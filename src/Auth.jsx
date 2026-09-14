import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { QRCodeSvg } from './qrGenerator.jsx'
import satelliteImg from './assets/satellite.png'
import {
  ShieldCheck,
  Rocket,
  Users,
  CreditCard,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Mail,
  Lock,
  Info,
} from 'lucide-react'
import {
  registerUser,
  logoutUser,
  fetchMe,
  fetchMyTeams,
  getAllRegisteredTeams,
  checkEmailApi,
  checkSquadNameApi,
  createTeamApi,
  joinWithPartyCodeApi,
  isEmailRegisteredAnywhere,
  sendOtpApi,
  verifyOtpApi,
} from './api'

// Indian mobile number: starts with 6-9, exactly 10 digits
const PHONE_REGEX = /^[6-9]\d{9}$/
// Basic email format check
const EMAIL_REGEX = /^\S+@\S+\.\S+$/

const OFFICIAL_UPI_ID = 'Q073541130@ybl'
const SQUAD_FEE = 800
const UNIVERSAL_UPI_URI = `upi://pay?pa=${OFFICIAL_UPI_ID}&pn=Codefiesta%205.0&am=${SQUAD_FEE}&cu=INR&tn=Codefiesta%205.0%20Registration`

const inputClass =
  'w-full rounded-xl bg-[#090d18] border border-slate-700/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-sans'

