import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { LanguageProvider } from './i18n/LanguageContext'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { ToastProvider } from './components/ui/Toast'
import { Navigation } from './components/Navigation'
import { LandingPage } from './pages/LandingPage'
import { BookingPage } from './pages/BookingPage'
import { CabinetPage } from './pages/CabinetPage'
import { StaffPage } from './pages/StaffPage'
import { AdminPage } from './pages/AdminPage'
import { LoginPage } from './pages/LoginPage'
import { CursorGlow } from './components/CursorGlow'
import './styles/global.css'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/login" element={<LoginPage />} />
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
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <CursorGlow />
            <Navigation />
            <AnimatedRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
