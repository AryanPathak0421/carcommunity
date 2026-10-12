import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Headset, Minus, Plus } from 'lucide-react'
import { HomeSectionHeader } from './HomeSectionHeader.jsx'

const FAQS = [
  {
    q: 'Can I book a recurring service?',
    a: 'Yes, you can schedule a service for a date and time that suits you directly from the app.',
  },
  {
    q: 'How can I trust your service?',
    a: 'All mechanics listed on CarCommunity go through strict identity checks, background verification, and video Aadhaar KYC approval before accepting jobs.',
  },
  {
    q: 'Do I need to provide all the tools and equipment?',
    a: 'Mechanics bring basic tools for standard tasks. If your vehicle needs specific spare parts, you can mention them in the booking notes.',
  },
  {
    q: 'What if I need to cancel or reschedule my booking?',
    a: 'You can easily reschedule or cancel your booking through the "Your bookings" section in your profile before the shift begins.',
  },
]

export function HomeFaqSection() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section aria-labelledby="home-faq-title">
      <HomeSectionHeader id="home-faq-title" title="Frequently asked questions" />
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-[0_6px_18px_-12px_rgba(15,23,42,0.3)] ring-1 ring-slate-100">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx
          return (
            <div key={faq.q}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
              >
                <span className="text-[13px] font-bold leading-snug text-slate-900">{faq.q}</span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                  {isOpen ? <Minus className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden px-4 pb-3.5 text-xs leading-relaxed text-slate-600"
                  >
                    {faq.a}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <Link
        to="/app/support"
        className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.3)] ring-1 ring-slate-100 transition active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Headset className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-slate-900">Still need help?</span>
          <span className="block text-[11px] font-medium text-slate-500">Our support team is here for you</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      </Link>
    </section>
  )
}
