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
import { CarsMarketplacePage } from '../pages/app/cars/CarsMarketplacePage.jsx'
import { CarDetailPage } from '../pages/app/cars/CarDetailPage.jsx'
import { SellCarPage } from '../pages/app/cars/SellCarPage.jsx'
import { MyCarsPage } from '../pages/app/cars/MyCarsPage.jsx'
import { CarEnquiriesPage } from '../pages/app/cars/CarEnquiriesPage.jsx'
import { CarWashPage } from '../pages/app/carwash/CarWashPage.jsx'
import { AccessoriesPage } from '../pages/app/accessories/AccessoriesPage.jsx'
import { AccessoryDetailPage } from '../pages/app/accessories/AccessoryDetailPage.jsx'
import { MyAccessoriesPage } from '../pages/app/accessories/MyAccessoriesPage.jsx'
import { AccessoryFormPage } from '../pages/app/accessories/AccessoryFormPage.jsx'
import { AccessoryLeadsPage, AccessoryRequestsPage } from '../pages/app/accessories/AccessoryRequestsPages.jsx'
import { USER_ROLES } from '../constants/userRoles.js'

export const appShellChildRoutes = (
  <>
    <Route index element={<AppHomePage />} />
    <Route
      path="cars"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]} allowGuest>
          <CarsMarketplacePage />
        </RoleRoute>
      }
    />
    <Route
      path="car-wash"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]} allowGuest>
          <CarWashPage />
        </RoleRoute>
      }
    />
    <Route
      path="accessories"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL, USER_ROLES.MECHANIC]} allowGuest>
          <AccessoriesPage />
        </RoleRoute>
      }
    />
    <Route
      path="accessories/requests"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]}>
          <AccessoryRequestsPage />
        </RoleRoute>
      }
    />
    <Route
      path="accessories/mine"
      element={
        <RoleRoute allow={[USER_ROLES.MECHANIC]}>
          <MyAccessoriesPage />
        </RoleRoute>
      }
    />
    <Route
      path="accessories/leads"
      element={
        <RoleRoute allow={[USER_ROLES.MECHANIC]}>
          <AccessoryLeadsPage />
        </RoleRoute>
      }
    />
    <Route
      path="accessories/new"
      element={
        <RoleRoute allow={[USER_ROLES.MECHANIC]}>
          <AccessoryFormPage />
        </RoleRoute>
      }
    />
    <Route
      path="accessories/edit/:id"
      element={
        <RoleRoute allow={[USER_ROLES.MECHANIC]}>
          <AccessoryFormPage />
        </RoleRoute>
      }
    />
    <Route
      path="accessories/:id"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL, USER_ROLES.MECHANIC]} allowGuest>
          <AccessoryDetailPage />
        </RoleRoute>
      }
    />
    <Route
      path="cars/enquiries"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]}>
          <CarEnquiriesPage />
        </RoleRoute>
      }
    />
    <Route
      path="cars/my"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]}>
          <MyCarsPage />
        </RoleRoute>
      }
    />
    <Route
      path="cars/sell"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]}>
          <SellCarPage />
        </RoleRoute>
      }
    />
    <Route
      path="cars/sell/:id"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]}>
          <SellCarPage />
        </RoleRoute>
      }
    />
    <Route
      path="cars/:id"
      element={
        <RoleRoute allow={[USER_ROLES.INDIVIDUAL]} allowGuest>
          <CarDetailPage />
        </RoleRoute>
      }
    />
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
