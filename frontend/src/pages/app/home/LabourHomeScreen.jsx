import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Droplets,
  Flame,
  GraduationCap,
  Headphones,
  IndianRupee,
  LifeBuoy,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  Phone,
  Shield,
  ShieldCheck,
  Sparkles,
  Timer,
  Wallet,
  Wrench,
} from 'lucide-react'
import { KYC_STATUS } from '../../../constants/userRoles.js'
import { AppPrimaryButton } from '../../../components/app/AppPrimaryButton.jsx'
import { AppSecondaryButton } from '../../../components/app/AppSecondaryButton.jsx'
import { AppSectionHeader } from '../../../components/app-ui/layout/AppSectionHeader.jsx'
import { GlassPanel } from '../../../components/ui/GlassPanel.jsx'
import { NotificationBell } from '../../../components/notifications/NotificationBell.jsx'
import { useNow } from '../../../hooks/useNow.js'
import { formatSecondsAsClock } from '../../../lib/formatDurationClock.js'
import {
  formatAppUserLocationLabel,
  hasAppUserLocation,
  readAppUserLocation,
} from '../../../lib/appUserLocationStorage.js'
import { AppUserLocationModal } from '../../../components/app/AppUserLocationModal.jsx'
import { LabourAssignmentDetailModal } from '../../../components/labour/LabourAssignmentDetailModal.jsx'
import { useLabourPresence } from '../../../hooks/useLabourPresence.js'
import {
  appendAttendancePunch,
  dayKey,
  lastTodayType,
  liveWorkedSecondsForDay,
  readAttendanceEntries,
  subscribeAttendance,
} from '../../../lib/labourAttendanceStorage.js'
import { useLabourSocket } from '../../../hooks/useLabourSocket.js'
import { bookingsApi } from '../../../api/bookingsApi.js'
import { broadcastsApi } from '../../../api/broadcastsApi.js'
import { withdrawalsApi } from '../../../api/withdrawalsApi.js'
import { readWalletState, subscribeWallet } from '../../../lib/labourWalletStorage.js'
import {
  buildAttendanceHistoryRows,
  buildEarningsGlance,
  buildUpcomingSchedule,
  formatInrFromPaise,
  LABOUR_EMERGENCY_PHONE,
  LABOUR_SUPPORT_PHONE,
  offerDistanceKm,
  pickTodayAssignment,
  SAFETY_BANNERS,
  whatsAppSupportUrl,
} from '../../../lib/labourHomeHelpers.js'
import { markNotificationRead } from '../../../lib/labourNotifications.js'
import { updateLabourSchedule } from '../../../api/userLabourApi.js'

function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function initialsFromName(name) {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0]
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : ''
  return `${a || ''}${b || ''}`.toUpperCase() || '?'
}

function formatPunchTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const QUICK_ACTIONS = [
  { to: '/app/earnings', label: 'Earnings', icon: IndianRupee, bg: 'from-emerald-500/15 to-emerald-50', iconTone: 'text-emerald-700' },
  { to: '/app/jobs', label: 'My jobs', icon: Wrench, bg: 'from-amber-500/15 to-amber-50', iconTone: 'text-amber-800' },
  { to: '/app/work-categories', label: 'My skills', icon: Wrench, bg: 'from-orange-500/15 to-orange-50', iconTone: 'text-orange-800' },
  { to: '/app/support', label: 'Support', icon: LifeBuoy, bg: 'from-rose-500/15 to-rose-50', iconTone: 'text-rose-700' },
]

const STATUS_TONE = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  sky: 'bg-sky-500',
  brand: 'bg-brand',
}

function SafetyBannerIcon({ icon }) {
  if (icon === 'helmet') return <Wrench className="h-6 w-6" aria-hidden />
  if (icon === 'shield') return <Shield className="h-6 w-6" aria-hidden />
  if (icon === 'droplet') return <Droplets className="h-6 w-6" aria-hidden />
  return <GraduationCap className="h-6 w-6" aria-hidden />
}

/**
 * Mechanic home — jobs, earnings, availability schedule and safety tips.
 */
