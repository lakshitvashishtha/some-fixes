import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMe, fetchMyTeams, submitPaymentApi, getAllRegisteredTeams } from './api'
import { QRCodeSvg } from './qrGenerator.jsx'

const UTR_REGEX = /^\d{12}$/

const inputClass =
  'w-full rounded-md bg-[#0e1017] border border-slate-700/80 px-3 py-2 sm:py-2.5 text-[11px] sm:text-sm text-white outline-none placeholder:text-slate-500 focus:border-tactical tracking-wide transition-colors'

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

function CornerBrackets() {
  return (
    <>
      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-tactical pointer-events-none" />
      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-tactical pointer-events-none" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-tactical pointer-events-none" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-tactical pointer-events-none" />
    </>
  )
}

function QrSvg() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" className="w-40 sm:w-48 block">
      <rect width="160" height="160" fill="#ffffff" />
      <rect x="10" y="10" width="42" height="42" fill="#000000" />
      <rect x="16" y="16" width="30" height="30" fill="#ffffff" />
      <rect x="22" y="22" width="18" height="18" fill="#000000" />
      <rect x="108" y="10" width="42" height="42" fill="#000000" />
      <rect x="114" y="16" width="30" height="30" fill="#ffffff" />
      <rect x="120" y="22" width="18" height="18" fill="#000000" />
      <rect x="10" y="108" width="42" height="42" fill="#000000" />
      <rect x="16" y="114" width="30" height="30" fill="#ffffff" />
      <rect x="22" y="120" width="18" height="18" fill="#000000" />
      <path d="M58 28 h6 v6 h-6 z M70 28 h6 v6 h-6 z M82 28 h6 v6 h-6 z M94 28 h6 v6 h-6 z" fill="#000" />
      <path d="M28 58 v6 h6 v-6 z M28 70 v6 h6 v-6 z M28 82 v6 h6 v-6 z M28 94 v6 h6 v-6 z" fill="#000" />
      <rect x="60" y="12" width="6" height="6" fill="#000" />
      <rect x="72" y="12" width="12" height="6" fill="#000" />
      <rect x="90" y="12" width="6" height="6" fill="#000" />
      <rect x="60" y="44" width="18" height="6" fill="#000" />
      <rect x="84" y="44" width="12" height="6" fill="#000" />
      <rect x="12" y="60" width="6" height="12" fill="#000" />
      <rect x="24" y="60" width="12" height="6" fill="#000" />
      <rect x="42" y="60" width="6" height="18" fill="#000" />
      <rect x="54" y="54" width="12" height="12" fill="#000" />
      <rect x="72" y="54" width="6" height="6" fill="#000" />
      <rect x="84" y="54" width="18" height="6" fill="#000" />
      <rect x="108" y="54" width="12" height="6" fill="#000" />
      <rect x="126" y="54" width="18" height="6" fill="#000" />
      <rect x="54" y="72" width="6" height="18" fill="#000" />
      <rect x="66" y="72" width="18" height="6" fill="#000" />
      <rect x="90" y="72" width="6" height="12" fill="#000" />
      <rect x="102" y="66" width="12" height="12" fill="#000" />
      <rect x="120" y="72" width="12" height="6" fill="#000" />
      <rect x="138" y="72" width="12" height="12" fill="#000" />
      <rect x="60" y="96" width="12" height="6" fill="#000" />
      <rect x="78" y="90" width="12" height="12" fill="#000" />
      <rect x="96" y="96" width="18" height="6" fill="#000" />
      <rect x="120" y="90" width="6" height="18" fill="#000" />
      <rect x="132" y="96" width="12" height="6" fill="#000" />
      <rect x="116" y="116" width="22" height="22" fill="#000" />
      <rect x="121" y="121" width="12" height="12" fill="#fff" />
      <rect x="124" y="124" width="6" height="6" fill="#000" />
      <rect x="58" y="112" width="12" height="6" fill="#000" />
      <rect x="76" y="112" width="6" height="18" fill="#000" />
      <rect x="88" y="112" width="18" height="6" fill="#000" />
      <rect x="58" y="124" width="6" height="18" fill="#000" />
      <rect x="70" y="136" width="18" height="6" fill="#000" />
      <rect x="94" y="124" width="12" height="18" fill="#000" />
      <rect x="112" y="142" width="18" height="6" fill="#000" />
      <rect x="136" y="142" width="12" height="6" fill="#000" />
    </svg>
  )
}

function fmtDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function Payment() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState(null)
  const [utr, setUtr] = useState('')
  const [utrError, setUtrError] = useState('')
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetchMe()
      .then((meData) => {
        const user = meData?.user
        if (!user) {
          if (!cancelled) navigate('/auth')
          return
        }
        if (!cancelled) setCurrentUser(user)

        return fetchMyTeams().then((data) => {
          if (cancelled) return
          const teams = data?.teams || []
          const userEmail = (user.email || '').toLowerCase().trim()

          // Resolve the user's squad: match leader email, members, or leader flag
          const myTeam =
            teams.find(
              (t) =>
                (t.leader?.email || t.leader_email || '').toLowerCase().trim() === userEmail ||
                (t.members || []).some((m) => (m.email || '').toLowerCase().trim() === userEmail) ||
                t.isLeaderForThisTeam
            ) ||
            teams.find((t) => t.isLeaderForThisTeam) ||
            teams[0] ||
            null

          if (!myTeam) {
            setTeam(null)
            return
          }

          const isLeader =
            (myTeam.leader?.email || myTeam.leader_email || '').toLowerCase().trim() === userEmail ||
            Boolean(myTeam.isLeaderForThisTeam) ||
            Boolean(myTeam.isLeader)

          setTeam({
            ...myTeam,
            isLeader,
            isLeaderForThisTeam: isLeader,
          })
        })
      })
      .catch(() => {
        if (!cancelled) navigate('/auth')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [navigate])

  const paymentStatus = team?.payment?.status || 'not_submitted'
  const submittedAt = team?.payment?.submittedAt

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    setUtrError('')

    const value = utr.trim()
    if (!UTR_REGEX.test(value)) {
      setUtrError('Enter a valid 12-digit UTR / transaction reference')
      return
    }

    // Client-side quick check against other registered squads
    try {
      const existingTeams = getAllRegisteredTeams() || []
      const duplicate = existingTeams.find(
        (t) =>
          String(t.id) !== String(team.id) &&
          (
            (t.payment?.utr && String(t.payment.utr).trim().toLowerCase() === value.toLowerCase()) ||
            (t.payment?.reference && String(t.payment.reference).trim().toLowerCase() === value.toLowerCase()) ||
            (t.payment_reference && String(t.payment_reference).trim().toLowerCase() === value.toLowerCase()) ||
            (t.paymentReference && String(t.paymentReference).trim().toLowerCase() === value.toLowerCase())
          )
      )
      if (duplicate) {
        setUtrError(`This UTR transaction reference has already been submitted by squad "${duplicate.name || 'another squad'}". Each squad must submit a unique payment transaction reference.`)
        return
      }
    } catch {
      // Non-blocking if storage read fails
    }

    setSubmitting(true)
    try {
      const res = await submitPaymentApi(team.id, value)
      if (res?.payment?.status === 'submitted') {
        setDone(true)
      }
    } catch (err) {
      setServerError(err.message)
      // Already-submitted conflicts surface the current status.
    } finally {
      setSubmitting(false)
    }
  }

  const secondaryBtnClass =
    'w-full rounded-md bg-[#171924] hover:bg-[#1e2233] border border-slate-700 py-2.5 sm:py-3 text-[10px] sm:text-xs text-slate-200 uppercase tracking-wider transition-colors'

  // Loading
  if (loading) {
    return (
      <div className={pageClass}>
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-tactical" />
        </div>
      </div>
    )
  }

  // No team exists for user
  if (!team) {
    return (
      <div className={pageClass}>
        <div className="w-full max-w-[520px]">
          <HomeLink />
          <div className="bg-[#0e111a] border border-slate-800 rounded-lg p-4 sm:p-8 shadow-2xl relative">
            <CornerBrackets />
            <div className="flex flex-col items-center text-center py-4">
              <h1 className="font-sans font-bold text-base sm:text-lg text-white leading-relaxed">
                NO SQUAD ENROLLED
              </h1>
              <p className="text-xs text-slate-400 mt-2 mb-5 leading-relaxed font-mono">
                You are not currently enrolled in any squad. Create a squad or accept an invitation to proceed with registration payment.
              </p>
              <div className="w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/create-team')}
                  className={secondaryBtnClass}
                >
                  Create or Join Team
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className={secondaryBtnClass}
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Non-leader teammate visited payment page
  if (!team.isLeaderForThisTeam && !team.isLeader) {
    return (
      <div className={pageClass}>
        <div className="w-full max-w-[520px]">
          <HomeLink />
          <div className="bg-[#0e111a] border border-slate-800 rounded-lg p-4 sm:p-8 shadow-2xl relative">
            <CornerBrackets />
            <div className="flex flex-col items-center text-center py-4">
              <h1 className="font-sans font-bold text-base sm:text-lg text-white leading-relaxed">
                LEADER PAYMENT ONLY
              </h1>
              <p className="text-xs text-slate-400 mt-2 mb-5 leading-relaxed font-mono">
                Only your squad leader (<strong className="text-tactical">{team.leader?.name || team.leader?.email || 'Leader'}</strong>) is authorized to submit or re-submit the payment UTR for squad "{team.name}".
              </p>
              <div className="w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className={secondaryBtnClass}
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Roster not locked yet
  const isRosterLocked =
    team.status === 'locked' ||
    team.status === 'rejected' ||
    team.status === 'registered' ||
    team.status === 'confirmed' ||
    paymentStatus === 'rejected' ||
    paymentStatus === 'submitted' ||
    paymentStatus === 'verified'

  if (!isRosterLocked) {
    return (
      <div className={pageClass}>
        <div className="w-full max-w-[520px]">
          <HomeLink />
          <div className="bg-[#0e111a] border border-slate-800 rounded-lg p-4 sm:p-8 shadow-2xl relative">
            <CornerBrackets />
            <div className="flex flex-col items-center text-center py-4">
              <h1 className="font-sans font-bold text-base sm:text-lg text-white leading-relaxed">
                LOCK SQUAD ROSTER FIRST
              </h1>
              <p className="text-xs text-slate-400 mt-2 mb-5 leading-relaxed font-mono">
                Payment opens after your squad roster is locked with all members accepted. Lock your roster from the dashboard to continue.
              </p>
              <div className="w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className={secondaryBtnClass}
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Already submitted (pending or verified)
  if (!done && (paymentStatus === 'submitted' || paymentStatus === 'verified')) {
    const verified = paymentStatus === 'verified'
    return (
      <div className={pageClass}>
        <div className="w-full max-w-[520px]">
          <HomeLink />
          <div className="bg-[#0e111a] border border-slate-800 rounded-lg p-4 sm:p-8 shadow-2xl relative">
            <CornerBrackets />
            <div className="text-center py-4">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded border text-[9px] sm:text-xs font-bold uppercase tracking-wider ${
                  verified
                    ? 'text-sync bg-sync/10 border-sync/30'
                    : 'text-tactical bg-tactical/10 border-tactical/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    verified ? 'bg-sync' : 'bg-tactical'
                  }`}
                />
                {verified ? 'Payment Verified' : 'Payment Under Review'}
              </span>
              <h1 className="font-sans font-bold text-base sm:text-lg text-white leading-relaxed mt-4">
                {verified
                  ? 'PAYMENT CONFIRMED'
                  : 'PAYMENT ALREADY SUBMITTED'}
              </h1>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed font-mono">
                {verified
                  ? 'Your registration payment has been verified.'
                  : 'Your payment submission is being verified. Confirmation will appear on the dashboard status section within a few hours.'}
              </p>
              <div className="mt-5 text-[10px] sm:text-xs text-slate-500 space-y-1">
                <div>
                  UTR: <span className="text-white">{team.payment.utr}</span>
                </div>
                {submittedAt && (
                  <div>
                    Submitted: <span className="text-white">{fmtDate(submittedAt)}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className={`mt-6 ${secondaryBtnClass}`}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success state (just submitted)
  if (done) {
    return (
      <div className={pageClass}>
        <div className="w-full max-w-[520px]">
          <HomeLink />
          <div className="bg-[#0e111a] border border-slate-800 rounded-lg p-4 sm:p-8 shadow-2xl relative">
            <CornerBrackets />
            <div className="text-center py-4">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-sync/10 border border-sync/40 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-sync"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="font-sans font-bold text-base sm:text-lg text-white leading-relaxed">
                PAYMENT SUBMITTED
              </h1>
              <p className="text-xs text-slate-300 mt-3 leading-relaxed font-mono">
                Your payment submission is done.
              </p>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-mono">
                It will be verified within a few hours — you'll see the
                confirmation on the dashboard in the status section.
              </p>
              <div className="mt-5 inline-block rounded-md bg-[#0a0c13] border border-slate-800 px-4 py-2 text-xs font-mono text-slate-400">
                UTR: <span className="text-tactical font-bold">{utr.trim()}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className={`mt-6 ${secondaryBtnClass}`}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Form
  return (
    <div className={pageClass}>
      <div className="w-full max-w-[520px]">
        <HomeLink />
        <div className="bg-[#0e111a] border border-slate-800 rounded-lg p-4 sm:p-8 shadow-2xl relative">
          <CornerBrackets />

          {/* Rejection Alert Banner */}
          {paymentStatus === 'rejected' && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-950/40 border border-red-500/50 text-xs font-mono text-red-200 leading-relaxed space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-red-400 text-xs">
                <span>✕</span>
                <span>PREVIOUS PAYMENT UTR REJECTED</span>
              </div>
              <div>
                Rejection Reason: <strong className="text-red-300">{team.payment?.notes || 'Invalid transaction ID or payment not received.'}</strong>
              </div>
              <div className="text-[10px] text-slate-400">
                Previous UTR: <span className="font-mono text-red-400 line-through font-bold">{team.payment?.utr || 'N/A'}</span>. Please verify your banking or UPI app and enter the correct 12-digit transaction ID below.
              </div>
            </div>
          )}

          {/* Warning Banner */}
          <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/50 text-amber-300 text-xs font-mono mb-4 flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <div>
              <strong className="block text-amber-200 uppercase font-bold">DO NOT CLOSE OR REFRESH THIS TAB</strong>
              <span className="text-[11px] text-amber-200/90">Do not leave this tab while completing payment in your UPI app. Return here immediately to submit your 12-digit UTR.</span>
            </div>
          </div>

          {/* Title & amount */}
          <div className="text-center mb-4">
            <h1 className="font-sans font-bold text-base sm:text-lg text-white">
              PAYMENT
            </h1>
            <p className="text-[9px] sm:text-xs text-slate-400 mt-1.5">
              Scan the QR or use quick UPI links to pay the flat ₹800 fee
            </p>
            <div className="mt-2.5 inline-block bg-[#0d0e15] border border-slate-800 px-4 py-1.5 rounded text-sm text-tactical font-bold">
              ₹800.00
            </div>
          </div>

          {/* QR */}
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="bg-white p-3 rounded-xl shadow-xl border-2 border-tactical inline-block">
              <QRCodeSvg value="upi://pay?pa=Q073541130@ybl&pn=Codefiesta%205.0&am=800&cu=INR&tn=Codefiesta%205.0%20Registration" size={150} />
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white bg-[#131726] px-2.5 py-1 rounded border border-slate-700 select-all">
                Q073541130@ybl
              </span>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText('Q073541130@ybl').catch(() => {})
                  alert('UPI ID copied: Q073541130@ybl')
                }}
                className="px-2 py-1 rounded bg-[#1e2338] hover:bg-tactical hover:text-black text-slate-300 text-[10px] font-mono transition"
              >
                📋 COPY
              </button>
            </div>
          </div>

          {/* Mobile UPI Buttons */}
          <div className="space-y-1.5 mb-4">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider text-center">
              ⚡ Quick Pay via UPI App (Click to open)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <a
                href="tez://upi/pay?pa=Q073541130@ybl&pn=Codefiesta%205.0&am=800&cu=INR&tn=Codefiesta%205.0%20Registration"
                className="p-2 rounded bg-[#121626] hover:bg-[#1a2038] border border-blue-500/40 text-blue-300 text-[11px] font-mono font-bold text-center flex items-center justify-center gap-1 transition active:scale-95"
              >
                <span>🔵</span> GPay
              </a>
              <a
                href="phonepe://pay?pa=Q073541130@ybl&pn=Codefiesta%205.0&am=800&cu=INR&tn=Codefiesta%205.0%20Registration"
                className="p-2 rounded bg-[#121626] hover:bg-[#1a2038] border border-purple-500/40 text-purple-300 text-[11px] font-mono font-bold text-center flex items-center justify-center gap-1 transition active:scale-95"
              >
                <span>🟣</span> PhonePe
              </a>
              <a
                href="paytmmp://pay?pa=Q073541130@ybl&pn=Codefiesta%205.0&am=800&cu=INR&tn=Codefiesta%205.0%20Registration"
                className="p-2 rounded bg-[#121626] hover:bg-[#1a2038] border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-bold text-center flex items-center justify-center gap-1 transition active:scale-95"
              >
                <span>🔷</span> Paytm
              </a>
              <a
                href="upi://pay?pa=Q073541130@ybl&pn=Codefiesta%205.0&am=800&cu=INR&tn=Codefiesta%205.0%20Registration"
                className="p-2 rounded bg-[#121626] hover:bg-[#1a2038] border border-tactical/50 text-tactical text-[11px] font-mono font-bold text-center flex items-center justify-center gap-1 transition active:scale-95"
              >
                <span>⚡</span> Any UPI
              </a>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-[9px] sm:text-xs uppercase tracking-wider text-slate-300 mb-1.5">
                UTR Number / Transaction ID
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={12}
                placeholder="e.g. 428901238910"
                value={utr}
                onChange={(e) => {
                  setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))
                  setUtrError('')
                  setServerError('')
                }}
                className={`${inputClass} ${utrError || serverError ? 'border-red-400' : ''}`}
                autoComplete="off"
                spellCheck={false}
              />
              {utrError ? (
                <p className="text-[9px] sm:text-[11px] text-red-400 mt-1">
                  {utrError}
                </p>
              ) : (
                <p className="text-[9px] sm:text-[11px] text-slate-500 mt-1">
                  Enter the 12-digit reference number from your UPI receipt.
                </p>
              )}
              {serverError && (
                <p className="text-[9px] sm:text-[11px] text-red-400 mt-1">
                  {serverError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || utr.trim().length === 0}
              className="w-full btn-ribbed bg-tactical hover:bg-[#e6a600] active:translate-y-0.5 text-black font-mono font-bold text-xs sm:text-sm py-2.5 sm:py-3.5 px-4 rounded border-b-4 border-[#b28200] transition uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'SUBMITTING...' : 'SUBMIT UTR >>'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-[10px] sm:text-xs text-slate-500 hover:text-tactical transition-colors"
              >
                ← Back to Team Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
