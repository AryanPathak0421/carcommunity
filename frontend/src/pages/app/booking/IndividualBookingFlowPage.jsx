import { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ImagePlus,
  IndianRupee,
  MapPin,
  MapPinned,
  MessageCircle,
  Navigation,
  Phone,
  Star,
  Zap,
  Loader2,
} from 'lucide-react'
import { AppStackScreenHeader } from '../../../components/app/AppStackScreenHeader.jsx'
import { AppButton } from '../../../components/app-ui/buttons/AppButton.jsx'
import { AppTextInput } from '../../../components/app-ui/inputs/AppTextInput.jsx'
import { GlassPanel } from '../../../components/ui/GlassPanel.jsx'
import { fetchLabourCategoriesGrouped } from '../../../api/labourCategoriesApi.js'
import { bookingsApi } from '../../../api/bookingsApi.js'
import { LiveTrackingScreen } from '../../../components/app/tracking/LiveTrackingScreen.jsx'
import { getPublicSettings } from '../../../api/adminSettingsApi.js'
import { userSubscriptionApi } from '../../../api/userSubscriptionApi.js'
import { uploadMedia, assetUrlFromUpload } from '../../../api/uploadApi.js'
import { BookingFindingScreen } from '../../../components/app/booking/BookingFindingScreen.jsx'
import { BookingTypeSheet } from '../../../components/app/booking/BookingTypeSheet.jsx'
import { BookingStepProgress } from '../../../components/app/booking/BookingStepProgress.jsx'
import { BookingServiceHighlight } from '../../../components/app/booking/BookingServiceHighlight.jsx'
import { BookingReviewModal } from '../../../components/app/booking/BookingReviewModal.jsx'
import { SavedAddressPicker } from '../../../components/app/SavedAddressPicker.jsx'
import { useBookingSocket } from '../../../hooks/useBookingSocket.js'
import { useAuth } from '../../../hooks/useAuth.js'
import { paymentsApi } from '../../../api/paymentsApi.js'
import {
  PAYMENT_METHODS,
  durationKindLabel,
  durationKindToDays,
  formatInr,
  todayISODate,
  maxISODate,
} from '../../../lib/individualBookings.js'
import {
  clearBookingDraft,
  patchBookingDraft,
  readBookingDraft,
  writeBookingDraft,
} from '../../../lib/individualBookingDraft.js'
import { writeAppUserLocation } from '../../../lib/appUserLocationStorage.js'
import {
  APP_HOME_LOCATION,
  BOOKING_FLOW_PATH,
  buildBookingFlowPath,
} from '../../../lib/bookingFlowNavigation.js'

const TIME_SLOTS = ['9:00 AM – 12:00 PM', '12:00 PM – 3:00 PM', '3:00 PM – 6:00 PM', '6:00 PM – 9:00 PM']

function FieldLabel({ children, optional, htmlFor }) {
  const Tag = htmlFor ? 'label' : 'div'
  return (
    <Tag className="lc-booking-flow-label" htmlFor={htmlFor}>
      {children}
      {optional ? <span className="lc-booking-flow-muted font-normal"> (optional)</span> : null}
    </Tag>
  )
}

