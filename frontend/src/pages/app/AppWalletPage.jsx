import { useAuth } from '../../hooks/useAuth.js'
import { USER_ROLES } from '../../constants/userRoles.js'
import { LaborWallet } from './LaborWallet.jsx'
import { UserWalletPage } from './UserWalletPage.jsx'

/**
 * `/app/wallet` serves two very different screens. Labour see earnings and the
 * dues they owe the platform; customers see referral credit and a ledger.
 */
export function AppWalletPage() {
  const { user } = useAuth()
  if (user?.role === USER_ROLES.MECHANIC) return <LaborWallet />
  return <UserWalletPage />
}
