import { useState } from 'react'
import { ClipboardList, Trash2, XCircle } from 'lucide-react'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import {
  useGetAdminBookingsQuery,
  useDeleteAdminBookingMutation
} from '../../store/api/adminBookingApi.js'

const BOOKING_STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'CREATED', label: 'Created' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'STARTED', label: 'Started' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
]

function BookingDetailsModal({ booking, onClose }) {
  if (!booking) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-4 border-slate-100">
          <h2 className="text-lg font-extrabold text-slate-900">Booking Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-600 transition">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs">Service</p>
              <p className="font-semibold">{booking.serviceId?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Subcategory</p>
              <p className="font-semibold">{booking.subcategoryId?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Status</p>
              <p className="font-bold text-brand">{booking.status}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Payment Method</p>
              <p className="font-semibold">{booking.paymentMethod}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Duration</p>
              <p className="font-semibold">{booking.durationDays} {booking.durationKind}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Scheduled At</p>
              <p className="font-semibold">{booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleString() : 'N/A'}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-slate-500 text-xs mb-1">User Information</p>
            <p className="font-semibold">{booking.userId?.fullName}</p>
            <p className="text-slate-600">{booking.userId?.phone}</p>
            <p className="text-slate-600 mt-1 text-xs">{booking.address?.locationText}</p>
          </div>

          {booking.laborId && (
            <div className="border-t border-slate-100 pt-4">
              <p className="text-slate-500 text-xs mb-1">Assigned Mechanic</p>
              <p className="font-semibold">{booking.laborId?.fullName}</p>
              <p className="text-slate-600">{booking.laborId?.phone}</p>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-500 text-xs">Start OTP</p>
              <p className="font-mono font-semibold">{booking.startOtp || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Completion OTP</p>
              <p className="font-mono font-semibold">{booking.completionOtp || 'N/A'}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-500 text-xs mb-2">Start Work Image</p>
              {booking.startWorkImage ? (
                <img src={booking.startWorkImage} alt="Start Work" className="w-full h-auto rounded-lg shadow-sm border border-slate-200" />
              ) : (
                <div className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs italic">
                  Not uploaded
                </div>
              )}
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-2">End Work Image</p>
              {booking.endWorkImage ? (
                <img src={booking.endWorkImage} alt="End Work" className="w-full h-auto rounded-lg shadow-sm border border-slate-200" />
              ) : (
                <div className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs italic">
                  Not uploaded
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 bg-slate-50 p-3 rounded-lg">
            <p className="font-extrabold text-sm mb-2">Financial Breakdown</p>
            <div className="flex justify-between text-xs text-slate-600 py-1">
              <span>Base Price:</span>
              <span className="font-semibold text-slate-900">₹{booking.basePrice}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 py-1">
              <span>Platform Fee:</span>
              <span className="font-semibold text-slate-900">₹{booking.platformFee}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 py-1">
              <span>Taxes:</span>
              <span className="font-semibold text-slate-900">₹{booking.taxes}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-900 py-1 font-bold border-t border-slate-200 mt-1 pt-2">
              <span>Total Amount:</span>
              <span>₹{booking.totalAmount}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 py-1 mt-2">
              <span>Commission (Admin):</span>
              <span className="font-semibold text-brand">₹{booking.commissionAmount}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 py-1">
              <span>Mechanic Share:</span>
              <span className="font-semibold text-green-600">₹{booking.laborShare}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function IndividualBookingsTab() {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data, isLoading, isError, refetch } = useGetAdminBookingsQuery(
    { status: statusFilter },
  )
  const [deleteAdminBooking] = useDeleteAdminBookingMutation()

  const bookings = data?.bookings ?? []

  const confirmDelete = async () => {
    if (!deleteConfirmId) return
    setIsDeleting(true)
    try {
      await deleteAdminBooking(deleteConfirmId).unwrap()
      refetch()
    } catch (err) {
      console.error('Failed to delete booking:', err)
      alert('Failed to delete booking.')
    } finally {
      setIsDeleting(false)
      setDeleteConfirmId(null)
    }
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {BOOKING_STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${
                statusFilter === f.value
                  ? 'bg-brand text-white ring-brand'
                  : 'bg-white text-slate-600 ring-slate-200 hover:ring-brand/30'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <GlassPanel className="p-6">
          <p className="text-sm text-slate-500">Loading bookings…</p>
        </GlassPanel>
      ) : null}

      {isError ? (
        <GlassPanel className="border-rose-200 p-6">
          <p className="text-sm font-semibold text-rose-800">Failed to load bookings.</p>
        </GlassPanel>
      ) : null}

      {!isLoading && !isError && bookings.length === 0 ? (
        <GlassPanel className="p-8 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-slate-700">No bookings in this filter.</p>
        </GlassPanel>
      ) : null}

      <ul className="space-y-4">
        {bookings.map((b) => {
          if (b.status === 'FAILED') return null;
          return (
          <li key={b._id}>
            <GlassPanel className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{b.serviceId?.name || 'Service'} ({b.type})</p>
                  <p className="text-xs text-slate-500">
                    User: {b.userId?.fullName || 'Unknown'} · {b.userId?.phone}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Location: {b.address?.locationText || 'No location'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Date: {new Date(b.createdAt).toLocaleDateString()}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-700">
                    Status: {b.status}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    Payment Status: 
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider ${b.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {b.paymentStatus || 'PENDING'}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(b._id)}
                    className="flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:border-rose-300 hover:bg-rose-100 transition shadow-sm"
                    title="Delete permanently"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(b)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-bold text-brand hover:border-brand/30 hover:bg-brand/5 transition"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </GlassPanel>
          </li>
          )
        })}
      </ul>

      {selectedBooking && (
        <BookingDetailsModal 
          booking={selectedBooking} 
          onClose={() => setSelectedBooking(null)} 
        />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-900/5">
            <h3 className="text-lg font-bold text-slate-900">Confirm Deletion</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to permanently delete this booking? This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-700 focus:ring-2 focus:ring-rose-500/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminBookingsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 md:px-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Bookings</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage customer bookings and track the assigned mechanic, status and payment.
        </p>
      </div>

      <IndividualBookingsTab />
    </div>
  )
}
