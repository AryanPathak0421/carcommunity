import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { bookingsApi } from '../../api/bookingsApi.js'
import { AppPrimaryButton } from '../app/AppPrimaryButton.jsx'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  Building2,
  CalendarRange,
  CheckCircle2,
  Clock,
  HardHat,
  History,
  MapPin,
  Navigation,
  Phone,
  Timer,
  User,
  X,
  Camera,
  Loader2,
} from 'lucide-react'
import { AppBadge } from '../app-ui/data-display/AppBadge.jsx'
import { AppSecondaryButton } from '../app/AppSecondaryButton.jsx'
import { GlassPanel } from '../ui/GlassPanel.jsx'
import { buildAssignmentDetailSnapshot } from '../../lib/labourAssignmentDetail.js'
import { readAttendanceEntries } from '../../lib/labourAttendanceStorage.js'
import { uploadMedia, assetUrlFromUpload } from '../../api/uploadApi.js'
import { UPLOAD_FOLDERS } from '../../constants/uploadFolders.js'

const STATUS_DOT = {
  brand: 'bg-brand',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  slate: 'bg-slate-300',
}

/**
 * Full assignment brief — project timeline, site, supervisor, per-day attendance.
 */
export function LabourAssignmentDetailModal({ open, onClose, job, rawJob, assignmentKind = 'active', onRefresh }) {
  const reduce = useReducedMotion()

  const detail = useMemo(() => {
    if (!open || !job) return null
    return buildAssignmentDetailSnapshot(readAttendanceEntries(), job, rawJob)
  }, [open, job, rawJob])

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [jobImage, setJobImage] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const handleStatusUpdate = async (nextStatus, requireOtp) => {
    if (requireOtp && !otp) {
      setErrorMsg('OTP is required.')
      return
    }
    if (requireOtp && !jobImage) {
      setErrorMsg(nextStatus === 'STARTED' ? 'Before Work image is required.' : 'After Work image is required.')
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      let payload = nextStatus
      if (requireOtp) {
        payload = { status: nextStatus, otp }
        if (nextStatus === 'STARTED') payload.beforeImage = jobImage
        if (nextStatus === 'COMPLETED') payload.afterImage = jobImage
      }

      await bookingsApi.updateBookingStatus(rawJob._id, payload)
      setOtp('')
      setJobImage(null)
      if (onRefresh) onRefresh()
      if (nextStatus === 'COMPLETED') {
        onClose()
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update status.')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    setErrorMsg('')
    try {
      const uploaded = await uploadMedia(file, UPLOAD_FOLDERS.GENERAL_MEDIA)
      setJobImage(assetUrlFromUpload(uploaded))
    } catch (err) {
      setErrorMsg('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDailyOtpSubmit = async (type, dayNumber, requireImage) => {
    if (!otp) {
      setErrorMsg('OTP is required.')
      return
    }
    if (requireImage && !jobImage) {
      setErrorMsg(type === 'start' ? 'Before Work image is required.' : 'After Work image is required.')
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      const payload = { type, otp, dayNumber }
      if (requireImage) {
        payload.image = jobImage
      }
      await bookingsApi.verifyDailyOtp(rawJob._id, payload)
      setOtp('')
      setJobImage(null)
      if (onRefresh) onRefresh()
    } catch (err) {
      setErrorMsg(err.message || 'Failed to verify OTP.')
    } finally {
      setLoading(false)
    }
  }

  if (typeof document === 'undefined') return null

  const sheet = (
    <AnimatePresence>
      {open && detail ? (
        <motion.div
          className="fixed inset-0 z-[200] flex h-[100dvh] max-h-[100dvh] flex-col bg-slate-50"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="assignment-detail-title"
        >
          <motion.div className="relative shrink-0 overflow-hidden bg-linear-to-br from-slate-900 via-slate-800 to-slate-950 text-white">
            <div
              className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=60')] bg-cover bg-center opacity-30"
              aria-hidden
            />
            <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-900/85 to-slate-900/60" aria-hidden />

            <div className="relative px-4 pb-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <motion.div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 backdrop-blur-sm"
                  aria-label="Close"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Assignment details</p>
                  <h1 id="assignment-detail-title" className="truncate text-lg font-extrabold">
                    {detail.job.siteName || detail.job.title}
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-white/80 hover:bg-white/10"
                  aria-label="Dismiss"
                >
                  <X className="h-5 w-5" />
                </button>
              </motion.div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm">
                  {assignmentKind === 'active' ? 'Active project' : 'Scheduled'}
                </span>
                {detail.job.projectCode ? (
                  <span className="rounded-full bg-brand/30 px-2.5 py-1 text-[10px] font-bold ring-1 ring-brand/40">
                    {detail.job.projectCode}
                  </span>
                ) : null}
                {detail.isMultiDay ? (
                  <span className="rounded-full bg-amber-400/90 px-2.5 py-1 text-[10px] font-black text-amber-950">
                    Day {detail.dayIndex} of {detail.durationDays}
                  </span>
                ) : null}
              </div>

              {detail.isMultiDay ? (
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wide text-white/75">
                    <span>Project progress</span>
                    <span>
                      {detail.workedDays}/{detail.durationDays} days worked
                    </span>
                  </div>
                  <motion.div className="h-2.5 overflow-hidden rounded-full bg-white/15">
                    <motion.div
                      className="h-full rounded-full bg-linear-to-r from-brand-bright to-brand"
                      initial={reduce ? false : { width: 0 }}
                      animate={{ width: `${detail.progressPct}%` }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </motion.div>
                  <p className="mt-1.5 text-xs text-white/70">
                    {detail.startLabel} → {detail.endLabel} · {detail.daysRemaining} day
                    {detail.daysRemaining === 1 ? '' : 's'} left on calendar
                  </p>
                </div>
              ) : null}
            </div>
          </motion.div>

          <motion.div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <GlassPanel className="grid grid-cols-2 gap-3 border-slate-200/90 p-4 sm:grid-cols-4">
              {[
                { label: 'Role', value: detail.job.role, icon: HardHat },
                { label: 'Rate', value: detail.job.rateLabel || '—', icon: CheckCircle2 },
                { label: 'Shift', value: detail.job.shiftLabel, icon: Clock },
                { label: 'Total time', value: detail.totalWorkTime, icon: Timer },
              ].map((cell) => {
                const Icon = cell.icon
                return (
                  <div key={cell.label} className="min-w-0">
                    <Icon className="h-4 w-4 text-slate-400" aria-hidden />
                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">{cell.label}</p>
                    <p className="mt-0.5 text-xs font-extrabold text-slate-900">{cell.value}</p>
                  </div>
                )
              })}
            </GlassPanel>

            <section>
              <h2 className="mb-2 px-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                Customer & location
              </h2>
              <GlassPanel className="space-y-3 border-slate-200/90 p-4">
                <p className="flex items-start gap-2 text-sm font-bold text-slate-900">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                  {detail.job.customerName}
                </p>
                <p className="flex items-start gap-2 text-sm text-slate-700">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  {detail.job.location}
                </p>
                {detail.gateInstruction ? (
                  <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-bold text-slate-800">Entry note:</span> {detail.gateInstruction}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {detail.job.facilities?.map((f) => (
                    <span
                      key={f}
                      className="rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900"
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <AppSecondaryButton
                  as="a"
                  href={`https://www.google.com/maps/search/?api=1&query=${detail.job.mapQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 text-sm"
                >
                  <Navigation className="h-4 w-4" aria-hidden />
                  Open in Google Maps
                </AppSecondaryButton>
              </GlassPanel>
            </section>

            {rawJob && assignmentKind === 'active' && !['COMPLETED', 'CANCELLED'].includes(rawJob.status) ? (
              <section>
                <h2 className="mb-2 px-0.5 text-xs font-bold uppercase tracking-wider text-brand">
                  Live Job Actions
                </h2>
                <GlassPanel className="space-y-3 border-brand/20 bg-brand/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">Current Status:</span>
                    <AppBadge variant="brand">{rawJob.status}</AppBadge>
                  </div>
                  
                  {errorMsg && (
                    <p className="text-xs font-bold text-rose-600">{errorMsg}</p>
                  )}

                  {(() => {
                    const isMultiDay = rawJob.durationKind === 'multi_day'
                    let currentDayLog = null
                    let isDailyStartRequired = false
                    let isDailyEndRequired = false
                    if (isMultiDay && rawJob.attendanceLog) {
                      currentDayLog = rawJob.attendanceLog.find(log => !log.endOtpVerifiedAt) || rawJob.attendanceLog[rawJob.attendanceLog.length - 1]
                      if (currentDayLog) {
                        isDailyStartRequired = !currentDayLog.startOtpVerifiedAt
                        isDailyEndRequired = !!currentDayLog.startOtpVerifiedAt && !currentDayLog.endOtpVerifiedAt
                      }
                    }

                    return (
                      <>
                        {isMultiDay && (isDailyStartRequired || isDailyEndRequired) ? (
                          <div className={`space-y-4 ${isDailyStartRequired ? '' : 'border-emerald-500/20 bg-emerald-50'}`}>
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
                                className={`w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold tracking-widest outline-hidden focus:border-${isDailyStartRequired ? 'brand' : 'emerald-500'} focus:ring-1 focus:ring-${isDailyStartRequired ? 'brand' : 'emerald-500'}`}
                                maxLength={4}
                              />
                            </div>
                            <AppPrimaryButton 
                              type="button" 
                              onClick={() => handleDailyOtpSubmit(isDailyStartRequired ? 'start' : 'end', currentDayLog.dayNumber, true)}
                              disabled={loading || otp.length < 4 || !jobImage || uploadingImage}
                              className={`w-full ${isDailyStartRequired ? '' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            >
                              {loading ? 'Updating...' : `${isDailyStartRequired ? 'Start Shift' : 'End Shift'}`}
                            </AppPrimaryButton>
                          </div>
                        ) : rawJob.status === 'ACCEPTED' && !isMultiDay ? (
                          <AppPrimaryButton 
                            type="button" 
                            onClick={() => handleStatusUpdate('EN_ROUTE', false)}
                            disabled={loading}
                            className="w-full"
                          >
                            {loading ? 'Updating...' : 'I am En Route'}
                          </AppPrimaryButton>
                        ) : rawJob.status === 'EN_ROUTE' && !isMultiDay ? (
                          <div className="space-y-4">
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
                                placeholder="Enter Start OTP" 
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold tracking-widest outline-hidden focus:border-brand focus:ring-1 focus:ring-brand"
                                maxLength={4}
                              />
                            </div>
                            <AppPrimaryButton 
                              type="button" 
                              onClick={() => handleStatusUpdate('STARTED', true)}
                              disabled={loading || otp.length < 4 || !jobImage || uploadingImage}
                              className="w-full"
                            >
                              {loading ? 'Updating...' : 'Start Job'}
                            </AppPrimaryButton>
                          </div>
                        ) : rawJob.status === 'STARTED' && !isMultiDay ? (
                          <div className="space-y-4">
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
                                placeholder="Enter Completion OTP" 
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold tracking-widest outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                maxLength={4}
                              />
                            </div>
                            <AppPrimaryButton 
                              type="button" 
                              onClick={() => handleStatusUpdate('COMPLETED', true)}
                              disabled={loading || otp.length < 4 || !jobImage || uploadingImage}
                              className="w-full bg-emerald-600 hover:bg-emerald-700"
                            >
                              {loading ? 'Updating...' : 'Complete Job'}
                            </AppPrimaryButton>
                          </div>
                        ) : null}
                      </>
                    )
                  })()}
                </GlassPanel>
              </section>
            ) : null}

            <section>
              <h2 className="mb-2 px-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">Supervisor</h2>
              <GlassPanel className="flex items-center gap-3 border-slate-200/90 p-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                  <User className="h-6 w-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-slate-900">{detail.job.supervisor || '—'}</p>
                  <p className="text-xs text-slate-500">On-site contact for safety & directions</p>
                  {detail.job.supervisorPhone ? (
                    <a
                      href={`tel:${detail.job.supervisorPhone}`}
                      className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-brand"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden />
                      {detail.job.supervisorPhone}
                    </a>
                  ) : null}
                </div>
              </GlassPanel>
            </section>

            {detail.rawNotes ? (
              <section>
                <h2 className="mb-2 px-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">Instructions</h2>
                <GlassPanel className="border-slate-200/90 p-4 text-sm leading-relaxed text-slate-700">
                  {detail.rawNotes}
                </GlassPanel>
              </section>
            ) : null}

            <section>
              <div className="mb-2 flex items-center justify-between px-0.5">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <CalendarRange className="h-3.5 w-3.5" aria-hidden />
                  {detail.isMultiDay ? 'Project attendance' : 'Shift attendance'}
                </h2>
                <span className="text-[10px] font-semibold text-slate-500">
                  Linked to check-in / check-out
                </span>
              </div>
              <ul className="space-y-2">
                {detail.attendanceLog.map((row) => (
                  <li key={row.day}>
                    <GlassPanel
                      className={`border-slate-200/90 p-3 ${
                        row.isToday ? 'ring-2 ring-brand/25' : row.isFuture ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[row.status.tone] || STATUS_DOT.slate}`}
                              aria-hidden
                            />
                            <p className="text-sm font-bold text-slate-900">{row.dayLabel}</p>
                            {row.isToday ? <AppBadge variant="brand">Today</AppBadge> : null}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {row.workTime} · {row.status.label}
                          </p>
                        </div>
                      </div>
                      {row.punches.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {row.punches.map((p, i) => (
                            <li
                              key={`${p.at}-${i}`}
                              className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                                p.type === 'in'
                                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80'
                                  : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80'
                              }`}
                            >
                              {p.type === 'in' ? 'In' : 'Out'} {p.time}
                            </li>
                          ))}
                        </ul>
                      ) : row.isFuture ? (
                        <p className="mt-2 text-[11px] italic text-slate-400">Scheduled — not started</p>
                      ) : (
                        <p className="mt-2 text-[11px] text-slate-400">No punches recorded</p>
                      )}
                    </GlassPanel>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-1.5 px-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <History className="h-3.5 w-3.5" aria-hidden />
                Assignment history
              </h2>
              <ol className="relative border-l-2 border-slate-200/90 pl-4 ml-1">
                {detail.timeline.map((ev, i) => (
                  <li key={`${ev.at}-${i}`} className="relative pb-4 last:pb-0">
                    <span
                      className="absolute -left-[1.3rem] top-1 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-slate-50"
                      aria-hidden
                    />
                    <p className="text-sm font-extrabold text-slate-900">{ev.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{ev.body}</p>
                  </li>
                ))}
              </ol>
            </section>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  if (!open) return null
  return createPortal(sheet, document.body)
}
