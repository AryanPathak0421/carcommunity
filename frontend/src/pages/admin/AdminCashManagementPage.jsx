import { useState, useEffect } from 'react'
import { Landmark, AlertCircle, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { AppPrimaryButton } from '../../components/app/AppPrimaryButton.jsx'
import { adminSettingsApi } from '../../api/adminSettingsApi.js'

export function AdminCashManagementPage() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [labourLimit, setLabourLimit] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fetchSettings = async () => {
    try {
      const res = await adminSettingsApi.getSettings()
      const data = res.data?.settings
      if (data) {
        setSettings(data)
        setLabourLimit(data.labourCashLimit?.toString() || '500')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setSaving(true)
    try {
      await adminSettingsApi.updateLabourCashLimit({ labourCashLimit: Number(labourLimit) })
      setSuccessMsg('Limit updated successfully!')
      fetchSettings()
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg('Failed to update limit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <span className="flex items-center justify-center h-10 w-10 bg-brand/10 text-brand rounded-xl">
          <Landmark className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cash Management</h1>
          <p className="text-sm text-slate-500 font-medium">Control limits for offline cash collection</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      ) : (
        <div className="max-w-2xl">
          <GlassPanel className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Mechanic Cash Collection Limit</h2>
            <p className="text-sm text-slate-600 mb-6">
              When a mechanic collects cash directly from the customer, the admin commission and fees are added to their Admin Dues. 
              If their total dues exceed this limit, they will be temporarily blocked from accepting new bookings until they clear their dues.
            </p>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm font-semibold">{errorMsg}</p>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-emerald-700">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm font-semibold">{successMsg}</p>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Max Outstanding Dues (₹)</label>
                <div className="relative max-w-xs">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                  <input
                    type="number"
                    required
                    min="0"
                    value={labourLimit}
                    onChange={(e) => setLabourLimit(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand font-semibold text-slate-800"
                    placeholder="Enter limit"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 font-medium">Labours cannot accept cash bookings if their dues exceed this amount.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <AppPrimaryButton type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Limit'}
                </AppPrimaryButton>
              </div>
            </form>
          </GlassPanel>
        </div>
      )}
    </div>
  )
}
