import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Shield, Loader2, AlertTriangle, ChevronRight, Sparkles, X } from 'lucide-react'
import { userSubscriptionApi } from '../../api/userSubscriptionApi'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

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

export function AppSubscriptionPage() {
  const [plans, setPlans] = useState([])
  const [activeSubscription, setActiveSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [toast, setToast] = useState({ message: '', variant: 'success' })
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth.user)

  const showToast = (message, variant = 'success') => {
    setToast({ message, variant })
    setTimeout(() => setToast({ message: '', variant: 'success' }), 4000)
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [plansRes, subRes] = await Promise.all([
        userSubscriptionApi.getPlans(),
        userSubscriptionApi.getMySubscription()
      ])
      setPlans(plansRes?.data?.plans || [])
      setActiveSubscription(subRes?.data?.subscription || null)
    } catch (err) {
      console.error(err)
      showToast('Failed to load subscriptions', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handleSubscribe = async (plan) => {
    try {
      setProcessingId(plan._id)

      const res = await loadRazorpay()
      if (!res) {
        showToast('Razorpay SDK failed to load. Are you online?', 'error')
        setProcessingId(null)
        return
      }

      const orderRes = await userSubscriptionApi.createOrder(plan._id)
      const { order, keyId } = orderRes.data

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'CarCommunity',
        description: `Subscription: ${plan.name}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            await userSubscriptionApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan._id
            })
            setSuccessModalOpen(true)
            loadData()
          } catch (err) {
            showToast('Payment verification failed', 'error')
          }
        },
        prefill: {
          name: user?.fullName || '',
          contact: user?.phone || '',
          email: user?.email || ''
        },
        theme: {
          color: '#f97316'
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        showToast(response.error.description || 'Payment failed', 'error')
      })
      rzp.open()

    } catch (err) {
      console.error(err)
      showToast(err?.response?.data?.message || 'Failed to initiate checkout', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-4">
      <AnimatePresence>
        {toast.message && <Toast message={toast.message} variant={toast.variant} />}
      </AnimatePresence>
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-brand" />
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Choose Your Plan</h1>
          <p className="mx-auto mt-3 max-w-md text-slate-600 sm:text-lg">
            Unlock seamless booking experiences with our flexible subscription plans tailored for you.
          </p>
        </div>

        <AnimatePresence>
          {successModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white p-6 text-center shadow-2xl"
              >
                {/* Decorative background blob */}
                <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-brand/10 blur-3xl" aria-hidden />
                <div className="absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />

                <button
                  onClick={() => {
                    setSuccessModalOpen(false)
                    navigate('/app')
                  }}
                  className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1, bounce: 0.5 }}
                  className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50"
                >
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </motion.div>

                <h2 className="mt-6 text-2xl font-black text-slate-900">Payment Successful!</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Your subscription has been activated successfully. You can now start booking without limits!
                </p>

                <button
                  onClick={() => {
                    setSuccessModalOpen(false)
                    navigate('/app')
                  }}
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-active active:scale-95"
                >
                  <Sparkles className="h-4 w-4" />
                  Continue
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {activeSubscription && (
          <div className="mb-10 overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/50">
            <div className="bg-brand px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <CheckCircle2 className="h-5 w-5" /> Your Active Plan
              </h2>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{activeSubscription.snapshotPlanDetails?.name || activeSubscription.plan?.name}</h3>
                  <p className="text-slate-500">Valid until {new Date(activeSubscription.endDate).toLocaleDateString()}</p>
                </div>
                <div className="mt-4 sm:mt-0">
                  <div className="text-sm font-semibold text-slate-600">Bookings Used</div>
                  <div className="text-3xl font-black text-brand">
                    {activeSubscription.bookingsUsed} <span className="text-xl text-slate-400">/ {activeSubscription.snapshotPlanDetails?.allowedBookings || activeSubscription.plan?.allowedBookings}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, idx) => {
            const isCurrent = activeSubscription?.plan?._id === plan._id

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={plan._id}
                className={`relative flex flex-col overflow-hidden rounded-3xl bg-white p-6 shadow-xl transition-transform hover:-translate-y-1 ${plan.recommended ? 'ring-2 ring-brand' : ''}`}
              >
                {plan.recommended && (
                  <div className="absolute right-0 top-0 rounded-bl-3xl bg-brand px-4 py-1.5 text-xs font-bold tracking-wide text-white">
                    RECOMMENDED
                  </div>
                )}

                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">₹{plan.price}</span>
                </div>

                <div className="mt-4 inline-block rounded-xl bg-brand/10 px-3 py-1 text-sm font-bold text-brand">
                  Up to {plan.allowedBookings} Bookings
                </div>

                <p className="mt-4 text-sm text-slate-600">{plan.description}</p>

                <div className="mt-6 flex-1 space-y-3">
                  {plan.features?.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <span className="text-sm font-medium text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrent || processingId === plan._id}
                  className={`group mt-8 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition ${isCurrent
                      ? 'bg-brand text-white shadow-lg shadow-brand/30'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                    } disabled:opacity-70`}
                >
                  {processingId === plan._id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : (
                    <>
                      {plan.buttonText || 'Subscribe Now'}
                      <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
