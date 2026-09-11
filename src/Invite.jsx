import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  verifyInviteApi,
  acceptInviteApi,
  registerUser,
  fetchMe,
  checkInviteEmailApi,
} from './api'
import colleges from './indian_universities.json'
import Dropdown from './Dropdown'

const YEAR_OPTIONS = ['1st', '2nd', '3rd', '4th']
const GENDER_OPTIONS = ['male', 'female']
const PHONE_REGEX = /^[6-9]\d{9}$/
const EMAIL_REGEX = /^\S+@\S+\.\S+$/

const inputClass =
  'w-full rounded-md bg-[#090b12] border border-slate-700/80 px-3 py-2 sm:py-2.5 text-[11px] sm:text-sm text-white outline-none placeholder:text-slate-500 focus:border-tactical transition-colors'

const labelClass =
  'block text-[8px] sm:text-[10px] text-slate-400 uppercase tracking-wider mb-1'

const primaryBtnClass =
  'w-full btn-ribbed bg-tactical hover:bg-[#e6a600] active:translate-y-0.5 text-black font-mono font-bold text-xs sm:text-sm tracking-wider uppercase rounded-md px-4 py-2.5 sm:py-3.5 border-b-4 border-[#b28200] transition-all duration-100 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed'

const secondaryBtnClass =
  'w-full rounded-md bg-[#171924] hover:bg-[#1e2233] border border-slate-700 py-2.5 sm:py-3 text-[10px] sm:text-xs text-slate-200 uppercase tracking-wider transition-colors'

const pageClass =
  'min-h-dvh w-full bg-[#07080e] text-slate-200 font-mono overflow-y-auto flex flex-col items-center justify-center px-3 sm:px-6 py-6 sm:py-10'

function HomeLink() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 px-2 py-1 mb-3 rounded bg-[#10121a]/80 border border-slate-800 text-[9px] sm:text-[11px] text-slate-400 hover:text-tactical hover:border-tactical transition-colors uppercase tracking-wider"
    >
      <span className="text-tactical font-bold">←</span> Home
    </Link>
  )
}

function Card({ children }) {
  return (
    <div className="w-full max-w-[520px]">
      <HomeLink />
      <div className="bg-[#0e111a] border border-slate-800 rounded-lg p-4 sm:p-8 shadow-2xl">
        {children}
      </div>
    </div>
  )
}

function InviteHeader({ teamName, leaderName, subtitle }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-4 sm:mb-5 pb-3 border-b border-slate-800/80">
        <span className="inline-block w-2.5 h-2.5 bg-tactical rounded-sm shadow-[0_0_10px_rgba(255,184,0,0.5)]" />
        <span className="font-mono font-bold text-xs text-tactical tracking-wider">
          CF 5.0 · TEAM INVITE
        </span>
      </div>
      <h1 className="font-sans font-bold text-base sm:text-lg text-white leading-relaxed break-words">
        {leaderName} invited you to join {teamName || 'a team'}.
      </h1>
      <p className="text-xs text-slate-400 mt-1.5 mb-4 sm:mb-6 font-mono">
        {subtitle}
      </p>
    </>
  )
}

function ErrorIcon() {
  return (
    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#171924] border border-slate-700 mb-3">
      <svg
        className="w-5 h-5 text-tactical"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 9v4m0 4h.01" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    </span>
  )
}

