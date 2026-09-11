import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMe, fetchMyTeams, submitPaymentApi } from './api'

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

  useEffect(() => {
    let cancelled = false

    fetchMe()
      .catch(() => {
        if (!cancelled) navigate('/auth')
        throw new Error('redirect')
      })
      .then(() => fetchMyTeams())
      .then((data) => {
        if (cancelled) return
        const teams = data.teams || []
        // The leader's locked team is the one eligible for payment.
        const locked = teams.find(
          (t) => t.isLeaderForThisTeam && t.status === 'locked',
        )
        setTeam(locked || null)
      })
      .catch(() => undefined)
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

  // Not eligible (not a leader of a locked team)
  if (!team) {
    return (
      <div className={pageClass}>
        <div className="w-full max-w-[520px]">
          <HomeLink />
          <div className="bg-[#0e111a] border border-slate-800 rounded-lg p-4 sm:p-8 shadow-2xl relative">
            <CornerBrackets />
            <div className="flex flex-col items-center text-center py-4">
              <h1 className="font-sans font-bold text-base sm:text-lg text-white leading-relaxed">
                NO TEAM TO PAY FOR
              </h1>
              <p className="text-xs text-slate-400 mt-2 mb-5 leading-relaxed font-mono">
                Payment opens after your team is locked with all members
                accepted. Lock your roster from the dashboard to continue.
              </p>
              <div className="w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className={secondaryBtnClass}
                >
                  Go to Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/create-team')}
                  className={secondaryBtnClass}
                >
                  Create or Join Team
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

          {/* Title & amount */}
          <div className="text-center mb-5">
            <h1 className="font-sans font-bold text-base sm:text-lg text-white">
              PAYMENT
            </h1>
            <p className="text-[9px] sm:text-xs text-slate-400 mt-1.5">
              Scan the QR to pay the registration fee
            </p>
            <div className="mt-3 inline-block bg-[#0d0e15] border border-slate-800 px-4 py-1.5 rounded text-sm text-tactical font-bold">
              ₹800.00
            </div>
          </div>

          {/* QR */}
          <div className="flex flex-col items-center justify-center mb-5">
            <div className="bg-white p-3 sm:p-4 rounded-md shadow-md border-2 border-slate-300 inline-block">
              <QrSvg />
            </div>
            <div className="mt-2 text-[10px] sm:text-[11px] text-slate-400">
              UPI ID: git.codefiesta@upi
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
