import { useNavigate } from 'react-router-dom'
import { Calendar, CreditCard, MapPin, User } from 'lucide-react'
import { GlassPanel } from '../ui/GlassPanel.jsx'

const STATUS_STYLES = {
  CREATED: 'bg-amber-100 text-amber-800 border-amber-200',
  BROADCASTING: 'bg-amber-100 text-amber-800 border-amber-200',
  ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-200',
  ASSIGNED: 'bg-blue-100 text-blue-800 border-blue-200',
  EN_ROUTE: 'bg-purple-100 text-purple-800 border-purple-200',
  STARTED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  COMPLETED: 'bg-slate-100 text-slate-800 border-slate-200',
  CANCELLED: 'bg-rose-100 text-rose-800 border-rose-200',
  FAILED: 'bg-rose-100 text-rose-800 border-rose-200',
  REFUNDED: 'bg-slate-100 text-slate-800 border-slate-200',
}

const STATUS_LABELS = {
  BROADCASTING: 'Finding mechanic',
  EN_ROUTE: 'On the way',
  STARTED: 'In progress',
}

const CLOSED_STATUSES = new Set(['CANCELLED', 'FAILED', 'REFUNDED'])

export function B2cBookingCard({ booking, isLabour }) {
  const navigate = useNavigate()
  const status = (booking.status || 'CREATED').toUpperCase()
  const subcategory = typeof booking.subcategoryId === 'object' ? booking.subcategoryId : null
  const isUnpaid = booking.paymentMethod === 'ONLINE' && booking.paymentStatus !== 'PAID'
  const isUnreviewed = !booking.review
  const isActive = !CLOSED_STATUSES.has(status) && (status !== 'COMPLETED' || isUnpaid || isUnreviewed)

  return (
    <GlassPanel
      className="cursor-pointer overflow-hidden p-0 transition-all hover:shadow-lg border-slate-200/60"
      onClick={() => {
        if (isActive) {
          navigate(`/app/tracking/${booking._id}`)
        }
      }}
    >
      <div className="flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between p-4 pb-3 border-b border-slate-100/80 bg-white/50">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${STATUS_STYLES[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {STATUS_LABELS[status] || status.replace(/_/g, ' ')}
              </span>
              {booking.type && (
                <>
                  <span className="text-[10px] font-bold text-slate-400">•</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{booking.type}</span>
                </>
              )}
            </div>
            <p className="truncate text-base font-extrabold text-slate-900 leading-tight">
              {booking.serviceId?.name || subcategory?.name || 'Service Booking'}
            </p>
            {subcategory?.name && (
                <p className="truncate text-xs text-slate-500 font-medium mt-1">
                  {subcategory.name}
                </p>
            )}
          </div>
          <div className="flex flex-col items-end shrink-0 pl-2">
            {booking.totalAmount && (
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Amount</p>
                <span className="text-lg font-black text-brand">
                  ₹{isLabour ? (booking.laborShare || (booking.totalAmount - (booking.commissionAmount || 0))).toFixed(0) : booking.totalAmount}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="flex flex-col gap-3 p-4 bg-slate-50/50">
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white shadow-sm border border-slate-100 shrink-0">
              <Calendar className="h-4 w-4 text-brand" />
            </div>
            <span className="font-semibold truncate">
              {booking.type === 'SCHEDULED' && booking.scheduledAt
                ? `${new Date(booking.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at ${booking.timeSlot || ''}`
                : booking.createdAt 
                  ? new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
            </span>
          </div>
          
          {booking.address?.locationText && (
            <div className="flex items-start gap-3 text-sm text-slate-700">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white shadow-sm border border-slate-100 shrink-0 mt-0.5">
                <MapPin className="h-4 w-4 text-brand" />
              </div>
              <span className="line-clamp-2 leading-snug mt-1 font-medium text-slate-600">{booking.address.locationText}</span>
            </div>
          )}

          {((isLabour && booking.userId) || (!isLabour && booking.laborId)) && (
            <div className="flex items-center gap-3 text-sm text-slate-700 mt-2 pt-3 border-t border-slate-100/80">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white shadow-sm border border-slate-100 shrink-0">
                <User className="h-4 w-4 text-brand" />
              </div>
              <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">{isLabour ? 'Customer' : 'Professional'}</span>
                  <span className="font-bold leading-tight text-slate-800">
                    {isLabour 
                    ? `${booking.userId?.fullName || 'Guest'} ${booking.userId?.phone ? `• ${booking.userId.phone}` : ''}`
                    : `${booking.laborId?.fullName || booking.laborId?.name || 'Assigned'} ${booking.laborId?.phone ? `• ${booking.laborId.phone}` : ''}`}
                  </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Section */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pt-3 border-t border-slate-100/80 bg-white">
          {booking.paymentMethod ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-slate-50 border border-slate-100 shrink-0">
                  <CreditCard className="h-3 w-3 text-slate-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Payment</span>
                  <div className="flex items-center gap-1.5 text-xs mt-0.5">
                    <span className="font-extrabold text-slate-700">{booking.paymentMethod}</span>
                    <span className="text-[10px] text-slate-300">•</span>
                    <span className={`font-bold ${booking.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {booking.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
          ) : <div />}
          
          {(booking.startOtp || booking.completionOtp) && (
            <div className="flex gap-2">
              {booking.startOtp && (
                <div className="flex flex-col items-center px-3 py-1.5 bg-blue-50/50 border border-blue-100/50 rounded-lg">
                  <span className="text-[9px] font-bold text-blue-500/80 uppercase tracking-wider mb-0.5">Start OTP</span>
                  <span className="text-sm font-black text-blue-700 leading-none">{booking.startOtp}</span>
                </div>
              )}
              {booking.completionOtp && (
                <div className="flex flex-col items-center px-3 py-1.5 bg-purple-50/50 border border-purple-100/50 rounded-lg">
                  <span className="text-[9px] font-bold text-purple-500/80 uppercase tracking-wider mb-0.5">End OTP</span>
                  <span className="text-sm font-black text-purple-700 leading-none">{booking.completionOtp}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </GlassPanel>
  )
}
