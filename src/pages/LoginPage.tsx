import { useState, type FormEvent, useEffect } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLang } from '../i18n/LanguageContext'
import { useAuth, homeForRole } from '../auth/AuthContext'
import { ApiError } from '../lib/api'
import './LoginPage.css'

export function LoginPage() {
  const { locale } = useLang()
  const { login, register, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: string; mode?: 'login' | 'register' } | null
  const from = state?.from

  const [mode, setMode] = useState<'login' | 'register'>(state?.mode === 'register' ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (state?.mode === 'register' || state?.mode === 'login') {
      setMode(state.mode)
    }
  }, [state?.mode])

  if (!loading && user) {
    return <Navigate to={from || homeForRole(user.role)} replace />
  }

  const copy =
    locale === 'ru'
      ? {
          title: mode === 'login' ? 'Вход' : 'Регистрация',
          sub: 'Кабинеты клиента, мастера и администратора',
          email: 'Email',
          password: 'Пароль',
          firstName: 'Имя',
          lastName: 'Фамилия',
          phone: 'Телефон',
          submit: mode === 'login' ? 'Войти' : 'Создать аккаунт',
          switch:
            mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти',
          demo: 'Демо: admin@an.beauty / admin123 · elena@an.beauty / master123 · you@an.beauty / client123',
        }
      : {
          title: mode === 'login' ? 'Anmelden' : 'Registrieren',
          sub: 'Kunden-, Mitarbeiter- und Admin-Bereich',
          email: 'Email',
          password: 'Passwort',
          firstName: 'Vorname',
          lastName: 'Nachname',
          phone: 'Telefon',
          submit: mode === 'login' ? 'Einloggen' : 'Konto erstellen',
          switch:
            mode === 'login' ? 'Kein Konto? Registrieren' : 'Bereits Konto? Anmelden',
          demo: 'Demo: admin@an.beauty / admin123 · elena@an.beauty / master123 · you@an.beauty / client123',
        }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const u =
        mode === 'login'
          ? await login(email.trim(), password)
          : await register({
              email: email.trim(),
              password,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone: phone.trim() || undefined,
            })
      navigate(from || homeForRole(u.role), { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login page-enter">
      <motion.form
        className="login__card glass-strong"
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="eyebrow">AN.Beauty</p>
        <h1 className="login__title display">{copy.title}</h1>
        <p className="login__sub">{copy.sub}</p>

        {mode === 'register' && (
          <>
            <div className="login__row">
              <label>
                {copy.firstName}
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </label>
              <label>
                {copy.lastName}
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </label>
            </div>
            <label>
              {copy.phone}
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </label>
          </>
        )}

        <label>
          {copy.email}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          {copy.password}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
          />
        </label>

        {error && <p className="login__error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {copy.submit}
        </button>

        <button
          type="button"
          className="login__switch"
          onClick={() => {
            setMode((m) => (m === 'login' ? 'register' : 'login'))
            setError('')
          }}
        >
          {copy.switch}
        </button>

        <p className="login__demo">{copy.demo}</p>
        <Link to="/" className="login__home">
          ← AN.Beauty
        </Link>
      </motion.form>
    </main>
  )
}
