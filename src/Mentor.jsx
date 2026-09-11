import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  mentorLoginApi,
  getHackathonStateApi,
  submitMentorEvaluationApi,
  getAllRegisteredTeamsApi,
} from './api'

export default function Mentor() {
  const [mentor, setMentor] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [selectedRound, setSelectedRound] = useState('round1') // 'round1' | 'round2'
  const [loggingIn, setLoggingIn] = useState(false)

  // Evaluation states
  const [teams, setTeams] = useState([])
  const [hackState, setHackState] = useState(null)
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [innovation, setInnovation] = useState(25)
  const [tech, setTech] = useState(24)
  const [feasibility, setFeasibility] = useState(16)
  const [pitch, setPitch] = useState(17)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')

  const reloadData = async () => {
    try {
      const stateRes = await getHackathonStateApi()
      if (stateRes?.state) setHackState(stateRes.state)
      const teamsRes = await getAllRegisteredTeamsApi()
      if (teamsRes?.teams) {
        setTeams(teamsRes.teams)
        if (!selectedTeamId && teamsRes.teams.length > 0) {
          setSelectedTeamId(teamsRes.teams[0].id)
        }
      }
    } catch {}
  }

  useEffect(() => {
    if (mentor) {
      reloadData()
      const id = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return
        reloadData()
      }, 6000)
      const onVisible = () => {
        if (typeof document !== 'undefined' && !document.hidden) reloadData()
      }
      document.addEventListener('visibilitychange', onVisible)
      return () => {
        clearInterval(id)
        document.removeEventListener('visibilitychange', onVisible)
      }
    }
  }, [mentor])

  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    setLoggingIn(true)
    try {
      const res = await mentorLoginApi(email.trim(), password.trim())
      if (res.mentor) {
        setMentor(res.mentor)
      }
    } catch (err) {
      setAuthError(err.message || 'Invalid mentor credentials.')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleGradeSubmit = async (e) => {
    e.preventDefault()
    if (!selectedTeam) return
    setSubmitting(true)
    setMsg('')
    try {
      const payload = {
        teamId: selectedTeam.id,
        teamName: selectedTeam.name,
        tableNumber: currentTable,
        round: selectedRound,
        mentorEmail: mentor.email,
        mentorName: mentor.name,
        scores: {
          innovation: Number(innovation),
          tech: Number(tech),
          feasibility: Number(feasibility),
          pitch: Number(pitch),
        },
        notes: notes.trim(),
      }
      await submitMentorEvaluationApi(payload)
      setMsg(`✓ Evaluation for ${selectedTeam.name} (${currentTable}) permanently locked!`)
      reloadData()
    } catch (err) {
      setMsg(err.message || 'Failed to submit evaluation.')
    } finally {
      setSubmitting(false)
    }
  }

  // Mentor Login Screen
  if (!mentor) {
    return (
      <div className="min-h-dvh w-full bg-[#05070c] text-slate-200 font-mono flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0a0d16] border border-cyan-500/40 rounded-xl p-6 sm:p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
          <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-800">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-arcade text-xs text-cyan-300 tracking-wider">
              ON-GROUND MENTOR & JURY SCORING DESK
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1.5">
                Mentor Email Address
              </label>
              <input
                type="email"
                placeholder="mentor@codefiesta.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded bg-[#0f1320] border border-slate-700 px-3.5 py-3 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="Password provided by organizing team..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded bg-[#0f1320] border border-slate-700 px-3.5 py-3 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                required
              />
            </div>

            {authError && <p className="text-xs text-red-400 font-mono">{authError}</p>}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black font-arcade text-[10px] py-3.5 rounded tracking-widest uppercase transition font-bold shadow-lg disabled:opacity-50"
            >
              {loggingIn ? 'VERIFYING...' : 'ACCESS SCORING CONSOLE >>'}
            </button>
          </form>

          <div className="mt-5 p-3 rounded bg-[#0f1422] border border-slate-800 text-[10px] text-slate-400 font-mono">
            <strong>Default Evaluation Access:</strong>
            <br />
            Email: <span className="text-slate-200">mentor.ai@codefiesta.in</span>
            <br />
            Password: <span className="text-slate-200">mentor_access_cf5</span>
          </div>
        </div>
      </div>
    )
  }

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0] || null
  const currentTable = selectedTeam
    ? (hackState?.tableAssignments || {})[selectedTeam.id] || selectedTeam.tableNumber || null
    : null

  const isRoundOpen = !!(hackState?.evaluationRounds?.[selectedRound])
  const existingEval = (hackState?.evaluations || []).find(
    (e) => e.teamId === selectedTeam?.id && (e.round === selectedRound || (!e.round && selectedRound === 'round1'))
  )
  const isLocked = !!existingEval?.locked
  const liveTotal = Number(innovation) + Number(tech) + Number(feasibility) + Number(pitch)

  return (
    <div className="min-h-dvh w-full bg-[#070910] text-slate-200 font-mono">
      {/* Mentor Header */}
      <header className="h-16 border-b border-slate-800 bg-[#0a0d17] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-500/20 border border-cyan-500 text-cyan-300 font-arcade text-xs flex items-center justify-center font-bold">
            JR
          </div>
          <div>
            <div className="font-arcade text-xs text-white tracking-wider flex items-center gap-2">
              CODEFIESTA 5.0 <span className="text-cyan-400 text-[10px]">MENTOR DESK</span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono">
              Evaluator: <strong className="text-slate-200">{mentor.name || mentor.email}</strong> · Assigned: {mentor.tables || 'All Tables'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMentor(null)}
          className="text-[10px] font-arcade text-red-400 hover:underline px-2.5 py-1.5 rounded border border-slate-800"
        >
          Logout
        </button>
      </header>

      {/* Main Scoring Cockpit */}
      <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
        {msg && (
          <div className="p-3.5 rounded bg-sync/10 border border-sync text-sync text-xs font-mono">
            {msg}
          </div>
        )}

        {/* Team / Table Selector */}
        <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-5 space-y-3">
          <label className="block text-[10px] font-arcade text-slate-400 uppercase tracking-wider">
            SELECT WORKSTATION TABLE TO EVALUATE:
          </label>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => {
              const tableNum = (hackState?.tableAssignments || {})[t.id] || t.tableNumber || null
              const evaluated = (hackState?.evaluations || []).some((e) => e.teamId === t.id)
              const active = t.id === selectedTeam?.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedTeamId(t.id)
                    setMsg('')
                  }}
                  className={`px-3 py-2 rounded text-xs font-mono transition flex items-center gap-2 border ${
                    active
                      ? 'bg-cyan-500 text-black font-bold border-cyan-400 shadow-md'
                      : 'bg-[#101422] text-slate-300 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <span className="font-arcade text-[10px]">{tableNum ? `Table ${tableNum}` : 'Table TBD'}</span>
                  <span>{t.name}</span>
                  {evaluated && <span className="text-[9px]">🔒</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Evaluation Desk */}
        {selectedTeam && (
          <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-6 space-y-6">
            {/* Round Switcher Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2 p-1.5 rounded-lg bg-[#0e1220] border border-slate-800">
              <button
                type="button"
                onClick={() => { setSelectedRound('round1'); setMsg('') }}
                className={`flex-1 py-2.5 px-3 rounded text-xs font-arcade transition flex items-center justify-between gap-2 border ${
                  selectedRound === 'round1'
                    ? 'bg-cyan-500 text-black font-bold border-cyan-400 shadow-md'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>📝</span>
                  <span>ROUND 1: FIRST ASSESSMENT (5:00 PM)</span>
                </div>
                {hackState?.evaluationRounds?.round1 ? (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono ${
                    selectedRound === 'round1' ? 'bg-black/30 text-white font-bold' : 'bg-cyan-900/40 text-cyan-300'
                  }`}>
                    OPEN
                  </span>
                ) : (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono ${
                    selectedRound === 'round1' ? 'bg-black/30 text-white' : 'bg-red-900/40 text-red-300'
                  }`}>
                    LOCKED
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setSelectedRound('round2'); setMsg('') }}
                className={`flex-1 py-2.5 px-3 rounded text-xs font-arcade transition flex items-center justify-between gap-2 border ${
                  selectedRound === 'round2'
                    ? 'bg-amber-500 text-black font-bold border-amber-400 shadow-md'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>🌙</span>
                  <span>ROUND 2: SECOND ASSESSMENT (11:00 PM)</span>
                </div>
                {hackState?.evaluationRounds?.round2 ? (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono ${
                    selectedRound === 'round2' ? 'bg-black/30 text-white font-bold' : 'bg-amber-900/40 text-amber-300'
                  }`}>
                    OPEN
                  </span>
                ) : (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono ${
                    selectedRound === 'round2' ? 'bg-black/30 text-white' : 'bg-red-900/40 text-red-300'
                  }`}>
                    LOCKED
                  </span>
                )}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="font-arcade text-sm sm:text-base text-white">{selectedTeam.name}</h2>
                  <span className="px-2.5 py-0.5 rounded bg-tactical text-black font-arcade text-[9px] font-bold">
                    TABLE: {currentTable}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Track: <strong className="text-cyan-300">{selectedTeam.trackName || 'Agentic AI'}</strong> · Members: {selectedTeam.members?.length || 3}
                </p>
              </div>

              {isLocked ? (
                <span className="px-3 py-1 rounded bg-sync/10 border border-sync text-sync text-[10px] font-arcade flex items-center gap-1.5 self-start sm:self-auto">
                  🔒 EVALUATION LOCKED & FINALIZED
                </span>
              ) : (
                <span className="px-3 py-1 rounded bg-amber-500/10 border border-amber-500 text-amber-400 text-[10px] font-arcade flex items-center gap-1.5 self-start sm:self-auto">
                  ● PENDING ON-GROUND EVALUATION
                </span>
              )}
            </div>

            {/* If evaluation is already permanently locked: show read-only scorecard */}
            {isLocked ? (
              <div className="p-5 rounded-lg bg-[#111422] border border-slate-800 space-y-4">
                <div className="font-arcade text-xs text-white uppercase flex items-center justify-between">
                  <span>LOCKED SCORECARD</span>
                  <span className="text-cyan-400 text-base">{existingEval.total} / 100</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded bg-[#0c0f1a] border border-slate-800">
                    <span className="text-[9px] text-slate-400 block uppercase">Innovation</span>
                    <span className="text-sm font-bold text-white">{existingEval.scores.innovation} / 30</span>
                  </div>
                  <div className="p-3 rounded bg-[#0c0f1a] border border-slate-800">
                    <span className="text-[9px] text-slate-400 block uppercase">Tech Execution</span>
                    <span className="text-sm font-bold text-white">{existingEval.scores.tech} / 30</span>
                  </div>
                  <div className="p-3 rounded bg-[#0c0f1a] border border-slate-800">
                    <span className="text-[9px] text-slate-400 block uppercase">Feasibility</span>
                    <span className="text-sm font-bold text-white">{existingEval.scores.feasibility} / 20</span>
                  </div>
                  <div className="p-3 rounded bg-[#0c0f1a] border border-slate-800">
                    <span className="text-[9px] text-slate-400 block uppercase">Pitch / Q&A</span>
                    <span className="text-sm font-bold text-white">{existingEval.scores.pitch} / 20</span>
                  </div>
                </div>

                {existingEval.notes && (
                  <div className="p-3 rounded bg-[#0c0f1a] border border-slate-800 text-xs font-mono text-slate-300">
                    <strong>Mentor Notes:</strong> {existingEval.notes}
                  </div>
                )}
                <p className="text-[10px] text-slate-500 font-mono italic">
                  Graded by {existingEval.mentorName} on {new Date(existingEval.lockedAt).toLocaleTimeString()}. This score cannot be altered.
                </p>
              </div>
            ) : (
              /* Active Grading Form */
              <form onSubmit={handleGradeSubmit} className="space-y-5">
                <div className="space-y-4">
                  {/* Innovation */}
                  <div className="p-4 rounded-lg bg-[#111422] border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-arcade text-[10px] text-white uppercase">
                        1. Innovation, Novelty & Creativity (0–30)
                      </span>
                      <strong className="text-cyan-300 text-sm">{innovation} / 30</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={innovation}
                      onChange={(e) => setInnovation(e.target.value)}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Tech Execution */}
                  <div className="p-4 rounded-lg bg-[#111422] border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-arcade text-[10px] text-white uppercase">
                        2. Technical Execution & Prototype Depth (0–30)
                      </span>
                      <strong className="text-cyan-300 text-sm">{tech} / 30</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={tech}
                      onChange={(e) => setTech(e.target.value)}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Feasibility */}
                  <div className="p-4 rounded-lg bg-[#111422] border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-arcade text-[10px] text-white uppercase">
                        3. Real-World Feasibility & Scalability (0–20)
                      </span>
                      <strong className="text-cyan-300 text-sm">{feasibility} / 20</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={feasibility}
                      onChange={(e) => setFeasibility(e.target.value)}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Pitch & Presentation */}
                  <div className="p-4 rounded-lg bg-[#111422] border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-arcade text-[10px] text-white uppercase">
                        4. On-Ground Pitch, Defense & Demo (0–20)
                      </span>
                      <strong className="text-cyan-300 text-sm">{pitch} / 20</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={pitch}
                      onChange={(e) => setPitch(e.target.value)}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Qualitative Feedback */}
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-arcade">
                      Mentor Feedback & Qualitative Evaluation Notes:
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Enter specific recommendations, architectural notes, or feedback for the squad..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded bg-[#111422] border border-slate-700 p-3 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                {/* Score Total Banner & Lock CTA */}
                <div className="p-4 rounded-lg bg-[#121626] border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-arcade text-slate-400 uppercase block">Total Evaluation Score</span>
                    <div className="text-2xl font-arcade text-cyan-300">
                      {liveTotal} <span className="text-xs text-slate-400 font-mono">/ 100</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-ribbed bg-cyan-400 hover:bg-cyan-300 text-black font-arcade text-[10px] py-3.5 px-6 rounded uppercase font-bold tracking-wider transition shadow-lg disabled:opacity-50"
                  >
                    {submitting ? 'RECORDING & LOCKING...' : 'LOCK & SUBMIT EVALUATION (PERMANENT) >>'}
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 font-mono text-center">
                  ⚠️ Note: Once locked, this evaluation is permanent and cannot be modified or unlocked by anyone.
                </p>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
