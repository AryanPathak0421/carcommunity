/**
 * Admin sidebar — Super Control Panel modules for the mechanic booking platform.
 */
import {
  Car,
  ShoppingBag,
  LayoutDashboard,
  Users,
  IdCard,
  Layers,
  ClipboardList,
  Wallet,
  BarChart3,
  Settings,
  Image,
  MessageSquare,
  UserCog,
  Tag,
  Wrench,
  Package,
  Map,
  Gift,
  HandCoins,
  Star,
  FileText,
  Phone,
} from 'lucide-react'

/**
 * Admin Mechanics hub (`/admin/labour`) shows links to these routes — a curated slice of modules
 * that touch roster, KYC and deployment. Edit here to expand the hub without touching the page.
 */
export const ADMIN_LABOUR_HUB_PATHS = new Set([
  '/admin/categories',
  '/admin/sub-categories',
  '/admin/services',
  '/admin/users',
  '/admin/bookings',
])

/**
 * @returns {{ title: string | null, items: { to: string, label: string, icon: import('lucide-react').LucideIcon, end?: boolean }[] }[]}
 */
export function getLabourAdminHubNavGroups() {
  return ADMIN_NAV_SECTIONS.map((section) => ({
    title: section.title,
    items: section.items.filter((item) => ADMIN_LABOUR_HUB_PATHS.has(item.to)),
  })).filter((g) => g.items.length > 0)
}

/** @type {{ title: string | null, items: { to: string, label: string, icon: import('lucide-react').LucideIcon, end?: boolean }[] }[]} */
export const ADMIN_NAV_SECTIONS = [
  {
    title: null,
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Customers',
    items: [
      { to: '/admin/users', label: 'Customers', icon: Users },
      { to: '/admin/user-subscriptions', label: 'User Subscriptions', icon: IdCard },
    ],
  },
  {
    title: 'Mechanics',
    items: [{ to: '/admin/labour', label: 'Mechanics & KYC', icon: IdCard }],
  },
  {
    title: 'Service categories',
    items: [
      { to: '/admin/categories', label: 'Categories', icon: Layers },
      { to: '/admin/sub-categories', label: 'Sub-Categories', icon: Tag },
      { to: '/admin/services', label: 'Services', icon: Wrench },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/admin/bookings', label: 'Bookings', icon: ClipboardList },
      { to: '/admin/cars', label: 'Buy / Sell Cars', icon: Car },
      { to: '/admin/accessories', label: 'Car Accessories', icon: ShoppingBag },
      { to: '/admin/car-parts', label: 'Car Parts & Stock', icon: Package },
      { to: '/admin/complaints', label: 'Complaints', icon: MessageSquare },
      { to: '/admin/zones', label: 'Manage Radius', icon: Map },
    ],
  },
  {
    title: 'Finance',
    items: [
      { to: '/admin/platform-fee', label: 'Platform Fee', icon: HandCoins },
      { to: '/admin/commission-fee', label: 'Commission Fee', icon: HandCoins },
      { to: '/admin/referrals', label: 'Refer & Earn', icon: Gift },
      { to: '/admin/user-wallet', label: 'Customer Payouts', icon: Wallet },
      { to: '/admin/labour-wallet', label: 'Mechanic Wallet', icon: Wallet },
      { to: '/admin/cash-management', label: 'Cash Management', icon: Wallet },
    ],
  },
  {
    title: 'Insights',
    items: [{ to: '/admin/reports', label: 'Reports & analytics', icon: BarChart3 }],
  },
  {
    title: 'Content',
    items: [
      { to: '/admin/banners', label: 'Banners', icon: Image },
      { to: '/admin/terms', label: 'Terms & Conditions', icon: FileText },
      { to: '/admin/privacy-policy', label: 'Privacy Policy', icon: FileText },
      { to: '/admin/faq', label: 'FAQs', icon: FileText },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/admin/profile', label: 'Profile', icon: UserCog },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
      { to: '/admin/service-settings', label: 'Service app settings', icon: Settings },
      { to: '/admin/contact', label: 'Contact us', icon: Phone },
      { to: '/admin/reviews', label: 'Reviews & Ratings', icon: Star },
    ],
  },
]

const ROUTE_TITLES = [
  { prefix: '/admin/user-wallet', title: 'Customer Payouts' },
  { prefix: '/admin/referrals', title: 'Refer & Earn' },
  { prefix: '/admin/profile', title: 'Profile' },
  { prefix: '/admin/complaints', title: 'Complaints' },
  { prefix: '/admin/service-settings', title: 'Service app settings' },
  { prefix: '/admin/contact', title: 'Contact us' },
  { prefix: '/admin/settings', title: 'Settings' },
  { prefix: '/admin/banners', title: 'Banners' },
  { prefix: '/admin/terms', title: 'Terms & Conditions' },
  { prefix: '/admin/privacy-policy', title: 'Privacy Policy' },
  { prefix: '/admin/faq', title: 'FAQs' },
  { prefix: '/admin/reports', title: 'Reports & analytics' },
  { prefix: '/admin/platform-fee', title: 'Platform Fee' },
  { prefix: '/admin/commission-fee', title: 'Commission Fee' },
  { prefix: '/admin/labour-wallet', title: 'Mechanic Wallet' },
  { prefix: '/admin/cash-management', title: 'Cash Management' },
  { prefix: '/admin/reviews', title: 'Reviews & Ratings' },
  { prefix: '/admin/bookings', title: 'Bookings' },
  { prefix: '/admin/cars', title: 'Buy / Sell Cars' },
  { prefix: '/admin/accessories', title: 'Car Accessories' },
  { prefix: '/admin/car-parts', title: 'Car Parts & Stock' },
  { prefix: '/admin/services', title: 'Services' },
  { prefix: '/admin/sub-categories', title: 'Sub-Categories' },
  { prefix: '/admin/categories', title: 'Categories' },
  { prefix: '/admin/labour', title: 'Mechanics & KYC' },
  { prefix: '/admin/user-subscriptions', title: 'User Subscriptions' },
  { prefix: '/admin/users', title: 'Customers' },
  { prefix: '/admin/zones', title: 'Manage Radius' },
  { prefix: '/admin', title: 'Dashboard' },
]

export function getAdminTitle(pathname) {
  const path = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname
  for (const { prefix, title } of ROUTE_TITLES) {
    if (path === prefix || (prefix !== '/admin' && path.startsWith(prefix + '/'))) return title
  }
  return 'Admin'
}
