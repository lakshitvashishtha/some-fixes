import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Dropdown from './Dropdown'
import { QRCodeSvg } from './qrGenerator.jsx'
import {
  registerUser,
  loginUser,
  logoutUser,
  fetchMe,
  fetchMyTeams,
  getAllRegisteredTeams,
  checkEmailApi,
  checkSquadNameApi,
  createTeamApi,
  joinWithPartyCodeApi,
  isEmailRegisteredAnywhere,
  requestPasswordResetApi,
} from './api'

const YEAR_OPTIONS = ['1st', '2nd', '3rd', '4th']
const GENDER_OPTIONS = ['male', 'female']
// Indian mobile number: starts with 6-9, exactly 10 digits
const PHONE_REGEX = /^[6-9]\d{9}$/
// Basic email format check
const EMAIL_REGEX = /^\S+@\S+\.\S+$/

const inputClass =
  'w-full rounded-md bg-[#090b12] border border-slate-700/80 px-3 py-2 sm:py-2.5 text-[11px] sm:text-sm text-white outline-none placeholder:text-slate-500 focus:border-tactical transition-colors font-mono'

const labelClass =
  'block text-[8px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-mono font-semibold'

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

function HudBracket({ pos }) {
  const corner = {
    tl: 'top-3 left-3 border-t-2 border-l-2',
    tr: 'top-3 right-3 border-t-2 border-r-2',
    bl: 'bottom-3 left-3 border-b-2 border-l-2',
    br: 'bottom-3 right-3 border-b-2 border-r-2',
  }[pos]
  return <div className={`hud-bracket ${corner}`} />
}

function StepDots({ step, total = 3 }) {
  return (
    <div
      aria-label={`Step ${step} of ${total}`}
      className="flex items-center justify-center gap-1.5 pt-1 select-none"
    >
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const active = n === step
        return active ? (
          <span
            key={n}
            className="w-7 h-1.5 bg-tactical rounded-sm border border-[#b28200]"
          />
        ) : (
          <span
            key={n}
            className="w-1.5 h-1.5 bg-[#232838] rounded-sm border border-[#2b3149]"
          />
        )
      })}
    </div>
  )
}

