import { CarCommunityLogo } from '../../components/brand/CarCommunityLogo.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BadgeCheck, Briefcase, Gift, Loader2, Lock, MapPin, Phone, ShieldCheck, User, Wallet, Zap } from 'lucide-react'
import workerImg from '../../assets/user_home_images/carcommunity_worker.webp'
import { MobileShell } from '../../layouts/MobileShell.jsx'
import { AppAmbientBackground } from '../../components/app/AppAmbientBackground.jsx'
import { LabourCategorySetup } from '../../components/auth/LabourCategorySetup.jsx'
import { USER_ROLES } from '../../constants/userRoles.js'
import { getRoleHomePath } from '../../lib/roleHomePath.js'
import { requestLoginOtp, requestRegisterOtp, verifyLogin, verifyRegister } from '../../api/authApi.js'
import { useAuth } from '../../hooks/useAuth.js'
import { ApiError } from '../../api/http.js'
import { referralsApi } from '../../api/referralsApi.js'
import {
  captureReferralCodeFromUrl,
  clearStoredReferralCode,
  readStoredReferralCode,
  storeReferralCode,
} from '../../lib/referralCapture.js'

/** Each audience has its own sign-in / sign-up page (`/user/auth`, `/mechanic/auth`). */
const AUDIENCES = {
  [USER_ROLES.INDIVIDUAL]: {
    label: 'Customer',
    heroClass: 'bg-linear-to-br from-brand via-orange-500 to-amber-500',
    loginTitle: 'Welcome back!',
    loginSubtitle: 'Sign in to book trusted car & bike mechanics',
    registerTitle: 'Create your account',
    registerSubtitle: 'Join CarCommunity in less than a minute',
    namePlaceholder: 'As on your ID',
    perks: [
      [BadgeCheck, 'Verified mechanics'],
      [Zap, 'Quick matching'],
      [Lock, 'Safe & secure'],
    ],
    otherPath: '/mechanic/auth',
    otherPrompt: 'Are you a mechanic?',
    otherLink: 'Mechanic login',
  },
  [USER_ROLES.MECHANIC]: {
    label: 'Mechanic',
    heroClass: 'bg-linear-to-br from-navy via-slate-800 to-slate-900',
    loginTitle: 'Mechanic sign in',
    loginSubtitle: 'Sign in to receive jobs near you',
    registerTitle: 'Become a mechanic partner',
    registerSubtitle: 'Register once, then pick the services you offer',
    namePlaceholder: 'Your full name',
    perks: [
      [MapPin, 'Jobs near you'],
      [Wallet, 'Your earnings wallet'],
      [Briefcase, 'Choose your services'],
    ],
    otherPath: '/user/auth',
    otherPrompt: 'Looking to book a mechanic?',
    otherLink: 'Customer login',
  },
}

export const HARDCODED_TEST_ACCOUNTS = {
  '1111111111': { otp: '123456', role: USER_ROLES.INDIVIDUAL, label: 'User', title: 'Customer / User' },
  '2222222222': { otp: '123456', role: USER_ROLES.MECHANIC, label: 'Mechanic', title: 'Mechanic' },
}

/** Mechanics who have not finished verification go through onboarding first. */
function postAuthPath(user, from) {
  const lp = user?.labourProfile
  if (user?.role === USER_ROLES.MECHANIC && lp?.kycStatus !== 'verified' && !lp?.kycSubmittedAt) {
    return '/mechanic/onboarding'
  }
  return from || getRoleHomePath(user?.role)
}

function isValidIndianMobile(digits) {
  return digits.length === 10 && (/^[6-9]\d{9}$/.test(digits) || Boolean(HARDCODED_TEST_ACCOUNTS[digits]))
}

const OTP_BYPASS_HINT = import.meta.env.VITE_OTP_BYPASS_HINT === 'true'

function demoOtpFromPhone(digits) {
  if (!digits || digits.length < 6) return null
  return digits.slice(-6)
}

function FeedbackBanner({ variant, children }) {
  if (!children) return null
  const styles =
    variant === 'error'
      ? 'border-amber-200/90 bg-amber-50 text-amber-950 ring-amber-100'
      : 'border-emerald-200/90 bg-emerald-50 text-emerald-950 ring-emerald-100'
  return (
    <p role="alert" className={`rounded-2xl border px-4 py-3 text-sm font-medium leading-relaxed ring-1 ${styles}`}>
      {children}
    </p>
  )
}

