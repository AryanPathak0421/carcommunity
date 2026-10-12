import { Route } from 'react-router-dom'
import { RoleSelectPage } from '../pages/boot/RoleSelectPage.jsx'
import { SplashPage } from '../pages/boot/SplashPage.jsx'

/** Public mobile bootstrap routes (splash → role select). */
export const bootRoutes = (
  <>
    <Route path="/splash" element={<SplashPage />} />
    <Route path="/onboarding/role" element={<RoleSelectPage />} />
  </>
)
