import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, HelpCircle, AlertTriangle, ChevronDown } from 'lucide-react'
import { faqApi } from '../../api/faqApi.js'

export function AppFaqPage() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    async function fetchFaqs() {
      try {
        setLoading(true)
        const res = await faqApi.getFaqs()
        setFaqs(res.data.faqs || [])
      } catch (err) {
        console.error('Failed to load FAQs:', err)
        setError('Failed to load FAQs. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    fetchFaqs()
  }, [])

  return (
    <motion.div
      className="flex min-h-screen flex-col bg-slate-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex-1 p-5">
        {loading ? (
          <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <p className="text-sm font-medium">Loading FAQs...</p>
          </div>
        ) : error ? (
          <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-400">
            <AlertTriangle className="h-10 w-10 text-rose-500" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mb-6 flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
            </div>
            
            {faqs.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/60">
                <p className="text-slate-500">No FAQs available right now.</p>
              </div>
            ) : (
              faqs.map((faq) => {
                const isOpen = openId === faq._id
                return (
                  <div 
                    key={faq._id}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 transition hover:ring-brand/30"
                  >
                    <button
                      onClick={() => setOpenId(isOpen ? null : faq._id)}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left outline-none"
                    >
                      <span className="font-semibold text-slate-800">{faq.question}</span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
                          isOpen ? 'rotate-180 text-brand' : ''
                        }`}
                      />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="border-t border-slate-100 p-5 pt-4 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
