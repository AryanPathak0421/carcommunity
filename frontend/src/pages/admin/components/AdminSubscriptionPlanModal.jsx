import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2 } from 'lucide-react'

export function AdminSubscriptionPlanModal({ isOpen, onClose, onSave, mode = 'create', initialData = null }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('per month')
  const [description, setDescription] = useState('')
  const [features, setFeatures] = useState([''])
  const [buttonText, setButtonText] = useState('Subscribe Now')
  const [recommended, setRecommended] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (initialData && (mode === 'edit' || mode === 'view')) {
        setName(initialData.name || '')
        setPrice(initialData.price || '')
        setDuration(initialData.duration || '')
        setDescription(initialData.description || '')
        setFeatures(initialData.features?.length ? initialData.features : [''])
        setButtonText(initialData.buttonText || '')
        setRecommended(initialData.recommended || false)
      } else {
        setName('')
        setPrice('')
        setDuration('per month')
        setDescription('')
        setFeatures([''])
        setButtonText('Subscribe Now')
        setRecommended(false)
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
      duration,
      description,
      features: features.filter(f => f.trim() !== ''),
      buttonText,
      recommended
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>

          <h2 className="mb-6 text-2xl font-bold text-slate-800">
            {mode === 'create' ? 'Add Pricing Plan' : mode === 'edit' ? 'Edit Pricing Plan' : 'View Pricing Plan'}
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
                className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand disabled:opacity-70"
                placeholder="e.g. 3-Month Plan"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Price (₹)</label>
                <input
                  type="number"
                  required
                  disabled={isViewMode}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand disabled:opacity-70"
                  placeholder="e.g. 799"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Duration</label>
                <input
                  type="text"
                  required
                  disabled={isViewMode}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand disabled:opacity-70"
                  placeholder="e.g. for 3 months"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <input
                type="text"
                disabled={isViewMode}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand disabled:opacity-70"
                placeholder="Brief description of the plan"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Features (Bullet Points)</label>
              {features.map((feature, index) => (
                <div key={index} className="mb-2 flex items-center gap-2">
                  <input
                    type="text"
                    disabled={isViewMode}
                    value={feature}
                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                    className="flex-1 rounded-xl border-slate-200 bg-slate-50 px-4 py-2 outline-none transition focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand disabled:opacity-70"
                    placeholder="e.g. Access to all categories"
                  />
                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="rounded-full p-2 text-red-500 hover:bg-red-50 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {!isViewMode && (
                <button
                  type="button"
                  onClick={addFeature}
                  className="flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand/90"
                >
                  <Plus className="h-4 w-4" /> Add Feature
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Button Text</label>
                <input
                  type="text"
                  required
                  disabled={isViewMode}
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand disabled:opacity-70"
                  placeholder="e.g. Subscribe Now"
                />
              </div>
              <div className="flex h-[42px] items-center gap-2">
                <input
                  type="checkbox"
                  id="recommended"
                  disabled={isViewMode}
                  checked={recommended}
                  onChange={(e) => setRecommended(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-brand focus:ring-brand disabled:opacity-70"
                />
                <label htmlFor="recommended" className="text-sm font-medium text-slate-700">
                  Mark as "Most Popular"
                </label>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                {isViewMode ? 'Close' : 'Cancel'}
              </button>
              {!isViewMode && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand/90 hover:shadow-brand/30 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {mode === 'edit' ? 'Update Plan' : 'Save Pricing Plan'}
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
