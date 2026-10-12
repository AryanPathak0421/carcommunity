import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  MapPin,
  Navigation,
  Play,
  X,
  Clock,
  Camera,
  Upload,
  Wallet,
} from 'lucide-react'
import { bookingsApi } from '../../api/bookingsApi.js'
import { ApiError } from '../../api/http.js'
import { useSocket } from '../../context/SocketContext.jsx'
import { AppStackScreenHeader } from '../../components/app/AppStackScreenHeader.jsx'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { uploadMedia, assetUrlFromUpload } from '../../api/uploadApi.js'
import { UPLOAD_FOLDERS } from '../../constants/uploadFolders.js'
import { useAuth } from '../../hooks/useAuth.js'
import { MechanicNavigationScreen } from '../../components/app/tracking/MechanicNavigationScreen.jsx'

const STATUS_CONFIG = {
  ACCEPTED: {
    label: 'Start Journey',
    next: 'EN_ROUTE',
    icon: Navigation,
    color: 'bg-[#F97316] shadow-[#F97316]/25',
    description: 'Let the customer know you\'re on your way',
  },
  EN_ROUTE: {
    label: 'Start Work',
    next: 'STARTED',
    icon: Play,
    color: 'bg-[#F97316] shadow-[#F97316]/25',
    description: 'You\'ve arrived — begin the work',
  },
  STARTED: {
    label: 'Finish Job',
    next: 'COMPLETED',
    icon: CheckCircle2,
    color: 'bg-[#F97316] shadow-[#F97316]/25',
    description: 'Mark the job as completed',
  },
}

const STEP_ORDER = ['ACCEPTED', 'EN_ROUTE', 'STARTED', 'COMPLETED']