export function AuthEntryPage({ audience = USER_ROLES.INDIVIDUAL }) {
  const copy = AUDIENCES[audience] ?? AUDIENCES[USER_ROLES.INDIVIDUAL]
  const role = AUDIENCES[audience] ? audience : USER_ROLES.INDIVIDUAL
  const navigate = useNavigate()
  const location = useLocation()
  const { applySession } = useAuth()
  const reduce = useReducedMotion()
  const otpInputRefs = useRef([])

  const [mode, setMode] = useState('login')
  const [step, setStep] = useState('form')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [referralCode, setReferralCode] = useState(
    () => captureReferralCodeFromUrl() || readStoredReferralCode(),
  )
  /** null = not checked yet, otherwise { valid, referrerName, refereeReward } */
  const [referralCheck, setReferralCheck] = useState(null)
  const [otpCells, setOtpCells] = useState(() => Array(6).fill(''))
  const [challengeId, setChallengeId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState(null)
  const [resendIn, setResendIn] = useState(0)

  const p = isValidIndianMobile(phone) ? phone : null
  const code = otpCells.join('')
  const phoneComplete = phone.length === 10

  function clearOtpError() {
    setBanner((b) => (b?.variant === 'error' ? null : b))
  }

  function digitsToOtpCells(raw) {
    const d = String(raw ?? '').replace(/\D/g, '').slice(0, 6)
    const out = Array(6).fill('')
    for (let k = 0; k < d.length; k++) out[k] = d[k]
    return out
  }

  function handleOtpPaste(e) {
    e.preventDefault()
    const cells = digitsToOtpCells(e.clipboardData.getData('text/plain'))
    setOtpCells(cells)
    clearOtpError()
    const nextEmpty = cells.findIndex((c) => c === '')
    queueMicrotask(() => {
      otpInputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus()
    })
  }

  useEffect(() => {
    if (step !== 'otp') return
    queueMicrotask(() => {
      otpInputRefs.current[0]?.focus()
    })
  }, [step])

  // "Resend OTP" becomes available 30 s after the code was sent
  useEffect(() => {
    if (resendIn <= 0) return undefined
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  function setPhoneDigits(value) {
    const digits = String(value).replace(/\D/g, '').slice(0, 10)
    setPhone(digits)
    if (banner?.variant === 'error') setBanner(null)
  }

  function resetFlowToForm() {
    setStep('form')
    setChallengeId(null)
    setBanner(null)
    setOtpCells(Array(6).fill(''))
  }

  function switchMode(next) {
    setMode(next)
    resetFlowToForm()
  }

  async function handleSendOtp() {
    setBanner(null)
    setChallengeId(null)
    if (!isValidIndianMobile(phone)) {
      setBanner({
        variant: 'error',
        message: 'Enter exactly 10 digits starting with 6, 7, 8, or 9.',
      })
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        const res = await requestLoginOtp({ phone: p })
        setChallengeId(res.data?.challengeId ?? null)
      } else {
        if (!termsAccepted) {
          setBanner({ variant: 'error', message: 'You must accept the Terms and Conditions.' })
          setBusy(false)
          return
        }
        const res = await requestRegisterOtp({
          phone: p,
          role,
          fullName: fullName.trim() || undefined,
        })
        setChallengeId(res.data?.challengeId ?? null)
      }
      setOtpCells(Array(6).fill(''))
      setResendIn(30)
      setStep('otp')
      // Test-account hint ("Hardcoded Test Account ...: Enter OTP 123456") is switched off.
      // const testAcc = import.meta.env.DEV && p ? HARDCODED_TEST_ACCOUNTS[p] : null
      // message: `Hardcoded Test Account (${testAcc.label}): Enter OTP ${testAcc.otp}`
      setBanner({
        variant: 'success',
        message:
          OTP_BYPASS_HINT && p
            ? `Demo OTP: enter the last 6 digits of ${p} (${demoOtpFromPhone(p)}).`
            : 'OTP sent. Enter the 6-digit code to continue.',
      })
    } catch (e) {
      setBanner({
        variant: 'error',
        message: e instanceof ApiError ? e.message : 'Could not send OTP. Try again.',
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleVerifyOtp() {
    setBanner(null)
    if (code.length !== 6) {
      setBanner({ variant: 'error', message: 'Enter all 6 digits of the OTP.' })
      return
    }
    if (!challengeId) {
      setBanner({ variant: 'error', message: 'Session expired. Go back and tap Send OTP again.' })
      return
    }
    if (!p) {
      setBanner({ variant: 'error', message: 'Phone number is invalid. Go back and fix it.' })
      return
    }
    setBusy(true)
    try {
      let signedInUser
      if (mode === 'login') {
        const res = await verifyLogin({ phone: p, code, challengeId })
        const { token, user } = res.data
        if (user.role !== role) {
          // Keep the two audiences apart: this number belongs to the other kind of account.
          const other = AUDIENCES[user.role]
          setBanner({
            variant: 'error',
            message: other
              ? `This number is registered as a ${other.label.toLowerCase()}. Please use the ${other.label.toLowerCase()} login instead.`
              : 'This account cannot sign in here.',
          })
          setStep('form')
          setChallengeId(null)
          setOtpCells(Array(6).fill(''))
          return
        }
        applySession(token, user)
        signedInUser = user
      } else {
        if (!fullName.trim()) {
          setBanner({ variant: 'error', message: 'Full name is required to complete registration.' })
          setBusy(false)
          return
        }
        const body = {
          phone: p,
          role,
          code,
          challengeId,
          fullName: fullName.trim(),
        }
        if (referralCode.trim()) {
          body.referralCode = referralCode.trim().toUpperCase()
        }
        const res = await verifyRegister(body)
        const { token, user } = res.data
        clearStoredReferralCode()
        applySession(token, user)
        signedInUser = user
      }

      const needsWorkSetup =
        signedInUser.role === USER_ROLES.MECHANIC && !(signedInUser.labourProfile?.categoryIds?.length > 0)
      if (needsWorkSetup) {
        setStep('work-setup')
        setBanner(null)
      } else {
        navigate(postAuthPath(signedInUser, location.state?.from), { replace: true })
      }
    } catch (e) {
      setBanner({
        variant: 'error',
        message: e instanceof ApiError ? e.message : 'Verification failed. Check the code and try again.',
      })
    } finally {
      setBusy(false)
    }
  }

  if (step === 'work-setup') {
    return (
      <>
        <AppAmbientBackground />
        <MobileShell transparent className="pb-0 pt-4">
          <LabourCategorySetup variant="auth" onComplete={() => {
            navigate(postAuthPath({ role: USER_ROLES.MECHANIC }, location.state?.from), { replace: true })
          }} />
        </MobileShell>
      </>
    )
  }

  const isLogin = mode === 'login'
  const phoneError = banner?.variant === 'error' && phone.length > 0 && !phoneComplete

  const fieldShell = (extra = '') =>
    `flex items-center gap-2.5 rounded-2xl border-2 bg-slate-50 px-3.5 transition-colors focus-within:border-brand focus-within:bg-white ${extra || 'border-slate-200'}`

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-white shadow-[0_0_60px_-30px_rgba(15,23,42,0.35)]">
        {/* hero */}
        <header className={`relative min-h-[17rem] overflow-hidden ${copy.heroClass} px-6 pb-16 pt-[max(1.25rem,0px)] text-white`}>
          <span className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" aria-hidden />
          <span className="pointer-events-none absolute -left-8 bottom-2 h-28 w-28 rounded-full bg-white/10" aria-hidden />
          <div className="relative z-20 flex items-center justify-between">
            {step === 'otp' ? (
              <button
                type="button"
                onClick={resetFlowToForm}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition active:scale-95"
                aria-label="Change mobile number"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <CarCommunityLogo variant="light" size="md" tagline={false} />
            )}
            <span className="hidden min-[340px]:flex items-center gap-1 whitespace-nowrap rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {copy.label} login
            </span>
          </div>

          <div className="relative z-20 mt-6 max-w-[58%]">
            <h1 className="text-[27px] font-black leading-[1.1] tracking-tight">
              {step === 'otp' ? 'Verify your number' : isLogin ? copy.loginTitle : copy.registerTitle}
            </h1>
            <p className="mt-2 text-[13px] font-semibold leading-snug text-white/90">
              {step === 'otp'
                ? 'Enter the 6-digit code we sent you'
                : isLogin
                ? copy.loginSubtitle
                : copy.registerSubtitle}
            </p>
          </div>
          <img
            src={workerImg}
            alt=""
            decoding="async"
            className="pointer-events-none absolute -bottom-1 right-1 z-10 h-40 w-auto select-none object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.25)]"
          />
        </header>

        {/* sheet */}
        <main className="relative z-10 -mt-8 flex-1 rounded-t-[2rem] bg-white px-6 pb-8 pt-6 shadow-[0_-14px_30px_-20px_rgba(0,0,0,0.35)]">
          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.div
                key="form"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? false : { opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1" role="tablist" aria-label="Sign in or sign up">
                  {[
                    ['login', 'Sign in'],
                    ['register', 'Sign up'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={mode === id}
                      onClick={() => mode !== id && switchMode(id)}
                      className={`rounded-xl py-2.5 text-sm font-extrabold transition ${
                        mode === id ? 'bg-white text-navy shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {mode === 'register' && role === USER_ROLES.MECHANIC ? (
                  <p className="rounded-xl bg-orange-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-slate-600 ring-1 ring-brand/15">
                    After OTP, you&apos;ll pick the services you offer.
                  </p>
                ) : null}

                <div className="space-y-4">
                  {mode === 'register' ? (
                    <div>
                      <label htmlFor="auth-name" className="mb-1.5 block text-[12px] font-bold text-slate-500">
                        Full name
                      </label>
                      <div className={fieldShell()}>
                        <User className="h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden />
                        <input
                          id="auth-name"
                          type="text"
                          autoComplete="name"
                          placeholder={copy.namePlaceholder}
                          className="w-full bg-transparent py-3.5 text-[15px] font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <label htmlFor="auth-phone" className="text-[12px] font-bold text-slate-500">
                        Mobile number
                      </label>
                      <span className={`text-xs tabular-nums ${phoneComplete ? 'font-bold text-brand' : 'text-slate-400'}`}>
                        {phone.length}/10
                      </span>
                    </div>
                    <div className={fieldShell(phoneError ? 'border-amber-400' : 'border-slate-200')}>
                      <Phone className="h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden />
                      <span className="shrink-0 border-r border-slate-200 pr-2.5 text-[15px] font-black text-slate-700">+91</span>
                      <input
                        id="auth-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        maxLength={10}
                        placeholder="98765 43210"
                        className="w-full bg-transparent py-3.5 text-[16px] font-bold tracking-wide text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
                        value={phone}
                        onChange={(e) => setPhoneDigits(e.target.value)}
                        onKeyDown={(e) => {
                          const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter']
                          if (e.key === 'Enter' && !busy) {
                            e.preventDefault()
                            void handleSendOtp()
                            return
                          }
                          if (allowed.includes(e.key)) return
                          if (e.ctrlKey || e.metaKey) return
                          if (!/^\d$/.test(e.key)) e.preventDefault()
                        }}
                      />
                    </div>
                  </div>

                  {mode === 'register' ? (
                    <>
                      <div>
                        <label htmlFor="auth-ref" className="mb-1.5 block text-[12px] font-bold text-slate-500">
                          Referral code <span className="font-medium text-slate-400">(optional)</span>
                        </label>
                        <div className={fieldShell()}>
                          <Gift className="h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden />
                          <input
                            id="auth-ref"
                            type="text"
                            maxLength={16}
                            placeholder="Enter a friend's code"
                            className="w-full bg-transparent py-3.5 text-[15px] font-semibold uppercase tracking-wider text-slate-900 outline-none placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400"
                            value={referralCode}
                            onChange={(e) => {
                              const next = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                              setReferralCode(next)
                              setReferralCheck(null)
                              storeReferralCode(next)
                            }}
                            onBlur={async () => {
                              const value = referralCode.trim()
                              if (value.length < 4) {
                                setReferralCheck(null)
                                return
                              }
                              try {
                                const res = await referralsApi.validateCode(value)
                                setReferralCheck(res.data || null)
                              } catch {
                                setReferralCheck(null)
                              }
                            }}
                          />
                        </div>
                        {referralCheck ? (
                          <p
                            className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold ${
                              referralCheck.valid ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            <Gift className="h-3.5 w-3.5" aria-hidden />
                            {referralCheck.valid
                              ? `Invited by ${referralCheck.referrerName}${
                                  referralCheck.refereeReward > 0 ? ` · ₹${referralCheck.refereeReward} joining bonus` : ''
                                }`
                              : 'That referral code is not valid'}
                          </p>
                        ) : null}
                      </div>

                      <label htmlFor="terms" className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-slate-50 p-3">
                        <input
                          type="checkbox"
                          id="terms"
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-orange-500"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                        />
                        <span className="text-[12px] font-medium leading-snug text-slate-600">
                          I agree to the{' '}
                          <Link to="/terms" target="_blank" className="font-bold text-brand hover:underline">
                            Terms &amp; Conditions
                          </Link>{' '}
                          and{' '}
                          <Link to="/privacy" target="_blank" className="font-bold text-brand hover:underline">
                            Privacy Policy
                          </Link>
                        </span>
                      </label>
                    </>
                  ) : null}
                </div>

                <div>
                  <FeedbackBanner variant={banner?.variant}>{banner?.message}</FeedbackBanner>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSendOtp()}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-base font-black text-white shadow-lg shadow-brand/30 transition active:scale-[0.98] disabled:opacity-70"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Sending OTP…
                      </>
                    ) : (
                      <>
                        {isLogin ? 'Get OTP' : 'Create account'} <ArrowRight className="h-5 w-5" aria-hidden />
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-center text-[12px] font-medium text-slate-500">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                    <button
                      type="button"
                      onClick={() => switchMode(isLogin ? 'register' : 'login')}
                      className="font-extrabold text-brand hover:underline"
                    >
                      {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                  </p>
                </div>

                <ul className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                  {copy.perks.map(([Icon, text]) => (
                    <li key={text} className="flex flex-col items-center gap-1">
                      <Icon className="h-[18px] w-[18px] text-brand" aria-hidden />
                      <span className="text-[10px] font-bold leading-tight text-slate-500">{text}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? false : { opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <p className="text-[14px] font-medium text-slate-500">
                  Code sent to <span className="font-black text-navy">+91 {phone}</span>{' '}
                  <button type="button" onClick={resetFlowToForm} className="ml-1 text-[12px] font-extrabold text-brand hover:underline">
                    Change
                  </button>
                </p>

                {OTP_BYPASS_HINT && p ? (
                  <p className="rounded-xl border border-brand/20 bg-orange-50 px-3 py-2 text-[13px] font-semibold text-brand">
                    Demo: OTP is {demoOtpFromPhone(p)}
                  </p>
                ) : null}

                <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                  {otpCells.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpInputRefs.current[i] = el
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={i === 0 ? 'one-time-code' : 'off'}
                      maxLength={1}
                      aria-label={`OTP digit ${i + 1} of 6`}
                      className={`h-14 w-full min-w-0 rounded-xl border-2 bg-slate-50 text-center font-mono text-2xl font-black tabular-nums text-navy outline-none transition-colors focus:border-brand focus:bg-white ${
                        digit ? 'border-brand/50' : 'border-slate-200'
                      }`}
                      value={digit}
                      onPaste={handleOtpPaste}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, '').slice(-1)
                        const next = [...otpCells]
                        if (d) {
                          next[i] = d
                          setOtpCells(next)
                          clearOtpError()
                          if (i < 5) otpInputRefs.current[i + 1]?.focus()
                        } else {
                          next[i] = ''
                          setOtpCells(next)
                          clearOtpError()
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (!busy) void handleVerifyOtp()
                          return
                        }
                        if (e.key === 'Backspace') {
                          e.preventDefault()
                          if (otpCells[i]) {
                            const next = [...otpCells]
                            next[i] = ''
                            setOtpCells(next)
                            clearOtpError()
                          } else if (i > 0) {
                            const next = [...otpCells]
                            next[i - 1] = ''
                            setOtpCells(next)
                            clearOtpError()
                            otpInputRefs.current[i - 1]?.focus()
                          }
                          return
                        }
                        if (e.key === 'ArrowLeft' && i > 0) {
                          e.preventDefault()
                          otpInputRefs.current[i - 1]?.focus()
                          return
                        }
                        if (e.key === 'ArrowRight' && i < 5) {
                          e.preventDefault()
                          otpInputRefs.current[i + 1]?.focus()
                          return
                        }
                        if (e.ctrlKey || e.metaKey) return
                        if (!/^\d$/.test(e.key) && e.key.length === 1) e.preventDefault()
                      }}
                    />
                  ))}
                </div>

                <div>
                  <FeedbackBanner variant={banner?.variant}>{banner?.message}</FeedbackBanner>
                  <button
                    type="button"
                    disabled={busy || code.length !== 6}
                    onClick={() => void handleVerifyOtp()}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-base font-black text-white shadow-lg shadow-brand/30 transition active:scale-[0.98] disabled:opacity-60"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Verifying…
                      </>
                    ) : (
                      <>
                        Verify &amp; continue <ArrowRight className="h-5 w-5" aria-hidden />
                      </>
                    )}
                  </button>
                  <p className="mt-4 text-center text-[13px] font-medium text-slate-500">
                    Did not get the code?{' '}
                    {resendIn > 0 ? (
                      <span className="font-bold text-slate-400">Resend in {resendIn}s</span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSendOtp()}
                        className="font-extrabold text-brand hover:underline disabled:opacity-60"
                      >
                        Resend OTP
                      </button>
                    )}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-8 text-center text-[12px] text-slate-500">
            {copy.otherPrompt}{' '}
            <Link to={copy.otherPath} state={location.state} replace className="font-bold text-brand hover:underline">
              {copy.otherLink}
            </Link>
          </p>
          <p className="mt-2 text-center text-[12px] text-slate-400">
            Admin?{' '}
            <Link to="/admin/login" className="font-bold text-brand hover:underline">
              Web login
            </Link>
          </p>
        </main>
      </div>
    </div>
  )
}