export function LabourHomeScreen({ user }) {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const now = useNow(1000)
  const [entries, setEntries] = useState(readAttendanceEntries)
  const [wallet, setWallet] = useState(readWalletState)
  const [jobs, setJobs] = useState({ offers: [], active: [], history: [] }) // legacy fallback if needed
  const { liveOffers, removeOfferLocal } = useLabourSocket()
  const [activeBookings, setActiveBookings] = useState([])
  const [withdrawals, setWithdrawals] = useState([])

  const loadBookings = useCallback(() => {
    if (!user || user.id === 'guest') return
    bookingsApi.getMyBookings().then(res => {
      setActiveBookings(res.data?.bookings || [])
    }).catch(err => {
      if (err?.message !== 'Authentication required' && err?.status !== 401) {
        console.error('Failed to load bookings:', err)
      }
    })
    withdrawalsApi.getWithdrawals().then(res => {
      setWithdrawals(res.data?.requests || res.requests || [])
    }).catch(console.error)
  }, [user])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])
  const [toast, setToast] = useState('')
  const [safetyIdx, setSafetyIdx] = useState(0)
  const [appLocation, setAppLocation] = useState(() => readAppUserLocation())
  const [workAreaModalOpen, setWorkAreaModalOpen] = useState(false)
  const [timeManagementOpen, setTimeManagementOpen] = useState(false)
  const [assignmentDetailOpen, setAssignmentDetailOpen] = useState(false)
  const { online, setOnline } = useLabourPresence()
  const [schedule, setSchedule] = useState(() => {
    return user?.labourProfile?.schedule && user.labourProfile.schedule.length === 7 
      ? user.labourProfile.schedule 
      : [
          { day: 'Monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'Tuesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'Wednesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'Thursday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'Friday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'Saturday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'Sunday', startTime: '09:00', endTime: '17:00', isAvailable: false },
        ]
  })

  const isScheduleOffline = useMemo(() => {
    if (!online) return false
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const currentDay = days[new Date().getDay()]
    const todaySchedule = schedule.find(s => s.day === currentDay)
    
    if (!todaySchedule || !todaySchedule.isAvailable) return true
    
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const currentIstStr = `${hh}:${mm}`
    
    if (currentIstStr < todaySchedule.startTime || currentIstStr > todaySchedule.endTime) {
      return true
    }
    return false
  }, [online, schedule])

  const firstName = user?.fullName?.split(/\s/)?.[0]
  const greeting = getTimeGreeting()
  const initials = initialsFromName(user?.fullName)
  const profileImageUrl = user?.profileImageUrl?.trim()
  const kyc = user?.labourProfile?.kycStatus
  const kycOk = kyc === KYC_STATUS.VERIFIED
  const categories = user?.labourProfile?.categoryIds
  const primaryTrade =
    Array.isArray(categories) && categories.length > 0
      ? typeof categories[0] === 'object' && categories[0]?.name
        ? categories[0].name
        : 'Skilled mechanic'
      : 'Mechanic'

  useEffect(() => subscribeAttendance(setEntries), [])
  useEffect(() => subscribeWallet(setWallet), [])
  useEffect(() => {
    const onLoc = () => setAppLocation(readAppUserLocation())
    window.addEventListener('lc-app-user-location-changed', onLoc)
    return () => window.removeEventListener('lc-app-user-location-changed', onLoc)
  }, [])

  useEffect(() => {
    if (reduce) return undefined
    const id = window.setInterval(() => {
      setSafetyIdx((i) => (i + 1) % SAFETY_BANNERS.length)
    }, 5200)
    return () => window.clearInterval(id)
  }, [reduce])

  const todayKey = dayKey()
  const lastType = lastTodayType(entries)
  const onSite = lastType === 'in'
  const workedSecondsToday = useMemo(
    () => liveWorkedSecondsForDay(entries, todayKey, now),
    [entries, todayKey, now],
  )

  const todayPunches = useMemo(
    () => entries.filter((e) => e.day === todayKey).sort((a, b) => new Date(a.at) - new Date(b.at)),
    [entries, todayKey],
  )
  const lastIn = useMemo(() => [...todayPunches].reverse().find((e) => e.type === 'in'), [todayPunches])

  const todayBooking = useMemo(() => {
    return activeBookings.find(b => ['ACCEPTED', 'EN_ROUTE', 'STARTED'].includes(b.status))
  }, [activeBookings])

  const todayAssignment = useMemo(() => {
    if (!todayBooking) return { job: null, kind: null, raw: null }
    return {
      kind: 'active',
      raw: todayBooking,
      job: {
        _id: todayBooking._id,
        siteName: todayBooking.address?.locationText || 'Customer location',
        title: todayBooking.address?.locationText || 'Customer location',
        role: todayBooking.subcategoryId?.name || 'Mechanic',
        location: todayBooking.address?.locationText || '',
        shiftLabel: todayBooking.durationKind === 'multi_day' ? 'Multi-day job' : 'Service job',
        rateLabel: `${formatInrFromPaise(todayBooking.laborShare * 100)} payout`,
        customerName: todayBooking.userId?.name || 'Customer',
        mapQuery: `${todayBooking.address?.coordinates?.coordinates[1]},${todayBooking.address?.coordinates?.coordinates[0]}`,
        supervisor: todayBooking.userId?.name || 'Customer',
        supervisorPhone: todayBooking.userId?.phone || '',
      }
    }
  }, [todayBooking])

  const todayJob = todayAssignment.job

  const upcomingSchedule = useMemo(() => {
    const scheduled = activeBookings.filter(b => b.type === 'SCHEDULED' && ['ACCEPTED'].includes(b.status) && b._id !== todayBooking?._id)
    return scheduled.map(b => ({
      id: b._id,
      when: new Date(b.scheduledAt).toLocaleDateString(),
      siteName: b.address?.locationText,
      role: b.subcategoryId?.name || 'Mechanic',
      shiftLabel: b.timeSlot,
      tone: 'brand'
    }))
  }, [activeBookings, todayBooking])

  const historyRows = useMemo(() => buildAttendanceHistoryRows(entries), [entries])

  const earnings = useMemo(() => {
    let earnedPaise = 0
    let todayPaise = 0
    let weekPaise = 0
    let monthPaise = 0
    
    const now = new Date()
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0]
    
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Month tile: every COMPLETED job this month (cash + online) at the mechanic's share
    activeBookings.forEach(b => {
      if (b.status === 'COMPLETED') {
        const when = new Date(b.updatedAt || b.scheduledAt || b.createdAt)
        if (when >= monthStart) monthPaise += (b.laborShare || b.basePrice || 0) * 100
      }
    })

    activeBookings.forEach(b => {
      if (['COMPLETED', 'ACCEPTED', 'ASSIGNED', 'STARTED'].includes(b.status)) {
        const share = b.laborShare || b.basePrice || 0
        if (b.paymentMethod !== 'CASH') {
           earnedPaise += share * 100
           
           const bookingDate = new Date(b.scheduledAt || b.createdAt)
           const bDateStr = new Date(bookingDate.getTime() - bookingDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]
           
           if (bDateStr === todayStr) {
             todayPaise += share * 100
           }
           if (bookingDate >= weekAgo) {
             weekPaise += share * 100
           }
        }
      }
    })
    
    const paidInr = withdrawals.filter(w => w.status === 'APPROVED').reduce((acc, curr) => acc + (curr.amount || 0), 0)
    const pendingInr = withdrawals.filter(w => w.status === 'PENDING').reduce((acc, curr) => acc + (curr.amount || 0), 0)
    
    const availableInr = Math.floor(earnedPaise / 100) - paidInr - pendingInr
    const availablePaise = Math.max(0, availableInr * 100)
    
    return {
      earnedPaise,
      todayPaise,
      weekPaise,
      monthPaise,
      availablePaise
    }
  }, [activeBookings, withdrawals])

  const hasWorkLocation = useMemo(() => hasAppUserLocation(appLocation), [appLocation])
  const locationLabel = formatAppUserLocationLabel(appLocation) || 'Set your work area'
  const siteLabel = hasWorkLocation ? locationLabel : (todayJob?.siteName || todayJob?.title || (lastIn?.projectLabel && lastIn.projectLabel !== 'Unassigned' ? lastIn.projectLabel : 'No job assigned'))

  const showToast = useCallback((msg) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2600)
  }, [])

  const handleWorkAreaSaved = useCallback(() => {
    const next = readAppUserLocation()
    setAppLocation(next)

    // Sync location to backend so the broadcasting engine knows where they are
    if (next && next.lat && next.lng) {
      import('../../../api/locationApi.js').then(({ updateLabourLocation }) => {
        updateLabourLocation(next.lat, next.lng).catch(err => console.error('Failed to sync location to backend:', err))
      })
    }
  }, [])

  const handleAcceptOffer = async (offerId) => {
    if (!kycOk) {
      showToast('Complete Aadhaar KYC before accepting jobs.')
      navigate('/app/kyc')
      return
    }
    try {
      await broadcastsApi.acceptBroadcast(offerId)
      removeOfferLocal(offerId)
      loadBookings() // Refresh active jobs
      showToast('Job accepted — see Active in My Jobs.')
    } catch (err) {
      removeOfferLocal(offerId)
      showToast(err.message || 'Failed to accept job. It might have expired.')
    }
  }

  const openDrawer = () => window.dispatchEvent(new CustomEvent('lc-open-app-drawer'))

  // Legacy alertOffers removed, we use liveOffers from socket

  const safetyBanner = SAFETY_BANNERS[safetyIdx]

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="-mx-4 space-y-5 overflow-x-hidden pb-4"
      aria-label={user?.fullName ? `Mechanic home for ${user.fullName}` : 'Mechanic home'}
    >
      {toast ? (
        <p
          className="mx-4 rounded-xl border border-brand/25 bg-brand/10 px-4 py-2 text-center text-sm font-semibold text-brand"
          role="status"
        >
          {toast}
        </p>
      ) : null}

      {/* 1. Header */}
      <section className="relative px-4 pb-2 mt-2 z-40">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-[1.75rem] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.55)]"
        >
          <div className="absolute inset-0 overflow-hidden rounded-[1.75rem] border border-white/20 bg-linear-to-br from-slate-900 via-slate-800 to-slate-950">
            <motion.div
              className="pointer-events-none absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=60')] bg-cover bg-center opacity-25"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-slate-950/85 via-slate-900/75 to-brand/30" aria-hidden />
            <motion.div
              className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-brand/30 blur-3xl"
              animate={reduce ? undefined : { scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />
          </div>

          <motion.div className="relative p-4 sm:p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={openDrawer}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <NotificationBell
                buttonClassName="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
              />
            </div>

            <div className="mt-4 flex items-stretch gap-2.5 sm:gap-3">
              <Link
                to="/app/profile"
                className="relative shrink-0 self-center rounded-2xl p-0.5 ring-2 ring-white/40 transition hover:ring-white/70"
                aria-label="Open profile"
              >
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt=""
                    className="h-14 w-14 rounded-[0.85rem] object-cover sm:h-16 sm:w-16 sm:rounded-[0.9rem]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-[0.85rem] bg-white/15 text-lg font-black sm:h-16 sm:w-16 sm:rounded-[0.9rem] sm:text-xl">
                    {initials}
                  </span>
                )}
                {kycOk ? (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white ring-2 ring-slate-900 sm:h-6 sm:w-6">
                    <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} aria-hidden />
                  </span>
                ) : null}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="text-[11px] font-semibold text-white/75">
                  {greeting}
                  {firstName ? `, ${firstName}` : ''} 👋
                </p>
                <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">
                  {user?.fullName?.trim() || firstName || 'Mechanic'}
                </h1>
                <p className="truncate text-xs font-medium text-white/70">{primaryTrade}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {kycOk ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-100">
                      <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
                      Verified
                    </span>
                  ) : (
                    <Link
                      to="/app/kyc"
                      className="inline-flex items-center gap-0.5 rounded-full border border-amber-300/50 bg-amber-500/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-50"
                    >
                      KYC
                      <ChevronRight className="h-2.5 w-2.5" aria-hidden />
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex w-[7.4rem] shrink-0 flex-col justify-between rounded-2xl border border-emerald-400/35 bg-linear-to-br from-emerald-500/25 to-white/10 p-2.5 shadow-inner backdrop-blur-md sm:w-[8.25rem] sm:p-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-100/90">This month</p>
                  <p className="mt-0.5 font-mono text-base font-black leading-tight tabular-nums text-white sm:text-lg">
                    {formatInrFromPaise(earnings.monthPaise)}
                  </p>
                  {(earnings.availablePaise ?? 0) > 0 ? (
                    <p className="mt-0.5 truncate text-[9px] font-semibold text-emerald-100/85">
                      {formatInrFromPaise(earnings.availablePaise)} withdraw
                    </p>
                  ) : earnings.pendingPaise > 0 ? (
                    <p className="mt-0.5 truncate text-[9px] font-semibold text-amber-100/85">
                      {formatInrFromPaise(earnings.pendingPaise)} clearing
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[9px] text-white/55">Completed jobs</p>
                  )}
                </div>
                <Link
                  to="/app/earnings"
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl bg-linear-to-r from-brand-bright to-brand py-2 text-[10px] font-black text-white shadow-md shadow-brand/30 transition hover:brightness-110 active:scale-[0.98]"
                >
                  <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Withdraw
                </Link>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setWorkAreaModalOpen(true)}
              className={`mt-4 flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm backdrop-blur-sm transition hover:bg-white/15 ${hasWorkLocation
                ? 'border-white/20 bg-white/10'
                : 'border-amber-300/50 bg-amber-500/20 ring-1 ring-amber-300/40'
                }`}
            >
              <MapPin className="h-4 w-4 shrink-0 text-brand-bright" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-medium text-white/90">{locationLabel}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
            </button>
          </motion.div>
        </motion.div>
      </section>

      <div className="space-y-5 px-4">
        {isScheduleOffline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200/80 p-4 shadow-sm"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <div>
              <h3 className="text-sm font-bold text-amber-800">Currently Offline (Schedule)</h3>
              <p className="mt-1 text-xs text-amber-900/80 leading-relaxed font-medium">
                Your global toggle is on, but your current schedule shows you are offline or outside working hours. You will not receive any instant or scheduled bookings right now.
              </p>
            </div>
          </motion.div>
        )}

        {/* Working hours Section */}
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          aria-labelledby="working-hours-heading"
        >
          <GlassPanel className="border-slate-200/90 p-4">
            <button
              type="button"
              onClick={() => setTimeManagementOpen(!timeManagementOpen)}
              className="flex w-full items-center justify-between text-left focus:outline-none"
            >
              <div className="flex flex-col items-start">
                <h2 id="working-hours-heading" className="text-base font-extrabold text-slate-900">
                  Working hours
                </h2>
                <span className="text-[11px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-slate-400 transition-transform ${timeManagementOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {timeManagementOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4">
                    {schedule.map((daySchedule, idx) => (
                      <div key={daySchedule.day} className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <div className="w-24 shrink-0 font-medium text-slate-700 text-sm order-1">
                          {daySchedule.day}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newSchedule = [...schedule];
                            newSchedule[idx] = { ...newSchedule[idx], isAvailable: !newSchedule[idx].isAvailable };
                            setSchedule(newSchedule);
                          }}
                          className={`relative ml-2 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 order-2 sm:order-3 ${
                            daySchedule.isAvailable ? 'bg-brand' : 'bg-slate-300'
                          }`}
                          role="switch"
                          aria-checked={daySchedule.isAvailable}
                        >
                          <span className="sr-only">Toggle {daySchedule.day} availability</span>
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              daySchedule.isAvailable ? 'translate-x-2.5' : '-translate-x-2.5'
                            }`}
                          />
                        </button>
                        <div className="w-full sm:w-auto sm:flex-1 flex items-center gap-2 order-3 sm:order-2">
                          <input 
                            type="time" 
                            value={daySchedule.startTime}
                            onChange={(e) => {
                              const newSchedule = [...schedule];
                              newSchedule[idx] = { ...newSchedule[idx], startTime: e.target.value };
                              setSchedule(newSchedule);
                            }}
                            disabled={!daySchedule.isAvailable}
                            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 bg-slate-50 focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50"
                          />
                          <span className="text-xs text-slate-500">to</span>
                          <input 
                            type="time" 
                            value={daySchedule.endTime}
                            onChange={(e) => {
                              const newSchedule = [...schedule];
                              newSchedule[idx] = { ...newSchedule[idx], endTime: e.target.value };
                              setSchedule(newSchedule);
                            }}
                            disabled={!daySchedule.isAvailable}
                            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 bg-slate-50 focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
            
            
                  <AppPrimaryButton
                    type="button"
                    onClick={async () => {
                      try {
                        await updateLabourSchedule(schedule)
                        showToast('Working hours saved')
                        setTimeManagementOpen(false)
                      } catch (err) {
                        showToast(err?.message || 'Failed to save schedule')
                      }
                    }}
                    className="mt-5 w-full py-3.5 text-sm shadow-lg shadow-brand/25"
                  >
                    <CalendarClock className="mr-2 h-4 w-4" aria-hidden />
                    Save working hours
                  </AppPrimaryButton>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassPanel>
        </motion.section>

        {/* 4. Today's job */}
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          {todayJob ? (
            <motion.div
              role="button"
              tabIndex={0}
              onClick={() => setAssignmentDetailOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setAssignmentDetailOpen(true)
                }
              }}
              className="cursor-pointer overflow-hidden rounded-[1.5rem] border border-slate-200/90 bg-white shadow-[0_16px_40px_-24px_rgba(15,23,42,0.2)] transition hover:border-brand/30 hover:shadow-lg active:scale-[0.99]"
            >
              <div className="relative h-28 bg-linear-to-br from-slate-700 to-slate-900">
                <div
                  className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=60')] bg-cover bg-center opacity-40"
                  aria-hidden
                />
                <motion.div className="absolute inset-0 bg-linear-to-t from-slate-950/90 to-transparent" aria-hidden />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-800">
                  {todayAssignment.kind === 'active' ? 'In progress' : 'Scheduled'}
                </span>
              </div>
              <div className="space-y-2 p-4">
                <h2 className="text-base font-extrabold text-slate-900 mb-2">Today's job</h2>
                <p className="flex items-start gap-2 text-sm font-extrabold text-slate-900">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                  {todayJob.siteName || todayJob.title}
                </p>
                <p className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Wrench className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  {todayJob.role} · {todayJob.customerName}
                </p>
                <p className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  {todayJob.location}
                </p>
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Clock className="h-3.5 w-3.5 text-brand" aria-hidden />
                  {todayJob.shiftLabel}
                </p>
                {todayJob.rateLabel ? (
                  <p className="text-xs font-bold text-brand">{todayJob.rateLabel}</p>
                ) : null}
                <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  <AppSecondaryButton
                    as="a"
                    href={`https://www.google.com/maps/search/?api=1&query=${todayJob.mapQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 text-xs"
                  >
                    <Navigation className="h-3.5 w-3.5" aria-hidden />
                    Map
                  </AppSecondaryButton>
                  <AppSecondaryButton
                    type="button"
                    onClick={() => setAssignmentDetailOpen(true)}
                    className="flex-1 py-2.5 text-xs"
                  >
                    Details
                  </AppSecondaryButton>
                </div>
              </div>
            </motion.div>
          ) : (
            <GlassPanel className="border-dashed border-slate-300/90 p-5 text-center relative">
              <div className="absolute top-4 left-5">
                <h2 className="text-base font-extrabold text-slate-900">Today's job</h2>
              </div>
              <Wrench className="mx-auto mt-6 h-8 w-8 text-slate-300" aria-hidden />
              <p className="mt-2 text-sm font-bold text-slate-800">No job right now</p>
              <p className="mt-1 text-xs text-slate-500">New job requests will pop up here. You can also open My Jobs.</p>
              <AppPrimaryButton as={Link} to="/app/jobs" className="mx-auto mt-4 w-full max-w-xs py-3 text-sm">
                Browse jobs
              </AppPrimaryButton>
            </GlassPanel>
          )}
        </motion.section>

        {/* 4. Quick actions */}
        <section aria-label="Quick actions">
          <AppSectionHeader title="Quick actions" className="mb-2 px-0.5" />
          <div className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className={`flex min-w-[5.5rem] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-slate-200/80 bg-linear-to-b ${a.bg} px-3 py-3.5 shadow-sm transition active:scale-[0.98] hover:shadow-md`}
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ${a.iconTone}`}>
                  <a.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-center text-[10px] font-bold leading-tight text-slate-800">{a.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* 5. Earnings breakdown */}
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          aria-label="Earnings breakdown"
        >
          <AppSectionHeader title="Earnings breakdown" className="mb-2 px-0.5" />
          <GlassPanel className="border-slate-200/90 p-3">
            <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">All-time earned</p>
              <p className="font-mono text-sm font-black tabular-nums text-slate-900">
                {formatInrFromPaise(earnings.earnedPaise ?? 0)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Today', value: earnings.todayPaise },
                { label: 'This week', value: earnings.weekPaise },
                { label: 'Available', value: earnings.availablePaise ?? 0 },
              ].map((cell) => (
                <Link
                  key={cell.label}
                  to="/app/earnings"
                  className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-2 py-2 text-center transition hover:border-brand/30 hover:bg-brand/5"
                >
                  <p className="text-[9px] font-bold uppercase text-slate-500">{cell.label}</p>
                  <p className="mt-0.5 text-xs font-black tabular-nums text-slate-900">
                    {formatInrFromPaise(cell.value)}
                  </p>
                </Link>
              ))}
            </div>
          </GlassPanel>
        </motion.section>

        {/* 6. Job alerts (Flash Broadcasts) */}
        {liveOffers.length > 0 ? (
          <section aria-label="New job alerts">
            <AppSectionHeader title="New flash assignments" className="mb-2 px-0.5" />
            <ul className="space-y-3">
              {liveOffers.map((offer) => (
                <li key={offer.bookingId}>
                  <GlassPanel
                    className="relative overflow-hidden border-2 p-4 border-amber-300/80 bg-amber-50/50"
                  >
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-amber-400/50"
                      animate={reduce ? undefined : { opacity: [0.4, 0.9, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      aria-hidden
                    />
                    <div className="relative flex items-start gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                        <Flame className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">New job</p>
                        <p className="text-sm font-extrabold text-slate-900">{formatInrFromPaise((offer.laborShare || 0) * 100)} payout</p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {offer.radiusKm ? `${offer.radiusKm} km radius` : ''} · {offer.type}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{offer.address?.locationText}</p>
                      </div>
                    </div>
                    <div className="relative mt-3 flex gap-2">
                      <AppPrimaryButton
                        type="button"
                        onClick={() => handleAcceptOffer(offer.bookingId)}
                        className="flex-1 py-2.5 text-xs"
                      >
                        Accept job
                      </AppPrimaryButton>
                    </div>
                  </GlassPanel>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* 7. Upcoming schedule */}
        {upcomingSchedule.length > 0 ? (
          <section aria-label="Upcoming schedule">
            <AppSectionHeader title="Upcoming schedule" className="mb-2 px-0.5" />
            <ol className="relative space-y-0 border-l-2 border-slate-200/90 pl-4 ml-1.5">
              {upcomingSchedule.map((row, i) => (
                <li key={`${row.id}-${i}`} className="relative pb-4 last:pb-0">
                  <span
                    className={`absolute -left-[1.3rem] top-1 flex h-3 w-3 rounded-full ring-4 ring-white ${row.tone === 'brand' ? 'bg-brand' : row.tone === 'amber' ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                    aria-hidden
                  />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{row.when}</p>
                  <p className="mt-0.5 text-sm font-extrabold text-slate-900">{row.siteName || row.title}</p>
                  <p className="text-xs text-slate-600">
                    {row.role} · {row.shiftLabel}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* 8. Job location */}
        {todayJob ? (
          <section aria-label="Job location">
            <AppSectionHeader title="Current job" className="mb-2 px-0.5" />
            <GlassPanel className="border-slate-200/90 p-4">
              <p className="text-sm font-extrabold text-slate-900">{todayJob.siteName || todayJob.title}</p>
              <p className="mt-1 text-xs text-slate-600">{todayJob.location}</p>
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <p className="text-[10px] font-bold uppercase text-slate-400">Customer</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">{todayJob.supervisor || '—'}</p>
                {todayJob.supervisorPhone ? (
                  <a
                    href={`tel:${todayJob.supervisorPhone}`}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand"
                  >
                    <Phone className="h-3 w-3" aria-hidden />
                    {todayJob.supervisorPhone}
                  </a>
                ) : null}
              </div>
              <AppSecondaryButton
                as="a"
                href={`https://www.google.com/maps/search/?api=1&query=${todayJob.mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full py-3 text-sm"
              >
                <MapPin className="h-4 w-4" aria-hidden />
                Open map
              </AppSecondaryButton>
            </GlassPanel>
          </section>
        ) : null}

        {/* 9. Skills & KYC */}
        <section aria-label="Skills and verification">
          <AppSectionHeader title="Skills & verification" className="mb-2 px-0.5" />
          <GlassPanel className="border-slate-200/90 p-4">
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                {kycOk ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
                )}
                {kycOk ? 'Aadhaar verified' : 'Aadhaar verification pending'}
              </li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.isArray(categories) && categories.length > 0 ? (
                categories.map((c) => (
                  <span
                    key={typeof c === 'object' && c?._id ? c._id : String(c)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm"
                  >
                    <Wrench className="h-3 w-3 text-brand" aria-hidden />
                    {typeof c === 'object' && c?.name ? c.name : 'Skill'}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">Add your work types for better job matching.</span>
              )}
            </div>
            <Link
              to="/app/work-categories"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand underline-offset-4 hover:underline"
            >
              Update skills
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </GlassPanel>
        </section>




        {/* 11. Support & emergency */}
        <section aria-label="Support and emergency">
          <AppSectionHeader title="Support & emergency" className="mb-2 px-0.5" />
          <div className="grid gap-2 sm:grid-cols-3">
            <a
              href={`tel:${LABOUR_SUPPORT_PHONE}`}
              className="flex flex-col items-center gap-2 rounded-2xl border border-sky-200/80 bg-sky-50 px-3 py-4 text-center transition hover:bg-sky-100/80 active:scale-[0.98]"
            >
              <Phone className="h-6 w-6 text-sky-700" aria-hidden />
              <span className="text-xs font-extrabold text-sky-950">Call support</span>
            </a>
            <a
              href={`tel:${LABOUR_EMERGENCY_PHONE}`}
              className="flex flex-col items-center gap-2 rounded-2xl border border-rose-300/80 bg-rose-50 px-3 py-4 text-center transition hover:bg-rose-100/80 active:scale-[0.98]"
            >
              <AlertTriangle className="h-6 w-6 text-rose-700" aria-hidden />
              <span className="text-xs font-extrabold text-rose-950">Emergency</span>
            </a>
            <a
              href={whatsAppSupportUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-300/80 bg-emerald-50 px-3 py-4 text-center transition hover:bg-emerald-100/80 active:scale-[0.98]"
            >
              <MessageCircle className="h-6 w-6 text-emerald-700" aria-hidden />
              <span className="text-xs font-extrabold text-emerald-950">WhatsApp</span>
            </a>
          </div>
          <AppSecondaryButton as={Link} to="/app/support" className="mt-3 w-full py-3">
            <Headphones className="h-4 w-4 text-brand" aria-hidden />
            Open support centre
          </AppSecondaryButton>
        </section>

        {/* 12. Safety / training carousel */}
        <section aria-label="Safety tips">
          <AppSectionHeader title="Safety & training" className="mb-2 px-0.5" />
          <AnimatePresence mode="wait">
            <motion.div
              key={safetyBanner.id}
              initial={reduce ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -12 }}
              transition={{ duration: 0.35 }}
              className={`overflow-hidden rounded-[1.35rem] bg-linear-to-br ${safetyBanner.tone} p-4 text-white shadow-lg`}
            >
              <div className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <SafetyBannerIcon icon={safetyBanner.icon} />
                </span>
                <div>
                  <p className="text-sm font-extrabold">{safetyBanner.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/90">{safetyBanner.subtitle}</p>
                </div>
              </div>
              <motion.div className="mt-3 flex justify-center gap-1.5">
                {SAFETY_BANNERS.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSafetyIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${i === safetyIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                      }`}
                    aria-label={`Show tip: ${b.title}`}
                  />
                ))}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </section>


      </div>

      <AppUserLocationModal
        open={workAreaModalOpen}
        onClose={() => {
          setWorkAreaModalOpen(false)
        }}
        onSaved={handleWorkAreaSaved}
        title="Work area"
        subtitle="Enter manually or fetch GPS"
        saveLabel="Save work area"
        requireLocation
      />



      <LabourAssignmentDetailModal
        open={assignmentDetailOpen}
        onClose={() => setAssignmentDetailOpen(false)}
        job={todayJob}
        rawJob={todayAssignment.raw}
        assignmentKind={todayAssignment.kind}
        onRefresh={loadBookings}
      />
    </motion.div>
  )
}
