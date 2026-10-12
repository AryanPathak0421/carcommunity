import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2 } from 'lucide-react'

export function AddUserSubscriptionPlanModal({ isOpen, onClose, onSave, mode = 'create', initialData = null }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [features, setFeatures] = useState([''])
  const [buttonText, setButtonText] = useState('Subscribe Now')
  const [recommended, setRecommended] = useState(false)
  const [allowedBookings, setAllowedBookings] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (initialData && (mode === 'edit' || mode === 'view')) {
        setName(initialData.name || '')
        setPrice(initialData.price || '')
        setDescription(initialData.description || '')
        setFeatures(initialData.features?.length ? initialData.features : [''])
        setButtonText(initialData.buttonText || 'Subscribe Now')
        setRecommended(initialData.recommended || false)
        setAllowedBookings(initialData.allowedBookings || '')
      } else {
        setName('')
        setPrice('')
        setDescription('')
        setFeatures([''])
        setButtonText('Subscribe Now')
        setRecommended(false)
        setAllowedBookings('')
      }
    }
  }, [isOpen, initialData, mode])

  if (!isOpen) return null

  const isViewMode = mode === 'view'

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...features]
    newFeatures[index] = value
    setFeatures(newFeatures)
  }

  const addFeature = () => setFeatures([...features, ''])
  const removeFeature = (index) => {
    const newFeatures = features.filter((_, i) => i !== index)
    setFeatures(newFeatures)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const planData = {
      name,
      price: Number(price),
      description,
      features: features.filter(f => f.trim() !== ''),
      buttonText,
      recommended,
      planType: 'individual',
      allowedBookings: Number(allowedBookings)
    }
    await onSave(planData)
    setIsSubmitting(false)
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>

          <h2 className="mb-6 text-2xl font-bold text-slate-800">
            {mode === 'create' ? 'Add User Plan' : mode === 'edit' ? 'Edit User Plan' : 'View User Plan'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Plan Name</label>
              <input
                type="text"
                required
                disabled={isViewMode}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-70"
                placeholder="e.g. Basic Plan"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">Price (₹)</label>
                <input
                  type="number"
                  required
                  disabled={isViewMode}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-70"
                  placeholder="e.g. 19"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">Allowed Bookings</label>
                <input
                  type="number"
                  required
                  disabled={isViewMode}
                  value={allowedBookings}
                  onChange={(e) => setAllowedBookings(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-70"
                  placeholder="e.g. 3"
                />
              </div>
            </div>


            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                rows="2"
                disabled={isViewMode}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-70"
                placeholder="Brief description..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Features</label>
              <div className="space-y-2">
                {features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      disabled={isViewMode}
                      value={feature}
                      onChange={(e) => handleFeatureChange(index, e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-70"
                      placeholder="e.g. Priority Support"
                    />
                    {!isViewMode && features.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!isViewMode && (
                <button
                  type="button"
                  onClick={addFeature}
                  className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand transition hover:text-brand/80"
                >
                  <Plus className="h-4 w-4" /> Add Feature
                </button>
              )}
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">Button Text</label>
                <input
                  type="text"
                  disabled={isViewMode}
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-70"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 py-2">
              <input
                type="checkbox"
                id="recommended"
                disabled={isViewMode}
                checked={recommended}
                onChange={(e) => setRecommended(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand disabled:opacity-70"
              />
              <label htmlFor="recommended" className="text-sm font-medium text-slate-700">
                Mark as Recommended Plan
              </label>
            </div>

            {!isViewMode && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand/90 hover:shadow-brand/30 disabled:opacity-70"
              >
                {isSubmitting ? 'Saving...' : 'Save Plan'}
              </button>
            )}
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