function TactileButton({ children, className = '', ...props }) {
  return (
    <button
      type="submit"
      className={`btn-ribbed bg-tactical hover:bg-[#e6a600] active:translate-y-0.5 text-black font-mono font-bold text-xs sm:text-sm tracking-wider uppercase rounded-md px-4 py-2.5 sm:py-3.5 border-b-4 border-[#b28200] transition-all duration-100 flex items-center justify-center shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function Auth() {
  const location = useLocation()
  const navigate = useNavigate()
  const [step, setStep] = useState(() => (location.pathname === '/login' ? 'login' : 1))

  useEffect(() => {
    if (location.pathname === '/login') {
      setStep('login')
    } else if (location.pathname === '/register') {
      setStep(1)
    }
  }, [location.pathname])

  // Active session detection
  const [currentUser, setCurrentUser] = useState(null)
  const [userTeam, setUserTeam] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  // Login tabs: 'credentials' | 'partyCode'
  const [loginTab, setLoginTab] = useState('credentials')
  const [partyCode, setPartyCode] = useState('')
  const [partyCodeError, setPartyCodeError] = useState('')

  useEffect(() => {
    fetchMe()
      .then(async (data) => {
        if (data?.user?.email) {
          setCurrentUser(data.user)
          try {
            const teamsRes = await fetchMyTeams()
            const list = teamsRes?.teams || []
            if (list.length > 0) {
              setUserTeam(list[0])
            }
          } catch {
            // Non-blocking team lookup
          }
        } else {
          setCurrentUser(null)
          setUserTeam(null)
        }
      })
      .catch(() => {
        setCurrentUser(null)
        setUserTeam(null)
      })
      .finally(() => setCheckingSession(false))
  }, [])

  const [showPassword, setShowPassword] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [emailError, setEmailError] = useState('')

  // Login-only state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSubmitted, setForgotSubmitted] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMsg, setForgotMsg] = useState('')

  // Step 1: Account credentials
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Step 2: Squad Configuration (Default: 4 members)
  const [squadName, setSquadName] = useState('')
  const [squadSize, setSquadSize] = useState(4)

  // Step 2: Leader Profile (You)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [college, setCollege] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [course, setCourse] = useState('')
  const [year, setYear] = useState('')
  const [gender, setGender] = useState('')

  // Step 2: Teammates (up to 3 teammates for max 4-person squad)
  const [teammates, setTeammates] = useState([
    { firstName: '', lastName: '', email: '', phone: '', college: '', rollNumber: '', course: '', year: '', gender: '' },
    { firstName: '', lastName: '', email: '', phone: '', college: '', rollNumber: '', course: '', year: '', gender: '' },
    { firstName: '', lastName: '', email: '', phone: '', college: '', rollNumber: '', course: '', year: '', gender: '' },
  ])

  // Step 3: Payment
  const [utr, setUtr] = useState('')
  const [utrError, setUtrError] = useState('')
  const [copiedUpi, setCopiedUpi] = useState(false)

  const updateTeammate = (index, field, val) => {
    setTeammates((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }
      return copy
    })
    setServerError('')
  }

  // Step 1: Verify Email
  const handleStep1Next = async (e) => {
    e.preventDefault()
    setEmailError('')
    setServerError('')
    if (!EMAIL_REGEX.test(email) || !password) return

    setCheckingEmail(true)
    try {
      await checkEmailApi(email)
      setStep(2)
    } catch (err) {
      setEmailError(err.message)
    } finally {
      setCheckingEmail(false)
    }
  }

  // Step 2: Verify Squad & All Candidate Details
  const handleStep2Next = async (e) => {
    if (e) e.preventDefault()
    setServerError('')
    setPhoneError('')

    // Squad Name
    if (!squadName.trim()) {
      setServerError('Squad name is required.')
      return
    }
    try {
      await checkSquadNameApi(squadName.trim())
    } catch (err) {
      try {
        const allTeams = getAllRegisteredTeams() || []
        const existing = allTeams.find(
          (t) => t.name && t.name.trim().toLowerCase() === squadName.trim().toLowerCase()
        )
        if (
          existing &&
          (
            (currentUser && (existing.leaderEmail?.toLowerCase() === currentUser.email?.toLowerCase() || existing.leader?.email?.toLowerCase() === currentUser.email?.toLowerCase())) ||
            (email && (existing.leaderEmail?.toLowerCase() === email.trim().toLowerCase() || existing.leader?.email?.toLowerCase() === email.trim().toLowerCase()))
          )
        ) {
          setServerError(`You have already registered squad "${existing.name}". Please log in to view your Squad Dashboard or Payment page.`)
          return
        }
      } catch {}
      setServerError(err.message)
      return
    }

    // Leader Details
    const leaderAlreadyRegistered = isEmailRegisteredAnywhere(email)
    if (leaderAlreadyRegistered) {
      setServerError(`Leader email "${email}" is already registered. If this is your squad, please log in with this email to access your squad dashboard.`)
      return
    }

    if (!firstName.trim()) {
      setServerError('Leader first name is required.')
      return
    }
    if (!lastName.trim()) {
      setServerError('Leader last name is required.')
      return
    }
    if (!PHONE_REGEX.test(phone)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number')
      setServerError('Please enter a valid 10-digit mobile number for leader.')
      return
    }
    if (!college.trim()) {
      setServerError('Please enter your college / university name.')
      return
    }
    if (!rollNumber.trim()) {
      setServerError('Leader College ID / Roll Number is required.')
      return
    }
    if (!course.trim()) {
      setServerError('Leader Course / Branch is required (e.g. CSE, AI&DS).')
      return
    }
    if (!year.trim()) {
      setServerError('Please select leader academic year.')
      return
    }
    if (!gender.trim()) {
      setServerError('Please select leader gender.')
      return
    }

    // Needed Teammates
    const needed = squadSize - 1
    const seenEmails = new Set([email.toLowerCase().trim()])

    for (let i = 0; i < needed; i++) {
      const tm = teammates[i]
      const memberNum = i + 2

      if (!tm.firstName.trim()) {
        setServerError(`Teammate #${memberNum} first name is required.`)
        return
      }
      if (!tm.lastName.trim()) {
        setServerError(`Teammate #${memberNum} last name is required.`)
        return
      }
      const tmEmail = (tm.email || '').toLowerCase().trim()
      if (!EMAIL_REGEX.test(tmEmail)) {
        setServerError(`Teammate #${memberNum} valid email is required.`)
        return
      }
      if (seenEmails.has(tmEmail)) {
        setServerError(`Duplicate email "${tmEmail}" used. Each participant must have a unique email address.`)
        return
      }
      seenEmails.add(tmEmail)

      // Uniqueness check across system
      const alreadyRegistered = isEmailRegisteredAnywhere(tmEmail)
      if (alreadyRegistered) {
        setServerError(`Email "${tmEmail}" is already registered with another account or squad. One email = one registration only.`)
        return
      }

      if (!PHONE_REGEX.test(tm.phone)) {
        setServerError(`Teammate #${memberNum} requires a valid 10-digit Indian mobile number.`)
        return
      }
      if (!tm.college.trim() && !college.trim()) {
        setServerError(`Teammate #${memberNum} college name is required.`)
        return
      }
      if (!tm.rollNumber.trim()) {
        setServerError(`Teammate #${memberNum} Roll Number / College ID is required.`)
        return
      }
      if (!tm.course.trim()) {
        setServerError(`Teammate #${memberNum} Course is required.`)
        return
      }
      if (!tm.year.trim()) {
        setServerError(`Teammate #${memberNum} Academic Year is required.`)
        return
      }
      if (!tm.gender.trim()) {
        setServerError(`Teammate #${memberNum} Sex is required.`)
        return
      }
    }

    // All profiles valid — advance to Step 3 (Payment)
    setStep(3)
  }

  // Step 3: Final Payment Submission
  const handleStep3Submit = async (e) => {
    e.preventDefault()
    setUtrError('')
    setServerError('')

    const cleanUtr = (utr || '').trim().replace(/\s+/g, '')
    if (!cleanUtr || cleanUtr.length < 8) {
      setUtrError('Please enter a valid 12-digit UTR transaction reference number.')
      return
    }

    setSubmitting(true)
    try {
      // 1. Register leader account credentials & profile
      await registerUser({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        college: college.trim(),
        rollNumber: rollNumber.trim(),
        course: course.trim(),
        year: year.trim(),
        gender: gender.trim(),
      })

      // 2. Prepare teammate payload
      const needed = squadSize - 1
      const activeTeammates = teammates.slice(0, needed).map((tm) => ({
        firstName: tm.firstName.trim(),
        lastName: tm.lastName.trim(),
        name: `${tm.firstName.trim()} ${tm.lastName.trim()}`,
        email: tm.email.trim().toLowerCase(),
        phone: tm.phone.trim(),
        college: (tm.college || college).trim(),
        rollNumber: tm.rollNumber.trim(),
        course: tm.course.trim(),
        year: tm.year.trim(),
        gender: tm.gender.trim(),
      }))

      // 3. Register Squad with Payment details
      await createTeamApi({
        name: squadName.trim(),
        size: squadSize,
        leader: {
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone.trim(),
          college: college.trim(),
          rollNumber: rollNumber.trim(),
          course: course.trim(),
          year: year.trim(),
          gender: gender.trim(),
        },
        members: activeTeammates,
        payment: {
          utr: cleanUtr,
          amount: 800,
          status: 'submitted',
        },
      })

      // Navigate to Dashboard (which will display VerificationPendingScreen until admin confirms)
      navigate('/dashboard')
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please check inputs.')
    } finally {
      setSubmitting(false)
    }
  }

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')

    if (!EMAIL_REGEX.test(loginEmail)) {
      setLoginError('Enter a valid email address')
      return
    }
    if (!loginPassword) {
      setLoginError('Enter your password')
      return
    }

    setSubmitting(true)
    try {
      await loginUser({ email: loginEmail.trim(), password: loginPassword })
      navigate('/dashboard')
    } catch (err) {
      setLoginError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePartyCodeJoin = async (e) => {
    e.preventDefault()
    setPartyCodeError('')
    const cleanCode = partyCode.trim().toUpperCase()
    if (!cleanCode) {
      setPartyCodeError('Please enter your Squad Party Code.')
      return
    }

    setSubmitting(true)
    try {
      const res = await joinWithPartyCodeApi(cleanCode)
      if (res.success) {
        navigate('/dashboard')
      }
    } catch (err) {
      setPartyCodeError(err.message || 'Invalid party code. Please check with your team leader.')
    } finally {
      setSubmitting(false)
    }
  }

  const clearLogin = () => {
    setLoginEmail('')
    setLoginPassword('')
    setLoginError('')
    setPartyCode('')
    setPartyCodeError('')
    setStep(1)
  }

  const handleCopyUpi = async () => {
    const ok = await copyText('git.codefiesta@upi')
    if (ok) {
      setCopiedUpi(true)
      setTimeout(() => setCopiedUpi(false), 2500)
    }
  }

  const heading =
    step === 1
      ? 'WELCOME TO CODEFIESTA 5.0'
      : step === 2
        ? 'SQUAD & ROSTER REGISTRATION'
        : step === 3
          ? 'REGISTRATION PAYMENT & UTR'
          : loginTab === 'partyCode'
            ? 'JOIN SQUAD WITH PARTY CODE'
            : 'WELCOME BACK'

  const sub =
    step === 1
      ? 'Step 1 of 3 — Create leader account credentials'
      : step === 2
        ? 'Step 2 of 3 — Complete leader details & all teammate profiles'
        : step === 3
          ? 'Step 3 of 3 — Scan QR, pay ₹800 squad fee & enter 12-digit UTR'
          : loginTab === 'partyCode'
            ? 'Enter the party code provided by your leader — no password required'
            : 'Sign in to access your squad dashboard & evaluations'

  const toggleBtnClass =
    'absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-[#171924] hover:bg-[#1e2233] border border-slate-700 text-tactical text-[9px] sm:text-[10px] uppercase tracking-wider font-mono'

  const upiPaymentUri = `upi://pay?pa=git.codefiesta@upi&pn=Codefiesta%205.0&am=800&cu=INR&tn=Codefiesta%20Registration`

  return (
    <div className="auth-page min-h-dvh w-full bg-[#07080e] text-slate-200 font-mono overflow-y-auto">
      <main className="min-h-dvh w-full flex flex-col lg:flex-row">
        {/* Left visual — desktop only */}
        <section className="hidden lg:flex w-5/12 min-h-dvh bg-[#0a0b12] items-center justify-center relative overflow-hidden blueprint-grid p-8 sticky top-0 h-screen">
          <HudBracket pos="tl" />
          <HudBracket pos="tr" />
          <HudBracket pos="bl" />
          <HudBracket pos="br" />
          <div className="w-full max-w-[420px] aspect-square flex items-center justify-center">
            <div className="w-full h-full rounded-lg border border-slate-800 bg-[#080910] p-2 shadow-2xl flex flex-col items-center justify-center overflow-hidden text-center space-y-4">
              <img
                alt="Codefiesta probe blueprint"
                className="w-4/5 h-4/5 object-contain [filter:contrast(1.1)] select-none"
                src="https://lh3.googleusercontent.com/aida/AEtjO1UE1fUyFyVVXW_3EZkQJZjGkfM2RHA9hh1STykyWjUv-gLhozbcLCjv_oFkcwhw1euMP-flfnx1q1NQ-ZcIUNbh30waJiDlg-ICxVGBXrSZ58e5p9jus1tHKcP6RPNXSRx4-lNnBRYkA1ksXmr-sY4I43ZlifJE4NIss3LiI5-K8N7CkU_aXDIjVMgM4kqu4-s5f6L-i6mcesl2LnQo7vEgKcIVPmr50VcpxwlGSzdYw1t-W25piyJcOBQt"
              />
              <div className="px-4 pb-2">
                <div className="text-tactical font-bold text-xs tracking-wider">
                  CODEFIESTA 5.0 GATEWAY
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Leader Login → Team Details → Payment Scanner → UTR Verify
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right auth panel */}
        <section className="flex-1 w-full min-h-dvh flex flex-col items-center justify-center px-3 sm:px-6 py-6 sm:py-12">
          <div className={`w-full ${step === 2 ? 'max-w-[720px]' : 'max-w-[540px]'} transition-all duration-200`}>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 rounded bg-[#10121a]/80 border border-slate-800 text-[10px] sm:text-xs text-slate-400 hover:text-tactical hover:border-tactical transition-colors uppercase tracking-wider"
            >
              <span className="text-tactical font-bold">←</span> Home
            </Link>

            <div className="bg-[#0e111a] border border-slate-800 rounded-xl p-4 sm:p-8 relative shadow-2xl">
              {/* Brand header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 bg-tactical rounded-sm shadow-[0_0_10px_rgba(255,184,0,0.5)]" />
                  <span className="font-mono font-bold text-xs text-tactical tracking-wider">
                    CODEFIESTA 5.0
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs text-slate-500 font-mono uppercase tracking-widest">
                  {step === 'login' ? 'Login Portal' : `Registration // Step ${step} of 3`}
                </span>
              </div>

              {/* Heading */}
              <h1 className="font-sans font-bold text-base sm:text-xl text-white leading-relaxed">
                {heading}
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-1 mb-5">
                {sub}
              </p>

              {/* Active Session Guard (blocks registering another squad while signed in) */}
              {currentUser && step !== 'login' ? (
                <div className="bg-[#111422] border border-amber-500/50 rounded-xl p-6 text-center space-y-4 shadow-xl">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center text-xl font-bold">
                    ⚠️
                  </div>
                  <div>
                    <div className="font-mono font-bold text-xs text-amber-400 uppercase tracking-wider mb-1">
                      ACTIVE SQUAD SESSION DETECTED
                    </div>
                    <p className="text-xs text-slate-200 font-mono">
                      You are currently signed in as <strong className="text-tactical">{currentUser.name || currentUser.email}</strong> ({currentUser.email}).
                    </p>
                    {userTeam && (
                      <div className="mt-3 p-3 rounded-lg bg-[#0a0d16] border border-slate-700/80 text-left text-xs font-mono space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px] uppercase tracking-wider">Your Squad:</span>
                          <span className="text-cyan-400 font-bold text-sm">{userTeam.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px] uppercase tracking-wider">Payment Status:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            userTeam.payment?.status === 'verified'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : userTeam.payment?.status === 'rejected'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            {userTeam.payment?.status ? userTeam.payment.status.toUpperCase() : 'UNPAID'}
                          </span>
                        </div>
                        {userTeam.payment?.utr && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Submitted UTR:</span>
                            <span className="font-mono text-slate-300">{userTeam.payment.utr}</span>
                          </div>
                        )}
                        {userTeam.tableNumber && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Assigned Table:</span>
                            <span className="font-mono text-tactical font-bold">{userTeam.tableNumber}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400 font-mono mt-3 leading-relaxed">
                      Each candidate is permitted only one squad registration. If you want to view your squad, fix payment, or check admission status, use the options below.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="flex-1 btn-ribbed bg-tactical text-black font-mono font-bold text-xs uppercase py-2.5 rounded-lg shadow"
                    >
                      GO TO DASHBOARD &gt;&gt;
                    </button>
                    {userTeam && userTeam.payment?.status !== 'verified' && (
                      <button
                        type="button"
                        onClick={() => navigate('/payment')}
                        className="flex-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-mono font-bold text-xs uppercase py-2.5 transition"
                      >
                        {userTeam.payment?.status === 'rejected' ? 'RE-SUBMIT UTR &gt;&gt;' : 'VIEW PAYMENT / UTR &gt;&gt;'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        await logoutUser()
                        setCurrentUser(null)
                        setUserTeam(null)
                        setStep(1)
                      }}
                      className="flex-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-400 font-mono text-xs uppercase py-2.5 transition"
                    >
                      LOGOUT &amp; SWITCH
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* ─────────────────────────────────────────────────────────── */}
                  {/* STEP 1: Leader Email & Password                            */}
                  {/* ─────────────────────────────────────────────────────────── */}
                  {step === 1 && (
                    <form className="space-y-4" onSubmit={handleStep1Next}>
                      <div className="space-y-1">
                        <label className={labelClass}>Leader Email ID *</label>
                        <input
                          type="email"
                          autoComplete="email"
                          placeholder="leader@gmail.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value)
                            setEmailError('')
                          }}
                          className={`${inputClass} ${emailError ? 'border-red-400' : ''}`}
                          required
                        />
                        {emailError && (
                          <p className="text-[10px] sm:text-xs text-red-400 mt-1">
                            {emailError}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className={labelClass}>Create Account Password *</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Choose a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`${inputClass} pr-16`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className={toggleBtnClass}
                          >
                            {showPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-[#0d101a] border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
                        <span className="text-tactical font-bold">ℹ</span> You are registering as the <strong className="text-tactical">Squad Leader</strong>. Next, you will enter your squad details and profile details for you and all your teammates.
                      </div>

                      {serverError && (
                        <p className="text-[10px] sm:text-xs text-red-400">
                          {serverError}
                        </p>
                      )}

                      <div className="pt-2">
                        <TactileButton
                          disabled={!EMAIL_REGEX.test(email) || !password || checkingEmail}
                          className="w-full"
                        >
                          {checkingEmail ? 'VERIFYING EMAIL...' : 'PROCEED TO SQUAD DETAILS >>'}
                        </TactileButton>
                      </div>

                      <StepDots step={1} total={3} />
                      <p className="text-center text-[10px] sm:text-xs text-slate-600">
                        Step 1 of 3: Account Credentials
                      </p>

                      <div className="text-center pt-2 border-t border-slate-800/60 mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 font-mono">
                        <span>Already registered?</span>
                        <button
                          type="button"
                          onClick={() => {
                            setStep('login')
                            setLoginTab('credentials')
                          }}
                          className="text-tactical hover:underline uppercase font-bold"
                        >
                          Login
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => {
                            setStep('login')
                            setLoginTab('partyCode')
                          }}
                          className="text-cyan-400 hover:underline uppercase font-bold"
                        >
                          Join with Party Code
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              {/* ─────────────────────────────────────────────────────────── */}
              {/* STEP 2: Leader & All Teammates Details                     */}
              {/* ─────────────────────────────────────────────────────────── */}
              {step === 2 && (
                <form className="space-y-5" onSubmit={handleStep2Next}>
                  {/* Squad Configuration Header */}
                  <div className="p-4 rounded-xl bg-[#111524] border border-tactical/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono font-bold text-tactical uppercase tracking-wider flex items-center gap-1.5">
                        <span>🛡️</span> SQUAD CONFIGURATION
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Unique Name & Squad Size
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={labelClass}>Squad / Team Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. CYBER_VORTEX"
                          value={squadName}
                          onChange={(e) => setSquadName(e.target.value)}
                          className={inputClass}
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className={labelClass}>Total Squad Size (Min 2, Max 4 Players) *</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[2, 3, 4].map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setSquadSize(sz)}
                              className={`py-2 px-1 rounded text-xs font-mono font-bold transition border ${
                                squadSize === sz
                                  ? 'bg-tactical text-black border-tactical shadow'
                                  : 'bg-[#090b12] text-slate-300 border-slate-700 hover:border-slate-500'
                              }`}
                            >
                              {sz} Members {sz === 4 ? '★' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Leader Profile */}
                  <div className="p-4 rounded-xl bg-[#090b14] border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-tactical/20 border border-tactical text-tactical text-[10px] font-bold">
                          ★ MEMBER #1: SQUAD LEADER (YOU)
                        </span>
                        <span className="text-xs text-slate-400">{email}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={labelClass}>First name *</label>
                        <input
                          type="text"
                          placeholder="Arjun"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className={inputClass}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={labelClass}>Last name *</label>
                        <input
                          type="text"
                          placeholder="Sharma"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className={inputClass}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={labelClass}>Phone number (10 Digits) *</label>
                        <input
                          type="tel"
                          placeholder="9876543210"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                            setPhoneError('')
                          }}
                          className={`${inputClass} ${phoneError ? 'border-red-400' : ''}`}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={labelClass}>College ID / Roll No. *</label>
                        <input
                          type="text"
                          placeholder="e.g. 23GIT1001"
                          value={rollNumber}
                          onChange={(e) => setRollNumber(e.target.value)}
                          className={inputClass}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className={labelClass}>College / University Name * (Type Name)</label>
                      <input
                        type="text"
                        placeholder="Global Institute of Technology, Jaipur"
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-6 gap-2.5 sm:gap-3">
                      <div className="col-span-3 space-y-1">
                        <label className={labelClass}>Course *</label>
                        <input
                          type="text"
                          placeholder="e.g. B.Tech CSE"
                          value={course}
                          onChange={(e) => setCourse(e.target.value)}
                          className={inputClass}
                          required
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className={labelClass}>Year *</label>
                        <Dropdown
                          options={YEAR_OPTIONS}
                          value={year}
                          onChange={setYear}
                          placeholder="Select"
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className={labelClass}>Sex *</label>
                        <Dropdown
                          options={GENDER_OPTIONS}
                          value={gender}
                          onChange={setGender}
                          placeholder="—"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section: Teammate Profiles */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span>👥</span> TEAMMATES ({squadSize - 1} REQUIRED // TOTAL SQUAD: {squadSize} MEMBERS)
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono">
                        One Email = One Registration
                      </span>
                    </div>

                    {Array.from({ length: squadSize - 1 }, (_, idx) => {
                      const memberNum = idx + 2
                      const tm = teammates[idx]

                      return (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-[#090b14] border border-slate-800 space-y-3 relative"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="px-2 py-0.5 rounded bg-[#161c2e] border border-slate-700 text-slate-300 text-[10px] font-bold">
                              MEMBER #{memberNum}: TEAMMATE {idx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 hidden sm:inline">
                                Will receive unique personalized join code
                              </span>
                              {squadSize > 2 && (
                                <button
                                  type="button"
                                  onClick={() => setSquadSize((s) => Math.max(2, s - 1))}
                                  className="text-[10px] font-mono text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-500/10 transition"
                                  title="Remove this teammate slot"
                                >
                                  ✕ Remove Slot
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className={labelClass}>First name *</label>
                              <input
                                type="text"
                                placeholder="Teammate First Name"
                                value={tm.firstName}
                                onChange={(e) => updateTeammate(idx, 'firstName', e.target.value)}
                                className={inputClass}
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <label className={labelClass}>Last name *</label>
                              <input
                                type="text"
                                placeholder="Teammate Last Name"
                                value={tm.lastName}
                                onChange={(e) => updateTeammate(idx, 'lastName', e.target.value)}
                                className={inputClass}
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className={labelClass}>Email Address *</label>
                              <input
                                type="email"
                                placeholder="teammate@college.edu"
                                value={tm.email}
                                onChange={(e) => updateTeammate(idx, 'email', e.target.value)}
                                className={inputClass}
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <label className={labelClass}>Phone number (10 Digits) *</label>
                              <input
                                type="tel"
                                placeholder="9876543210"
                                value={tm.phone}
                                onChange={(e) =>
                                  updateTeammate(
                                    idx,
                                    'phone',
                                    e.target.value.replace(/\D/g, '').slice(0, 10)
                                  )
                                }
                                className={inputClass}
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className={labelClass}>College Name *</label>
                              <input
                                type="text"
                                placeholder={college || 'College / University'}
                                value={tm.college || ''}
                                onChange={(e) => updateTeammate(idx, 'college', e.target.value)}
                                className={inputClass}
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <label className={labelClass}>Roll No / College ID *</label>
                              <input
                                type="text"
                                placeholder="e.g. 23GIT1002"
                                value={tm.rollNumber}
                                onChange={(e) => updateTeammate(idx, 'rollNumber', e.target.value)}
                                className={inputClass}
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-6 gap-2.5 sm:gap-3">
                            <div className="col-span-3 space-y-1">
                              <label className={labelClass}>Course *</label>
                              <input
                                type="text"
                                placeholder="e.g. B.Tech CSE"
                                value={tm.course}
                                onChange={(e) => updateTeammate(idx, 'course', e.target.value)}
                                className={inputClass}
                                required
                              />
                            </div>
                            <div className="col-span-2 space-y-1">
                              <label className={labelClass}>Year *</label>
                              <Dropdown
                                options={YEAR_OPTIONS}
                                value={tm.year}
                                onChange={(val) => updateTeammate(idx, 'year', val)}
                                placeholder="Select"
                              />
                            </div>
                            <div className="col-span-1 space-y-1">
                              <label className={labelClass}>Sex *</label>
                              <Dropdown
                                options={GENDER_OPTIONS}
                                value={tm.gender}
                                onChange={(val) => updateTeammate(idx, 'gender', val)}
                                placeholder="—"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Add Another Teammate Slot Button (Max 4 Members Total) */}
                    {squadSize < 4 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setSquadSize((s) => Math.min(4, s + 1))}
                          className="w-full py-2.5 rounded-xl bg-[#121729] hover:bg-[#1a2038] border border-dashed border-tactical/50 text-tactical font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                        >
                          <span className="text-base font-black">+</span>
                          <span>ADD ANOTHER TEAMMATE SLOT (CURRENT: {squadSize} MEMBERS // MAX 4)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {serverError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 text-xs">
                      ⚠️ {serverError}
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2.5 rounded-md bg-[#171924] hover:bg-[#1e2233] border border-slate-700 text-slate-300 font-mono text-xs uppercase tracking-wider transition-colors"
                    >
                      ← Back
                    </button>
                    <TactileButton className="flex-1">
                      PROCEED TO PAYMENT &gt;&gt;
                    </TactileButton>
                  </div>

                  <StepDots step={2} total={3} />
                  <p className="text-center text-[10px] sm:text-xs text-slate-600">
                    Step 2 of 3: Roster Details
                  </p>
                </form>
              )}

              {/* ─────────────────────────────────────────────────────────── */}
              {/* STEP 3: Payment Scanner & UTR Final Submission            */}
              {/* ─────────────────────────────────────────────────────────── */}
              {step === 3 && (
                <form className="space-y-5" onSubmit={handleStep3Submit}>
                  {/* Payment HUD Card */}
                  <div className="p-5 rounded-xl bg-[#090c14] border border-tactical/40 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <div className="text-xs font-mono font-bold text-tactical uppercase tracking-wider">
                          OFFICIAL PAYMENT GATEWAY
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Squad: <strong className="text-white">{squadName}</strong> ({squadSize} Members)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-sans font-black text-tactical">₹800</div>
                        <div className="text-[9px] text-slate-400 uppercase font-mono">Total Squad Fee</div>
                      </div>
                    </div>

                    {/* QR Code Matrix */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                      <div className="p-3 rounded-xl bg-white border-2 border-tactical shadow-xl flex items-center justify-center">
                        <QRCodeSvg value={upiPaymentUri} size={168} />
                      </div>

                      <div className="space-y-2.5 text-center sm:text-left max-w-[260px]">
                        <div className="text-xs text-slate-300 font-mono font-semibold">
                          Scan & Pay via any UPI App
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                          {['GPay', 'PhonePe', 'Paytm', 'BHIM', 'CRED'].map((app) => (
                            <span
                              key={app}
                              className="px-2 py-0.5 rounded bg-[#141829] border border-slate-700 text-[9px] font-mono text-slate-300"
                            >
                              {app}
                            </span>
                          ))}
                        </div>

                        <div className="pt-1">
                          <div className="text-[10px] text-slate-400 uppercase font-mono">
                            Official Merchant UPI ID:
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 justify-center sm:justify-start">
                            <span className="text-xs font-mono font-bold text-white bg-[#131726] px-2.5 py-1 rounded border border-slate-700 select-all">
                              git.codefiesta@upi
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyUpi}
                              className="px-2 py-1 rounded bg-[#1e2338] hover:bg-tactical hover:text-black text-slate-300 text-[10px] font-mono transition"
                            >
                              {copiedUpi ? '✓ COPIED' : '📋 COPY'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="p-3 rounded bg-[#101422] border border-slate-800 text-[10px] sm:text-xs text-slate-400 space-y-1">
                      <div className="font-bold text-slate-300">Payment Steps:</div>
                      <div>1. Scan QR with your UPI app or pay ₹800 to <code className="text-tactical">git.codefiesta@upi</code>.</div>
                      <div>2. Copy the 12-digit UTR / UPI Transaction Reference Number from your payment receipt.</div>
                      <div>3. Paste the UTR below and click Final Submission. Our organizing committee will match your transaction and unlock your dashboard.</div>
                    </div>
                  </div>

                  {/* UTR Input Field */}
                  <div className="space-y-1.5">
                    <label className={labelClass}>
                      Enter 12-Digit UPI Transaction Reference (UTR) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 428901238910"
                      value={utr}
                      onChange={(e) => {
                        setUtr(e.target.value)
                        setUtrError('')
                      }}
                      className={`${inputClass} text-sm font-bold tracking-widest ${
                        utrError ? 'border-red-400' : ''
                      }`}
                      required
                    />
                    {utrError && (
                      <p className="text-[10px] sm:text-xs text-red-400 mt-1">
                        {utrError}
                      </p>
                    )}
                  </div>

                  {serverError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 text-xs">
                      ⚠️ {serverError}
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2.5 rounded-md bg-[#171924] hover:bg-[#1e2233] border border-slate-700 text-slate-300 font-mono text-xs uppercase tracking-wider transition-colors"
                    >
                      ← Back to Details
                    </button>
                    <TactileButton disabled={submitting} className="flex-1">
                      {submitting ? 'SUBMITTING REGISTRATION...' : '💳 FINAL SUBMISSION & SUBMIT UTR'}
                    </TactileButton>
                  </div>

                  <StepDots step={3} total={3} />
                  <p className="text-center text-[10px] sm:text-xs text-slate-600">
                    Step 3 of 3: Payment Verification
                  </p>
                </form>
              )}

              {/* ─────────────────────────────────────────────────────────── */}
              {/* LOGIN MODE (Dual Tabs: Account Login vs Party Code)       */}
              {/* ─────────────────────────────────────────────────────────── */}
              {step === 'login' && (
                <div className="space-y-4">
                  {/* Mode Selector Tabs */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#090c16] rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setLoginTab('credentials')}
                      className={`py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center justify-center gap-1.5 ${
                        loginTab === 'credentials'
                          ? 'bg-tactical text-black shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🔐</span>
                      <span>Account Login</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginTab('partyCode')}
                      className={`py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center justify-center gap-1.5 ${
                        loginTab === 'partyCode'
                          ? 'bg-tactical text-black shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🎮</span>
                      <span>Join with Party Code</span>
                    </button>
                  </div>

                  {/* TAB 1: Account Login (Email & Password) */}
                  {loginTab === 'credentials' && (
                    <form className="space-y-3 sm:space-y-4" onSubmit={handleLogin}>
                      <div className="space-y-1">
                        <label className={labelClass}>Email ID</label>
                        <input
                          type="email"
                          autoComplete="email"
                          placeholder="leader@gmail.com"
                          value={loginEmail}
                          onChange={(e) => {
                            setLoginEmail(e.target.value)
                            setLoginError('')
                          }}
                          className={`${inputClass} ${
                            loginError && !EMAIL_REGEX.test(loginEmail)
                              ? 'border-red-400'
                              : ''
                          }`}
                          required
                        />
                        {loginError && !EMAIL_REGEX.test(loginEmail) && (
                          <p className="text-[10px] sm:text-xs text-red-400">
                            {loginError}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className={labelClass}>Password</label>
                          <button
                            type="button"
                            onClick={() => {
                              setForgotEmail(loginEmail || '')
                              setForgotSubmitted(false)
                              setForgotMsg('')
                              setShowForgotModal(true)
                            }}
                            className="text-[10px] font-mono text-tactical hover:underline uppercase tracking-wider font-semibold"
                          >
                            Forgot Password?
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            value={loginPassword}
                            onChange={(e) => {
                              setLoginPassword(e.target.value)
                              setLoginError('')
                            }}
                            className={`${inputClass} pr-16`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className={toggleBtnClass}
                          >
                            {showPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      {loginError && EMAIL_REGEX.test(loginEmail) && (
                        <p className="text-[10px] sm:text-xs text-red-400">
                          {loginError}
                        </p>
                      )}

                      <div className="pt-2">
                        <TactileButton disabled={submitting} className="w-full">
                          {submitting ? 'SIGNING IN...' : 'LOGIN >>'}
                        </TactileButton>
                      </div>

                      <div className="text-center pt-2 border-t border-slate-800/60 mt-4 space-y-1.5">
                        <p className="text-xs text-slate-400 font-mono">
                          Joining as a squad teammate?{' '}
                          <button
                            type="button"
                            onClick={() => setLoginTab('partyCode')}
                            className="text-cyan-400 hover:underline uppercase font-bold ml-1"
                          >
                            Join with Party Code
                          </button>
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          New to Codefiesta?{' '}
                          <button
                            type="button"
                            onClick={clearLogin}
                            className="text-tactical hover:underline uppercase font-bold ml-1"
                          >
                            Register Squad
                          </button>
                        </p>
                      </div>
                    </form>
                  )}

                  {/* TAB 2: Join with Party Code (Teammate Access - No Password Required) */}
                  {loginTab === 'partyCode' && (
                    <form className="space-y-4" onSubmit={handlePartyCodeJoin}>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className={labelClass}>Squad Party Code / Invite Code *</label>
                          <span className="text-[10px] text-cyan-400 font-mono">No Password Needed</span>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. NEURAL-VIKRAM-GLOB-ROHAN-5603"
                          value={partyCode}
                          onChange={(e) => {
                            setPartyCode(e.target.value.toUpperCase())
                            setPartyCodeError('')
                          }}
                          className={`${inputClass} font-mono tracking-wider uppercase text-tactical font-semibold`}
                          required
                        />
                        <p className="text-[11px] text-slate-400 font-mono leading-relaxed mt-1">
                          Enter the unique Party Code given to you by your Squad Leader. Teammates enter their team dashboard directly without having to register or login with a password.
                        </p>
                        {partyCodeError && (
                          <p className="text-xs text-red-400 font-mono mt-1">
                            ✕ {partyCodeError}
                          </p>
                        )}
                      </div>

                      <div className="pt-2">
                        <TactileButton disabled={submitting} className="w-full">
                          {submitting ? 'CONNECTING TO SQUAD...' : '🚀 JOIN SQUAD & ENTER DASHBOARD >>'}
                        </TactileButton>
                      </div>

                      <div className="text-center pt-2 border-t border-slate-800/60 mt-4 space-y-1.5">
                        <p className="text-xs text-slate-400 font-mono">
                          Have leader credentials?{' '}
                          <button
                            type="button"
                            onClick={() => setLoginTab('credentials')}
                            className="text-tactical hover:underline uppercase font-bold ml-1"
                          >
                            Sign In with Password
                          </button>
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          New to Codefiesta?{' '}
                          <button
                            type="button"
                            onClick={clearLogin}
                            className="text-tactical hover:underline uppercase font-bold ml-1"
                          >
                            Register Squad
                          </button>
                        </p>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FORGOT PASSWORD / HELPDESK RECOVERY MODAL                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0a0d17] border border-tactical/40 rounded-2xl p-6 sm:p-7 shadow-[0_0_40px_rgba(255,184,0,0.15)] relative space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-tactical animate-pulse" />
                <span className="font-arcade text-xs text-white tracking-wider">
                  LOST CREDENTIALS // OPS DESK
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition"
              >
                ✕
              </button>
            </div>

            {!forgotSubmitted ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!forgotEmail) return
                  setForgotLoading(true)
                  try {
                    const res = await requestPasswordResetApi(forgotEmail)
                    setForgotMsg(res?.message || 'Password reset request registered.')
                    setForgotSubmitted(true)
                  } catch (err) {
                    setForgotMsg('Request submitted to Admin Desk.')
                    setForgotSubmitted(true)
                  } finally {
                    setForgotLoading(false)
                  }
                }}
                className="space-y-4"
              >
                <p className="text-xs text-slate-300 leading-relaxed">
                  Lost your password? Enter your registered email address. The Admin Command Vault will locate your profile and reset your password.
                </p>

                <div className="space-y-1">
                  <label className={labelClass}>Registered Account Email *</label>
                  <input
                    type="email"
                    placeholder="leader@gmail.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#0f1424] border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="text-tactical font-bold text-[10px] uppercase">Direct Ops Helpline</div>
                  <div>📞 Phone / WhatsApp: <a href="https://wa.me/919772316648" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">+91 97723 16648</a></div>
                  <div>✉️ Email: <a href="mailto:support@codefiesta.in" className="text-cyan-400 hover:underline">support@codefiesta.in</a></div>
                  <div>📍 On-Ground Desk: GIT Central Control Room (Main Entrance)</div>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs uppercase font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 btn-ribbed bg-tactical text-black text-xs uppercase font-bold py-2.5 rounded-lg shadow disabled:opacity-50"
                  >
                    {forgotLoading ? 'Submitting...' : 'Submit Request >>'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xl mx-auto">
                  ✓
                </div>
                <div>
                  <h3 className="font-arcade text-xs text-white">REQUEST TRANSMITTED TO OPS</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {forgotMsg}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Our admin desk is actively monitoring. You can connect with the helpdesk on WhatsApp at <strong className="text-tactical">+91 97723 16648</strong> for instant password generation.
                  </p>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-6 py-2.5 rounded-lg bg-tactical text-black font-arcade text-[10px] uppercase font-bold"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Auth