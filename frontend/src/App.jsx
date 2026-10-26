import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider.jsx'
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx'
import { AppShell } from './layouts/AppShell.jsx'
import { AdminLayout } from './layouts/AdminLayout.jsx'
import { LandingPage } from './pages/LandingPage'
import { UserAuthPage } from './pages/auth/UserAuthPage.jsx'
import { MechanicAuthPage } from './pages/auth/MechanicAuthPage.jsx'
import { MechanicEntryPage } from './pages/auth/MechanicEntryPage.jsx'
import { PwaManifestSwitcher } from './components/app/PwaManifestSwitcher.jsx'
import { ContactPage } from './pages/ContactPage.jsx'
import { AdminContactSettingsPage } from './pages/admin/AdminContactSettingsPage.jsx'
import { AuthRedirect } from './pages/auth/AuthRedirect.jsx'
import { LabourCategoriesPage } from './pages/app/LabourCategoriesPage.jsx'
import { MechanicOnboardingPage } from './pages/app/MechanicOnboardingPage.jsx'
import { appShellChildRoutes } from './routes/appRoutes.jsx'
import { bootRoutes } from './routes/bootRoutes.jsx'
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage.jsx'
import { AdminSubCategoriesPage } from './pages/admin/AdminSubCategoriesPage.jsx'
import { AdminServicesPage } from './pages/admin/AdminServicesPage.jsx'
import { AdminLoginPage } from './pages/admin/AdminLoginPage.jsx'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.jsx'
import { AdminUsersPage } from './pages/admin/AdminUsersPage.jsx'
import { AdminLabourPage } from './pages/admin/AdminLabourPage.jsx'
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage.jsx'
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage.jsx'
import { AdminReportsPage } from './pages/admin/AdminReportsPage.jsx'
import { AdminUserSubscriptionsPage } from './pages/admin/AdminUserSubscriptionsPage.jsx'
import { AdminBannersPage } from './pages/admin/AdminBannersPage.jsx'
import { AdminCarListingsPage } from './pages/admin/AdminCarListingsPage.jsx'
import { AdminAccessoriesPage } from './pages/admin/AdminAccessoriesPage.jsx'
import { AdminCarPartsPage } from './pages/admin/AdminCarPartsPage.jsx'
import { AdminServiceSettingsPage } from './pages/admin/AdminServiceSettingsPage.jsx'
import { AdminComplaintsPage } from './pages/admin/AdminComplaintsPage.jsx'
import { AdminProfilePage } from './pages/admin/AdminProfilePage.jsx'
import { AdminZonesPage } from './pages/admin/AdminZonesPage.jsx'
import { AdminPlatformFeePage } from './pages/admin/AdminPlatformFeePage.jsx'
import { AdminCommissionFeePage } from './pages/admin/AdminCommissionFeePage.jsx'
import { AdminLabourWalletPage } from './pages/admin/AdminLabourWalletPage.jsx'
import { AdminCashManagementPage } from './pages/admin/AdminCashManagementPage.jsx'
import { AdminReviewsRatingsPage } from './pages/admin/AdminReviewsRatingsPage.jsx'
import { AdminTermsAndConditionsPage } from './pages/admin/AdminTermsAndConditionsPage.jsx'
import { AdminPrivacyPolicyPage } from './pages/admin/AdminPrivacyPolicyPage.jsx'
import { PublicLegalPage } from './pages/legal/PublicLegalPage.jsx'
import { AdminFaqPage } from './pages/admin/AdminFaqPage.jsx'
import { AdminReferralsPage } from './pages/admin/AdminReferralsPage.jsx'
import { AdminUserWalletPage } from './pages/admin/AdminUserWalletPage.jsx'

import { BroadcastPopup } from './components/app/BroadcastPopup.jsx'
import { PushNotificationManager } from './hooks/usePushNotifications.js'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { APP_B2C_ROLES } from './constants/panelRoles.js'
import { USER_ROLES } from './constants/userRoles.js'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PwaManifestSwitcher />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          {bootRoutes}
          <Route path="/user/auth" element={<UserAuthPage />} />
          <Route path="/mechanic" element={<MechanicEntryPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/mechanic/contact" element={<ContactPage audience="mechanic" />} />
          <Route path="/mechanic/auth" element={<MechanicAuthPage />} />
          <Route path="/b2c/auth" element={<AuthRedirect />} />
          <Route path="/auth" element={<AuthRedirect />} />
          <Route path="/terms" element={<PublicLegalPage kind="terms" />} />
          <Route path="/privacy" element={<PublicLegalPage kind="privacy" />} />
          <Route path="/mechanic/privacy" element={<PublicLegalPage kind="privacy" role="mechanic" />} />
          <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute roles={APP_B2C_ROLES}>
                <ErrorBoundary>
                  <AppShell />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          >
            {appShellChildRoutes}
          </Route>
          <Route
            path="/app/work-categories"
            element={
              <ProtectedRoute roles={[USER_ROLES.MECHANIC]}>
                <ErrorBoundary>
                  <LabourCategoriesPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="/mechanic/onboarding"
            element={
              <ProtectedRoute roles={[USER_ROLES.MECHANIC]}>
                <ErrorBoundary>
                  <MechanicOnboardingPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route path="/admin/login" element={<AdminLoginPage />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={[USER_ROLES.ADMIN]}>
                <ErrorBoundary>
                  <AdminLayout />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="sub-categories" element={<AdminSubCategoriesPage />} />
            <Route path="services" element={<AdminServicesPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="user-subscriptions" element={<AdminUserSubscriptionsPage />} />
            <Route path="labour" element={<AdminLabourPage />} />
            <Route path="bookings" element={<AdminBookingsPage />} />
            <Route path="banners" element={<AdminBannersPage />} />
            <Route path="cars" element={<AdminCarListingsPage />} />
            <Route path="accessories" element={<AdminAccessoriesPage />} />
            <Route path="car-parts" element={<AdminCarPartsPage />} />
            <Route path="service-settings" element={<AdminServiceSettingsPage />} />
            <Route path="contact" element={<AdminContactSettingsPage />} />
            <Route path="complaints" element={<AdminComplaintsPage />} />
            <Route path="profile" element={<AdminProfilePage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="zones" element={<AdminZonesPage />} />
            <Route path="platform-fee" element={<AdminPlatformFeePage />} />
            <Route path="commission-fee" element={<AdminCommissionFeePage />} />
            <Route path="referrals" element={<AdminReferralsPage />} />
            <Route path="user-wallet" element={<AdminUserWalletPage />} />
            <Route path="labour-wallet" element={<AdminLabourWalletPage />} />
            <Route path="cash-management" element={<AdminCashManagementPage />} />
            <Route path="reviews" element={<AdminReviewsRatingsPage />} />
            <Route path="terms" element={<AdminTermsAndConditionsPage />} />
            <Route path="privacy-policy" element={<AdminPrivacyPolicyPage />} />
            <Route path="faq" element={<AdminFaqPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BroadcastPopup />
        <PushNotificationManager />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
