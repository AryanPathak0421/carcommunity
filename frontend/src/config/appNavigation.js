/**
 * App navigation — Customer (individual) + Mechanic (/app).
 */
import {
  CalendarClock,
  CarFront,
  ClipboardList,
  HardHat,
  Home,
  IndianRupee,
  LifeBuoy,
  Search,
  ShieldCheck,
  UserRound,
  Wrench,
  FileText,
  Gift,
  Wallet,
} from 'lucide-react'
import { USER_ROLES } from '../constants/userRoles.js'

/** @type {Record<string, { headerTagline: string, bottomNav: object[], drawerNav: object[] }>} */
const byRole = {
  [USER_ROLES.INDIVIDUAL]: {
    headerTagline: 'Book a mechanic for your car or bike',
    bottomNav: [
      { id: 'home', to: '/app', label: 'Home', icon: Home, end: true },
      { id: 'book', to: '/app/my-bookings', label: 'Bookings', icon: CalendarClock },
      { id: 'search', to: '/app/search', label: 'Search', icon: Search, center: true },
      { id: 'vehicles', to: '/app/vehicles', label: 'My Vehicles', icon: CarFront },
      { id: 'profile', to: '/app/profile', label: 'Profile', icon: UserRound },
    ],
    drawerNav: [
      { id: 'home', to: '/app', label: 'Home', icon: Home, end: true },
      { id: 'search', to: '/app/search', label: 'Search services', icon: Search },
      { id: 'vehicles', to: '/app/vehicles', label: 'My Vehicles', icon: CarFront },
      { id: 'subscription', to: '/app/subscriptions', label: 'My Subscription', icon: ShieldCheck },
      { id: 'book', to: '/app/my-bookings', label: 'My bookings', icon: ClipboardList },
      { id: 'refer', to: '/app/refer', label: 'Refer & Earn', icon: Gift },
      { id: 'wallet', to: '/app/wallet', label: 'My wallet', icon: Wallet },
      { id: 'support', to: '/app/support', label: 'Support & issues', icon: LifeBuoy },
      { id: 'terms', to: '/app/terms', label: 'Terms & Conditions', icon: FileText },
      { id: 'privacy-policy', to: '/app/privacy-policy', label: 'Privacy Policy', icon: FileText },
      { id: 'faq', to: '/app/faq', label: 'FAQs', icon: FileText },
      { id: 'profile', to: '/app/profile', label: 'Profile & settings', icon: UserRound },
    ],
  },
  [USER_ROLES.MECHANIC]: {
    headerTagline: 'Jobs, earnings & payouts',
    bottomNav: [
      { id: 'home', to: '/app', label: 'Home', icon: Home, end: true },
      { id: 'jobs', to: '/app/jobs', label: 'Jobs', icon: HardHat },
      { id: 'earnings', to: '/app/earnings', label: 'Earnings', icon: IndianRupee },
      { id: 'wallet', to: '/app/wallet', label: 'Wallet', icon: Wallet },
      { id: 'profile', to: '/app/profile', label: 'Profile', icon: UserRound },
    ],
    drawerNav: [
      { id: 'home', to: '/app', label: 'Home', icon: Home, end: true },
      { id: 'jobs', to: '/app/jobs', label: 'My jobs', icon: HardHat },
      { id: 'book', to: '/app/my-bookings', label: 'My bookings', icon: CalendarClock },
      { id: 'earnings', to: '/app/earnings', label: 'Earnings & payouts', icon: IndianRupee },
      { id: 'wallet', to: '/app/wallet', label: 'My wallet', icon: Wallet },
      { id: 'kyc', to: '/app/kyc', label: 'Aadhaar KYC', icon: ShieldCheck },
      { id: 'workTypes', to: '/app/work-categories', label: 'My skills', icon: Wrench },
      { id: 'refer', to: '/app/refer', label: 'Refer & Earn', icon: Gift },
      { id: 'support', to: '/app/support', label: 'Support', icon: LifeBuoy },
      { id: 'terms', to: '/app/terms', label: 'Terms & Conditions', icon: FileText },
      { id: 'privacy-policy', to: '/app/privacy-policy', label: 'Privacy Policy', icon: FileText },
      { id: 'faq', to: '/app/faq', label: 'FAQs', icon: FileText },
      { id: 'profile', to: '/app/profile', label: 'Profile', icon: UserRound },
    ],
  },
}

export function getAppNavigation(role) {
  if (role && byRole[role]) return byRole[role]
  return byRole[USER_ROLES.INDIVIDUAL]
}

export function getAppShellTitle(pathname) {
  if (pathname.startsWith('/app/jobs')) return 'Jobs'
  if (pathname.startsWith('/app/earnings')) return 'Earnings'
  if (pathname.startsWith('/app/kyc')) return 'KYC verification'
  if (pathname.startsWith('/app/refer')) return 'Refer & Earn'
  if (pathname.startsWith('/app/wallet')) return 'My Wallet'
  if (pathname.startsWith('/app/vehicles')) return 'My Vehicles'
  if (pathname.startsWith('/app/notifications')) return 'Notifications'
  if (pathname.startsWith('/app/work-categories')) return 'My skills'
  if (pathname.startsWith('/app/booking/flow')) return 'Book a mechanic'
  if (pathname.startsWith('/app/support')) return 'Support'
  if (pathname.startsWith('/app/subscriptions')) return 'Subscription'
  if (pathname.startsWith('/app/profile')) return 'Profile'
  if (pathname.startsWith('/app/bookings') || pathname.startsWith('/app/my-bookings')) return 'My bookings'
  if (pathname.startsWith('/app/search')) return 'Search'
  if (pathname.startsWith('/app/terms')) return 'Terms & Conditions'
  if (pathname.startsWith('/app/privacy-policy')) return 'Privacy Policy'
  if (pathname.startsWith('/app/faq')) return 'FAQs'
  return 'Home'
}
