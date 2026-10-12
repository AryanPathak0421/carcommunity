import { useAuth } from '../../hooks/useAuth.js'
import { DynamicLegalDocument } from '../../components/legal/DynamicLegalDocument.jsx'

export function AppTermsPage() {
  const { user } = useAuth()
  return <DynamicLegalDocument kind="terms" role={user?.role || 'individual'} variant="app" />
}
