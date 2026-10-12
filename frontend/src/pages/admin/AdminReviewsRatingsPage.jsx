import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, FileText, Loader2, Star, User } from 'lucide-react'
import { reviewsApi } from '../../api/reviewsApi.js'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { AppBadge } from '../../components/app-ui/data-display/AppBadge.jsx'

export function AdminReviewsRatingsPage() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    let cancelled = false
    const fetchReviews = async () => {
      try {
        const res = await reviewsApi.getAllReviews()
        if (!cancelled) {
          setReviews(res.data.reviews || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load reviews')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchReviews()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )
  }

  if (error) {
    return (
      <GlassPanel className="p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
        <p className="mt-4 text-lg font-bold text-slate-900">Error Loading Reviews</p>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </GlassPanel>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassPanel className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Reviews</p>
              <p className="text-2xl font-black text-slate-900">{reviews.length}</p>
            </div>
          </div>
        </GlassPanel>
        
        {/* Can add average rating, etc in the future */}
      </div>

      <GlassPanel className="overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">All Reviews</h2>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'individual', 'mechanic'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  filter === f
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f === 'ALL' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>
        
        {(() => {
          const filteredReviews = reviews.filter(r => {
            if (filter === 'ALL') return true
            if (r.reviewerId?.role === filter) return true
            return false
          })

          return filteredReviews.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-lg font-bold text-slate-900">No Reviews Yet</p>
              <p className="mt-1 text-sm text-slate-500">When users submit reviews, they will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReviews.map((review) => (
                <div key={review._id} className="p-5 transition hover:bg-slate-50/50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <AppBadge variant={review.rating >= 4 ? 'success' : review.rating <= 2 ? 'danger' : 'warning'}>
                        {review.rating} / 5
                      </AppBadge>
                      <span className="text-xs font-semibold text-slate-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {review.comment ? (
                      <p className="text-sm text-slate-700 font-medium bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                        "{review.comment}"
                      </p>
                    ) : (
                      <p className="text-sm italic text-slate-400">No comment provided</p>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reviewer {review.reviewerId?.role ? `(${review.reviewerId.role})` : ''}</p>
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {review.reviewerId?.fullName || review.reviewerId?.name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{review.reviewerId?.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-brand/60">Reviewed {review.revieweeId?.role ? `(${review.revieweeId.role})` : ''}</p>
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {review.revieweeId?.fullName || review.revieweeId?.name || 'Unknown Mechanic'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{review.revieweeId?.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {review.bookingId && (
                    <div className="shrink-0 rounded-xl bg-slate-50 p-3 text-right border border-slate-100 sm:min-w-[140px]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Booking Ref</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">#{review.bookingId._id.substring(review.bookingId._id.length - 6).toUpperCase()}</p>
                      <AppBadge variant="neutral" className="mt-2 text-[10px]">
                        {review.bookingId.type}
                      </AppBadge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          )
        })()}
      </GlassPanel>
    </div>
  )
}