export function ActiveJob() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const socket = useSocket()
  const reduce = useReducedMotion()
  const { user } = useAuth()

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')
  
  const [otp, setOtp] = useState('')
  const [jobImage, setJobImage] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [showCashConfirm, setShowCashConfirm] = useState(false)
  const [pendingCashSubmit, setPendingCashSubmit] = useState(null)

  const [paymentWaitMode, setPaymentWaitMode] = useState(false)
  const [paymentCollected, setPaymentCollected] = useState(false)

  // Fetch booking
  useEffect(() => {
    if (!bookingId) return
    let cancelled = false
    bookingsApi.getBookingStatus(bookingId)
      .then((res) => {
        if (cancelled) return
        setBooking(res.data?.booking || null)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load job')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [bookingId])

  // Socket updates
  useEffect(() => {
    if (!socket || !bookingId) return

    const handleStatusUpdate = (data) => {
      if (data.bookingId === bookingId) {
        setBooking((prev) => prev ? { ...prev, status: data.status } : prev)
      }
    }

    const handlePaymentCompleted = (data) => {
      if (data.bookingId === bookingId) {
        setPaymentCollected(true)
      }
    }

    socket.on('BOOKING_STATUS_UPDATE', handleStatusUpdate)
    socket.on('ONLINE_PAYMENT_COMPLETED', handlePaymentCompleted)
    return () => { 
      socket.off('BOOKING_STATUS_UPDATE', handleStatusUpdate)
      socket.off('ONLINE_PAYMENT_COMPLETED', handlePaymentCompleted)
    }
  }, [socket, bookingId])

  const handleStatusUpdate = useCallback(async (nextStatus, requireOtp = false, bypassCashCheck = false) => {
    if (requireOtp && !otp) {
      setUpdateError('OTP is required.')
      return
    }
    if (requireOtp && !jobImage) {
      setUpdateError(nextStatus === 'STARTED' ? 'Before Work image is required.' : 'After Work image is required.')
      return
    }

    if (nextStatus === 'COMPLETED' && booking?.paymentMethod === 'CASH' && !bypassCashCheck) {
      setShowCashConfirm(true)
      setPendingCashSubmit({ nextStatus, requireOtp })
      return
    }

    setUpdating(true)
    setUpdateError('')
    try {
      let payload = nextStatus
      if (requireOtp) {
        payload = { status: nextStatus, otp }
        if (nextStatus === 'STARTED') payload.beforeImage = jobImage
        if (nextStatus === 'COMPLETED') payload.afterImage = jobImage
      }

      const res = await bookingsApi.updateBookingStatus(bookingId, payload)
      setOtp('')
      setJobImage(null)
      setBooking((prev) => prev ? { ...prev, status: nextStatus } : prev)
      if (nextStatus === 'COMPLETED') {
        if (booking?.paymentMethod === 'ONLINE') {
          setPaymentWaitMode(true)
        } else {
          setTimeout(() => navigate('/app/my-bookings', { replace: true }), 1500)
        }
      }
    } catch (err) {
      setUpdateError(err instanceof ApiError ? err.message : 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }, [bookingId, navigate, otp, jobImage])

  const handleDailyOtpSubmit = useCallback(async (type, dayNumber, requireImage) => {
    if (!otp) {
      setUpdateError('OTP is required.')
      return
    }
    if (requireImage && !jobImage) {
      setUpdateError(type === 'start' ? 'Before Work image is required.' : 'After Work image is required.')
      return
    }

    if (type === 'end' && dayNumber === booking?.durationDays && booking?.paymentMethod === 'CASH') {
      setShowCashConfirm(true)
      setPendingCashSubmit({ isDaily: true, type, dayNumber })
      return
    }

    setUpdating(true)
    setUpdateError('')
    try {
      const payload = { type, otp, dayNumber }
      if (requireImage) payload.image = jobImage

      const res = await bookingsApi.verifyDailyOtp(bookingId, payload)
      setOtp('')
      setJobImage(null)
      setBooking((prev) => prev ? { ...prev, ...res.data?.booking } : prev)
      
      if (type === 'end' && dayNumber === booking?.durationDays) {
        if (booking?.paymentMethod === 'ONLINE') {
          setPaymentWaitMode(true)
        } else {
          setTimeout(() => navigate('/app/my-bookings', { replace: true }), 1500)
        }
      }
    } catch (err) {
      setUpdateError(err instanceof ApiError ? err.message : 'Failed to verify OTP')
    } finally {
      setUpdating(false)
    }
  }, [bookingId, navigate, otp, jobImage, booking])

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    setUpdateError('')
    try {
      const uploaded = await uploadMedia(file, UPLOAD_FOLDERS.GENERAL_MEDIA)
      setJobImage(assetUrlFromUpload(uploaded))
    } catch (err) {
      setUpdateError('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCancel = useCallback(async () => {
    const confirmed = window.confirm(
      'Are you sure? A ₹50 penalty will be applied to your wallet.'
    )
    if (!confirmed) return

    setUpdating(true)
    setUpdateError('')
    try {
      await bookingsApi.updateBookingStatus(bookingId, 'CANCELLED')
      navigate('/app/my-bookings', { replace: true })
    } catch (err) {
      setUpdateError(err instanceof ApiError ? err.message : 'Failed to cancel')
      setUpdating(false)
    }
  }, [bookingId, navigate])

  if (loading) {
    return (
      <div className="space-y-4">
        <AppStackScreenHeader title="Active Job" backTo="/app" />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="space-y-4">
        <AppStackScreenHeader title="Active Job" backTo="/app" />
        <GlassPanel className="p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">{error || 'Job not found'}</p>
        </GlassPanel>
      </div>
    )
  }

  const status = (booking.status || 'ACCEPTED').toUpperCase()
  const config = STATUS_CONFIG[status]
  const stepIndex = STEP_ORDER.indexOf(status)
  const isCompleted = status === 'COMPLETED'
  const isCancelled = status === 'CANCELLED'
  const customer = booking.userId && typeof booking.userId === 'object' ? booking.userId : null

  // Check if it's too early to start a scheduled job (more than 30 mins away)
  const isTooEarly = booking.type === 'SCHEDULED' && booking.status === 'ACCEPTED' &&
    (new Date(booking.scheduledAt).getTime() - Date.now() > 30 * 60 * 1000)

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

  const overlays = (
    <>
    {/* Cash Payment Confirmation Popup */}
    {showCashConfirm && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        >
          <div className="mb-4 flex items-center justify-center gap-3 text-brand">
            <Wallet className="h-10 w-10" />
          </div>
          <h3 className="text-center text-xl font-extrabold text-slate-900">Take Cash Payment?</h3>
          <p className="mt-2 text-center text-sm font-medium text-slate-600">
            The customer has selected cash. Are you sure you want to continue to take payment in cash?
          </p>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => {
                setShowCashConfirm(false)
                setPendingCashSubmit(null)
              }}
              className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
            >
              No
            </button>
            <button
              onClick={() => {
                setShowCashConfirm(false)
                if (pendingCashSubmit) {
                  if (pendingCashSubmit.isDaily) {
                    handleDailyOtpSubmit(pendingCashSubmit.type, pendingCashSubmit.dayNumber, true)
                  } else {
                    handleStatusUpdate(pendingCashSubmit.nextStatus, pendingCashSubmit.requireOtp, true)
                  }
                }
              }}
              className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white transition hover:bg-brand/90"
            >
              Yes, Continue
            </button>
          </div>
        </motion.div>
      </div>
    )}

    {/* Online Payment Waiting & Success Modal */}
    <AnimatePresence>
      {paymentWaitMode && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl text-center relative"
          >
            {!paymentCollected ? (
              // Waiting State
              <>
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand/10 mb-6">
                  <Loader2 className="h-10 w-10 animate-spin text-brand" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Waiting for Payment</h3>
                <p className="mt-3 text-sm font-medium text-slate-600">
                  The job is complete! Please wait while the customer completes the online payment.
                </p>
              </>
            ) : (
              // Success State
              <>
                <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />
                <div className="absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-brand/10 blur-3xl" aria-hidden />

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 mb-6 relative z-10"
                >
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                </motion.div>
                <h3 className="text-xl font-extrabold text-slate-900 relative z-10">Payment Received!</h3>
                <p className="mt-3 text-sm font-medium text-slate-600 relative z-10">
                  The customer has paid. You can now collect the money to your wallet!
                </p>
                <button
                  onClick={() => {
                    setPaymentWaitMode(false)
                    navigate('/app', { replace: true })
                  }}
                  className="relative z-10 mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-base font-bold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-active active:scale-95"
                >
                  Collect Money
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  )

  // Live job: captain-style navigation (map + route + one clear action per step).
  if (['ACCEPTED', 'ASSIGNED', 'EN_ROUTE', 'STARTED'].includes(status) && !paymentWaitMode) {
    const savedLat = user?.labourProfile?.currentLatitude
    const savedLng = user?.labourProfile?.currentLongitude
    return (
      <>
        <MechanicNavigationScreen
          booking={booking}
          fallbackPosition={Number.isFinite(savedLat) && Number.isFinite(savedLng) ? { lat: savedLat, lng: savedLng } : null}
          isTooEarly={isTooEarly}
          multiDay={{
            required: isMultiDay && (isDailyStartRequired || isDailyEndRequired),
            type: isDailyStartRequired ? 'start' : 'end',
            dayNumber: currentDayLog?.dayNumber,
            isFinalDay: currentDayLog?.dayNumber === booking.durationDays,
          }}
          otp={otp}
          setOtp={setOtp}
          jobImage={jobImage}
          setJobImage={setJobImage}
          uploadingImage={uploadingImage}
          onImageFile={handleImageUpload}
          updating={updating}
          updateError={updateError}
          onAdvance={handleStatusUpdate}
          onDaily={handleDailyOtpSubmit}
          onCancel={handleCancel}
          onBack={() => navigate('/app/jobs')}
        />
        {overlays}
      </>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      <AppStackScreenHeader title="Active Job" backTo="/app" />

      {/* Status Header */}
      <GlassPanel className={`border-brand/20 px-4 py-4 text-center ${isCompleted ? 'bg-emerald-50' : isCancelled ? 'bg-rose-50' : 'bg-brand/5'}`}>
        {isCompleted ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        ) : isCancelled ? (
          <X className="mx-auto h-12 w-12 text-rose-500" />
        ) : null}
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500">Status</p>
        <p className="text-xl font-extrabold text-slate-900">{status.replace('_', ' ')}</p>
      </GlassPanel>

      {/* Progress Steps */}
      <GlassPanel className="p-4">
        <div className="flex items-center justify-between">
          {STEP_ORDER.map((step, i) => {
            const done = i <= stepIndex
            return (
              <div key={step} className="flex items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-brand text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                {i < STEP_ORDER.length - 1 && (
                  <div className={`mx-1 h-0.5 w-6 sm:w-10 ${i < stepIndex ? 'bg-brand' : 'bg-slate-200'}`} />
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-500">
          <span>Accepted</span>
          <span>On Way</span>
          <span>Working</span>
          <span>Done</span>
        </div>
      </GlassPanel>

      {/* Customer Info */}
      {customer && (
        <GlassPanel className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-extrabold text-slate-900">{customer.fullName || customer.name || 'Customer'}</p>
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand">
                Call
              </a>
            )}
          </div>
        </GlassPanel>
      )}

      {/* Booking Details */}
      <GlassPanel className="p-4 text-sm">
        {booking.totalAmount && (
          <div className="flex justify-between">
            <span className="text-slate-500">Amount</span>
            <span className="font-bold text-slate-900">₹{booking.totalAmount}</span>
          </div>
        )}
        {booking.paymentMethod && (
          <div className="mt-2 flex justify-between">
            <span className="text-slate-500">Payment</span>
            <span className="font-bold text-slate-900">{booking.paymentMethod}</span>
          </div>
        )}
      </GlassPanel>

      {/* Error */}
      {updateError && (
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {updateError}
        </motion.p>
      )}

      {/* Action Button */}
      {config && !isCompleted && !isCancelled && (
        <div className="space-y-3">
          {isTooEarly ? (
            <GlassPanel className="p-4 text-center">
              <Clock className="mx-auto h-8 w-8 text-amber-500 mb-2" />
              <p className="text-sm font-bold text-slate-800">Scheduled for later</p>
              <p className="text-xs text-slate-500 mt-1">
                You can start your journey 30 minutes before the scheduled time.
              </p>
            </GlassPanel>
          ) : (
            <>
              {isMultiDay && (isDailyStartRequired || isDailyEndRequired) ? (
                <GlassPanel className={`space-y-4 ${isDailyStartRequired ? 'border-brand/20 bg-brand/5' : 'border-emerald-500/20 bg-emerald-50'} p-4 text-left`}>
                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-2">1. Upload {isDailyStartRequired ? 'Before Work' : 'After Work'} Image</p>
                    {jobImage ? (
                      <div className="relative h-40 w-full overflow-hidden rounded-xl border border-slate-200">
                        <img src={jobImage} alt="Work" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setJobImage(null)}
                          className="absolute right-2 top-2 rounded-full bg-slate-900/50 p-1.5 text-white backdrop-blur-sm"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className={`flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white/50 text-slate-500 transition hover:border-${isDailyStartRequired ? 'brand' : 'emerald-500'} hover:bg-${isDailyStartRequired ? 'brand' : 'emerald-500'}/5 hover:text-${isDailyStartRequired ? 'brand' : 'emerald-500'}`}>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                        {uploadingImage ? (
                          <Loader2 className={`h-6 w-6 animate-spin text-${isDailyStartRequired ? 'brand' : 'emerald-500'}`} />
                        ) : (
                          <>
                            <Camera className="h-6 w-6" />
                            <span className="text-sm font-semibold">Tap to capture</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-2">2. Ask customer for Day {currentDayLog.dayNumber} {isDailyStartRequired ? 'Start' : 'End'} OTP</p>
                    <input
                      type="text"
                      placeholder="Enter 4-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className={`w-full rounded-xl border border-slate-200 p-3 text-lg font-bold tracking-widest text-center outline-hidden focus:border-${isDailyStartRequired ? 'brand' : 'emerald-500'} focus:ring-1 focus:ring-${isDailyStartRequired ? 'brand' : 'emerald-500'}`}
                      maxLength={4}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={updating || otp.length < 4 || !jobImage || uploadingImage}
                    onClick={() => handleDailyOtpSubmit(isDailyStartRequired ? 'start' : 'end', currentDayLog.dayNumber, true)}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50 bg-${isDailyStartRequired ? 'brand' : 'emerald-500'}`}
                  >
                    {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : `${isDailyStartRequired ? 'Start Shift' : 'End Shift'}`}
                  </button>
                </GlassPanel>
              ) : status === 'EN_ROUTE' && !isMultiDay ? (
                <GlassPanel className="space-y-4 border-brand/20 bg-brand/5 p-4 text-left">
                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-2">1. Upload Before Work Image</p>
                    {jobImage ? (
                      <div className="relative h-40 w-full overflow-hidden rounded-xl border border-slate-200">
                        <img src={jobImage} alt="Before work" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setJobImage(null)}
                          className="absolute right-2 top-2 rounded-full bg-slate-900/50 p-1.5 text-white backdrop-blur-sm"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white/50 text-slate-500 transition hover:border-brand hover:bg-brand/5 hover:text-brand">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                        {uploadingImage ? (
                          <Loader2 className="h-6 w-6 animate-spin text-brand" />
                        ) : (
                          <>
                            <Camera className="h-6 w-6" />
                            <span className="text-sm font-semibold">Tap to capture</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-2">2. Ask customer for Start OTP</p>
                    <input
                      type="text"
                      placeholder="Enter 4-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 text-lg font-bold tracking-widest text-center outline-hidden focus:border-brand focus:ring-1 focus:ring-brand"
                      maxLength={4}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={updating || otp.length < 4 || !jobImage || uploadingImage}
                    onClick={() => handleStatusUpdate(config.next, true)}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50 ${config.color}`}
                  >
                    {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Start Job'}
                  </button>
                </GlassPanel>
              ) : status === 'STARTED' && !isMultiDay ? (
                <GlassPanel className="space-y-4 border-emerald-500/20 bg-emerald-50 p-4 text-left">
                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-2">1. Upload After Work Image</p>
                    {jobImage ? (
                      <div className="relative h-40 w-full overflow-hidden rounded-xl border border-slate-200">
                        <img src={jobImage} alt="After work" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setJobImage(null)}
                          className="absolute right-2 top-2 rounded-full bg-slate-900/50 p-1.5 text-white backdrop-blur-sm"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white/50 text-slate-500 transition hover:border-emerald-500 hover:bg-emerald-500/5 hover:text-emerald-500">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                        {uploadingImage ? (
                          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                        ) : (
                          <>
                            <Camera className="h-6 w-6" />
                            <span className="text-sm font-semibold">Tap to capture</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-2">2. Ask customer for Completion OTP</p>
                    <input
                      type="text"
                      placeholder="Enter 4-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 text-lg font-bold tracking-widest text-center outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      maxLength={4}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={updating || otp.length < 4 || !jobImage || uploadingImage}
                    onClick={() => handleStatusUpdate(config.next, true)}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50 ${config.color}`}
                  >
                    {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Complete Job'}
                  </button>
                </GlassPanel>
              ) : (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusUpdate(config.next, false)}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-extrabold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50 ${config.color}`}
                >
                  {updating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <config.icon className="h-5 w-5" />
                      {config.label}
                    </>
                  )}
                </button>
              )}

              {status === 'ACCEPTED' && (
                <button
                  type="button"
                  disabled={updating}
                  onClick={handleCancel}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-extrabold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 active:scale-[0.98] disabled:opacity-50"
                >
                  Cancel Booking
                </button>
              )}
            </>
          )}
        </div>
      )}

      {overlays}
    </div>
  )
}
