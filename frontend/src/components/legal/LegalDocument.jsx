import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Building2, ChevronRight, Mail, MapPin, ShieldCheck } from 'lucide-react'
import { COMPANY, LAST_UPDATED, LEGAL_DOCS } from '../../data/legalContent.js'

const OTHER_DOC_PATH = {
  public: { terms: '/privacy', privacy: '/terms' },
  app: { terms: '/app/privacy-policy', privacy: '/app/terms' },
}

/** Paragraphs in the intro are separated by one or more blank lines. */
const BLANK_LINES = /\n{2,}/

function formatUpdated(updatedAt) {
  const d = updatedAt ? new Date(updatedAt) : null
  if (!d || Number.isNaN(d.getTime())) return LAST_UPDATED
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Block({ block }) {
  if (Array.isArray(block)) {
    return (
      <ul className="space-y-2">
        {block.map((item) => (
          <li key={item} className="flex gap-2.5 text-[14px] leading-relaxed text-slate-600">
            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
  }
  return <p className="text-[14px] leading-relaxed text-slate-600">{block}</p>
}

function ContactRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand ring-1 ring-slate-200/70">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 text-[13.5px] leading-relaxed text-slate-600">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
        {children}
      </div>
    </div>
  )
}

function Mailto({ email }) {
  return (
    <a href={`mailto:${email}`} className="break-all font-semibold text-brand hover:underline">
      {email}
    </a>
  )
}

function Address() {
  return (
    <p>
      {COMPANY.legalName}
      {COMPANY.address.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </p>
  )
}

function GrievanceContacts() {
  return (
    <div className="mt-4 space-y-2.5">
      <ContactRow icon={ShieldCheck} label="Grievance Officer">
        {COMPANY.grievanceOfficerName ? <p className="font-bold text-slate-900">{COMPANY.grievanceOfficerName}</p> : null}
        <p>Grievance Officer, {COMPANY.brand}</p>
        <Mailto email={COMPANY.grievanceEmail} />
      </ContactRow>
      <ContactRow icon={Mail} label="Privacy & data protection">
        <p>Access, correction, deletion, consent withdrawal and privacy concerns</p>
        <Mailto email={COMPANY.privacyEmail} />
      </ContactRow>
      <ContactRow icon={Mail} label="Customer support">
        <p>Support, technical help and general queries</p>
        <Mailto email={COMPANY.supportEmail} />
      </ContactRow>
      <ContactRow icon={MapPin} label="Registered communication address">
        <Address />
      </ContactRow>
    </div>
  )
}

/**
 * Renders the Terms or Privacy Policy. `variant="app"` is used inside the app shell,
 * `variant="public"` on the website pages.
 */
export function LegalDocument({ doc, variant = 'public', updatedAt = null }) {
  const { hash } = useLocation()
  const otherDoc = doc.kind === 'terms' ? LEGAL_DOCS.privacy : LEGAL_DOCS.terms

  useEffect(() => {
    if (!hash) return undefined
    const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 60)
    return () => window.clearTimeout(t)
  }, [hash])

  return (
    <article className={variant === 'public' ? '' : 'pb-6'}>
      <header>
        <h1 className="text-[26px] font-black leading-tight tracking-tight text-slate-900">{doc.title}</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">{doc.subtitle}</p>
        <p className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
          Last updated: {formatUpdated(updatedAt)}
        </p>
        {doc.intro ? (
          <div className="mt-4 space-y-3">
            {String(doc.intro)
              .split(BLANK_LINES)
              .map((para, i) => (
                <p key={i} className="whitespace-pre-line text-[14px] leading-relaxed text-slate-600">
                  {para}
                </p>
              ))}
          </div>
        ) : null}
      </header>

      <nav aria-label="Contents" className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Contents</p>
        <ol className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {doc.sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="flex gap-2 text-[13px] font-semibold text-slate-700 transition hover:text-brand"
              >
                <span className="w-5 shrink-0 text-slate-400">{i + 1}.</span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-2">
        {doc.sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-20 border-b border-slate-100 py-6 last:border-b-0">
            <h2 className="flex items-baseline gap-2 text-[17px] font-extrabold tracking-tight text-slate-900">
              <span className="text-brand">{i + 1}.</span>
              {s.title}
            </h2>
            <div className="mt-3 space-y-3">
              {s.content.map((block, bi) => (
                <Block key={bi} block={block} />
              ))}
            </div>
            {s.id === 'grievance' ? <GrievanceContacts /> : null}
          </section>
        ))}
      </div>

      <section className="mt-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
          <Building2 className="h-3.5 w-3.5" aria-hidden />
          Company information
        </p>
        <p className="text-[13.5px] leading-relaxed text-slate-600">
          {COMPANY.brand} is owned, operated and managed by <strong className="text-slate-900">{COMPANY.legalName}</strong>.
        </p>
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-[13px] text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="inline font-semibold text-slate-500">CIN: </dt>
            <dd className="inline break-all">{COMPANY.cin}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-slate-500">ROC: </dt>
            <dd className="inline">{COMPANY.roc}</dd>
          </div>
        </dl>
        <div className="mt-2 text-[13px] text-slate-600">
          <span className="font-semibold text-slate-500">Office address: </span>
          {COMPANY.address.join(' ')}
        </div>
      </section>

      <Link
        to={OTHER_DOC_PATH[variant][doc.kind]}
        className="mt-5 flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 text-[14px] font-bold text-slate-800 ring-1 ring-slate-200 transition hover:ring-brand/40"
      >
        Also read: {otherDoc.title}
        <ChevronRight className="h-4 w-4 text-brand" aria-hidden />
      </Link>
    </article>
  )
}