function BookingPrimaryButton({ children, className = '', ...rest }) {
  return (
    <button type="button" className={`lc-booking-btn-primary ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function IndividualBookingFlowPage() {
  const navigate = useNavigate()
  const { realUser } = useAuth()
  const location = useLocation()
  const reduce = useReducedMotion()
  const [searchParams] = useSearchParams()
  const step = searchParams.get('step') || 'type'

  const categoryIdParam = searchParams.get('categoryId')?.trim() || ''
  const groupIdParam = searchParams.get('groupId')?.trim() || ''

  const [draft, setDraft] = useState(() => readBookingDraft() || {})
  const [formError, setFormError] = useState('')
  const [typeSheetOpen, setTypeSheetOpen] = useState(false)
  const [activeBookingId, setActiveBookingId] = useState(() => readBookingDraft()?.lastRef || null)
  const [activeBooking, setActiveBooking] = useState(null)
  const [noMatch, setNoMatch] = useState(false)
  const [imageFiles, setImageFiles] = useState([])

  const [calculatedBill, setCalculatedBill] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false)

  const [timeSlots, setTimeSlots] = useState([])
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(true)

  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [forceInput, setForceInput] = useState(false)
  const [addressPickerOpen, setAddressPickerOpen] = useState(false)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerInstance = useRef(null)

  const [activeSubscription, setActiveSubscription] = useState(null)
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false)
  const [subscriptionModalMsg, setSubscriptionModalMsg] = useState('')

  const { bookingEvent } = useBookingSocket(activeBookingId)

  const syncDraft = useCallback((patch) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch }
      writeBookingDraft(next)
      return next
    })
  }, [])

  const flowQuery = useCallback(
    () => ({
      categoryId: draft.categoryId || categoryIdParam,
      groupId: draft.groupId || groupIdParam,
    }),
    [categoryIdParam, draft.categoryId, draft.groupId, groupIdParam],
  )

  const goStep = useCallback(
    (nextStep) => {
      navigate(buildBookingFlowPath(nextStep, flowQuery()), { replace: true })
    },
    [flowQuery, navigate],
  )

  const leaveFlow = useCallback(() => {
    navigate(APP_HOME_LOCATION, { replace: true })
  }, [navigate])

  useEffect(() => {
    const stored = readBookingDraft()
    if (stored) queueMicrotask(() => setDraft(stored))
  }, [])

  useEffect(() => {
    if (!autocompleteRef.current) return
    // Current Places UI Kit fires `gmp-select` with a placePrediction; the older preview fired
    // `gmp-placeselect` with a place. Handle both so choosing a suggestion always saves the location.
    const handleSelect = async (e) => {
      try {
        const place = e.placePrediction?.toPlace?.() || e.place
        if (!place) return
        await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] })
        if (place.location) {
          syncDraft({
            lat: place.location.lat(),
            lng: place.location.lng(),
            address: place.formattedAddress || place.displayName || '',
          })
          setForceInput(true)
        }
      } catch (err) {
        console.error('[booking] could not read the selected place:', err)
      }
    }
    const current = autocompleteRef.current
    current.addEventListener('gmp-select', handleSelect)
    current.addEventListener('gmp-placeselect', handleSelect)
    return () => {
      current.removeEventListener('gmp-select', handleSelect)
      current.removeEventListener('gmp-placeselect', handleSelect)
    }
  }, [mapsLoaded, syncDraft])

  useEffect(() => {
    if (draft.address) setForceInput(true)
  }, [draft.address])

  useEffect(() => {
    if (!categoryIdParam && !groupIdParam) return
    const patch = {}
    if (categoryIdParam) patch.categoryId = categoryIdParam
    if (groupIdParam) patch.groupId = groupIdParam
    syncDraft(patch)
  }, [categoryIdParam, groupIdParam, syncDraft])

  useEffect(() => {
    if (activeBookingId && !activeBooking && realUser) {
      bookingsApi.getBookingStatus(activeBookingId).then(res => {
        if (res.data?.booking) setActiveBooking(res.data.booking)
      }).catch(err => console.error(err))
    }
  }, [activeBookingId, activeBooking, realUser])

  useEffect(() => {
    let cancelled = false
    if (!realUser) return
    userSubscriptionApi.getMySubscription()
      .then((res) => {
        if (!cancelled && res?.data?.subscription) {
          setActiveSubscription(res.data.subscription)
        }
      })
      .catch((err) => console.error('Failed to load active subscription', err))
    return () => { cancelled = true }
  }, [realUser])

  useEffect(() => {
    if (!bookingEvent) return
    if (bookingEvent.type === 'BOOKING_ACCEPTED') {
      goStep('active')
      if (realUser) {
        bookingsApi.getBookingStatus(activeBookingId).then(res => {
          if (res.data?.booking) setActiveBooking(res.data.booking)
        }).catch(err => console.error(err))
      }
    } else if (bookingEvent.type === 'BOOKING_FAILED') {
      setNoMatch(true)
    } else if (bookingEvent.type === 'BOOKING_STATUS_UPDATE') {
      const newStatus = bookingEvent.data?.status
      setActiveBooking(prev => prev ? { ...prev, status: newStatus } : null)
      if (newStatus === 'COMPLETED') {
        // Refresh booking details then show payment step
        if (realUser) {
          bookingsApi.getBookingStatus(activeBookingId).then(res => {
            if (res.data?.booking) setActiveBooking(res.data.booking)
          }).catch(() => { })
        }
        goStep('payment')
      }
    }
  }, [bookingEvent, activeBookingId, goStep, realUser])

  useEffect(() => {
    const cid = categoryIdParam
    const gid = groupIdParam
    if (!cid) return

    const current = readBookingDraft()
    if (current?.categoryName && (!gid || current?.groupName)) return

    let cancelled = false
    fetchLabourCategoriesGrouped()
      .then((res) => {
        if (cancelled) return
        const groups = res.data?.groups ?? []
        for (const g of groups) {
          if (gid && String(g._id) !== gid) continue
          const cat = (g.categories || []).find((c) => String(c._id) === String(cid))
          if (cat) {
            const subcat = cat.subcategories?.[0]
            const srv = subcat?.services?.[0]
            syncDraft({
              categoryId: String(cat._id),
              serviceId: srv ? String(srv._id) : String(cat._id),
              categoryName: cat.name || '',
              groupId: String(g._id),
              groupName: g.name || '',
            })
            return
          }
        }
      })
      .catch(() => { })

    return () => {
      cancelled = true
    }
  }, [categoryIdParam, groupIdParam, syncDraft])

  useEffect(() => {
    if (location.pathname !== BOOKING_FLOW_PATH) return
    // A live booking can be resumed (refresh / reopened app) without a category in the URL.
    if (step === 'active' && draft.lastRef) return
    if (!draft.categoryId && !categoryIdParam) {
      // If they somehow enter without a category, they need to pick one.
      navigate('/app/search', { replace: true })
    }
  }, [categoryIdParam, draft.categoryId, draft.lastRef, step, navigate, location.pathname])

  useEffect(() => {
    if (location.pathname !== BOOKING_FLOW_PATH) return
    if (step !== 'type' || !draft.bookingType) return
    if (draft.entryPoint !== 'category') return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      goStep('details')
    })
    return () => {
      cancelled = true
    }
  }, [draft.bookingType, draft.entryPoint, goStep, location.pathname, step])

  useEffect(() => {
    let cancelled = false
    getPublicSettings()
      .then((res) => {
        if (!cancelled) {
          const slots = res.data?.timeSlots
          if (Array.isArray(slots) && slots.length > 0) {
            setTimeSlots(slots)
          } else {
            setTimeSlots(['08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM'])
          }
          setTimeSlotsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTimeSlots(['08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM'])
          setTimeSlotsLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  const filteredTimeSlots = useMemo(() => {
    if (!draft.serviceDate) return timeSlots
    const now = new Date()
    const selectedDate = new Date(draft.serviceDate)
    const isToday = selectedDate.toDateString() === now.toDateString()
    if (!isToday) return timeSlots

    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    return timeSlots.filter(slot => {
      const match = slot.match(/(\d+):(\d+) (AM|PM)/)
      if (!match) return true
      let [, h, m, ampm] = match
      h = parseInt(h, 10)
      m = parseInt(m, 10)
      if (ampm === 'PM' && h < 12) h += 12
      if (ampm === 'AM' && h === 12) h = 0

      const slotMinutes = h * 60 + m
      return slotMinutes > currentMinutes + 30
    })
  }, [draft.serviceDate, timeSlots])

  useEffect(() => {
    if (step !== 'details') return
    if (window.google?.maps?.places && window.google?.maps?.Map) {
      initMaps()
      return
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) return

    if (!document.querySelector('#google-maps-script')) {
      const script = document.createElement('script')
      script.id = 'google-maps-script'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.onload = initMaps
      document.head.appendChild(script)
    } else {
      const script = document.querySelector('#google-maps-script')
      script.addEventListener('load', initMaps)
    }

    function initMaps() {
      setMapsLoaded(true)

      if (mapRef.current && !mapInstance.current) {
        const currentPos = {
          lat: draft.lat || 28.7041,
          lng: draft.lng || 77.1025
        }

        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          center: currentPos,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
        })

        markerInstance.current = new window.google.maps.Marker({
          position: currentPos,
          map: mapInstance.current,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
        })

        markerInstance.current.addListener('dragend', () => {
          const pos = markerInstance.current.getPosition()
          const lat = pos.lat()
          const lng = pos.lng()

          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ location: pos }, (results, status) => {
            if (status === 'OK' && results[0]) {
              syncDraft({ lat, lng, address: results[0].formatted_address })
            } else {
              syncDraft({ lat, lng })
            }
          })
        })
      }
    }
  }, [step, syncDraft])

  useEffect(() => {
    if (step === 'summary' && !calculatedBill) {
      if (!draft.categoryId && !draft.serviceId) {
        goStep('type')
        return
      }
      let cancelled = false
      setIsCalculating(true)
      const days = durationKindToDays(draft.durationKind, draft.durationDays)
      bookingsApi.calculateBill({
        serviceId: draft.serviceId || draft.categoryId,
        durationDays: days
      }).then(res => {
        if (!cancelled) {
          setCalculatedBill(res.data)
          syncDraft({ billAmount: res.data.totalAmount })
        }
      }).catch(err => {
        if (!cancelled) {
          setFormError(err.message || 'Failed to calculate bill.')
          goStep('details')
        }
      }).finally(() => {
        if (!cancelled) setIsCalculating(false)
      })
      return () => { cancelled = true }
    }
  }, [step, calculatedBill, draft.categoryId, draft.serviceId, draft.durationKind, draft.durationDays, goStep])

  useEffect(() => {
    if (mapInstance.current && markerInstance.current && draft.lat && draft.lng) {
      const pos = { lat: draft.lat, lng: draft.lng }
      mapInstance.current.panTo(pos)
      markerInstance.current.setPosition(pos)
    }
  }, [draft.lat, draft.lng])

  const pickLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        if (window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results[0]) {
              syncDraft({ lat, lng, address: results[0].formatted_address })
              setForceInput(true)
            } else {
              syncDraft({ lat, lng })
            }
          })
        } else {
          syncDraft({ lat, lng })
        }
      },
      () => { },
      { enableHighAccuracy: false, timeout: 10_000 },
    )
  }

  const applySavedAddress = (picked) => {
    syncDraft({ address: picked.address, lat: picked.lat ?? draft.lat, lng: picked.lng ?? draft.lng })
    setForceInput(true)
    setFormError('')
  }

  const validateDetails = () => {
    if (!draft.address?.trim()) {
      setFormError('Add your work location to continue.')
      return false
    }

    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const currentIstStr = `${hh}:${mm}`

    if (draft.bookingType === 'scheduled') {
      if (!draft.serviceDate) {
        setFormError('Choose a date for scheduled booking.')
        return false
      }
      if (draft.serviceDate < todayISODate()) {
        setFormError('Date cannot be in the past.')
        return false
      }
      if (!draft.timeSlot) {
        setFormError('Pick a start time.')
        return false
      }
      if (draft.durationKind !== 'multi_day' && !draft.endTime) {
        setFormError('Pick an end time.')
        return false
      }
      if (draft.serviceDate === todayISODate() && draft.timeSlot < currentIstStr) {
        setFormError('Start time cannot be in the past.')
        return false
      }
      if (draft.durationKind !== 'multi_day' && draft.timeSlot >= draft.endTime) {
        setFormError('End time must be after start time.')
        return false
      }
    }
    setFormError('')
    return true
  }

  const handleReviewBooking = async () => {
    if (!validateDetails()) return
    setIsCalculating(true)
    try {
      const days = durationKindToDays(draft.durationKind, draft.durationDays)
      const res = await bookingsApi.calculateBill({
        serviceId: draft.serviceId || draft.categoryId, // Fallback
        durationDays: days
      })
      setCalculatedBill(res.data)
      syncDraft({ billAmount: res.data.totalAmount })
      goStep('summary')
    } catch (err) {
      setFormError(err.message || 'Failed to calculate bill.')
    } finally {
      setIsCalculating(false)
    }
  }

  const confirmBooking = async () => {
    if (!validateDetails()) return
    if (!realUser) {
      navigate('/b2c/auth', { replace: true, state: { from: location.pathname + location.search } })
      return
    }
    writeAppUserLocation({ address: draft.address.trim(), lat: draft.lat, lng: draft.lng })

    try {
      const uploadedImageUrls = []
      for (const file of imageFiles) {
        const res = await uploadMedia(file, 'job-posters')
        const url = assetUrlFromUpload(res)
        if (url) uploadedImageUrls.push(url)
      }

      const days = durationKindToDays(draft.durationKind, draft.durationDays)
      const payload = {
        serviceId: draft.serviceId || draft.categoryId,
        type: draft.bookingType === 'scheduled' ? 'SCHEDULED' : 'INSTANT',
        locationText: draft.address.trim(),
        lat: draft.lat || 28.6139,
        lng: draft.lng || 77.2090,
        paymentMethod: draft.paymentMethod || 'CASH',
        notes: draft.notes,
        durationKind: draft.durationKind,
        durationDays: days,
        timeSlot: draft.timeSlot,
        endTime: draft.endTime,
        scheduledAt: draft.serviceDate,
        imageNames: uploadedImageUrls,
      }

      const res = await bookingsApi.createBooking(payload)
      const createdBooking = res.data.booking
      setActiveBookingId(createdBooking._id)
      patchBookingDraft({ lastRef: createdBooking._id })
      setNoMatch(false)
      goStep(draft.bookingType === 'scheduled' ? 'scheduled_success' : 'searching')
    } catch (err) {
      console.error(err)
      if (err.message && err.message.includes('subscription plan')) {
        setSubscriptionModalMsg(err.message)
        setSubscriptionModalOpen(true)
      } else {
        alert(err.message || 'Failed to create booking')
      }
    } finally {
      setIsCreating(false)
    }
  }

  const wizardIndex = step === 'type' ? 0 : step === 'details' ? 1 : step === 'summary' ? 2 : 3

  if (step === 'scheduled_success') {
    return (
      <div className="space-y-4 pb-8">
        <AppStackScreenHeader title="Booking confirmed" onBack={() => navigate('/app/my-bookings')} />
        <GlassPanel className="p-6 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" aria-hidden />
          <p className="mt-4 text-lg font-black text-slate-900">Your job is scheduled!</p>
          <p className="mt-2 text-sm font-medium text-slate-600">
            We have confirmed your requirement. A mechanic will be assigned to you before your scheduled time.
          </p>
          <div className="mt-4 text-left rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-semibold">Date</span>
              <span className="text-slate-900 font-bold">{new Date(draft.serviceDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-semibold">Time slot</span>
              <span className="text-slate-900 font-bold">{draft.timeSlot} - {draft.endTime}</span>
            </div>
          </div>
          <motion.div className="mt-6 flex flex-col gap-2">
            <BookingPrimaryButton type="button" onClick={() => { window.scrollTo(0, 0); clearBookingDraft(); navigate('/app/my-bookings', { replace: true }) }}>
              View my bookings
            </BookingPrimaryButton>
            <AppButton type="button" variant="secondary" onClick={() => { window.scrollTo(0, 0); clearBookingDraft(); navigate('/app', { replace: true }) }}>
              Back to home
            </AppButton>
          </motion.div>
        </GlassPanel>
      </div>
    )
  }

  if (step === 'searching' && !noMatch) {
    return (
      <div className="pb-8">
        <AppStackScreenHeader title="Matching mechanic" onBack={() => goStep('summary')} />
        <BookingServiceHighlight categoryName={draft.categoryName} groupName={draft.groupName} />

        <div className="px-4 mt-6">
          <div className="lc-booking-flow-card">
            <p className="lc-booking-flow-label mb-2">Booking Details</p>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Date</span>
                <span className="font-medium text-slate-900">{draft.bookingType === 'scheduled' ? new Date(draft.serviceDate).toLocaleDateString() : 'ASAP'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Time</span>
                <span className="font-medium text-slate-900">{draft.bookingType === 'scheduled' ? draft.timeSlot : 'Earliest available'}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-slate-500">Location</span>
                <span className="line-clamp-2 mt-0.5 text-slate-900 font-medium">{draft.address}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900 mt-2">
                <span>Total Bill</span>
                <span>₹{draft.billAmount?.toLocaleString('en-IN') || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <BookingFindingScreen
          categoryLabel={draft.categoryName}
          onComplete={() => { }}
          onNoMatch={() => { }}
        />
      </div>
    )
  }

  if (noMatch) {
    return (
      <div className="space-y-4 pb-8">
        <AppStackScreenHeader title="No match" onBack={() => { window.scrollTo(0, 0); navigate('/app') }} />
        <GlassPanel className="p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500" aria-hidden />
          <p className="mt-3 text-sm font-bold text-slate-900">Mechanics are currently not available</p>
          <p className="mt-2 text-xs text-slate-600">Please try searching again in a few minutes.</p>
          <motion.div className="mt-5 flex flex-col gap-2">
            <BookingPrimaryButton type="button" onClick={() => { setNoMatch(false); confirmBooking() }}>
              Retry search
            </BookingPrimaryButton>
            <AppButton type="button" variant="secondary" onClick={() => { window.scrollTo(0, 0); navigate('/app') }}>
              Cancel
            </AppButton>
          </motion.div>
        </GlassPanel>
      </div>
    )
  }

  // Mechanic assigned and the job is live: Rapido-style tracking screen (map + ETA + mechanic sheet).
  if (
    step === 'active' &&
    activeBookingId &&
    (!activeBooking || ['ACCEPTED', 'ASSIGNED', 'EN_ROUTE', 'STARTED'].includes(activeBooking.status))
  ) {
    return (
      <LiveTrackingScreen
        bookingId={activeBookingId}
        onBack={() => navigate('/app/my-bookings', { replace: true })}
        onCancelled={() => navigate('/app/my-bookings', { replace: true })}
      />
    )
  }

  if (step === 'active' || step === 'payment') {
    const booking = activeBooking
    const worker = booking?.laborId
    const statusSequence = ['CREATED', 'BROADCASTING', 'ACCEPTED', 'EN_ROUTE', 'STARTED', 'COMPLETED']
    const timelineIdx = booking ? statusSequence.indexOf(booking.status) - 2 : 0

    return (
      <div className="space-y-4 pb-8">
        <AppStackScreenHeader
          title={step === 'payment' ? 'Payment' : 'Mechanic on the way'}
          onBack={() => (step === 'payment' ? goStep('active') : navigate('/app/my-bookings', { replace: true }))}
        />
        <BookingServiceHighlight categoryName={draft.categoryName} groupName={draft.groupName} />

        {worker ? (
          <GlassPanel className="overflow-hidden border-slate-200/90 p-0">
            <motion.div className="flex gap-4 p-4">
              <img
                src={worker.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.fullName || 'W')}`}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white"
              />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-black text-slate-900">{worker.fullName || 'Unknown'}</p>
                <p className="text-xs font-semibold text-brand">{worker.phone}</p>
                <p className="mt-1 text-[11px] text-slate-500">{draft.categoryName}</p>
              </div>
            </motion.div>
            <div className="grid grid-cols-1 gap-2 border-t border-slate-100 bg-slate-50/80 p-3">
              <a
                href={`tel:${worker.phone}`}
                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white py-2.5 text-[10px] font-bold text-slate-800 ring-1 ring-slate-200/90"
              >
                <Phone className="h-4 w-4 text-brand" aria-hidden />
                Call
              </a>
            </div>
          </GlassPanel>
        ) : null}

        <div className="lc-booking-flow-card">
          <p className="lc-booking-flow-label">Status</p>
          <ol className="mt-3 space-y-2">
            {[
              { id: 'accepted', label: 'Accepted' },
              { id: 'en_route', label: 'En Route' },
              { id: 'started', label: 'Job Started' },
              { id: 'completed', label: 'Completed' },
            ].map((t, i) => {
              const done = i <= Math.max(0, timelineIdx)
              return (
                <li key={t.id} className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${done ? 'bg-brand text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={`text-sm font-semibold ${done ? 'text-black' : 'text-black/40'}`}>{t.label}</span>
                </li>
              )
            })}
          </ol>
        </div>

        {booking && (
          <div className="space-y-4">
            <div className="lc-booking-flow-card">
              <p className="lc-booking-flow-label mb-2">Booking Details</p>
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
                  <span className="line-clamp-2 mt-0.5 text-slate-900 font-medium">{booking.address?.locationText}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900 mt-2">
                  <span>Total Bill</span>
                  <span>₹{booking.totalAmount?.toLocaleString('en-IN') || 0}</span>
                </div>
              </div>
            </div>

            <div className="lc-booking-flow-card">
              <p className="lc-booking-flow-label mb-2">Security OTPs</p>
              <div className="flex gap-4">
                <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                  <p className="text-[10px] text-slate-500 font-semibold">Start OTP</p>
                  <p className="text-xl font-black text-slate-800 tracking-widest">{booking.startOtp}</p>
                </div>
                <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                  <p className="text-[10px] text-slate-500 font-semibold">Completion OTP</p>
                  <p className="text-xl font-black text-slate-800 tracking-widest">{booking.completionOtp}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'payment' ? (
          <motion.div className="space-y-4">
            <FieldLabel>Select Payment Method</FieldLabel>
            <motion.div className="grid grid-cols-2 gap-2">
              {[
                { id: 'CASH', label: 'Cash' },
                { id: 'ONLINE', label: 'Online' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => syncDraft({ paymentMethod: m.id })}
                  className="lc-booking-slot"
                  data-active={draft.paymentMethod === m.id ? 'true' : 'false'}
                >
                  {m.label}
                </button>
              ))}
            </motion.div>
            <div className="lc-booking-flow-card text-sm lc-booking-flow-body">
              <div className="flex justify-between font-semibold">
                <span>Subtotal</span>
                <span>{formatInr(booking?.basePrice || 0)}</span>
              </div>
              <div className="mt-1 flex justify-between lc-booking-flow-muted">
                <span>Platform fee</span>
                <span>{formatInr(booking?.platformFee || 0)}</span>
              </div>
              <div className="mt-1 flex justify-between lc-booking-flow-muted">
                <span>Taxes (GST)</span>
                <span>{formatInr(booking?.taxes || 0)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-black">
                <span>Total</span>
                <span>{formatInr(booking?.totalAmount || 0)}</span>
              </div>
            </div>
            <BookingPrimaryButton
              type="button"
              disabled={paymentProcessing}
              onClick={async () => {
                if (draft.paymentMethod === 'ONLINE') {
                  setPaymentProcessing(true)
                  try {
                    // Update to ONLINE just in case
                    if (activeBooking?.paymentMethod !== 'ONLINE') {
                      await bookingsApi.updatePaymentMethod(activeBookingId, 'ONLINE')
                    }

                    // load Razorpay
                    let rzpLoaded = window.Razorpay
                    if (!rzpLoaded) {
                      rzpLoaded = await new Promise((resolve) => {
                        const script = document.createElement('script')
                        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
                        script.onload = () => resolve(true)
                        script.onerror = () => resolve(false)
                        document.body.appendChild(script)
                      })
                    }
                    if (!rzpLoaded) {
                      alert('Razorpay SDK failed to load. Are you online?')
                      setPaymentProcessing(false)
                      return
                    }

                    const orderRes = await paymentsApi.initPayment({
                      amount: activeBooking?.totalAmount || booking?.totalAmount || 0,
                      purpose: 'BOOKING',
                      bookingId: activeBookingId,
                    })
                    const { order } = orderRes.data

                    const options = {
                      key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TYe1C0k011xHMB',
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
                          // Success!
                          setActiveBooking(prev => prev ? { ...prev, paymentStatus: 'PAID' } : prev)
                          setShowPaymentSuccessModal(true)
                        } catch (err) {
                          alert('Payment verification failed')
                        }
                      },
                      prefill: {
                        name: realUser?.fullName || '',
                        contact: realUser?.phone || '',
                        email: realUser?.email || ''
                      },
                      theme: { color: '#f97316' }
                    }

                    const rzp = new window.Razorpay(options)
                    rzp.on('payment.failed', function (response) {
                      alert(response.error.description || 'Payment failed')
                    })
                    rzp.open()

                  } catch (e) {
                    console.error('Payment Error:', e)
                    alert(e?.response?.data?.message || 'Failed to initiate checkout')
                  } finally {
                    setPaymentProcessing(false)
                  }
                } else {
                  if (activeBookingId) {
                    try {
                      await bookingsApi.updatePaymentMethod(activeBookingId, 'CASH')
                    } catch (e) {
                      console.error('Failed to update payment method:', e)
                    }
                  }
                  clearBookingDraft()
                  setReviewOpen(true)
                }
              }}
            >
              {paymentProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
              {draft.paymentMethod === 'ONLINE' ? 'Proceed to payment' : 'Confirm payment'}
            </BookingPrimaryButton>
          </motion.div>
        ) : (
          <div className="sticky bottom-2 z-10 space-y-2 pt-2">
            {activeBooking?.status === 'COMPLETED' ? (
              <BookingPrimaryButton type="button" onClick={() => setReviewOpen(true)}>
                <Star className="h-4 w-4" aria-hidden />
                Rate your experience
              </BookingPrimaryButton>
            ) : null}
            <BookingPrimaryButton type="button" onClick={() => goStep('payment')}>
              <IndianRupee className="h-4 w-4" aria-hidden />
              Proceed to payment
            </BookingPrimaryButton>
          </div>
        )}

        <BookingReviewModal
          open={reviewOpen}
          bookingId={activeBookingId}
          workerName={activeBooking?.laborId?.fullName || activeBooking?.laborId?.name || ''}
          onClose={() => {
            setReviewOpen(false)
            clearBookingDraft()
            window.location.href = '/app'
          }}
          onSubmitted={() => {
            setReviewOpen(false)
            clearBookingDraft()
            window.location.href = '/app'
          }}
        />

        <AnimatePresence>
          {showPaymentSuccessModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
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
                    clearBookingDraft()
                    setReviewOpen(true)
                  }}
                  className="relative z-10 mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-active active:scale-95"
                >
                  Continue to Review
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const flowTitle =
    step === 'type' ? 'Booking type' : step === 'details' ? 'Job details' : step === 'summary' ? 'Billing' : 'Review & confirm'

  return (
    <div className="-mx-4 space-y-4 bg-white pb-8">
      <AppStackScreenHeader
        title={flowTitle}
        onBack={() => {
          if (step === 'type') leaveFlow()
          else if (step === 'details') {
            if (draft.entryPoint === 'category') navigate(-1)
            else goStep('type')
          }
          else goStep('details')
        }}
      />

      <div className="space-y-4 px-4">
        <BookingServiceHighlight categoryName={draft.categoryName} groupName={draft.groupName} />

        {step !== 'searching' ? (
          <div className="lc-booking-flow-card py-3">
            <BookingStepProgress step={wizardIndex} total={3} />
          </div>
        ) : null}

        {step === 'type' ? (
          <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <button
              type="button"
              onClick={() => setTypeSheetOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-sm"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                {draft.bookingType === 'scheduled' ? (
                  <Calendar className="h-5 w-5" aria-hidden />
                ) : (
                  <Zap className="h-5 w-5" aria-hidden />
                )}
              </span>
              <span className="flex-1">
                <p className="text-sm font-bold text-black">
                  {draft.bookingType === 'scheduled' ? 'Schedule booking' : draft.bookingType === 'instant' ? 'Instant booking' : 'Choose booking type'}
                </p>
                <p className="text-xs text-black/55">Tap to change</p>
              </span>
              <ArrowRight className="h-5 w-5 text-slate-300" aria-hidden />
            </button>
            <BookingPrimaryButton type="button" disabled={!draft.bookingType} onClick={() => goStep('details')}>
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden />
            </BookingPrimaryButton>
          </motion.div>
        ) : null}

        {step === 'details' ? (
          <motion.div className="space-y-4">
            <div>
              <FieldLabel htmlFor="work-location">Work location</FieldLabel>
              {!mapsLoaded ? (
                <input
                  id="work-location"
                  name="workLocation"
                  ref={inputRef}
                  type="text"
                  value={draft.address || ''}
                  onChange={(e) => syncDraft({ address: e.target.value })}
                  placeholder="House, street, area, city"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              ) : (
                <div className="relative w-full">
                  <div className="w-full rounded-xl border border-slate-200 overflow-hidden focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 [&>gmp-place-autocomplete]:w-full [&>gmp-place-autocomplete]:block">
                    <gmp-place-autocomplete
                      id="work-location"
                      name="workLocation"
                      ref={autocompleteRef}
                    ></gmp-place-autocomplete>
                  </div>

                  {forceInput && (
                    <input
                      id="work-location-display"
                      name="workLocationDisplay"
                      type="text"
                      value={draft.address || ''}
                      readOnly
                      onClick={() => setForceInput(false)}
                      placeholder="House, street, area, city"
                      className="absolute top-0 left-0 h-full w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none cursor-text"
                    />
                  )}
                </div>
              )}
              <div
                ref={mapRef}
                className="mt-3 h-48 w-full rounded-xl bg-slate-100 ring-1 ring-black/5 overflow-hidden"
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={pickLocation}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-brand/25 bg-brand/5 py-2.5 text-[11px] font-bold text-brand"
                >
                  <Navigation className="h-3.5 w-3.5" aria-hidden />
                  Current location
                </button>
                <button
                  type="button"
                  onClick={() => setAddressPickerOpen(true)}
                  className="lc-booking-btn-secondary py-2.5 text-[11px]"
                >
                  Saved addresses
                </button>
              </div>
              <SavedAddressPicker
                open={addressPickerOpen}
                onClose={() => setAddressPickerOpen(false)}
                onSelect={applySavedAddress}
              />
            </div>

            <motion.div>
              <FieldLabel optional htmlFor="work-note">Work note</FieldLabel>
              <textarea
                id="work-note"
                name="workNote"
                value={draft.notes || ''}
                onChange={(e) => syncDraft({ notes: e.target.value })}
                rows={2}
                placeholder="Describe the work briefly…"
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-black outline-none focus:border-brand focus:ring-0 placeholder:text-black/40"
              />
            </motion.div>

            <motion.div>
              <FieldLabel optional>Photos</FieldLabel>
              <label htmlFor="job-photos" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-4 text-xs font-bold text-black">
                <ImagePlus className="h-4 w-4 text-brand" aria-hidden />
                Upload images
                <input
                  id="job-photos"
                  name="jobPhotos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => setImageFiles([...(e.target.files || [])])}
                />
              </label>
              {imageFiles.length ? (
                <p className="mt-1 text-[11px] text-slate-500">{imageFiles.length} file(s) selected</p>
              ) : null}
            </motion.div>

            {draft.bookingType !== 'instant' && (
              <motion.div>
                <FieldLabel>Working duration</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'few_hours', label: 'Few hours' },
                    { id: 'multi_day', label: 'Multi day' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() =>
                        syncDraft({
                          durationKind: d.id,
                          durationDays: durationKindToDays(d.id, draft.durationDays),
                        })
                      }
                      className="lc-booking-chip"
                      data-active={draft.durationKind === d.id ? 'true' : 'false'}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                {draft.durationKind === 'multi_day' ? (
                  <div className="mt-2 space-y-1.5">
                    <label htmlFor="duration-days" className="text-[11px] font-bold uppercase text-slate-500">
                      Number of days
                    </label>
                    <div className="relative">
                      <input
                        id="duration-days"
                        name="durationDays"
                        aria-label="Number of days"
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={2}
                        max={30}
                        value={draft.durationDays === undefined ? 2 : draft.durationDays}
                        onChange={(e) => {
                          const val = e.target.value
                          syncDraft({ durationDays: val === '' ? '' : Number(val) })
                        }}
                        onBlur={(e) => {
                          const val = Number(e.target.value)
                          if (!val || val < 2) syncDraft({ durationDays: 2 })
                          else if (val > 30) syncDraft({ durationDays: 30 })
                        }}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-12 text-sm font-bold text-black outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                        days
                      </span>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}

            {draft.bookingType === 'instant' ? (
              <div className="space-y-3">
                <div className="lc-booking-highlight flex items-center gap-2">
                  <Zap className="h-5 w-5 text-brand" aria-hidden />
                  <div>
                    <p className="text-sm font-bold text-black">ASAP</p>
                    <p className="text-xs font-medium text-black/70">Earliest available slot</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <motion.div>
                  <FieldLabel htmlFor="service-date">Date</FieldLabel>
                  <input
                    id="service-date"
                    name="serviceDate"
                    type="date"
                    min={todayISODate()}
                    max={maxISODate(5)}
                    value={draft.serviceDate || ''}
                    onChange={(e) => syncDraft({ serviceDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-black"
                  />
                </motion.div>
                <div className={draft.durationKind === 'multi_day' ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
                  <motion.div>
                    <FieldLabel htmlFor="scheduled-time">Start Time</FieldLabel>
                    <input
                      id="scheduled-time"
                      name="timeSlot"
                      type="time"
                      value={draft.timeSlot || ''}
                      onChange={(e) => syncDraft({ timeSlot: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-black outline-none focus:border-brand focus:ring-1"
                    />
                  </motion.div>
                  {draft.durationKind !== 'multi_day' && (
                    <motion.div>
                      <FieldLabel htmlFor="scheduled-end-time">End Time</FieldLabel>
                      <input
                        id="scheduled-end-time"
                        name="endTime"
                        type="time"
                        value={draft.endTime || ''}
                        onChange={(e) => syncDraft({ endTime: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-black outline-none focus:border-brand focus:ring-1"
                      />
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {formError ? (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {formError}
              </p>
            ) : null}

            <BookingPrimaryButton type="button" onClick={handleReviewBooking} disabled={isCalculating}>
              {isCalculating ? 'Calculating...' : 'Review booking'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </BookingPrimaryButton>
          </motion.div>
        ) : null}

        {step === 'summary' ? (
          !calculatedBill ? (
            <div className="flex flex-col items-center justify-center p-8 gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <span className="text-sm font-semibold text-slate-500">Loading billing details...</span>
            </div>
          ) : (
            <motion.div className="space-y-4">
              <div className="lc-booking-flow-card space-y-3 text-sm lc-booking-flow-body">
                <div className="flex justify-between gap-2">
                  <span className="lc-booking-flow-muted">Service</span>
                  <span className="text-right font-bold text-black">
                    <span className="lc-booking-highlight-title block text-base">{draft.categoryName}</span>
                    {draft.groupName ? <span className="text-xs font-semibold">{draft.groupName}</span> : null}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="lc-booking-flow-muted">Booking</span>
                  <span className="font-bold capitalize text-black">{draft.bookingType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="lc-booking-flow-muted">When</span>
                  <span className="font-bold text-black">
                    {draft.bookingType === 'instant'
                      ? 'ASAP'
                      : `${draft.serviceDate} · ${draft.timeSlot}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="lc-booking-flow-muted">Duration</span>
                  <span className="font-bold text-black">{durationKindLabel(draft.durationKind)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="shrink-0 lc-booking-flow-muted">Mechanic</span>
                  <span className="text-right font-bold text-black">
                    Flash Broadcast Match
                  </span>
                </div>
                <p className="flex items-start gap-2 font-medium text-black">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                  {draft.address}
                </p>
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between font-semibold text-black">
                    <span>Service fee</span>
                    <span>{formatInr(calculatedBill.basePrice)}</span>
                  </div>
                  <div className="mt-1 flex justify-between lc-booking-flow-muted">
                    <span>Platform fee</span>
                    <span>{formatInr(calculatedBill.platformFee)}</span>
                  </div>
                  <div className="flex justify-between lc-booking-flow-muted">
                    <span>Taxes</span>
                    <span>{formatInr(calculatedBill.taxes)}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-base font-extrabold text-black">
                    <span>Total</span>
                    <span>{formatInr(calculatedBill.totalAmount)}</span>
                  </div>
                  {activeSubscription ? (
                    <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-900 border border-emerald-100">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-bold text-sm">Active Plan: {activeSubscription.snapshotPlanDetails?.name || activeSubscription.plan?.name}</span>
                      </div>
                      <div className="text-xs font-medium">
                        Bookings Used: <span className="font-bold">{activeSubscription.bookingsUsed}</span> / {activeSubscription.snapshotPlanDetails?.allowedBookings || activeSubscription.plan?.allowedBookings}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl bg-orange-50 p-3 text-orange-900 border border-orange-100 flex items-center justify-between">
                      <span className="text-sm font-semibold">Get a plan to book mechanics easily</span>
                      <button
                        onClick={() => navigate('/app/subscriptions')}
                        className="text-xs font-bold bg-orange-500 text-white px-3 py-1.5 rounded-lg"
                      >
                        View Plans
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="lc-booking-flow-card space-y-3">
                <p className="lc-booking-flow-label font-bold text-slate-800">Payment Method</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => syncDraft({ paymentMethod: 'CASH' })}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-bold transition-all ${(draft.paymentMethod || 'CASH') === 'CASH'
                        ? 'border-brand bg-brand/5 text-brand'
                        : 'border-slate-200 text-slate-500 hover:border-brand/30 hover:bg-slate-50'
                      }`}
                  >
                    <IndianRupee className="h-5 w-5" />
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => syncDraft({ paymentMethod: 'ONLINE' })}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-bold transition-all ${draft.paymentMethod === 'ONLINE'
                        ? 'border-brand bg-brand/5 text-brand'
                        : 'border-slate-200 text-slate-500 hover:border-brand/30 hover:bg-slate-50'
                      }`}
                  >
                    <Zap className="h-5 w-5" />
                    Online
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" className="lc-booking-btn-secondary flex-1" onClick={() => goStep('details')}>
                  Edit details
                </button>
                <BookingPrimaryButton type="button" className="flex-1" onClick={confirmBooking} disabled={isCreating}>
                  {isCreating ? 'Sending req...' : 'Send req'}
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                </BookingPrimaryButton>
              </div>
            </motion.div>
          )
        ) : null}

        <AnimatePresence>
          {subscriptionModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setSubscriptionModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="fixed left-1/2 top-1/2 z-[101] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 p-4"
              >
                <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
                  <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-center">
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                      <AlertCircle className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Limit Reached</h3>
                  </div>
                  <div className="p-6 text-center">
                    <p className="mb-6 text-sm font-medium text-slate-600">
                      {subscriptionModalMsg}
                    </p>
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setSubscriptionModalOpen(false)
                          navigate('/app/subscriptions')
                        }}
                        className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/30 hover:bg-brand-dark"
                      >
                        View Subscription Plans
                      </button>
                      <button
                        onClick={() => setSubscriptionModalOpen(false)}
                        className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <BookingTypeSheet
          open={typeSheetOpen}
          onClose={() => setTypeSheetOpen(false)}
          value={draft.bookingType}
          categoryLabel={draft.categoryName}
          onSelect={(id) => {
            syncDraft({ bookingType: id })
            setTypeSheetOpen(false)
            goStep('details')
          }}
        />
      </div>
    </div>
  )
}

