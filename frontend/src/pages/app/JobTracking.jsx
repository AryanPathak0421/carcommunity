import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import {
  Check,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  Star,
  User,
} from 'lucide-react'
import { bookingsApi } from '../../api/bookingsApi.js'
import { paymentsApi } from '../../api/paymentsApi.js'
import { ApiError } from '../../api/http.js'
import { useSocket } from '../../context/SocketContext.jsx'
import { setActiveBooking, updateBookingStatus as updateBookingStatusAction, clearActiveBooking } from '../../store/slices/activeBookingSlice.js'
import { AppStackScreenHeader } from '../../components/app/AppStackScreenHeader.jsx'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { ReviewModal } from '../../components/app/ReviewModal.jsx'
import { LiveTrackingScreen } from '../../components/app/tracking/LiveTrackingScreen.jsx'

const BOOKING_STEPS = [
  { id: 'CREATED', label: 'Booking Created' },
  { id: 'BROADCASTING', label: 'Searching for Mechanics' },
  { id: 'ACCEPTED', label: 'Mechanic Accepted' },
  { id: 'EN_ROUTE', label: 'On the Way' },
  { id: 'STARTED', label: 'Work Started' },
  { id: 'COMPLETED', label: 'Completed' },
]

export function JobTracking() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const socket = useSocket()
  const reduce = useReducedMotion()

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [showBilling, setShowBilling] = useState(false)
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false)
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [labourLocation, setLabourLocation] = useState(null)

  // Fetch booking on mount
  useEffect(() => {
    if (!bookingId) return
    let cancelled = false
    bookingsApi.getBookingStatus(bookingId)
      .then((res) => {
        if (cancelled) return
        const b = res.data?.booking
        if (b) {
          setBooking(b)
          // After a refresh/reconnect, resume from the last position the server has.
          if (b.liveLocation?.lat != null && b.liveLocation?.lng != null) {
            setLabourLocation({ lat: b.liveLocation.lat, lng: b.liveLocation.lng })
          }
          dispatch(setActiveBooking({ bookingId: b._id, status: b.status }))
          if (b.status === 'COMPLETED') {
            if (b.paymentMethod === 'ONLINE' && b.paymentStatus === 'PAID') {
              setShowReview(true)
            } else {
              setShowBilling(true)
            }
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load booking')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [bookingId, dispatch])

  // Socket event listeners
  useEffect(() => {
    if (!socket || !bookingId) return

    const handleAccepted = (data) => {
      if (data.bookingId === bookingId) {
        setBooking((prev) => prev ? { ...prev, status: 'ACCEPTED', laborId: data.laborId } : prev)
        dispatch(updateBookingStatusAction('ACCEPTED'))
        // Refetch to get labor details
        bookingsApi.getBookingStatus(bookingId)
          .then((res) => {
            const b = res.data?.booking
            if (b) setBooking(b)
          })
          .catch(() => { })
      }
    }

    const handleStatusUpdate = (data) => {
      if (data.bookingId === bookingId) {
        setBooking((prev) => {
          const updated = prev ? { ...prev, status: data.status } : null
          if (data.status === 'COMPLETED' && updated) {
            if (updated.paymentMethod === 'ONLINE' && updated.paymentStatus === 'PAID') {
              setShowReview(true)
            } else {
              setShowBilling(true)
            }
          }
          return updated
        })
        dispatch(updateBookingStatusAction(data.status))
      }
    }

    const handleLocationUpdate = (data) => {
      if (data.bookingId === bookingId && data.lat && data.lng) {
        setLabourLocation({ lat: data.lat, lng: data.lng })
      }
    }

    socket.on('BOOKING_ACCEPTED', handleAccepted)
    socket.on('BOOKING_STATUS_UPDATE', handleStatusUpdate)
    socket.on('LABOUR_LOCATION_UPDATE', handleLocationUpdate)

    return () => {
      socket.off('BOOKING_ACCEPTED', handleAccepted)
      socket.off('BOOKING_STATUS_UPDATE', handleStatusUpdate)
      socket.off('LABOUR_LOCATION_UPDATE', handleLocationUpdate)
    }
  }, [socket, bookingId, dispatch])

  const currentStepIndex = useMemo(() => {
    if (!booking) return 0
    const idx = BOOKING_STEPS.findIndex((s) => s.id === booking.status)
    return idx >= 0 ? idx : 0
  }, [booking])

  const handleReviewClose = useCallback(() => {
    setShowReview(false)
    dispatch(clearActiveBooking())
    navigate('/app/my-bookings', { replace: true })
  }, [dispatch, navigate])

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

  const handlePayment = async () => {
    try {
      setPaymentProcessing(true)
      const res = await loadRazorpay()
      if (!res) {
        alert('Razorpay SDK failed to load. Are you online?')
        setPaymentProcessing(false)
        return
      }

      const orderRes = await paymentsApi.initPayment({
        amount: booking.totalAmount,
        purpose: 'BOOKING',
        bookingId: booking._id,
      })
      const { order } = orderRes.data

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TYe1C0k011xHMB', // fallback
        amount: order.amount,
        currency: order.currency,
        name: 'CarCommunity',
        description: `Payment for Booking`,
        order_id: order.id,
        handler: async function (response) {
          try {
            await paymentsApi.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            // Payment verified successfully!
            setBooking(prev => prev ? { ...prev, paymentStatus: 'PAID' } : prev)
            setShowBilling(false)
            setShowPaymentSuccessModal(true)
          } catch (err) {
            alert('Payment verification failed')
          }
        },
        prefill: {
          name: user?.fullName || '',
          contact: user?.phone || '',
          email: user?.email || ''
        },
        theme: { color: '#f97316' }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        alert(response.error.description || 'Payment failed')
      })
      rzp.open()
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.message || 'Failed to initiate checkout')
    } finally {
      setPaymentProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <AppStackScreenHeader title="Tracking" backTo="/app" />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="space-y-4">
        <AppStackScreenHeader title="Tracking" backTo="/app" />
        <GlassPanel className="p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">{error || 'Booking not found'}</p>
        </GlassPanel>
      </div>
    )
  }

  // While the job is live, show the full live-tracking experience (map, ETA, mechanic, PIN).
  if (['ACCEPTED', 'ASSIGNED', 'EN_ROUTE', 'STARTED'].includes(booking.status)) {
    return (
      <LiveTrackingScreen
        bookingId={bookingId}
        onBack={() => navigate('/app/my-bookings', { replace: true })}
        onCancelled={() => navigate('/app/my-bookings', { replace: true })}
      />
    )
  }

  const labor = booking.laborId && typeof booking.laborId === 'object' ? booking.laborId : null

  return (
    <div className="space-y-4 pb-8">
      <AppStackScreenHeader title="Job Tracking" backTo="/app" />

      {/* Status Badge */}
      <GlassPanel className="border-brand/20 bg-brand/5 px-4 py-3 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Current Status</p>
        <p className="mt-1 text-lg font-extrabold text-slate-900">
          {booking.type === 'SCHEDULED' && booking.status === 'CREATED'
            ? 'Scheduled (Awaiting Mechanic)'
            : BOOKING_STEPS[currentStepIndex]?.label || booking.status}
        </p>
      </GlassPanel>

      {/* Map Tracking */}
      {booking.status === 'EN_ROUTE' && labourLocation && (
        <GlassPanel className="overflow-hidden p-0">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-brand" /> Live Tracking
            </p>
          </div>
          <div className="h-48 w-full bg-slate-100 relative">
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${labourLocation.lat},${labourLocation.lng}&z=15&output=embed`}
            />
          </div>
        </GlassPanel>
      )}

      {/* Booking Details */}
      <GlassPanel className="p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Booking Details</p>
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-500">Date</span>
            <span className="font-medium text-slate-900">{booking.type === 'SCHEDULED' ? new Date(booking.scheduledAt).toLocaleDateString() : 'ASAP'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-500">Time</span>
            <span className="font-medium text-slate-900">{booking.type === 'SCHEDULED' ? booking.timeSlot : 'Earliest available'}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-500">Location</span>
            <span className="text-right line-clamp-2 mt-0.5 text-slate-900 font-medium">{booking.address?.locationText}</span>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900 mt-2">
            <span>Total Bill</span>
            <span>₹{booking.totalAmount?.toLocaleString('en-IN') || 0}</span>
          </div>
        </div>
      </GlassPanel>

      {/* Progress Stepper */}
      <GlassPanel className="p-5">
        <ol className="space-y-3">
          {BOOKING_STEPS.map((step, i) => {
            const done = i <= currentStepIndex
            const isCurrent = i === currentStepIndex
            return (
              <motion.li
                key={step.id}
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black shadow-sm transition ${done
                      ? 'bg-brand text-white shadow-brand/30'
                      : 'bg-slate-100 text-slate-400'
                    } ${isCurrent ? 'ring-4 ring-brand/20' : ''}`}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={`text-sm font-semibold ${done ? 'text-slate-900' : 'text-slate-400'}`}>
                  {step.label}
                </span>
                {isCurrent && (
                  <span className="ml-auto rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                    Active
                  </span>
                )}
              </motion.li>
            )
          })}
        </ol>
      </GlassPanel>

      {/* Laborer Details */}
      {labor && (
        <GlassPanel className="overflow-hidden p-0">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Mechanic</p>
          </div>
          <div className="flex items-center gap-4 p-4">
            {labor.profilePic ? (
              <img src={labor.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(labor.fullName || 'W')}`} alt="" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <User className="h-7 w-7" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold text-slate-900">{labor.fullName || 'Mechanic'}</p>
              {labor.phone && (
                <a href={`tel:${labor.phone}`} className="mt-1 flex items-center gap-1 text-sm font-semibold text-brand">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  {labor.phone}
                </a>
              )}
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Booking Info */}
      <GlassPanel className="p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Booking ID</span>
          <span className="font-mono font-bold text-slate-900">{booking._id?.slice(-8) || bookingId}</span>
        </div>
        {booking.totalAmount && (
          <div className="mt-2 flex justify-between">
            <span className="text-slate-500">Total Amount</span>
            <span className="font-bold text-brand">₹{booking.totalAmount}</span>
          </div>
        )}
        {booking.paymentMethod && (
          <div className="mt-2 flex justify-between">
            <span className="text-slate-500">Payment</span>
            <span className="font-bold text-slate-900">{booking.paymentMethod}</span>
          </div>
        )}
      </GlassPanel>

      {/* OTP Display for Customer */}
      {(() => {
        const isMultiDay = booking.durationKind === 'multi_day'
        let currentDayLog = null
        let isDailyStartRequired = false
        let isDailyEndRequired = false
        if (isMultiDay && booking.attendanceLog) {
          currentDayLog = booking.attendanceLog.find(log => !log.endOtpVerifiedAt) || booking.attendanceLog[booking.attendanceLog.length - 1]
          if (currentDayLog) {
            isDailyStartRequired = !currentDayLog.startOtpVerifiedAt
            isDailyEndRequired = !!currentDayLog.startOtpVerifiedAt && !currentDayLog.endOtpVerifiedAt
          }
        }

        if (isMultiDay && currentDayLog && (isDailyStartRequired || isDailyEndRequired)) {
          return (
            <GlassPanel className={`border-${isDailyStartRequired ? 'brand' : 'emerald-500'}/20 bg-${isDailyStartRequired ? 'brand' : 'emerald-500'}/5 p-4 text-center`}>
              <p className={`text-xs font-bold uppercase tracking-wider text-${isDailyStartRequired ? 'brand' : 'emerald-600'}`}>Day {currentDayLog.dayNumber} {isDailyStartRequired ? 'Start' : 'End'} OTP</p>
              <p className="mt-2 text-3xl font-black tracking-[0.2em] text-slate-900">{isDailyStartRequired ? currentDayLog.startOtp : currentDayLog.endOtp}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">Share this with the mechanic to {isDailyStartRequired ? 'start' : 'end'} the work for the day.</p>
            </GlassPanel>
          )
        }

        if (!isMultiDay && booking.status === 'EN_ROUTE' && booking.startOtp) {
          return (
            <GlassPanel className="border-brand/20 bg-brand/5 p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-brand">Start OTP</p>
              <p className="mt-2 text-3xl font-black tracking-[0.2em] text-slate-900">{booking.startOtp}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">Share this with the mechanic to start the job.</p>
            </GlassPanel>
          )
        }
        if (!isMultiDay && booking.status === 'STARTED' && booking.completionOtp) {
          return (
            <GlassPanel className="border-emerald-500/20 bg-emerald-50 p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Completion OTP</p>
              <p className="mt-2 text-3xl font-black tracking-[0.2em] text-slate-900">{booking.completionOtp}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">Share this with the mechanic when the job is done.</p>
            </GlassPanel>
          )
        }
        return null
      })()}

      {/* Billing Modal */}
      <AnimatePresence>
        {showBilling && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl relative"
            >
              <h3 className="text-2xl font-black text-slate-900 mb-2">Job Complete!</h3>
              <p className="text-sm font-medium text-slate-600 mb-6">
                Please review your billing details for this booking.
              </p>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-3 mb-6">
                <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                  <span>Service</span>
                  <span>{booking.serviceId?.name || booking.type}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                  <span>Duration</span>
                  <span>{booking.durationKind === 'multi_day' ? `${booking.durationDays} Days` : 'Single Day'}</span>
                </div>
                {booking.paymentMethod === 'ONLINE' && booking.platformFee > 0 && (
                  <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                    <span>Platform Fee</span>
                    <span>₹{booking.platformFee}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-200 mt-3 flex justify-between items-center">
                  <span className="text-base font-bold text-slate-900">Total Amount</span>
                  <span className="text-xl font-black text-brand">₹{booking.totalAmount}</span>
                </div>
              </div>

              {booking.paymentMethod === 'CASH' ? (
                <>
                  <p className="text-center text-sm font-bold text-emerald-600 mb-6 bg-emerald-50 py-2 rounded-lg border border-emerald-100">
                    Please pay ₹{booking.totalAmount} directly to the mechanic in cash.
                  </p>
                  <button
                    onClick={() => {
                      setShowBilling(false)
                      setShowReview(true)
                    }}
                    className="flex w-full items-center justify-center rounded-2xl bg-brand py-3.5 text-base font-bold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-active active:scale-95"
                  >
                    Continue to Review
                  </button>
                </>
              ) : (
                <button
                  onClick={handlePayment}
                  disabled={paymentProcessing}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-base font-bold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-active active:scale-95 disabled:opacity-70"
                >
                  {paymentProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Proceed to Payment'
                  )}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Success Modal */}
      <AnimatePresence>
        {showPaymentSuccessModal && (
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

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1, bounce: 0.5 }}
                className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 relative z-10"
              >
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </motion.div>

              <h2 className="mt-6 text-2xl font-black text-slate-900 relative z-10">Payment Successful!</h2>
              <p className="mt-2 text-sm text-slate-600 relative z-10">
                Your payment for this booking has been processed securely.
              </p>

              <button
                onClick={() => {
                  setShowPaymentSuccessModal(false)
                  setShowReview(true)
                }}
                className="relative z-10 mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-active active:scale-95"
              >
                Continue to Review
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <ReviewModal
        open={showReview}
        bookingId={bookingId}
        onClose={handleReviewClose}
      />
    </div>
  )
}
