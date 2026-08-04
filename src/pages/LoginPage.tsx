import { useState, type FormEvent, useEffect } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLang } from '../i18n/LanguageContext'
import { useAuth, homeForRole } from '../auth/AuthContext'
import { api, ApiError } from '../lib/api'
import './LoginPage.css'

type Mode = 'login' | 'register' | 'forgot' | 'reset'

export function LoginPage() {
  const { locale } = useLang()
  const { login, register, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: string; mode?: 'login' | 'register' } | null
  const from = state?.from

  const [mode, setMode] = useState<Mode>(state?.mode === 'register' ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
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
          title:
            mode === 'login'
              ? 'Вход'
              : mode === 'register'
                ? 'Регистрация'
                : mode === 'forgot'
                  ? 'Забыли пароль'
                  : 'Новый пароль',
          sub:
            mode === 'forgot'
              ? 'Отправим 6-значный код на вашу почту'
              : mode === 'reset'
                ? 'Введите код из письма и придумайте новый пароль'
                : 'Кабинеты клиента, мастера и администратора',
          email: 'Email',
          password: 'Пароль',
          confirmPassword: 'Повторите пароль',
          code: 'Код из письма',
          firstName: 'Имя',
          lastName: 'Фамилия',
          phone: 'Телефон',
          submit:
            mode === 'login'
              ? 'Войти'
              : mode === 'register'
                ? 'Создать аккаунт'
                : mode === 'forgot'
                  ? 'Отправить код'
                  : 'Сохранить пароль',
          switchHint: mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?',
          switchAction: mode === 'login' ? 'Регистрация' : 'Войти',
          forgot: 'Забыли пароль?',
          backToLogin: 'Вернуться ко входу',
          codeSent: 'Если аккаунт существует, код отправлен на почту. Проверьте входящие и спам.',
          passwordUpdated: 'Пароль обновлён. Теперь можно войти.',
          passwordMismatch: 'Пароли не совпадают',
          invalidCredentials: 'Неверный email или пароль',
          emailTaken: 'Этот email уже зарегистрирован',
          invalidBody: 'Проверьте заполненные поля',
          invalidCode: 'Неверный или просроченный код',
          tooMany: 'Слишком много попыток. Запросите новый код.',
          mailFail: 'Не удалось отправить письмо. Попробуйте позже или напишите в салон.',
          genericError: 'Что-то пошло не так. Попробуйте ещё раз',
        }
      : {
          title:
            mode === 'login'
              ? 'Anmelden'
              : mode === 'register'
                ? 'Registrieren'
                : mode === 'forgot'
                  ? 'Passwort vergessen'
                  : 'Neues Passwort',
          sub:
            mode === 'forgot'
              ? 'Wir senden einen 6-stelligen Code an Ihre E-Mail'
              : mode === 'reset'
                ? 'Code aus der E-Mail eingeben und neues Passwort setzen'
                : 'Kunden-, Mitarbeiter- und Admin-Bereich',
          email: 'Email',
          password: 'Passwort',
          confirmPassword: 'Passwort wiederholen',
          code: 'Code aus der E-Mail',
          firstName: 'Vorname',
          lastName: 'Nachname',
          phone: 'Telefon',
          submit:
            mode === 'login'
              ? 'Einloggen'
              : mode === 'register'
                ? 'Konto erstellen'
                : mode === 'forgot'
                  ? 'Code senden'
                  : 'Passwort speichern',
          switchHint: mode === 'login' ? 'Kein Konto?' : 'Bereits Konto?',
          switchAction: mode === 'login' ? 'Registrieren' : 'Anmelden',
          forgot: 'Passwort vergessen?',
          backToLogin: 'Zurück zum Login',
          codeSent:
            'Falls ein Konto existiert, wurde der Code per E-Mail gesendet. Bitte Posteingang und Spam prüfen.',
          passwordUpdated: 'Passwort aktualisiert. Sie können sich jetzt anmelden.',
          passwordMismatch: 'Passwörter stimmen nicht überein',
          invalidCredentials: 'E-Mail oder Passwort ist falsch',
          emailTaken: 'Diese E-Mail ist bereits registriert',
          invalidBody: 'Bitte prüfen Sie die eingegebenen Felder',
          invalidCode: 'Ungültiger oder abgelaufener Code',
          tooMany: 'Zu viele Versuche. Bitte neuen Code anfordern.',
          mailFail: 'E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.',
          genericError: 'Etwas ist schiefgelaufen. Bitte erneut versuchen',
        }

  const localizeError = (err: unknown) => {
    if (!(err instanceof ApiError)) return copy.genericError
    if (err.status === 401 || err.message === 'Invalid credentials') return copy.invalidCredentials
    if (err.status === 409 || err.message === 'Email already registered') return copy.emailTaken
    if (err.message === 'Invalid or expired code') return copy.invalidCode
    if (err.status === 429 || err.message === 'Too many attempts') return copy.tooMany
    if (err.status === 503 || err.status === 502 || err.message.includes('Mail')) return copy.mailFail
    if (err.status === 400 || err.message === 'Invalid body') return copy.invalidBody
    return copy.genericError
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'login') {
        const u = await login(email.trim(), password)
        navigate(from || homeForRole(u.role), { replace: true })
        return
      }

      if (mode === 'register') {
        const u = await register({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
        })
        navigate(from || homeForRole(u.role), { replace: true })
        return
      }

      if (mode === 'forgot') {
        await api('/auth/forgot-password', {
          method: 'POST',
          auth: false,
          body: JSON.stringify({ email: email.trim(), locale }),
        })
        setInfo(copy.codeSent)
        setMode('reset')
        return
      }

      if (password !== confirmPassword) {
        setError(copy.passwordMismatch)
        return
      }

      await api('/auth/reset-password', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          password,
        }),
      })
      setPassword('')
      setConfirmPassword('')
      setCode('')
      setInfo(copy.passwordUpdated)
      setMode('login')
    } catch (err) {
      setError(localizeError(err))
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
            readOnly={mode === 'reset'}
          />
        </label>

        {mode === 'reset' && (
          <label>
            {copy.code}
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </label>
        )}

        {(mode === 'login' || mode === 'register' || mode === 'reset') && (
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
        )}

        {mode === 'reset' && (
          <label>
            {copy.confirmPassword}
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
        )}

        {mode === 'login' && (
          <button
            type="button"
            className="login__forgot"
            onClick={() => {
              setMode('forgot')
              setError('')
              setInfo('')
              setPassword('')
            }}
          >
            {copy.forgot}
          </button>
        )}

        {error && <p className="login__error">{error}</p>}
        {info && <p className="login__info">{info}</p>}

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {copy.submit}
        </button>

        {(mode === 'login' || mode === 'register') && (
          <button
            type="button"
            className="login__switch"
            onClick={() => {
              setMode((m) => (m === 'login' ? 'register' : 'login'))
              setError('')
              setInfo('')
            }}
          >
            <span className="login__switch-hint">{copy.switchHint}</span>
            <span className="login__switch-action">{copy.switchAction}</span>
          </button>
        )}

        {(mode === 'forgot' || mode === 'reset') && (
          <button
            type="button"
            className="login__switch"
            onClick={() => {
              setMode('login')
              setError('')
              setInfo('')
              setCode('')
              setConfirmPassword('')
            }}
          >
            <span className="login__switch-action">{copy.backToLogin}</span>
          </button>
        )}

        {mode === 'reset' && (
          <button
            type="button"
            className="login__forgot"
            disabled={busy}
            onClick={() => {
              setMode('forgot')
              setError('')
              setInfo('')
              setCode('')
            }}
          >
            {locale === 'ru' ? 'Отправить код ещё раз' : 'Code erneut senden'}
          </button>
        )}

        <div className="login__legal">
          <Link to="/impressum">Impressum</Link>
          <Link to="/datenschutz">Datenschutz</Link>
        </div>
      </motion.form>
    </main>
  )
}
