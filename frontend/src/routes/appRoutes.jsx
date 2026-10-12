import { Navigate, Route } from 'react-router-dom'
import { RoleRoute } from '../components/auth/RoleRoute.jsx'
import { AppHomePage } from '../pages/app/AppHomePage.jsx'
import { AppBookingsPage } from '../pages/app/AppBookingsPage.jsx'
import { AppJobsPage } from '../pages/app/AppJobsPage.jsx'
import { AppSupportPage } from '../pages/app/AppSupportPage.jsx'
import { AppProfilePage } from '../pages/app/AppProfilePage.jsx'
import { AppAddressBookPage } from '../pages/app/AppAddressBookPage.jsx'
import { AppAboutUsPage } from '../pages/app/AppAboutUsPage.jsx'
import { AppEarningsPage } from '../pages/app/AppEarningsPage.jsx'
import { AppKycPage } from '../pages/app/AppKycPage.jsx'
import { AppTermsPage } from '../pages/app/AppTermsPage.jsx'
import { AppPrivacyPolicyPage } from '../pages/app/AppPrivacyPolicyPage.jsx'
import { AppFaqPage } from '../pages/app/AppFaqPage.jsx'
import { AppWalletPage } from '../pages/app/AppWalletPage.jsx'
import { ReferAndEarnPage } from '../pages/app/ReferAndEarnPage.jsx'
import { LabourNotificationsPage } from '../pages/app/labour/LabourNotificationsPage.jsx'
import { IndividualBookingFlowPage } from '../pages/app/booking/IndividualBookingFlowPage.jsx'
import { AppIndividualSearchPage } from '../pages/app/AppIndividualSearchPage.jsx'
import { ServiceCatalog } from '../pages/app/ServiceCatalog.jsx'
import { Checkout } from '../pages/app/Checkout.jsx'
import { JobTracking } from '../pages/app/JobTracking.jsx'
import { MyBookings } from '../pages/app/MyBookings.jsx'
import { ActiveJob } from '../pages/app/ActiveJob.jsx'
import { AppSubCategoryServicePage } from '../pages/app/AppSubCategoryServicePage.jsx'
import { AppSubscriptionPage } from '../pages/app/AppSubscriptionPage.jsx'
import { MyVehiclesPage } from '../pages/app/MyVehiclesPage.jsx'
import { USER_ROLES } from '../constants/userRoles.js'

export const appShellChildRoutes = (
  <>
    <Route index element={<AppHomePage />} />
    <Route path="discover/labours" element={<Navigate to="/app" replace />} />
    <Route
      path="booking/flow"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL, USER_ROLES.MECHANIC]} allowGuest>
          <IndividualBookingFlowPage />
        </RoleRoute>
      }
    />
    <Route
      path="bookings"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL, USER_ROLES.MECHANIC]}>
          <AppBookingsPage />
        </RoleRoute>
      }
    />
    <Route
      path="search"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]} allowGuest>
          <AppIndividualSearchPage />
        </RoleRoute>
      }
    />
    <Route
      path="services"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]} allowGuest>
          <ServiceCatalog />
        </RoleRoute>
      }
    />
    <Route
      path="sub-category/:id"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]} allowGuest>
          <AppSubCategoryServicePage />
        </RoleRoute>
      }
    />
    <Route
      path="checkout"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]} allowGuest>
          <Checkout />
        </RoleRoute>
      }
    />
    <Route
      path="tracking/:bookingId"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]}>
          <JobTracking />
        </RoleRoute>
      }
    />
    <Route
      path="subscriptions"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]}>
          <AppSubscriptionPage />
        </RoleRoute>
      }
    />
    <Route
      path="my-bookings"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL, USER_ROLES.MECHANIC]}>
          <MyBookings />
        </RoleRoute>
      }
    />
    {/* Active job (mechanic) */}
    <Route
      path="active-job/:bookingId"
      element={
        <RoleRoute allow={[USER_ROLES.MECHANIC]}>
          <ActiveJob />
        </RoleRoute>
      }
    />
    {/* Wallet: mechanics see earnings & dues, customers see referral credit */}
    <Route
      path="vehicles"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]}>
          <MyVehiclesPage />
        </RoleRoute>
      }
    />
    <Route
      path="wallet"
      element={
        <RoleRoute allow={[USER_ROLES.MECHANIC, USER_ROLES.INDIVIDUAL]}>
          <AppWalletPage />
        </RoleRoute>
      }
    />
    <Route
      path="refer"
      element={
        <RoleRoute allow={[USER_ROLES.MECHANIC, USER_ROLES.INDIVIDUAL]}>
          <ReferAndEarnPage />
        </RoleRoute>
      }
    />
    <Route
      path="jobs"
      element={
        <RoleRoute allow={[USER_ROLES.MECHANIC]}>
          <AppJobsPage />
        </RoleRoute>
      }
    />
    <Route path="support" element={<AppSupportPage />} />
    <Route path="terms" element={<AppTermsPage />} />
    <Route path="privacy-policy" element={<AppPrivacyPolicyPage />} />
    <Route path="faq" element={<AppFaqPage />} />
    <Route path="about" element={<AppAboutUsPage />} />
    <Route
      path="addresses"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]}>
          <AppAddressBookPage />
        </RoleRoute>
      }
    />
    <Route path="profile" element={<AppProfilePage />} />
    <Route
      path="earnings"
      element={
        <RoleRoute allow={[USER_ROLES.MECHANIC]}>
          <AppEarningsPage />
        </RoleRoute>
      }
    />
    <Route
      path="kyc"
      element={
        <RoleRoute allow={[USER_ROLES.MECHANIC]}>
          <AppKycPage />
        </RoleRoute>
      }
    />
    <Route
      path="notifications"
      element={
        <RoleRoute allow={[USER_ROLES.MECHANIC]}>
          <LabourNotificationsPage />
        </RoleRoute>
      }
    />
  </>
)
