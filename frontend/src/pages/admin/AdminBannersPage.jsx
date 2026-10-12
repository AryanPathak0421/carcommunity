import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Image as ImageIcon, Loader2, RefreshCw, Save } from 'lucide-react'
import { AppPrimaryButton } from '../../components/app/AppPrimaryButton.jsx'
import { fetchAdminBanners, createAdminBanner, updateAdminBanner, deleteAdminBanner } from '../../api/adminBannersApi.js'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'

/** Where a tap on the banner takes the user. `/app?book=…` opens the home booking picker. */
const LINK_PRESETS = [
  { value: '', label: 'No link' },
  { value: '/app?book=instant', label: 'Instant booking picker' },
  { value: '/app?book=scheduled', label: 'Schedule booking picker' },
  { value: '/app/search', label: 'Search services' },
  { value: '/app/refer', label: 'Refer & earn' },
  { value: '/app/subscriptions', label: 'Subscriptions' },
]
const CUSTOM = '__custom__'

function presetFor(url) {
  return LINK_PRESETS.some((p) => p.value === url) ? url : CUSTOM
}

function BannerCard({ banner, onChanged, onError }) {
  const [isActive, setIsActive] = useState(banner.isActive !== false)
  const [sortOrder, setSortOrder] = useState(String(banner.sortOrder ?? 0))
  const [targetUrl, setTargetUrl] = useState(banner.targetUrl || '')
  const [linkChoice, setLinkChoice] = useState(presetFor(banner.targetUrl || ''))
  const [saving, setSaving] = useState(false)
  const replaceRef = useRef(null)

  const dirty =
    isActive !== (banner.isActive !== false) ||
    Number(sortOrder) !== Number(banner.sortOrder ?? 0) ||
    targetUrl.trim() !== (banner.targetUrl || '')

  const save = async (file) => {
    const url = targetUrl.trim()
    if (url && !url.startsWith('/') && !/^https?:\/\//i.test(url)) {
      onError('Custom link must start with / (in-app page) or http(s)://')
      return
    }
    try {
      setSaving(true)
      const formData = new FormData()
      formData.append('isActive', String(isActive))
      formData.append('sortOrder', String(Number(sortOrder) || 0))
      formData.append('targetUrl', url)
      if (file) formData.append('file', file)
      await updateAdminBanner(banner._id, formData)
      await onChanged()
    } catch (err) {
      onError(err.message || 'Failed to update banner')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return
    try {
      await deleteAdminBanner(banner._id)
      await onChanged()
    } catch (err) {
      onError(err.message || 'Failed to delete banner')
    }
  }

  return (
    <GlassPanel className={`overflow-hidden rounded-xl bg-white shadow-sm ${isActive ? '' : 'opacity-70'}`}>
      <div className="relative aspect-[3/1] w-full bg-slate-100">
        <img src={banner.imageUrl} alt="Banner" className="h-full w-full object-cover" />
        {!isActive ? (
          <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-bold text-white">
            Hidden
          </span>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand,#16a34a)]"
            />
            Active
          </label>
          <label className="ml-auto flex items-center gap-2 text-sm font-medium text-slate-700">
            Order
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          On tap
          <select
            value={linkChoice}
            onChange={(e) => {
              setLinkChoice(e.target.value)
              if (e.target.value !== CUSTOM) setTargetUrl(e.target.value)
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            {LINK_PRESETS.map((p) => (
              <option key={p.value || 'none'} value={p.value}>
                {p.label}
              </option>
            ))}
            <option value={CUSTOM}>Custom link…</option>
          </select>
        </label>
        {linkChoice === CUSTOM ? (
          <input
            type="text"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="/app/... or https://..."
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={replaceRef}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) save(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => replaceRef.current?.click()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Replace image
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button
            type="button"
            onClick={() => save()}
            disabled={!dirty || saving}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      </div>
    </GlassPanel>
  )
}

export function AdminBannersPage() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const loadBanners = async () => {
    try {
      setLoading(true)
      const res = await fetchAdminBanners('APP')
      setBanners(res.data?.banners ?? [])
      setError('')
    } catch (e) {
      setError(e.message || 'Failed to load banners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBanners()
  }, [])

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      setError('')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('panel', 'APP')

      await createAdminBanner(formData)
      await loadBanners()
    } catch (err) {
      setError(err.message || 'Failed to upload banner')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Banners</h1>
          <p className="mt-1 text-sm text-slate-500">
            User app home carousel · lower order shows first · use 1500 × 500 px (3:1) images
          </p>
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <AppPrimaryButton onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Upload Banner
        </AppPrimaryButton>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-12 text-slate-500">
          <ImageIcon className="mb-2 h-10 w-10 opacity-20" />
          <p>No banners uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <BannerCard
              key={`${banner._id}-${banner.updatedAt}`}
              banner={banner}
              onChanged={loadBanners}
              onError={setError}
            />
          ))}
        </div>
      )}
    </div>
  )
}
