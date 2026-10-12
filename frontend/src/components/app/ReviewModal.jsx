import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Loader2, Star, X } from 'lucide-react'
import { reviewsApi } from '../../api/reviewsApi.js'
import { ApiError } from '../../api/http.js'

export function ReviewModal({ open, bookingId, onClose }) {
  const reduce = useReducedMotion()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      setError('Please select a rating')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await reviewsApi.submitReview({
        bookingId,
        rating,
        comment: comment.trim() || undefined,
      })
      setSubmitted(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }, [bookingId, rating, comment, onClose])

  const displayRating = hoverRating || rating

  const modalContent = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={submitted ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 20, scale: 0.95 }}
            className="fixed inset-x-4 bottom-auto top-1/2 z-[201] mx-auto max-w-md -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl"
          >
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
            </button>

            {submitted ? (
              <div className="py-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <Star className="mx-auto h-16 w-16 fill-amber-400 text-amber-400" />
                </motion.div>
                <p className="mt-4 text-lg font-extrabold text-slate-900">Thank you!</p>
                <p className="mt-1 text-sm text-slate-500">Your review has been submitted</p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-lg font-extrabold text-slate-900">Rate this Service</p>
                  <p className="mt-1 text-sm text-slate-500">How was your experience?</p>
                </div>

                {/* Stars */}
                <div className="mt-5 flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`h-10 w-10 transition-colors ${
                          star <= displayRating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  <label htmlFor="review-comment" className="sr-only">
                    Comment
                  </label>
                  <textarea
                    id="review-comment"
                    rows={3}
                    placeholder="Any feedback? (optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand"
                  />
                </div>

                {error && <p className="mt-3 text-center text-sm font-semibold text-rose-600">{error}</p>}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || rating === 0}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-sm font-bold text-white shadow-lg shadow-brand/20 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Star className="h-5 w-5 fill-white" />
                  )}
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