export default function InvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [verified, setVerified] = useState(null)
  const [inviteError, setInviteError] = useState('')
  const [checked, setChecked] = useState(false)

  const [sessionEmail, setSessionEmail] = useState('')
  const [sessionLoaded, setSessionLoaded] = useState(false)

  // 'identify' | 'form' | 'wrong-recipient'
  const [userStep, setUserStep] = useState('identify')
  const [identifyEmail, setIdentifyEmail] = useState('')
  const [identifyError, setIdentifyError] = useState('')
  const [checkingEmail, setCheckingEmail] = useState(false)

  // Registration fields (Branch A) — same shape as Auth.jsx step 2.
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [college, setCollege] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [course, setCourse] = useState('')
  const [year, setYear] = useState('')
  const [gender, setGender] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  // Verify token + load session in parallel
  useEffect(() => {
    let cancelled = false

    verifyInviteApi(token)
      .then((data) => {
        if (cancelled) return
        setVerified(data)
      })
      .catch((err) => {
        if (cancelled) return
        setInviteError(err.message)
      })
      .finally(() => {
        if (!cancelled) setChecked(true)
      })

    fetchMe()
      .then((data) => {
        if (!cancelled && data?.user?.email) {
          setSessionEmail(data.user.email.toLowerCase())
          // Pre-fill the identify step with the signed-in email if it matches
          setIdentifyEmail(data.user.email.toLowerCase())
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setSessionLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  // Derived flags
  const teamName = verified?.team?.name ?? ''
  const leaderName = verified?.team?.leaderName ?? 'The Team Leader'
  const invitedEmail = verified?.invitedEmail ?? ''
  const sessionMatchesInvite =
    sessionLoaded &&
    sessionEmail &&
    invitedEmail &&
    sessionEmail === invitedEmail.toLowerCase()

  let effectiveStep = userStep
  if (sessionMatchesInvite) {
    effectiveStep = 'form'
  } else if (sessionLoaded && sessionEmail && userStep === 'identify') {
    effectiveStep = 'wrong-recipient'
  }

  const setStep = setUserStep

  const handleExistingAccept = async () => {
    setSubmitting(true)
    setServerError('')
    try {
      await acceptInviteApi(token)
      navigate('/dashboard')
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleIdentify = async (e) => {
    e.preventDefault()
    setIdentifyError('')
    if (!EMAIL_REGEX.test(identifyEmail)) {
      setIdentifyError('Enter a valid email address.')
      return
    }
    setCheckingEmail(true)
    try {
      const data = await checkInviteEmailApi(token, identifyEmail)
      if (data.match) {
        setStep('form')
      } else {
        setStep('wrong-recipient')
      }
    } catch (err) {
      setIdentifyError(err.message)
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleRegisterAndAccept = async (e) => {
    e.preventDefault()
    setServerError('')
    setPhoneError('')

    if (!firstName.trim()) {
      setServerError('First name is required.')
      return
    }
    if (!PHONE_REGEX.test(phone)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number.')
      return
    }
    if (password.length < 6) {
      setServerError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setServerError("Passwords don't match.")
      return
    }

    setSubmitting(true)
    try {
      // The email is locked to the invite — never trust the client.
      await registerUser({
        email: invitedEmail,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        college: college.trim(),
        rollNumber: rollNumber.trim(),
        course: course.trim(),
        year,
        gender,
      })
      await acceptInviteApi(token)
      navigate('/dashboard')
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ───── Missing / invalid token ─────
  if (!token || inviteError) {
    return (
      <div className={pageClass}>
        <Card>
          <div className="flex flex-col items-center text-center py-4">
            <ErrorIcon />
            <h1 className="font-sans font-bold text-base sm:text-lg text-white leading-relaxed">
              {inviteError ? 'INVITE ISSUE' : 'INVALID INVITE'}
            </h1>
            <p className="text-xs text-slate-400 mt-2 mb-5 font-mono">
              {inviteError || 'This invite link is missing its token.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className={secondaryBtnClass}
            >
              Back to dashboard
            </button>
          </div>
        </Card>
      </div>
    )
  }

  if (!checked) {
    return (
      <div className={pageClass}>
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-tactical" />
        </div>
      </div>
    )
  }

  // ───── Identify: which email was invited ─────
  if (effectiveStep === 'identify') {
    return (
      <div className={pageClass}>
        <Card>
          <InviteHeader
            teamName={teamName}
            leaderName={leaderName}
            subtitle="Enter the email address that was invited — we'll match it against this link."
          />

          <form onSubmit={handleIdentify} className="space-y-3 sm:space-y-4">
            <div>
              <label className={labelClass}>Your email</label>
              <input
                type="email"
                placeholder="the email you were invited with"
                value={identifyEmail}
                onChange={(e) => setIdentifyEmail(e.target.value)}
                className={`${inputClass} ${
                  identifyError ? 'border-red-400' : ''
                }`}
                autoFocus
              />
              {identifyError && (
                <p className="mt-1 text-[9px] sm:text-[11px] text-red-400">
                  {identifyError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={checkingEmail}
              className={primaryBtnClass}
            >
              {checkingEmail ? 'CHECKING...' : 'CONTINUE >>'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="text-[10px] sm:text-xs text-slate-500 hover:text-tactical transition-colors uppercase tracking-wider"
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        </Card>
      </div>
    )
  }

  // ───── Wrong recipient ─────
  if (effectiveStep === 'wrong-recipient') {
    return (
      <div className={pageClass}>
        <Card>
          <div className="flex flex-col items-center text-center py-2">
            <ErrorIcon />
            <h1 className="font-sans font-bold text-base sm:text-lg text-white leading-relaxed">
              WRONG INVITE
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed font-mono">
              This invite link was sent to{' '}
              <span className="text-white font-semibold break-all">
                {invitedEmail}
              </span>
              , not you.
            </p>
            <p className="text-[9px] sm:text-[11px] text-slate-500 mt-1 leading-relaxed">
              Ask {leaderName} to send you your own link, or open the link sent
              to the invited email.
            </p>
            <div className="mt-6 w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className={secondaryBtnClass}
              >
                Back to dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('identify')
                  setIdentifyEmail('')
                }}
                className={secondaryBtnClass}
              >
                Try a different email
              </button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // ───── Branch B: session matches invited email ─────
  if (sessionMatchesInvite) {
    return (
      <div className={pageClass}>
        <Card>
          <InviteHeader
            teamName={teamName}
            leaderName={leaderName}
            subtitle="You're signed in with the invited email — accept to join."
          />

          <div className="rounded-md bg-[#0a0c13] border border-slate-800 p-3.5 sm:p-4 mb-4 space-y-2 text-[10px] sm:text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Team</span>
              <span className="text-white font-medium text-right break-all">
                {teamName || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Invited email</span>
              <span className="text-white font-medium text-right break-all">
                {invitedEmail}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Leader</span>
              <span className="text-white font-medium text-right break-all">
                {leaderName}
              </span>
            </div>
          </div>

          {serverError && (
            <p className="text-[9px] sm:text-[11px] text-red-400 mb-3">
              {serverError}
            </p>
          )}

          <button
            type="button"
            onClick={handleExistingAccept}
            disabled={submitting}
            className={primaryBtnClass}
          >
            {submitting ? 'JOINING...' : 'ACCEPT INVITE & JOIN TEAM'}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-[10px] sm:text-xs text-slate-500 hover:text-tactical transition-colors uppercase tracking-wider"
            >
              Back to dashboard
            </button>
          </div>
        </Card>
      </div>
    )
  }

  // ───── Branch A: full registration form ─────
  if (effectiveStep !== 'form') {
    return null
  }

  return (
    <div className={pageClass}>
      <Card>
        <InviteHeader
          teamName={teamName}
          leaderName={leaderName}
          subtitle={`Email confirmed for ${invitedEmail}. Finish your profile to join.`}
        />

        <form onSubmit={handleRegisterAndAccept} className="space-y-2.5 sm:space-y-3.5">
          {/* Email — locked to invite */}
          <div>
            <label className={labelClass}>Email ID</label>
            <input
              type="email"
              value={invitedEmail}
              disabled
              readOnly
              aria-readonly="true"
              className={`${inputClass} cursor-not-allowed bg-[#131722] text-slate-400`}
            />
            <p className="mt-0.5 text-[8px] sm:text-[10px] text-slate-500">
              Locked to this invite.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <label className={labelClass}>First name</label>
              <input
                type="text"
                placeholder="Sahil"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input
                type="text"
                placeholder="Vaishnav"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Phone number</label>
            <input
              type="tel"
              placeholder="10-digit mobile"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                setPhoneError('')
              }}
              className={`${inputClass} ${phoneError ? 'border-red-400' : ''}`}
            />
            {phoneError && (
              <p className="mt-0.5 text-[9px] sm:text-[11px] text-red-400">
                {phoneError}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>College / University</label>
            <Dropdown
              options={colleges}
              value={college}
              onChange={setCollege}
              placeholder="Select your college"
              searchable
            />
          </div>

          <div>
            <label className={labelClass}>College ID / Roll No.</label>
            <input
              type="text"
              placeholder="e.g. 22BCS001"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-6 gap-2.5 sm:gap-3">
            <div className="col-span-3">
              <label className={labelClass}>Course</label>
              <input
                type="text"
                placeholder="e.g. CSE"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Year</label>
              <Dropdown
                options={YEAR_OPTIONS}
                value={year}
                onChange={setYear}
                placeholder="Select"
              />
            </div>
            <div className="col-span-1">
              <label className={labelClass}>Sex</label>
              <Dropdown
                options={GENDER_OPTIONS}
                value={gender}
                onChange={setGender}
                placeholder="—"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 chars"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-[#171924] hover:bg-[#1e2233] border border-slate-700 text-tactical text-[9px] sm:text-[10px] uppercase tracking-wider"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Confirm</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Repeat"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {serverError && (
            <p className="text-[9px] sm:text-[11px] text-red-400">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={primaryBtnClass}
          >
            {submitting ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT & JOIN TEAM'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="text-[10px] sm:text-xs text-slate-500 hover:text-tactical transition-colors uppercase tracking-wider"
            >
              Already have an account? Sign in
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
