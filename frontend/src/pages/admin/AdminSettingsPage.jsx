import { useCallback, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Settings, Percent, IndianRupee, Wallet, Receipt, AlertTriangle, CheckCircle2, Loader2, Clock } from 'lucide-react'
import { adminSettingsApi } from '../../api/adminSettingsApi.js'
import { fetchAdminLabourCategoryTree, updateAdminLabourCategoryGst } from '../../api/adminLabourCategoriesApi.js'
import { ApiError } from '../../api/http.js'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { AppPrimaryButton } from '../../components/app/AppPrimaryButton.jsx'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20'

const labelClass = 'text-xs font-bold uppercase tracking-wider text-slate-500'

function SettingsSection({ icon: Icon, title, description, children, accent = 'brand' }) {
  return (
    <GlassPanel className="overflow-hidden p-0">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${accent}/10 text-${accent}`}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </GlassPanel>
  )
}

function Toast({ message, variant = 'success' }) {
  if (!message) return null
  const styles = variant === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-900'
    : 'border-emerald-200 bg-emerald-50 text-emerald-900'
  const Icon = variant === 'error' ? AlertTriangle : CheckCircle2
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`fixed left-4 right-4 top-20 z-50 mx-auto flex max-w-lg items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${styles}`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {message}
    </motion.div>
  )
}

export function AdminSettingsPage() {
  const reduce = useReducedMotion()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [toast, setToast] = useState({ message: '', variant: 'success' })

  const [rawSettings, setRawSettings] = useState(null)

  // Platform Fee
  // Backend still keys the platform fee by booking type; there is a single type now.
  const feeBookingType = 'B2C'
  const [feeType, setFeeType] = useState('percentage')
  const [feeValue, setFeeValue] = useState('')
  const [feeActive, setFeeActive] = useState(true)

  // Commission
  const [commissionType, setCommissionType] = useState('global')
  const [commissionPercent, setCommissionPercent] = useState('')
  const [commissionActive, setCommissionActive] = useState(true)

  // Sync Fee UI when booking type changes
  useEffect(() => {
    if (!rawSettings) return
    const s = rawSettings.platformFee
    if (s) {
      setFeeType(s.type || 'percentage')
      setFeeValue(String(s.value ?? ''))
      setFeeActive(s.isActive !== false)
    } else {
      setFeeType('percentage')
      setFeeValue('')
      setFeeActive(true)
    }
  }, [rawSettings])

  // Sync Commission UI when booking type changes
  useEffect(() => {
    if (!rawSettings) return
    const s = rawSettings.commission
    if (s) {
      setCommissionType(s.type || 'global')
      setCommissionPercent(String(s.globalPercentage ?? ''))
      setCommissionActive(s.isActive !== false)
    } else {
      setCommissionType('global')
      setCommissionPercent('')
      setCommissionActive(true)
    }
  }, [rawSettings])

  // GST
  const [gstPercentage, setGstPercentage] = useState('')

  // Categories for GST
  const [categories, setCategories] = useState([])
  const [selectedGstCategory, setSelectedGstCategory] = useState('')
  const [isGstActive, setIsGstActive] = useState(true)


  // Cancellation Penalty
  const [cancellationPenalty, setCancellationPenalty] = useState('')



  const showToast = useCallback((message, variant = 'success') => {
    setToast({ message, variant })
    setTimeout(() => setToast({ message: '', variant: 'success' }), 3500)
  }, [])

  useEffect(() => {
    let cancelled = false
    adminSettingsApi.getSettings()
      .then((res) => {
        if (cancelled) return
        const s = res.data?.settings || {}
        setRawSettings(s)
        

        
        // GST Categories
        fetchAdminLabourCategoryTree().then(res => {
          if (!cancelled && res.data?.categories) {
            setCategories(res.data.categories)
          }
        }).catch(console.error)

        // Cancellation Penalty
        if (s.cancellationPenalty != null) {
          setCancellationPenalty(String(s.cancellationPenalty))
        }

      })
      .catch((err) => {
        if (!cancelled) showToast(err instanceof ApiError ? err.message : 'Failed to load settings', 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [showToast])

  const handleSave = async (section, apiFn, payload) => {
    setSaving(section)
    try {
      await apiFn(payload)
      showToast(`${section} updated successfully`)
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : `Failed to update ${section}`, 'error')
    } finally {
      setSaving('')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Toast message={toast.message} variant={toast.variant} />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-emerald-600 text-white shadow-lg ring-4 ring-brand/10">
            <Settings className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Platform Settings</h1>
            <p className="text-sm text-slate-500">Configure fees, commission, wallet limits, GST, and penalties</p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform Fee */}
        <SettingsSection
          icon={Percent}
          title="Platform Fee"
          description="Fee charged to customers on each booking"
        >
          <div>
            <label className={labelClass}>Fee Type</label>
            <select
              className={inputClass + ' mt-1.5'}
              value={feeType}
              onChange={(e) => setFeeType(e.target.value)}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed (₹)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Value</label>
            <input
              className={inputClass + ' mt-1.5'}
              type="number"
              min={0}
              placeholder={feeType === 'percentage' ? 'e.g. 5' : 'e.g. 50'}
              value={feeValue}
              onChange={(e) => setFeeValue(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="fee-active"
              checked={feeActive}
              onChange={(e) => setFeeActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            <label htmlFor="fee-active" className="text-sm font-medium text-slate-700">Active</label>
          </div>
          <AppPrimaryButton
            type="button"
            loading={saving === 'Platform Fee'}
            onClick={() => handleSave('Platform Fee', adminSettingsApi.updatePlatformFees, {
              bookingType: feeBookingType,
              type: feeType,
              value: Number(feeValue),
              isActive: feeActive,
            })}
          >
            Save Platform Fee
          </AppPrimaryButton>
        </SettingsSection>

        {/* Commission */}
        <SettingsSection
          icon={IndianRupee}
          title="Commission"
          description="Percentage the platform takes from mechanics"
        >

          <div>
            <label className={labelClass}>Commission Percentage</label>
            <input
              className={inputClass + ' mt-1.5'}
              type="number"
              min={0}
              max={100}
              placeholder="e.g. 10"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="commission-active"
              checked={commissionActive}
              onChange={(e) => setCommissionActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            <label htmlFor="commission-active" className="text-sm font-medium text-slate-700">Active</label>
          </div>
          <AppPrimaryButton
            type="button"
            loading={saving === 'Commission'}
            onClick={() => handleSave('Commission', adminSettingsApi.updateCommission, {
              type: commissionType,
              globalPercentage: Number(commissionPercent),
              isActive: commissionActive,
            })}
          >
            Save Commission
          </AppPrimaryButton>
        </SettingsSection>



        {/* GST */}
        <SettingsSection
          icon={Receipt}
          title="Category GST"
          description="Tax applied on booking based on service category"
        >
          <div>
            <label className={labelClass}>Select Category</label>
            <select
              className={inputClass + ' mt-1.5'}
              value={selectedGstCategory}
              onChange={(e) => {
                 const val = e.target.value
                 setSelectedGstCategory(val)
                 const cat = categories.find(c => c._id === val)
                 if (cat) {
                   setGstPercentage(String(cat.gstPercentage || 0))
                   setIsGstActive(cat.isGstActive !== false)
                 } else {
                   setGstPercentage('')
                   setIsGstActive(true)
                 }
              }}
            >
              <option value="">-- Choose Category --</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>GST (%)</label>
            <input
              className={inputClass + ' mt-1.5'}
              type="number"
              min={0}
              max={100}
              placeholder="e.g. 18"
              value={gstPercentage}
              onChange={(e) => setGstPercentage(e.target.value)}
              disabled={!selectedGstCategory}
            />
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <input
              type="checkbox"
              id="gst-active"
              checked={isGstActive}
              onChange={(e) => setIsGstActive(e.target.checked)}
              disabled={!selectedGstCategory}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            <label htmlFor="gst-active" className="text-sm font-medium text-slate-700">Active</label>
          </div>
          <AppPrimaryButton
            type="button"
            loading={saving === 'GST'}
            disabled={!selectedGstCategory}
            onClick={() => {
              handleSave('GST', (payload) => updateAdminLabourCategoryGst(selectedGstCategory, payload), {
                gstPercentage: Number(gstPercentage),
                isGstActive: isGstActive,
              }).then(() => {
                // Update local state so it stays correctly configured when switching
                setCategories(prev => prev.map(c => c._id === selectedGstCategory ? { ...c, gstPercentage: Number(gstPercentage), isGstActive } : c))
              })
            }}
          >
            Save GST
          </AppPrimaryButton>
        </SettingsSection>

        {/* Cancellation Penalty */}
        <SettingsSection
          icon={AlertTriangle}
          title="Cancellation Penalty"
          description="Fixed penalty charged to mechanics for cancelling an accepted job"
          accent="amber-600"
        >
          <div>
            <label className={labelClass}>Penalty Amount (₹)</label>
            <input
              className={inputClass + ' mt-1.5'}
              type="number"
              min={0}
              placeholder="e.g. 50"
              value={cancellationPenalty}
              onChange={(e) => setCancellationPenalty(e.target.value)}
            />
          </div>
          <AppPrimaryButton
            type="button"
            loading={saving === 'Penalty'}
            onClick={() => handleSave('Penalty', adminSettingsApi.updateCancellationPenalty, {
              cancellationPenalty: Number(cancellationPenalty),
            })}
          >
            Save Penalty
          </AppPrimaryButton>
        </SettingsSection>

      </div>
    </div>
  )
}
