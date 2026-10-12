import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { LegalFormatHint } from '../../components/admin/LegalFormatHint.jsx'
import { apiClient } from '../../api/http.js'
import { USER_ROLES } from '../../constants/userRoles.js'

const TABS = [
  { id: USER_ROLES.INDIVIDUAL, label: 'Customers' },
  { id: USER_ROLES.MECHANIC, label: 'Mechanics' },
]

export function AdminPrivacyPolicyPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const [policyData, setPolicyData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  
  // Local state for the currently edited content
  const [content, setContent] = useState('')

  useEffect(() => {
    fetchPolicies()
  }, [])

  useEffect(() => {
    // When tab changes, populate the content editor with the specific role's policy
    setContent(policyData[activeTab]?.content || '')
    setMessage(null)
  }, [activeTab, policyData])

  async function fetchPolicies() {
    try {
      setLoading(true)
      const res = await apiClient.get('/admin/privacy-policy')
      const dataMap = {}
      res.data.data.forEach(item => {
        dataMap[item.role] = item
      })
      setPolicyData(dataMap)
    } catch (err) {
      console.error('Failed to fetch privacy policies:', err)
      setMessage({ type: 'error', text: 'Failed to load Privacy Policies.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      setMessage(null)
      const res = await apiClient.put(`/admin/privacy-policy/${activeTab}`, { content })
      
      setPolicyData(prev => ({
        ...prev,
        [activeTab]: res.data.data
      }))
      
      setMessage({ type: 'success', text: 'Privacy Policy updated successfully!' })
      
      // Auto-hide success message
      setTimeout(() => {
        setMessage(null)
      }, 3000)
    } catch (err) {
      console.error('Failed to update privacy policy:', err)
      setMessage({ type: 'error', text: 'Failed to save changes. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm font-medium">Loading Privacy Policies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage the privacy policies displayed to users during registration and usage.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200/60 pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-brand text-white shadow-md shadow-brand/20'
                : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 ring-1 ring-slate-200 ring-inset'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <GlassPanel className="p-6 md:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {TABS.find(t => t.id === activeTab)?.label} Privacy Policy
            </h2>
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-active hover:shadow-xl hover:shadow-brand/30 active:scale-95 disabled:opacity-70 sm:w-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>

        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 flex items-center gap-3 rounded-xl p-4 text-sm font-medium ${
                message.type === 'error'
                  ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                  : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              }`}
            >
              {message.type === 'error' ? (
                <AlertCircle className="h-5 w-5 shrink-0" />
              ) : (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              )}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <LegalFormatHint />

        <div className="relative h-[500px] w-full rounded-2xl bg-slate-50 ring-1 ring-slate-200/80 focus-within:ring-2 focus-within:ring-brand overflow-hidden">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-full w-full resize-none bg-transparent p-6 text-[15px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
            placeholder="Enter privacy policy here..."
          />
        </div>
      </GlassPanel>
    </div>
  )
}
