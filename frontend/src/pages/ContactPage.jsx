import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, ExternalLink, Loader2, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { CarCommunityLogo } from '../components/brand/CarCommunityLogo.jsx'
import { contactApi } from '../api/contactApi.js'
import { COMPANY } from '../data/legalContent.js'

/** Public "Contact us" page (`/contact`). Everything on it is edited in Admin → Contact us. */
export function ContactPage({ audience = 'customer' }) {
  const [contact, setContact] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const previous = document.title
    document.title = `Contact us — ${COMPANY.brand}`
    window.scrollTo(0, 0)
    let alive = true
    contactApi
      .get(audience)
      .then((res) => alive && setContact(res.data.contact))
      .catch((e) => alive && setError(e.message || 'Could not load contact details'))
    return () => {
      alive = false
      document.title = previous
    }
  }, [audience])

  const rows = contact
    ? [
        contact.phone && {
          icon: Phone,
          label: 'Call us',
          value: contact.phone,
          href: `tel:${contact.phone}`,
        },
        contact.whatsapp && {
          icon: MessageCircle,
          label: 'WhatsApp',
          value: contact.whatsapp,
          href: `https://wa.me/${contact.whatsapp.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`,
          external: true,
        },
        contact.email && {
          icon: Mail,
          label: 'Email',
          value: contact.email,
          href: `mailto:${contact.email}`,
        },
        contact.address && {
          icon: MapPin,
          label: 'Address',
          value: contact.address,
          href: contact.mapUrl || undefined,
          external: true,
        },
        contact.hours && { icon: Clock, label: 'Support hours', value: contact.hours },
      ].filter(Boolean)
    : []

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
            <Link to={audience === 'mechanic' ? '/mechanic/support' : '/support'} className="text-slate-500 hover:text-slate-800">
              Support
            </Link>
            <Link to="/terms" className="text-slate-500 hover:text-slate-800">
              Terms
            </Link>
            <Link to="/privacy" className="text-slate-500 hover:text-slate-800">
              Privacy
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        {!contact ? (
          <p className="flex items-center gap-2 py-10 text-sm font-semibold text-slate-500">
            {error ? error : (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…</>)}
          </p>
        ) : (
          <>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{contact.heading || 'Contact us'}</h1>
            {contact.intro ? <p className="mt-2 max-w-xl text-sm font-medium text-slate-600">{contact.intro}</p> : null}

            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {rows.map((r) => {
                const Icon = r.icon
                const body = (
                  <>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">{r.label}</span>
                      <span className="block break-words text-sm font-extrabold text-slate-900">{r.value}</span>
                    </span>
                  </>
                )
                const cls =
                  'flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition'
                return (
                  <li key={r.label}>
                    {r.href ? (
                      <a
                        href={r.href}
                        {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className={`${cls} hover:border-brand/40 hover:shadow-md`}
                      >
                        {body}
                      </a>
                    ) : (
                      <div className={cls}>{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>

            {rows.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-semibold text-slate-500">
                Contact details will be added soon.
              </p>
            ) : null}

            {contact.links?.length ? (
              <div className="mt-8">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Find us online</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {contact.links.map((l) => (
                    <a
                      key={l.label + l.url}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-700 hover:border-brand/40 hover:text-brand"
                    >
                      {l.label}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-[12px] text-slate-500">
        © {new Date().getFullYear()} {COMPANY.brand}
      </footer>
    </div>
  )
}