const labelClass =
  'block text-xs text-slate-300 font-semibold mb-1.5 uppercase tracking-wider font-sans'

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
  const stepTitles = ['Leader Email', 'Squad Roster', 'Flat ₹800 Payment']
  return (
    <div className="pt-3 pb-1 select-none">
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
          const active = n === step
          const done = n < step
          return (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center rounded-full text-xs font-bold transition-all ${
                  active
                    ? 'w-7 h-7 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.6)] ring-2 ring-amber-400/30 font-sans'
                    : done
                    ? 'w-6 h-6 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 font-sans'
                    : 'w-6 h-6 bg-slate-900 text-slate-500 border border-slate-800 font-sans'
                }`}
              >
                {done ? '✓' : n}
              </div>
              {n < total && (
                <div
                  className={`w-8 sm:w-12 h-0.5 rounded transition-all ${
                    done ? 'bg-emerald-500/60' : 'bg-slate-800'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="text-center text-[11px] sm:text-xs text-slate-400 mt-2 font-sans">
        Step {step} of {total}: <span className="text-amber-400 font-semibold">{stepTitles[step - 1] || ''}</span>
      </div>
    </div>
  )
}

function TactileButton({ children, className = '', ...props }) {
  return (
    <button
      type="submit"
      className={`group relative overflow-hidden bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-300 active:scale-[0.99] text-slate-950 font-sans font-bold text-xs sm:text-sm tracking-wider uppercase rounded-xl px-5 py-3 sm:py-3.5 border-b-2 border-amber-600 transition-all duration-150 flex items-center justify-center shadow-[0_4px_16px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_24px_rgba(245,158,11,0.45)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${className}`}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
    </button>
  )
}

export default function Auth() {
  const location = useLocation()
  const navigate = useNavigate()
  const [step, setStep] = useState(() => (location.pathname === '/login' ? 'login' : 1))

  useEffect(() => {
    if (location.pathname === '/login') {
      setStep('login')
    } else if (location.pathname === '/register' && step === 'login') {
      setStep(1)
    }
  }, [location.pathname])

  // Active session detection
  const [currentUser, setCurrentUser] = useState(null)
  const [userTeam, setUserTeam] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  // Login tabs: 'otp' | 'partyCode'
  const [loginTab, setLoginTab] = useState('otp')
  const [partyCode, setPartyCode] = useState('')
  const [partyCodeError, setPartyCodeError] = useState('')

  // OTP Login State (Passwordless via support@protechy.in)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginOtp, setLoginOtp] = useState('')
  const [otpDispatched, setOtpDispatched] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpMsg, setOtpMsg] = useState('')
  const [otpError, setOtpError] = useState('')
  const [attemptsLeft, setAttemptsLeft] = useState(5)

  // Step 1: Leader Email
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [checkingEmail, setCheckingEmail] = useState(false)

  // Step 2: Squad Configuration
  const [squadName, setSquadName] = useState('')
  const [squadSize, setSquadSize] = useState(4)
  const [college, setCollege] = useState('')
  const [squadNameStatus, setSquadNameStatus] = useState('idle') // 'idle' | 'checking' | 'available' | 'taken'
  const [squadNameError, setSquadNameError] = useState('')

  // Step 2: Leader Profile (No gender, roll number, or course)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')

  // Step 2: Teammates (Shared college, no gender/roll/course)
  const [teammates, setTeammates] = useState([
    { firstName: '', lastName: '', email: '', phone: '' },
    { firstName: '', lastName: '', email: '', phone: '' },
    { firstName: '', lastName: '', email: '', phone: '' },
  ])

  // Step 3: Payment
  const [utr, setUtr] = useState('')
  const [utrError, setUtrError] = useState('')
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  // Check active session
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
            // Non-blocking
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

  // Restore draft on mount so mobile app switches never lose form state
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cf_reg_draft')
      if (raw) {
        const d = JSON.parse(raw)
        if (d.email) setEmail(d.email)
        if (d.squadName) setSquadName(d.squadName)
        if (d.squadSize) setSquadSize(Number(d.squadSize) || 4)
        if (d.college) setCollege(d.college)
        if (d.firstName) setFirstName(d.firstName)
        if (d.lastName) setLastName(d.lastName)
        if (d.phone) setPhone(d.phone)
        if (Array.isArray(d.teammates) && d.teammates.length > 0) {
          setTeammates((prev) =>
            prev.map((t, idx) => ({ ...t, ...(d.teammates[idx] || {}) }))
          )
        }
        if (d.utr) setUtr(d.utr)
        if (d.step && location.pathname !== '/login' && d.step > 1) {
          setStep(d.step)
        }
      }
    } catch {}
  }, [location.pathname])

  // Persist form state to localStorage on changes (so mobile switching never loses progress)
  useEffect(() => {
    if (step === 'login') return
    try {
      const draft = {
        email,
        squadName,
        squadSize,
        college,
        firstName,
        lastName,
        phone,
        teammates,
        utr,
        step,
      }
      localStorage.setItem('cf_reg_draft', JSON.stringify(draft))
    } catch {}
  }, [email, squadName, squadSize, college, firstName, lastName, phone, teammates, utr, step])

  // Real-time Squad Name Uniqueness Check (ensures uniqueness before proceeding)
  useEffect(() => {
    const trimmed = squadName.trim()
    if (!trimmed || trimmed.length < 3) {
      setSquadNameStatus('idle')
      setSquadNameError('')
      return
    }

    const timer = setTimeout(async () => {
      setSquadNameStatus('checking')
      setSquadNameError('')
      try {
        await checkSquadNameApi(trimmed)
        setSquadNameStatus('available')
      } catch (err) {
        setSquadNameStatus('taken')
        setSquadNameError(err.message || `Squad name "${trimmed}" is already taken. Please choose a unique name.`)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [squadName])

  const updateTeammate = (index, field, val) => {
    setTeammates((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }
      return copy
    })
    setServerError('')
  }

  // Step 1: Verify Email (Passwordless - read only, 0 database writes)
  const handleStep1Next = async (e) => {
    e.preventDefault()
    setEmailError('')
    setServerError('')
    const cleanEmail = email.trim().toLowerCase()
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setEmailError('Please enter a valid email address.')
      return
    }

    setCheckingEmail(true)
    try {
      const res = await checkEmailApi(cleanEmail)
      if (res?.exists) {
        setEmailError(`Email "${cleanEmail}" is already registered. Please log in instead.`)
        return
      }
      setStep(2)
    } catch (err) {
      setEmailError(err.message || 'Email verification error')
    } finally {
      setCheckingEmail(false)
    }
  }

  // Step 2: Verify Squad & Profiles (No gender/roll/course, common college - read only, 0 server writes)
  const handleStep2Next = async (e) => {
    if (e) e.preventDefault()
    setServerError('')
    setPhoneError('')

    if (!squadName.trim()) {
      setServerError('Squad name is required.')
      return
    }

    if (squadNameStatus === 'taken' || squadNameError) {
      setServerError(squadNameError || 'Squad name is already taken. Please choose a unique name.')
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
          (existing.leaderEmail?.toLowerCase() === email.trim().toLowerCase() ||
            existing.leader?.email?.toLowerCase() === email.trim().toLowerCase())
        ) {
          setServerError(`You have already registered squad "${existing.name}". Please log in to view your Squad Dashboard or Payment page.`)
          return
        }
      } catch {}
      setServerError(err.message)
      return
    }

    // Leader Details
    if (isEmailRegisteredAnywhere(email.trim().toLowerCase())) {
      setServerError(`Leader email "${email}" is already registered. If this is your squad, please log in with your email to access your dashboard.`)
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
      setServerError('Please enter a valid 10-digit mobile number for the leader.')
      return
    }
    if (!college.trim()) {
      setServerError('Please enter your college / university name (shared by all squad members).')
      return
    }

    // Teammates check
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

      if (isEmailRegisteredAnywhere(tmEmail)) {
        setServerError(`Email "${tmEmail}" is already registered with another account or squad. Each participant can belong to only one squad.`)
        return
      }

      if (!PHONE_REGEX.test(tm.phone)) {
        setServerError(`Teammate #${memberNum} requires a valid 10-digit Indian mobile number.`)
        return
      }
    }

    // All profiles validated — proceed to Step 3 (Payment). Do NOT save to DB yet!
    setStep(3)
  }

  // Step 3: Final Payment Submission (Only saves to DB upon UTR entry)
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
      const leaderEmail = email.trim().toLowerCase()

      // 1. Prepare Teammates (common college, status: accepted)
      const needed = squadSize - 1
      const activeTeammates = teammates.slice(0, needed).map((tm) => ({
        firstName: tm.firstName.trim(),
        lastName: tm.lastName.trim(),
        name: `${tm.firstName.trim()} ${tm.lastName.trim()}`,
        email: tm.email.trim().toLowerCase(),
        phone: tm.phone.trim(),
        college: college.trim(),
        role: 'member',
        status: 'accepted',
      }))

      // 2. Commit Squad & Leader to Database atomically with status: pending_verification
      // Zero server writes occur if the user dropped midway before this submission.
      const res = await createTeamApi({
        name: squadName.trim(),
        size: squadSize,
        college: college.trim(),
        status: 'pending_verification',
        leader: {
          email: leaderEmail,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone.trim(),
          college: college.trim(),
          role: 'leader',
          status: 'accepted',
        },
        members: activeTeammates,
        payment: {
          utr: cleanUtr,
          amount: SQUAD_FEE,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
        },
      })

      // 3. Immediately establish authenticated session for the candidate
      const leaderUser = res?.user || {
        id: res?.team?.leader?.id || ('usr_' + (res?.team?.id || Math.random().toString(36).slice(2, 9))),
        email: leaderEmail,
        name: `${firstName.trim()} ${lastName.trim()}`,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        college: college.trim(),
        role: 'leader',
        isLeader: true,
      }

      try {
        localStorage.setItem('cf_auth_user', JSON.stringify(leaderUser))
        localStorage.setItem('cf_user', JSON.stringify(leaderUser))
        localStorage.removeItem('cf_logged_out')
        localStorage.removeItem('cf_reg_draft')
        if (res?.team) {
          localStorage.setItem(`cf_user_teams_${leaderEmail}`, JSON.stringify([res.team]))
        }
      } catch {}

      // 4. Dispatch storage & teams updated event for immediate sync
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('codefiesta_teams_updated'))
        window.dispatchEvent(new Event('storage'))
      }

      // 5. Navigate directly to Dashboard (displays VerificationPendingScreen)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please check inputs.')
    } finally {
      setSubmitting(false)
    }
  }

  // Passwordless Login: Dispatch OTP from support@protechy.in
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setOtpError('')
    setOtpMsg('')
    const cleanEmail = loginEmail.trim().toLowerCase()
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setOtpError('Please enter a valid email address.')
      return
    }

    setOtpLoading(true)
    try {
      const res = await sendOtpApi(cleanEmail)
      if (res && res.delivered === false) {
        throw new Error(res.error || `Unable to send OTP email to ${cleanEmail}. Please check your connection or try again.`)
      }
      setOtpDispatched(true)
      setOtpMsg(res.message || `Login OTP dispatched from support@protechy.in to ${cleanEmail}.`)
      if (res.attemptsLeft !== undefined) setAttemptsLeft(res.attemptsLeft)
    } catch (err) {
      setOtpError(err.message || 'Failed to dispatch OTP.')
    } finally {
      setOtpLoading(false)
    }
  }

  // Passwordless Login: Verify 6-digit OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setOtpError('')
    const cleanEmail = loginEmail.trim().toLowerCase()
    const cleanOtp = loginOtp.trim()
    if (!cleanOtp || cleanOtp.length < 6) {
      setOtpError('Please enter the 6-digit OTP received on your email.')
      return
    }

    setSubmitting(true)
    try {
      await verifyOtpApi(cleanEmail, cleanOtp)
      navigate('/dashboard')
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired OTP.')
    } finally {
      setSubmitting(false)
    }
  }

  // Teammate Party Code Join
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
    setLoginOtp('')
    setOtpDispatched(false)
    setOtpMsg('')
    setOtpError('')
    setPartyCode('')
    setPartyCodeError('')
    setStep(1)
  }

  const handleCopyUpi = async () => {
    const ok = await copyText(OFFICIAL_UPI_ID)
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
            : 'PASSWORDLESS LOGIN'

  const sub =
    step === 1
      ? 'Step 1 of 3 — Enter leader email to begin registration'
      : step === 2
        ? 'Step 2 of 3 — Complete squad details & teammate profiles'
        : step === 3
          ? 'Step 3 of 3 — Scan QR, pay ₹800 squad fee & enter 12-digit UTR'
          : loginTab === 'partyCode'
            ? 'Enter party code provided by your leader — no password required'
            : 'Sign in with your email & 6-digit OTP dispatched from support@protechy.in'

  return (
    <div className="auth-page min-h-dvh w-full bg-[#07080e] text-slate-200 font-sans overflow-y-auto selection:bg-amber-400 selection:text-slate-950">
      <main className="min-h-dvh w-full flex flex-col lg:flex-row">
        {/* Left visual — desktop only */}
        <section className="hidden lg:flex w-5/12 min-h-dvh bg-[#070912] items-center justify-center relative overflow-hidden blueprint-grid p-8 sticky top-0 h-screen">
          <HudBracket pos="tl" />
          <HudBracket pos="tr" />
          <HudBracket pos="bl" />
          <HudBracket pos="br" />
          <div className="w-full max-w-[460px] flex flex-col items-center justify-center">
            <div className="w-full rounded-2xl border border-slate-800/90 bg-[#090d18]/90 backdrop-blur-xl p-6 shadow-2xl shadow-black/80 flex flex-col items-center justify-center overflow-hidden text-center relative group">
              
              {/* Top Bar: Official Badge & Sector */}
              <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/codefiesta-logo.png"
                    alt="Codefiesta 5.0"
                    className="w-8 h-8 rounded-full shadow-[0_0_12px_rgba(236,72,153,0.35)]"
                  />
                  <div className="text-left">
                    <div className="text-xs font-bold text-white tracking-widest uppercase font-sans">
                      CODEFIESTA <span className="text-amber-400">5.0</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono">
                      NATIONAL HACKATHON
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ORBITAL SYNC
                </div>
              </div>

              {/* Satellite Showcase Container */}
              <div className="relative w-full aspect-[4/3] rounded-xl bg-gradient-to-b from-[#0e1428] to-[#060812] border border-slate-800/80 flex items-center justify-center overflow-hidden p-4 shadow-inner">
                {/* Radial Glow Halo */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.15),_transparent_70%)] pointer-events-none" />
                
                {/* Subtle HUD crosshairs */}
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-cyan-500/10 pointer-events-none" />
                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-cyan-500/10 pointer-events-none" />
                
                {/* Floating Satellite Image */}
                <img
                  src={satelliteImg}
                  alt="Codefiesta 5.0 Orbital Satellite Probe"
                  className="w-full h-full object-contain select-none animate-float-slow drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] filter brightness-105"
                />

                {/* Telemetry Corner Badges */}
                <div className="absolute top-2.5 left-3 text-[9px] font-mono text-cyan-400/90 bg-black/60 px-2 py-0.5 rounded border border-cyan-500/20 backdrop-blur-sm">
                  🛰️ PROBE: CF-SAT-05
                </div>
                <div className="absolute top-2.5 right-3 text-[9px] font-mono text-amber-400/90 bg-black/60 px-2 py-0.5 rounded border border-amber-500/20 backdrop-blur-sm">
                  1420.405 MHz
                </div>
                <div className="absolute bottom-2.5 left-3 text-[9px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded border border-slate-700/40 backdrop-blur-sm">
                  SECTOR: JAIPUR (GIT)
                </div>
                <div className="absolute bottom-2.5 right-3 text-[9px] font-mono text-emerald-400 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/20 backdrop-blur-sm">
                  GATEWAY: ONLINE
                </div>
              </div>

              {/* Registration Flow Roadmap */}
              <div className="w-full pt-4 space-y-3">
                <div className="text-xs font-bold text-slate-200 tracking-wider uppercase font-sans flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>CANDIDATE ONBOARDING PROTOCOL</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="p-2.5 rounded-lg bg-[#0d1222] border border-slate-800/80">
                    <div className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">
                      <span>01.</span> LEADER EMAIL
                    </div>
                    <div className="text-[11px] text-slate-300 font-sans mt-0.5">
                      Zero password. Instant OTP login.
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0d1222] border border-slate-800/80">
                    <div className="text-[10px] text-cyan-400 font-mono font-bold flex items-center gap-1">
                      <span>02.</span> SQUAD ROSTER
                    </div>
                    <div className="text-[11px] text-slate-300 font-sans mt-0.5">
                      2–4 members · Common college.
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0d1222] border border-slate-800/80">
                    <div className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <span>03.</span> FLAT ₹800 UPI
                    </div>
                    <div className="text-[11px] text-slate-300 font-sans mt-0.5">
                      Quick app links & UTR verify.
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0d1222] border border-slate-800/80">
                    <div className="text-[10px] text-purple-400 font-mono font-bold flex items-center gap-1">
                      <span>04.</span> LIVE DASHBOARD
                    </div>
                    <div className="text-[11px] text-slate-300 font-sans mt-0.5">
                      Admin verified squad access.
                    </div>
                  </div>
                </div>

                {/* Footer Assurance */}
                <div className="text-[10px] text-slate-400 font-sans pt-1 flex items-center justify-center gap-1.5 border-t border-slate-800/60">
                  <span className="text-emerald-400">✓</span> Automated OTP dispatched via <strong className="text-slate-200">support@protechy.in</strong>
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
                  {step === 'login' ? 'OTP Login Portal' : `Registration // Step ${step} of 3`}
                </span>
              </div>

              {/* Heading */}
              <h1 className="font-sans font-bold text-base sm:text-xl text-white leading-relaxed">
                {heading}
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-1 mb-5">
                {sub}
              </p>

              {/* Active Session Guard */}
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
                      Each candidate is permitted only one squad registration.
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
                  {/* STEP 1: Leader Email (Passwordless)                         */}
                  {/* ─────────────────────────────────────────────────────────── */}
                  {step === 1 && (
                    <form className="space-y-4" onSubmit={handleStep1Next}>
                      <div className="space-y-1.5">
                        <label className={labelClass}>
                          Leader Email Address <span className="text-amber-400">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Mail className="w-4 h-4 text-slate-500" />
                          </div>
                          <input
                            type="email"
                            autoComplete="email"
                            placeholder="e.g. leader@gmail.com"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value)
                              setEmailError('')
                            }}
                            className={`${inputClass} pl-10 ${emailError ? 'border-red-400 ring-1 ring-red-400/30' : ''}`}
                            required
                            autoFocus
                          />
                        </div>
                        {emailError && (
                          <p className="text-xs text-red-400 mt-1 font-medium">
                            {emailError}
                          </p>
                        )}
                      </div>

                      {/* Elevated Information Card */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-transparent border border-emerald-500/30 text-xs sm:text-sm text-slate-200 flex items-start gap-3 shadow-lg shadow-emerald-500/5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                          🛡️
                        </div>
                        <div className="space-y-1 leading-relaxed">
                          <strong className="text-emerald-300 font-semibold block text-xs uppercase tracking-wider font-sans">
                            Passwordless Security Protocol
                          </strong>
                          <p className="text-slate-300 text-xs font-sans">
                            No passwords to create or remember. Complete your squad registration and payment now, and access your account anytime with a secure 6-digit OTP delivered from <strong className="text-cyan-300">support@protechy.in</strong>.
                          </p>
                          <p className="text-[11px] text-amber-300/90 font-sans pt-1 flex items-center gap-1.5">
                            <span>⚡</span>
                            <span>Anti-Bot Shield: Incomplete or dropped registrations are never saved to our servers. Only completed squads with verified payment are recorded.</span>
                          </p>
                        </div>
                      </div>

                      {serverError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-xs text-red-300 font-medium font-sans">
                          {serverError}
                        </div>
                      )}

                      <div className="pt-2">
                        <TactileButton
                          disabled={!EMAIL_REGEX.test(email) || checkingEmail}
                          className="w-full"
                        >
                          {checkingEmail ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                              VERIFYING EMAIL...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              PROCEED TO SQUAD DETAILS <ArrowRight className="w-4 h-4" />
                            </span>
                          )}
                        </TactileButton>
                      </div>

                      <StepDots step={1} total={3} />

                      <div className="text-center pt-3 border-t border-slate-800/80 mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 font-sans">
                        <span>Already registered?</span>
                        <button
                          type="button"
                          onClick={() => {
                            setStep('login')
                            setLoginTab('otp')
                            if (email) setLoginEmail(email.trim().toLowerCase())
                          }}
                          className="px-2.5 py-1 rounded-md bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 uppercase font-bold text-xs transition cursor-pointer"
                        >
                          OTP Login
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => {
                            setStep('login')
                            setLoginTab('partyCode')
                          }}
                          className="px-2.5 py-1 rounded-md bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 uppercase font-bold text-xs transition cursor-pointer"
                        >
                          Join with Party Code
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ─────────────────────────────────────────────────────────── */}
                  {/* STEP 2: Squad & Roster (No gender/roll/course, common coll) */}
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
                            Name, Size & Shared College
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className={labelClass}>Squad / Team Name *</label>
                              {squadNameStatus === 'checking' && (
                                <span className="text-[10px] text-amber-400 font-sans animate-pulse">
                                  Checking...
                                </span>
                              )}
                              {squadNameStatus === 'available' && (
                                <span className="text-[10px] text-emerald-400 font-sans font-semibold flex items-center gap-1">
                                  ✓ Available
                                </span>
                              )}
                              {squadNameStatus === 'taken' && (
                                <span className="text-[10px] text-rose-400 font-sans font-semibold flex items-center gap-1">
                                  ⚠️ Already taken
                                </span>
                              )}
                            </div>
                            <input
                              type="text"
                              placeholder="e.g. CYBER_VORTEX"
                              value={squadName}
                              onChange={(e) => {
                                setSquadName(e.target.value)
                                if (squadNameError) setSquadNameError('')
                              }}
                              className={`${inputClass} ${
                                squadNameStatus === 'taken'
                                  ? 'border-rose-500/80 focus:border-rose-400 focus:ring-rose-500/20'
                                  : squadNameStatus === 'available'
                                  ? 'border-emerald-500/80 focus:border-emerald-400 focus:ring-emerald-500/20'
                                  : ''
                              }`}
                              required
                            />
                            {squadNameError && (
                              <p className="text-[11px] text-rose-400 font-sans mt-0.5">
                                {squadNameError}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className={labelClass}>Total Squad Size (2 to 4 Members) *</label>
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

                        {/* Common College for ALL Squad Members */}
                        <div className="space-y-1 pt-1">
                          <label className={labelClass}>College / University Name * (Shared by all members)</label>
                          <input
                            type="text"
                            placeholder="Global Institute of Technology, Jaipur"
                            value={college}
                            onChange={(e) => setCollege(e.target.value)}
                            className={inputClass}
                            required
                          />
                          <p className="text-[10px] text-slate-400 font-mono">
                            All teammates in this squad will be registered under this institution.
                          </p>
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

                        <div className="space-y-1">
                          <label className={labelClass}>Mobile Number (10 Digits) *</label>
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
                                <span className="text-[10px] text-slate-500 hidden sm:inline">
                                  College: {college || 'Shared Institution'}
                                </span>
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
                                      updateTeammate(idx, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))
                                    }
                                    className={inputClass}
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
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
                          PROCEED TO PAYMENT &amp; UTR &gt;&gt;
                        </TactileButton>
                      </div>

                      <StepDots step={2} total={3} />
                      <p className="text-center text-[10px] sm:text-xs text-slate-600">
                        Step 2 of 3: Squad Configuration &amp; Teammate Profiles
                      </p>
                    </form>
                  )}

                  {/* ─────────────────────────────────────────────────────────── */}
                  {/* STEP 3: Payment (₹800, Mobile Redirects & UTR Gate)         */}
                  {/* ─────────────────────────────────────────────────────────── */}
                  {step === 3 && (
                    <form className="space-y-4" onSubmit={handleStep3Submit}>
                      {/* Critical Warning Banner: Do NOT leave/close tab */}
                      <div className="p-3.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-300 text-xs font-mono flex items-start gap-3 shadow-lg">
                        <span className="text-xl leading-none">⚠️</span>
                        <div>
                          <strong className="block text-amber-200 font-bold uppercase tracking-wider mb-0.5">
                            DO NOT CLOSE OR REFRESH THIS TAB
                          </strong>
                          <span className="text-[11px] text-amber-200/90 leading-relaxed block">
                            If completing payment in your mobile UPI app, your draft is safely saved. Return to this exact tab immediately to enter your 12-digit UTR transaction ID.
                          </span>
                        </div>
                      </div>

                      {/* Payment Card */}
                      <div className="p-4 rounded-xl bg-[#090b14] border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div>
                            <div className="text-xs font-mono font-bold text-white uppercase">
                              {squadName || 'YOUR SQUAD'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {squadSize} Members · {college}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-arcade text-lg text-tactical font-bold">₹{SQUAD_FEE}.00</div>
                            <div className="text-[9px] text-slate-400 uppercase font-mono">Flat Squad Fee</div>
                          </div>
                        </div>

                        {/* QR Code Matrix */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 py-2">
                          <div className="p-3 rounded-xl bg-white border-2 border-tactical shadow-xl flex items-center justify-center">
                            <QRCodeSvg value={UNIVERSAL_UPI_URI} size={160} />
                          </div>

                          <div className="space-y-3 text-center sm:text-left">
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase font-mono">
                                Official UPI ID:
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 justify-center sm:justify-start">
                                <span className="text-xs font-mono font-bold text-white bg-[#131726] px-2.5 py-1.5 rounded border border-slate-700 select-all">
                                  {OFFICIAL_UPI_ID}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleCopyUpi}
                                  className="px-2.5 py-1.5 rounded bg-[#1e2338] hover:bg-tactical hover:text-black text-slate-300 text-[10px] font-mono font-bold transition"
                                >
                                  {copiedUpi ? '✓ COPIED' : '📋 COPY'}
                                </button>
                              </div>
                            </div>

                            <div className="text-[10px] text-slate-400 font-mono">
                              Recipient: <span className="text-tactical font-semibold">Codefiesta 5.0</span>
                            </div>
                          </div>
                        </div>

                        {/* Mobile Direct Redirect Buttons */}
                        <div className="space-y-2 pt-2 border-t border-slate-800/80">
                          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider text-center">
                            ⚡ Quick Pay via UPI App (Click on Mobile to Redirect)
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <a
                              href={`tez://upi/pay?pa=${OFFICIAL_UPI_ID}&pn=Codefiesta%205.0&am=${SQUAD_FEE}&cu=INR&tn=Codefiesta%205.0%20Registration`}
                              className="p-2.5 rounded-lg bg-[#121626] hover:bg-[#1a2038] border border-blue-500/40 hover:border-blue-400 text-blue-300 text-xs font-mono font-bold text-center flex items-center justify-center gap-1.5 transition active:scale-95"
                            >
                              <span>🔵</span> Google Pay
                            </a>
                            <a
                              href={`phonepe://pay?pa=${OFFICIAL_UPI_ID}&pn=Codefiesta%205.0&am=${SQUAD_FEE}&cu=INR&tn=Codefiesta%205.0%20Registration`}
                              className="p-2.5 rounded-lg bg-[#121626] hover:bg-[#1a2038] border border-purple-500/40 hover:border-purple-400 text-purple-300 text-xs font-mono font-bold text-center flex items-center justify-center gap-1.5 transition active:scale-95"
                            >
                              <span>🟣</span> PhonePe
                            </a>
                            <a
                              href={`paytmmp://pay?pa=${OFFICIAL_UPI_ID}&pn=Codefiesta%205.0&am=${SQUAD_FEE}&cu=INR&tn=Codefiesta%205.0%20Registration`}
                              className="p-2.5 rounded-lg bg-[#121626] hover:bg-[#1a2038] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-mono font-bold text-center flex items-center justify-center gap-1.5 transition active:scale-95"
                            >
                              <span>🔷</span> Paytm
                            </a>
                            <a
                              href={UNIVERSAL_UPI_URI}
                              className="p-2.5 rounded-lg bg-[#121626] hover:bg-[#1a2038] border border-tactical/50 hover:border-tactical text-tactical text-xs font-mono font-bold text-center flex items-center justify-center gap-1.5 transition active:scale-95"
                            >
                              <span>⚡</span> Any UPI App
                            </a>
                          </div>
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
                            setServerError('')
                          }}
                          className={`${inputClass} text-sm font-bold tracking-widest ${
                            utrError ? 'border-red-400' : ''
                          }`}
                          required
                        />
                        <p className="text-[10px] text-slate-400 font-mono">
                          Found in your payment receipt after transferring ₹800 to {OFFICIAL_UPI_ID}.
                        </p>
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
                          ← Back to Roster
                        </button>
                        <TactileButton disabled={submitting} className="flex-1">
                          {submitting ? 'SUBMITTING & LOCKING UTR...' : '💳 SUBMIT UTR & FINALIZE SQUAD >>'}
                        </TactileButton>
                      </div>

                      <StepDots step={3} total={3} />
                      <p className="text-center text-[10px] sm:text-xs text-slate-600">
                        Step 3 of 3: Payment Verification &amp; UTR Submission
                      </p>
                    </form>
                  )}
                </>
              )}

              {/* ─────────────────────────────────────────────────────────── */}
              {/* PASSWORDLESS LOGIN (Email + 6-digit OTP from support@protechy.in) */}
              {/* ─────────────────────────────────────────────────────────── */}
              {step === 'login' && (
                <div className="space-y-4">
                  {/* Mode Selector Tabs */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#090c16] rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setLoginTab('otp')}
                      className={`py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center justify-center gap-1.5 ${
                        loginTab === 'otp'
                          ? 'bg-tactical text-black shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>✉️</span>
                      <span>Email OTP Login</span>
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
                      <span>Party Code</span>
                    </button>
                  </div>

                  {/* TAB 1: Passwordless Email OTP Login */}
                  {loginTab === 'otp' && (
                    <div className="space-y-4">
                      {!otpDispatched ? (
                        <form className="space-y-3 sm:space-y-4" onSubmit={handleSendOtp}>
                          <div className="space-y-1">
                            <label className={labelClass}>Your Registered Email Address</label>
                            <input
                              type="email"
                              autoComplete="email"
                              placeholder="Enter your email (e.g. leader@gmail.com)"
                              value={loginEmail}
                              onChange={(e) => {
                                setLoginEmail(e.target.value)
                                setOtpError('')
                              }}
                              className={`${inputClass} ${otpError ? 'border-red-400' : ''}`}
                              required
                            />
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                              <span>Delivered to your email from: support@protechy.in</span>
                              <span>⏱️ 10 min validity</span>
                            </div>
                          </div>

                          {otpError && (
                            <p className="text-[10px] sm:text-xs text-red-400">
                              {otpError}
                            </p>
                          )}

                          <div className="pt-2">
                            <TactileButton disabled={otpLoading} className="w-full">
                              {otpLoading ? 'DISPATCHING OTP...' : 'SEND 6-DIGIT OTP >>'}
                            </TactileButton>
                          </div>
                        </form>
                      ) : (
                        <form className="space-y-3 sm:space-y-4" onSubmit={handleVerifyOtp}>
                          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-mono space-y-1.5 shadow-lg shadow-emerald-500/5">
                            <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                              <span>✓</span> 6-Digit OTP Dispatched to Your Inbox!
                            </div>
                            <div className="text-slate-300 text-[11px] leading-relaxed">
                              Delivered to: <span className="text-amber-400 font-bold underline">{loginEmail}</span>
                              <br />
                              Sender: <span className="text-white font-semibold">support@protechy.in</span>
                            </div>
                            <div className="text-[10px] text-emerald-400/90 flex items-center justify-between pt-1 border-t border-emerald-500/20">
                              <span>⏱️ Code valid for <strong>10 minutes</strong></span>
                              <span>Daily attempts left: <strong>{attemptsLeft}/5</strong></span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className={labelClass}>Enter 6-Digit OTP</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="123456"
                              value={loginOtp}
                              onChange={(e) => {
                                setLoginOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                                setOtpError('')
                              }}
                              className={`${inputClass} text-center font-bold text-base tracking-[0.3em]`}
                              required
                              autoFocus
                            />
                          </div>

                          {otpError && (
                            <p className="text-[10px] sm:text-xs text-red-400">
                              {otpError}
                            </p>
                          )}

                          <div className="pt-2">
                            <TactileButton disabled={submitting || loginOtp.length < 6} className="w-full">
                              {submitting ? 'VERIFYING...' : 'VERIFY & ENTER DASHBOARD >>'}
                            </TactileButton>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setOtpDispatched(false)
                                setLoginOtp('')
                                setOtpError('')
                              }}
                              className="text-slate-400 hover:text-white underline font-mono text-[11px]"
                            >
                              ← Change Email
                            </button>
                            <button
                              type="button"
                              onClick={handleSendOtp}
                              disabled={otpLoading}
                              className="text-tactical hover:underline font-mono text-[11px] font-bold"
                            >
                              {otpLoading ? 'Resending...' : 'Resend OTP'}
                            </button>
                          </div>
                        </form>
                      )}

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
                    </div>
                  )}

                  {/* TAB 2: Join with Party Code (Teammates) */}
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
                          Enter the unique Party Code given to you by your Squad Leader to access your dashboard directly.
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
                          Have email access?{' '}
                          <button
                            type="button"
                            onClick={() => setLoginTab('otp')}
                            className="text-tactical hover:underline uppercase font-bold ml-1"
                          >
                            Sign In with OTP
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
    </div>
  )
}