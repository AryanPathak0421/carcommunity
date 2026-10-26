import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Clock, LifeBuoy, Loader2, Mail, MessageCircle, Phone } from 'lucide-react'
import { CarCommunityLogo } from '../components/brand/CarCommunityLogo.jsx'
import { contactApi } from '../api/contactApi.js'
import { faqApi } from '../api/faqApi.js'
import { COMPANY } from '../data/legalContent.js'

const TOPICS = {
  customer: [
    {
      q: 'How do I book a mechanic?',
      a: 'Choose a service, set your location, pick Cash or Online payment and confirm. A nearby verified mechanic accepts your request and you can track them live. When they arrive, share the 4-digit start PIN from the booking screen. After the work is done, share the completion PIN.',
    },
    {
      q: 'Can I cancel or reschedule a booking?',
      a: 'You can cancel from the booking screen until the mechanic starts the work. Once the job has started it cannot be cancelled in the app. For a scheduled booking, cancel and book a new slot.',
    },
    {
      q: 'How do payments and refunds work?',
      a: 'You can pay in cash to the mechanic or online in the app, depending on what is available for your booking. If you were charged online for a booking that was cancelled or did not happen, contact us with the booking ID and we will look into it.',
    },
    {
      q: 'The mechanic did not arrive or did the wrong work',
      a: 'Please contact us with your booking ID and what happened. You can also raise a complaint from Profile → Help & support inside the app.',
    },
    {
      q: 'How do I delete my account?',
      a: 'Open the app, go to Profile → Request account deletion. You can also contact us from the registered mobile number and we will help. Finish or cancel any active booking first and use any wallet balance, because it cannot be recovered after deletion.',
    },
  ],
  mechanic: [
    {
      q: 'How do I get verified (KYC)?',
      a: 'Open the app, go to the KYC / onboarding screen and submit your documents and a short video. Review usually takes 1–2 business days. If something is flagged, update it and submit again. You can accept jobs only after you are verified.',
    },
    {
      q: 'Why am I not getting job requests?',
      a: 'Make sure you are verified, your availability is on, your work area is set, and you have selected the skills you offer. Requests only go to mechanics whose skills match the booking. Unpaid platform dues can also stop you from accepting new jobs.',
    },
    {
      q: 'How do the start and completion PINs work?',
      a: 'When you reach the customer, ask for the 4-digit start PIN shown on their booking screen to begin the job. After finishing, ask for the completion PIN to close it. Several wrong attempts lock the PIN for a while.',
    },
    {
      q: 'How do I get paid and withdraw earnings?',
      a: 'Online job earnings are added to your balance after the job is completed. Open Earnings, enter the amount (minimum ₹100) and your bank or UPI details to request a withdrawal. Cash jobs are collected by you directly.',
    },
    {
      q: 'What are admin dues?',
      a: 'For cash jobs the platform fee is added to your dues. You can pay it from the Earnings screen. Unpaid dues can stop you from receiving new jobs.',
    },
    {
      q: 'How do I delete my account?',
      a: 'Open the app, go to Profile → Request account deletion, or contact us from your registered number. Clear your dues, finish active jobs and withdraw your balance first, because it cannot be recovered after deletion.',
    },
  ],
}

function Topic({ q, a }) {
  return (
    <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm open:border-brand/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-extrabold text-slate-900 [&::-webkit-details-marker]:hidden">
        {q}
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden />
      </summary>
      <p className="whitespace-pre-line px-4 pb-4 text-sm font-medium leading-relaxed text-slate-600">{a}</p>
    </details>
  )
}

/**
 * Public Support / Help page: `/support` (customer app) and `/mechanic/support` (mechanic app).
 * Contact details come from Admin → Contact us; extra questions from the admin FAQ list.
 */
export function SupportPage({ audience = 'customer' }) {
  const isMechanic = audience === 'mechanic'
  const [contact, setContact] = useState(null)
  const [faqs, setFaqs] = useState([])

  useEffect(() => {
    const previous = document.title
    document.title = `Support — ${COMPANY.brand}${isMechanic ? ' Partner (Mechanic app)' : ''}`
    window.scrollTo(0, 0)
    let alive = true
    contactApi
      .get(audience)
      .then((res) => alive && setContact(res.data.contact))
      .catch(() => alive && setContact({}))
    faqApi
      .getFaqs()
      .then((res) => alive && setFaqs(res.data?.faqs ?? []))
      .catch(() => {})
    return () => {
      alive = false
      document.title = previous
    }
  }, [audience, isMechanic])

  const contactLinks = contact
    ? [
        contact.phone && { icon: Phone, label: 'Call us', value: contact.phone, href: `tel:${contact.phone}` },
        contact.whatsapp && {
          icon: MessageCircle,
          label: 'WhatsApp',
          value: contact.whatsapp,
          href: `https://wa.me/${contact.whatsapp.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`,
          external: true,
        },
        contact.email && { icon: Mail, label: 'Email', value: contact.email, href: `mailto:${contact.email}` },
      ].filter(Boolean)
    : []

  const contactPath = isMechanic ? '/mechanic/contact' : '/contact'
  const privacyPath = isMechanic ? '/mechanic/privacy' : '/privacy'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link
            to="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <CarCommunityLogo size="sm" tagline={false} />
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-[13px] font-bold">
            <Link to={contactPath} className="text-slate-500 hover:text-slate-800">
              Contact
            </Link>
            <Link to="/terms" className="text-slate-500 hover:text-slate-800">
              Terms
            </Link>
            <Link to={privacyPath} className="text-slate-500 hover:text-slate-800">
              Privacy
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <LifeBuoy className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              {isMechanic ? 'Mechanic support' : 'Help & support'}
            </h1>
            <p className="text-sm font-medium text-slate-600">
              {isMechanic
                ? 'Answers about jobs, verification, payouts and your account.'
                : 'Answers about bookings, payments and your account.'}
            </p>
          </div>
        </div>

        <section className="mt-8" aria-labelledby="support-contact">
          <h2 id="support-contact" className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Talk to us
          </h2>
          {!contact ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
            </p>
          ) : (
            <>
              <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                {contactLinks.map((c) => {
                  const Icon = c.icon
                  return (
                    <li key={c.label}>
                      <a
                        href={c.href}
                        {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand/40 hover:shadow-md"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            {c.label}
                          </span>
                          <span className="block break-words text-sm font-extrabold text-slate-900">{c.value}</span>
                        </span>
                      </a>
                    </li>
                  )
                })}
              </ul>
              {contact.hours ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Clock className="h-3.5 w-3.5" aria-hidden /> Support hours: {contact.hours}
                </p>
              ) : null}
            </>
          )}
        </section>

        <section className="mt-10" aria-labelledby="support-topics">
          <h2 id="support-topics" className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Common questions
          </h2>
          <div className="mt-3 space-y-2.5">
            {TOPICS[audience].map((t) => (
              <Topic key={t.q} q={t.q} a={t.a} />
            ))}
            {faqs.map((f) => (
              <Topic key={f._id || f.question} q={f.question} a={f.answer} />
            ))}
          </div>
        </section>

        <p className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-600">
          Still stuck? Share your booking ID or registered mobile number when you{' '}
          <Link to={contactPath} className="font-bold text-brand hover:underline">
            contact us
          </Link>{' '}
          so we can help faster.
        </p>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-[12px] text-slate-500">
        © {new Date().getFullYear()} {COMPANY.brand}
      </footer>
    </div>
  )
}
