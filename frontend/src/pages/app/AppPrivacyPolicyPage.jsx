import { useAuth } from '../../hooks/useAuth.js'
import { DynamicLegalDocument } from '../../components/legal/DynamicLegalDocument.jsx'

export function AppPrivacyPolicyPage() {
  const { user } = useAuth()
  return <DynamicLegalDocument kind="privacy" role={user?.role || 'individual'} variant="app" />
}
