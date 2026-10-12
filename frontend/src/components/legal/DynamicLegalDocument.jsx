import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { apiClient } from '../../api/http.js'
import { LEGAL_DOCS } from '../../data/legalContent.js'
import { parseLegalText } from '../../lib/legalMarkup.js'
import { LegalDocument } from './LegalDocument.jsx'

const ENDPOINT = { terms: '/terms/public', privacy: '/privacy-policy' }

/**
 * Terms / Privacy Policy loaded from the database (editable in the Admin panel, per role).
 * If the request fails or the stored text is empty, the built-in document is shown instead.
 */
export function DynamicLegalDocument({ kind, role = 'individual', variant = 'public' }) {
  const fallback = LEGAL_DOCS[kind]
  const requestKey = `${kind}:${role}`
  const [state, setState] = useState({ key: null, doc: null, updatedAt: null })

  useEffect(() => {
    let cancelled = false
    apiClient
      .get(ENDPOINT[kind], { params: { role } })
      .then((res) => {
        if (cancelled) return
        const data = res.data?.data
        const content = String(data?.content || '').trim()
        if (!content) {
          setState({ key: requestKey, doc: null, updatedAt: null })
          return
        }
        const parsed = parseLegalText(content)
        setState({
          key: requestKey,
          doc: { kind, title: fallback.title, subtitle: fallback.subtitle, intro: parsed.intro, sections: parsed.sections },
          updatedAt: data?.updatedAt || null,
        })
      })
      .catch(() => {
        if (!cancelled) setState({ key: requestKey, doc: null, updatedAt: null })
      })
    return () => {
      cancelled = true
    }
  }, [kind, role, fallback, requestKey])

  if (state.key !== requestKey) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-brand" aria-hidden />
      </div>
    )
  }

  return <LegalDocument doc={state.doc || fallback} variant={variant} updatedAt={state.updatedAt} />
}
