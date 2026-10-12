import { useEffect, useState } from 'react'
import { Plus, Eye, Edit, Trash2, Shield, Users } from 'lucide-react'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { adminSubscriptionsApi } from '../../api/adminSubscriptionsApi.js'
import { adminSettingsApi } from '../../api/adminSettingsApi.js'
import { AddUserSubscriptionPlanModal } from './components/AddUserSubscriptionPlanModal.jsx'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

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

export function AdminUserSubscriptionsPage() {
  const [activeTab, setActiveTab] = useState('users') // 'users' or 'plans'
  const [plans, setPlans] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(false)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create', 'view', 'edit'
  const [selectedPlan, setSelectedPlan] = useState(null)
  
  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  
  const [toast, setToast] = useState({ message: '', variant: 'success' })

  const showToast = (message, variant = 'success') => {
    setToast({ message, variant })
    setTimeout(() => setToast({ message: '', variant: 'success' }), 3000)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const settingsRes = await adminSettingsApi.getSettings()
      setIsFeatureEnabled(settingsRes?.data?.settings?.isUserSubscriptionEnabled || false)

      if (activeTab === 'plans') {
        const res = await adminSubscriptionsApi.getPlans()
        setPlans((res?.plans || []).filter(p => p.planType === 'individual'))
      } else {
        const res = await adminSubscriptionsApi.getUserSubscriptions()
        setSubscriptions(res?.subscriptions || [])
      }
    } catch (err) {
      console.error('Failed to fetch data', err)
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const handleToggleFeature = async (e) => {
    const checked = e.target.checked
    setIsFeatureEnabled(checked)
    try {
      await adminSettingsApi.updateUserSubscriptionToggle({ isUserSubscriptionEnabled: checked })
      showToast(`User subscription feature ${checked ? 'enabled' : 'disabled'}`, 'success')
    } catch (err) {
      setIsFeatureEnabled(!checked)
      showToast('Failed to update settings', 'error')
    }
  }

  const handleSavePlan = async (planData) => {
    try {
      if (modalMode === 'edit' && selectedPlan) {
        await adminSubscriptionsApi.updatePlan(selectedPlan._id, planData)
        showToast('Subscription plan updated successfully', 'success')
      } else {
        await adminSubscriptionsApi.createPlan(planData)
        showToast('Subscription plan created successfully', 'success')
      }
      fetchData()
    } catch (err) {
      console.error('Failed to save plan', err)
      showToast('Failed to save subscription plan', 'error')
    }
  }

  const handleDeletePlan = async (id) => {
    try {
      await adminSubscriptionsApi.deletePlan(id)
      showToast('Subscription plan deleted successfully', 'success')
      setDeleteConfirm(null)
      fetchData()
    } catch (err) {
      console.error('Failed to delete plan', err)
      showToast('Failed to delete subscription plan', 'error')
    }
  }

  const openCreateModal = () => {
    setModalMode('create')
    setSelectedPlan(null)
    setIsModalOpen(true)
  }

  const openViewModal = async (plan) => {
    try {
      const res = await adminSubscriptionsApi.getPlanById(plan._id)
      setModalMode('view')
      setSelectedPlan(res?.plan || plan)
      setIsModalOpen(true)
    } catch (err) {
      console.error('Failed to fetch plan details', err)
      showToast('Failed to load plan details', 'error')
    }
  }

  const openEditModal = async (plan) => {
    try {
      const res = await adminSubscriptionsApi.getPlanById(plan._id)
      setModalMode('edit')
      setSelectedPlan(res?.plan || plan)
      setIsModalOpen(true)
    } catch (err) {
      console.error('Failed to fetch plan details', err)
      showToast('Failed to load plan details', 'error')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-7xl space-y-4"
    >
      <AnimatePresence>
        {toast.message && <Toast message={toast.message} variant={toast.variant} />}
      </AnimatePresence>
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">User Subscriptions</h2>
          <p className="text-sm text-slate-500">Manage individual user subscription plans and subscribers</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
            <span>Enable User Subscriptions</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={isFeatureEnabled}
                onChange={handleToggleFeature}
                className="sr-only"
              />
              <div className={`block h-6 w-11 rounded-full transition-colors ${isFeatureEnabled ? 'bg-brand' : 'bg-slate-300'}`}></div>
              <div className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${isFeatureEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </label>
          {activeTab === 'plans' && (
            <button
              onClick={openCreateModal}
              className="flex w-max items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand/90 hover:shadow-brand/30"
            >
              <Plus className="h-4 w-4" /> Add Plan
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === 'users' ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Users className="h-4 w-4" /> Subscribers
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === 'plans' ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Shield className="h-4 w-4" /> Plans & Pricing
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand"></div>
        </div>
      ) : activeTab === 'plans' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <GlassPanel key={plan._id} className="group relative overflow-hidden flex flex-col rounded-2xl p-4 pt-12 transition hover:shadow-lg">

              {deleteConfirm === plan._id && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/95 p-4 backdrop-blur-sm">
                  <AlertTriangle className="mb-2 h-6 w-6 text-rose-500" />
                  <p className="mb-3 text-center text-xs font-medium text-slate-900">
                    Are you sure you want to delete this plan?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan._id)}
                      className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {plan.recommended && (
                <div className="absolute left-4 top-4 inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                  Recommended
                </div>
              )}
              <h3 className="mb-0.5 text-lg font-bold text-slate-900 line-clamp-1">{plan.name}</h3>
              <div className="mb-3 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">₹{plan.price}</span>
              </div>
              
              <div className="mb-3 rounded-lg bg-slate-50 p-2 text-xs font-semibold text-brand">
                Allowed Bookings: {plan.allowedBookings}
              </div>

              <p className="mb-4 text-xs text-slate-600 line-clamp-2">{plan.description}</p>
              
              <div className="space-y-2">
                {plan.features?.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0 rounded-full bg-emerald-100 p-0.5 text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => openViewModal(plan)}
                  className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
                  aria-label="View"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => openEditModal(plan)}
                  className="rounded-full bg-brand/10 p-2 text-brand transition hover:bg-brand/20"
                  aria-label="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(plan._id)}
                  className="rounded-full bg-rose-100 p-2 text-rose-600 transition hover:bg-rose-200"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </GlassPanel>
          ))}
          {plans.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
              No plans found. Create one to get started.
            </div>
          )}
        </div>
      ) : (
        <GlassPanel className="overflow-hidden rounded-3xl p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-bold">User</th>
                  <th className="px-6 py-4 font-bold">Plan</th>
                  <th className="px-6 py-4 font-bold">Bookings Used</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Start Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => (
                  <tr key={sub._id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{sub.user?.fullName || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{sub.user?.phone || 'No Phone'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-brand">{sub.plan?.name || sub.snapshotPlanDetails?.name}</div>
                      <div className="text-xs font-semibold text-slate-600">₹{sub.plan?.price || sub.snapshotPlanDetails?.price}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">{sub.bookingsUsed}</span> / {sub.snapshotPlanDetails?.allowedBookings || sub.plan?.allowedBookings}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        sub.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        sub.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {sub.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(sub.startDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {subscriptions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                      No active user subscriptions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}

      <AddUserSubscriptionPlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePlan}
        mode={modalMode}
        initialData={selectedPlan}
      />
    </motion.div>
  )
}
