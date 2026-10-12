import { useEffect, useRef, useState } from 'react'
import { Camera, ImageIcon, Loader2 } from 'lucide-react'
import { ApiError } from '../../api/http.js'
import { assetUrlFromUpload, uploadMedia } from '../../api/uploadApi.js'
import { UPLOAD_FOLDERS } from '../../constants/uploadFolders.js'
import { getCategoryImageUrl } from '../../lib/labourCategoryDisplay.js'

/**
 * Upload / URL editor for category or subcategory tile images.
 * @param {{ imageUrl?: string, label?: string, hint?: string, onSave: (url: string) => Promise<void> }} props
 */
export function AdminCategoryImageEditor({ imageUrl = '', label = 'Tile image', hint, onSave }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [urlDraft, setUrlDraft] = useState(imageUrl || '')

  useEffect(() => {
    setUrlDraft(imageUrl || '')
  }, [imageUrl])

  const preview = getCategoryImageUrl({ slug: label, name: label, imageUrl: urlDraft || imageUrl })

  const saveImage = async (nextUrl) => {
    setErr('')
    setBusy(true)
    try {
      await onSave(nextUrl || '')
      setUrlDraft(nextUrl || '')
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not save image')
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (file) => {
    if (!file?.type?.startsWith('image/')) {
      setErr('Choose a JPG, PNG, or WebP image.')
      return
    }
    try {
      const uploaded = await uploadMedia(file, UPLOAD_FOLDERS.LABOUR_CATEGORIES)
      const url = assetUrlFromUpload(uploaded)
      if (!url) {
        setErr('Upload succeeded but no URL was returned.')
        return
      }
      await saveImage(url)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not upload image.')
    }
  }

  return (
    <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-2 ring-slate-200/90">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-slate-300">
              <ImageIcon className="h-6 w-6" aria-hidden />
            </span>
          )}
          {busy ? (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onFile(f)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:border-brand/30"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden />
              Upload
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => saveImage(urlDraft.trim())}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-[11px] font-bold text-brand ring-1 ring-brand/25"
            >
              Save URL
            </button>
            {imageUrl || urlDraft ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setUrlDraft('')
                  void saveImage('')
                }}
                className="text-[11px] font-bold text-rose-600"
              >
                Remove
              </button>
            ) : null}
          </div>
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="Or paste https:// image URL"
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
          />
          {err ? <p className="text-[11px] font-medium text-rose-700">{err}</p> : null}
          {hint ? <p className="text-[10px] text-slate-500">{hint}</p> : null}
        </div>
      </div>
    </div>
  )
}
