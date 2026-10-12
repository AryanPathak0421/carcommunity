import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Loader2, Edit2, Trash2, CheckCircle2, AlertCircle, Save, X } from 'lucide-react'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { apiClient } from '../../api/http.js'

export function AdminFaqPage() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [currentFaq, setCurrentFaq] = useState(null)

  useEffect(() => {
    fetchFaqs()
  }, [])

  async function fetchFaqs() {
    try {
      setLoading(true)
      const res = await apiClient.get('/admin/faqs')
      setFaqs(res.data.faqs || [])
    } catch (err) {
      console.error('Failed to fetch FAQs:', err)
      showMessage('error', 'Failed to load FAQs.')
    } finally {
      setLoading(false)
    }
  }

  function showMessage(type, text) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  function handleAddNew() {
    setCurrentFaq({ question: '', answer: '', order: faqs.length })
    setIsEditing(true)
  }

  function handleEdit(faq) {
    setCurrentFaq({ ...faq })
    setIsEditing(true)
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return
    try {
      await apiClient.delete(`/admin/faqs/${id}`)
      setFaqs(faqs.filter(f => f._id !== id))
      showMessage('success', 'FAQ deleted successfully.')
    } catch (err) {
      console.error(err)
      showMessage('error', 'Failed to delete FAQ.')
    }
  }

  async function handleSaveFaq(e) {
    e.preventDefault()
    try {
      setSaving(true)
      if (currentFaq._id) {
        // Update
        const res = await apiClient.put(`/admin/faqs/${currentFaq._id}`, currentFaq)
        setFaqs(faqs.map(f => f._id === res.data.faq._id ? res.data.faq : f))
        showMessage('success', 'FAQ updated successfully.')
      } else {
        // Create
        const res = await apiClient.post('/admin/faqs', currentFaq)
        setFaqs([res.data.faq, ...faqs])
        showMessage('success', 'FAQ created successfully.')
      }
      setIsEditing(false)
      setCurrentFaq(null)
    } catch (err) {
      console.error(err)
      showMessage('error', 'Failed to save FAQ.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm font-medium">Loading FAQs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Frequently Asked Questions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the universal FAQs that appear across all user panels.
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add FAQ
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-3 rounded-xl p-4 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-rose-50 text-rose-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {isEditing ? (
        <GlassPanel className="p-6">
          <form onSubmit={handleSaveFaq} className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
              <h2 className="text-lg font-bold text-slate-800">
                {currentFaq._id ? 'Edit FAQ' : 'Create New FAQ'}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Question</label>
                <input
                  type="text"
                  required
                  value={currentFaq.question}
                  onChange={e => setCurrentFaq({...currentFaq, question: e.target.value})}
                  className="w-full rounded-xl border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-brand focus:ring-1 focus:ring-brand"
                  placeholder="e.g., How do I book a service?"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Answer</label>
                <textarea
                  required
                  value={currentFaq.answer}
                  onChange={e => setCurrentFaq({...currentFaq, answer: e.target.value})}
                  rows={5}
                  className="w-full resize-y rounded-xl border-slate-200 bg-white px-4 py-3 text-sm transition focus:border-brand focus:ring-1 focus:ring-brand"
                  placeholder="Provide the answer here..."
                />
              </div>

              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Order</label>
                  <input
                    type="number"
                    value={currentFaq.order}
                    onChange={e => setCurrentFaq({...currentFaq, order: Number(e.target.value)})}
                    className="w-full rounded-xl border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-70"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save FAQ'}
              </button>
            </div>
          </form>
        </GlassPanel>
      ) : (
        <div className="grid gap-4">
          {faqs.length === 0 ? (
            <GlassPanel className="p-12 text-center">
              <p className="text-slate-500">No FAQs found. Create one to get started.</p>
            </GlassPanel>
          ) : (
            faqs.map(faq => (
              <GlassPanel key={faq._id} className="p-5">
                <div className="flex gap-4 items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <h3 className="font-bold text-slate-800">{faq.question}</h3>
                    <p className="text-sm text-slate-600">{faq.answer}</p>
                    <p className="text-xs text-slate-400">Order: {faq.order}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(faq)}
                      className="p-2 text-slate-400 hover:text-brand transition rounded-lg hover:bg-brand/5"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(faq._id)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </GlassPanel>
            ))
          )}
        </div>
      )}
    </div>
  )
}
