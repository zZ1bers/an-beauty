import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { LanguageProvider } from './i18n/LanguageContext'
import { ThemeProvider } from './theme/ThemeContext'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { ToastProvider } from './components/ui/Toast'
import { Navigation } from './components/Navigation'
import { HashScroll } from './components/HashScroll'
import { ScrollToTop } from './components/ScrollToTop'
import { LandingPage } from './pages/LandingPage'
import { BookingPage } from './pages/BookingPage'
import { CabinetPage } from './pages/CabinetPage'
import { StaffPage } from './pages/StaffPage'
import { AdminPage } from './pages/AdminPage'
import { LoginPage } from './pages/LoginPage'
import { DatenschutzPage } from './pages/DatenschutzPage'
import { ImpressumPage } from './pages/ImpressumPage'
import { CookieConsent } from './components/CookieConsent'
import { PromoGift } from './components/PromoGift'
import { CursorGlow } from './components/CursorGlow'
import { AmbientBackdrop } from './components/AmbientBackdrop'
import './styles/global.css'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/datenschutz" element={<DatenschutzPage />} />
        <Route path="/impressum" element={<ImpressumPage />} />
        <Route
          path="/cabinet"
          element={
            <RequireAuth roles={['CLIENT']}>
              <CabinetPage />
            </RequireAuth>
          }
        />
        <Route
          path="/staff"
          element={
            <RequireAuth roles={['MASTER']}>
              <StaffPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth roles={['ADMIN']}>
              <AdminPage />
            </RequireAuth>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <AmbientBackdrop />
              <CursorGlow />
              <Navigation />
              <ScrollToTop />
              <HashScroll />
              <AnimatedRoutes />
              <CookieConsent />
              <PromoGift />
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
