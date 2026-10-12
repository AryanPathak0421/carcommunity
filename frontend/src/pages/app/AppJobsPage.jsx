import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, IndianRupee, MapPin, Sparkles } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'
import { KYC_STATUS } from '../../constants/userRoles.js'
import { AppEmptyState } from '../../components/app/AppEmptyState.jsx'
import { LabourJobsHero } from '../../components/labour/jobs/LabourJobsHero.jsx'
import { LabourJobsTabBar } from '../../components/labour/jobs/LabourJobsTabBar.jsx'
import { bookingsApi } from '../../api/bookingsApi.js'
import { B2cBookingCard } from '../../components/app/B2cBookingCard.jsx'

const OFFER_STATUSES = ['CREATED', 'BROADCASTING']
const ACTIVE_STATUSES = ['ACCEPTED', 'EN_ROUTE', 'STARTED', 'ASSIGNED']
const HISTORY_STATUSES = ['COMPLETED', 'CANCELLED']

/** Mechanic jobs list — backed entirely by the bookings API. */
export function AppJobsPage() {
  const { user } = useAuth()
  const reduce = useReducedMotion()
  const [tab, setTab] = useState('offers')
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    bookingsApi
      .getMyBookings()
      .then((res) => {
        if (res.data?.bookings) setBookings(res.data.bookings)
      })
      .catch(console.error)
  }, [])

  const kycOk = user?.labourProfile?.kycStatus === KYC_STATUS.VERIFIED

  const offers = useMemo(() => bookings.filter((b) => OFFER_STATUSES.includes(b.status)), [bookings])
  const active = useMemo(() => bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)), [bookings])
  const history = useMemo(() => bookings.filter((b) => HISTORY_STATUSES.includes(b.status)), [bookings])

  const thisMonthCount = useMemo(() => {
    const ym = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    return history.filter(
      (b) => b.status === 'COMPLETED' && String(b.updatedAt || b.createdAt || '').startsWith(ym),
    ).length
  }, [history])

  const tabCounts = { offers: offers.length, active: active.length, history: history.length }
  const lists = { offers, active, history }
  const list = lists[tab] || []

  const emptyCopy = useMemo(() => {
    if (tab === 'offers') {
      return {
        icon: Sparkles,
        title: 'No open requests',
        subtitle: kycOk
          ? 'New job requests near you will appear here and as instant alerts on Home.'
          : 'Complete KYC to start accepting job requests.',
      }
    }
    if (tab === 'active') {
      return {
        icon: MapPin,
        title: 'No active job',
        subtitle: 'Accept a job request to see it here with start and finish steps.',
      }
    }
    return {
      icon: CheckCircle2,
      title: 'No completed jobs',
      subtitle: 'Finished jobs show here with payout and completion time.',
    }
  }, [tab, kycOk])

  return (
    <div className="space-y-4 pb-6">
      <LabourJobsHero offersCount={offers.length} activeCount={active.length} kycOk={kycOk} />

      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {thisMonthCount} completed this month
        </p>
      </div>

      <LabourJobsTabBar tab={tab} onChange={setTab} counts={tabCounts} />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="space-y-3"
        >
          {list.length === 0 ? (
            <AppEmptyState
              icon={emptyCopy.icon}
              title={emptyCopy.title}
              subtitle={emptyCopy.subtitle}
              className="pt-2"
            />
          ) : (
            list.map((booking, i) => (
              <motion.div
                key={booking._id}
                initial={reduce ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <B2cBookingCard booking={booking} isLabour />
              </motion.div>
            ))
          )}
        </motion.div>
      </AnimatePresence>

      <section className="grid grid-cols-1 gap-2 pt-1" aria-label="Quick links">
        <Link
          to="/app/earnings"
          className="group flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm ring-1 ring-slate-100/90 transition hover:border-brand/30 hover:shadow-md"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
            <IndianRupee className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <p className="text-xs font-extrabold text-slate-900">Earnings</p>
            <p className="text-[10px] text-slate-500">Withdraw</p>
          </span>
        </Link>
      </section>
    </div>
  )
}
