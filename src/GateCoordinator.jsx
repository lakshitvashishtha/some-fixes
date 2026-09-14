import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import jsQR from 'jsqr'
import { coordinatorLoginApi, scanGateQrApi, getGateTeamsApi } from './api'

// Audio feedback on successful QR scan
const playScanBeep = (freq = 880) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
  } catch {}
}

export default function GateCoordinator() {
  const [coordinator, setCoordinator] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  // Scanner state
  const [scanInput, setScanInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanError, setScanError] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const [allTeams, setAllTeams] = useState([])
  const [rosterFilter, setRosterFilter] = useState('all') // 'all' | 'waiting' | 'present'
  const [rosterSearch, setRosterSearch] = useState('')

  // Live Camera Scanner State
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraFacing, setCameraFacing] = useState('environment') // 'environment' | 'user'
  const [cameraError, setCameraError] = useState('')
  const [lastScannedCode, setLastScannedCode] = useState('')

  const inputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scanningAnimRef = useRef(null)
  const fileInputRef = useRef(null)

  const reloadTeams = async () => {
    try {
      const res = await getGateTeamsApi()
      if (res.teams) setAllTeams(res.teams)
    } catch {}
  }

  useEffect(() => {
    if (coordinator) {
      reloadTeams()
      const id = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return
        reloadTeams()
      }, 5000)
      const onVisible = () => {
        if (typeof document !== 'undefined' && !document.hidden) reloadTeams()
      }
      document.addEventListener('visibilitychange', onVisible)
      return () => {
        clearInterval(id)
        document.removeEventListener('visibilitychange', onVisible)
      }
    }
  }, [coordinator])

  // Camera stream & jsQR frame decoder lifecycle
  useEffect(() => {
    if (!cameraActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (scanningAnimRef.current) {
        cancelAnimationFrame(scanningAnimRef.current)
        scanningAnimRef.current = null
      }
      return
    }

    let cancelled = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const scanFrame = () => {
      if (cancelled || !cameraActive) return
      const video = videoRef.current
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })

        if (code && code.data && code.data.trim()) {
          const payload = code.data.trim()
          playScanBeep(920)
          setLastScannedCode(payload)
          executeScan(payload)
          // Pause scanning loop briefly so we don't trigger repeatedly
          setTimeout(() => {
            if (!cancelled && cameraActive) {
              scanningAnimRef.current = requestAnimationFrame(scanFrame)
            }
          }, 1800)
          return
        }
      }
      scanningAnimRef.current = requestAnimationFrame(scanFrame)
    }

    const startStream = async () => {
      setCameraError('')
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera streaming is not supported by your browser or requires HTTPS.')
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: cameraFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          await videoRef.current.play().catch(() => {})
          scanningAnimRef.current = requestAnimationFrame(scanFrame)
        }
      } catch (err) {
        if (!cancelled) {
          setCameraError(
            err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
              ? 'Camera permission denied. Please allow camera access in your browser address bar.'
              : err.message || 'Unable to open camera.'
          )
        }
      }
    }

    startStream()

    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (scanningAnimRef.current) {
        cancelAnimationFrame(scanningAnimRef.current)
        scanningAnimRef.current = null
      }
    }
  }, [cameraActive, cameraFacing])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (scanningAnimRef.current) {
      cancelAnimationFrame(scanningAnimRef.current)
      scanningAnimRef.current = null
    }
    setCameraActive(false)
  }

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera()
    } else {
      setCameraActive(true)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanError('')
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code && code.data && code.data.trim()) {
          playScanBeep(880)
          setScanInput(code.data.trim())
          executeScan(code.data.trim())
        } else {
          setScanError('No readable QR code detected in uploaded image. Please ensure the QR is clear and well-lit.')
        }
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    setLoggingIn(true)
    try {
      const res = await coordinatorLoginApi(email.trim(), password.trim())
      if (res.coordinator) {
        setCoordinator(res.coordinator)
      }
    } catch (err) {
      setAuthError(err.message || 'Invalid gate credentials.')
    } finally {
      setLoggingIn(false)
    }
  }

  const executeScan = async (codeString) => {
    const code = (codeString || scanInput).trim()
    if (!code) return
    setScanning(true)
    setScanError('')
    try {
      const res = await scanGateQrApi(code)
      if (res.success) {
        setScanResult(res)
        setScanInput('')
        if (res.isComplete) {
          setShowCelebration(true)
        }
        reloadTeams()
      }
    } catch (err) {
      setScanError(err.message || 'Verification failed: invalid pass or QR code.')
    } finally {
      setScanning(false)
      if (inputRef.current) inputRef.current.focus()
    }
  }

  const handleScanSubmit = async (e) => {
    if (e) e.preventDefault()
    await executeScan(scanInput)
  }

  const handleDirectMemberCheckIn = async (member, team) => {
    const pId = `CF5-${(member.id || member.email || '0000').slice(-6).toUpperCase()}`
    const payload = `CF5:${team.id}:${member.email}:${pId}`
    playScanBeep(880)
    await executeScan(payload)
  }

  // Coordinator Login Screen
  if (!coordinator) {
    return (
      <div className="min-h-dvh w-full bg-[#05070c] text-slate-200 font-mono flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0a0d16] border border-amber-500/40 rounded-xl p-6 sm:p-8 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
          <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-800">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-arcade text-xs text-amber-300 tracking-wider">
              GATE ENTRY & QR SCANNER CONSOLE
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1.5">
                Coordinator Email
              </label>
              <input
                type="email"
                placeholder="gate.coordinator@codefiesta.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded bg-[#0f1320] border border-slate-700 px-3.5 py-3 text-xs text-white outline-none focus:border-amber-400 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1.5">
                Coordinator Passcode
              </label>
              <input
                type="password"
                placeholder="Password provided by organizing team..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded bg-[#0f1320] border border-slate-700 px-3.5 py-3 text-xs text-white outline-none focus:border-amber-400 font-mono"
                required
              />
            </div>

            {authError && <p className="text-xs text-red-400 font-mono">{authError}</p>}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-arcade text-[10px] py-3.5 rounded tracking-widest uppercase transition font-bold shadow-lg disabled:opacity-50"
            >
              {loggingIn ? 'AUTHENTICATING...' : 'ACCESS GATE SCANNER >>'}
            </button>
          </form>

          <div className="mt-5 p-3 rounded bg-[#0f1422] border border-slate-800 text-[10px] text-slate-400 font-mono space-y-1.5">
            <div className="flex items-center justify-between">
              <strong className="text-amber-300">Authorized Gate Credentials:</strong>
              <button
                type="button"
                onClick={() => {
                  setEmail('coordinator@codefiesta.in')
                  setPassword('gate123')
                }}
                className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[9px] font-mono"
              >
                Auto-Fill
              </button>
            </div>
            <div>Email: <span className="text-slate-200">coordinator@codefiesta.in</span> (or gate.coordinator@codefiesta.in)</div>
            <div>Password: <span className="text-slate-200">gate123</span> (or gate_access_cf5)</div>
          </div>
        </div>
      </div>
    )
  }

  const fullyPresentTeams = allTeams.filter((t) => t.isFullyPresent).length
  const partialTeams = allTeams.filter((t) => t.isPartiallyPresent).length

  return (
    <div className="min-h-dvh w-full bg-[#070910] text-slate-200 font-mono">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-[#0a0d17] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500/20 border border-amber-500 text-amber-300 font-arcade text-xs flex items-center justify-center font-bold">
            GT
          </div>
          <div>
            <div className="font-arcade text-xs text-white tracking-wider flex items-center gap-2">
              CODEFIESTA 5.0 <span className="text-amber-400 text-[10px]">GATE ENTRANCE DESK</span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono">
              Station: <strong className="text-slate-200">{coordinator.gate || 'Main Gate'}</strong> · Staff: {coordinator.name}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCoordinator(null)}
          className="text-[10px] font-arcade text-red-400 hover:underline px-2.5 py-1.5 rounded border border-slate-800"
        >
          Exit Gate
        </button>
      </header>

      {/* Main Gate Scanner HUD */}
      <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Live Gate Entry Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded bg-[#0b0e18] border border-slate-800 text-center">
            <span className="text-[9px] font-arcade text-slate-400 uppercase">SQUADS REGISTERED</span>
            <div className="text-xl font-bold font-mono text-white mt-1">{allTeams.length}</div>
          </div>
          <div className="p-3.5 rounded bg-[#0b0e18] border border-sync/40 text-center">
            <span className="text-[9px] font-arcade text-sync uppercase">FULLY PRESENT</span>
            <div className="text-xl font-bold font-mono text-sync mt-1">{fullyPresentTeams}</div>
          </div>
          <div className="p-3.5 rounded bg-[#0b0e18] border border-amber-500/40 text-center">
            <span className="text-[9px] font-arcade text-amber-400 uppercase">PARTIAL (WAITING)</span>
            <div className="text-xl font-bold font-mono text-amber-300 mt-1">{partialTeams}</div>
          </div>
          <div className="p-3.5 rounded bg-[#0b0e18] border border-slate-800 text-center">
            <span className="text-[9px] font-arcade text-slate-400 uppercase">TOTAL ATTENDEES</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {allTeams.reduce((acc, t) => acc + (t.presentCount || 0), 0)}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes scanline {
            0% { top: 4%; opacity: 0.8; }
            50% { top: 92%; opacity: 1; }
            100% { top: 4%; opacity: 0.8; }
          }
          .animate-scanline {
            animation: scanline 2.2s ease-in-out infinite;
          }
        `}</style>

        {/* QR Scan Input Card */}
        <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xl">📷</span>
              <h2 className="font-arcade text-xs sm:text-sm text-white uppercase tracking-wider">
                PARTICIPANT QR SCANNER & GATE CHECK-IN
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {cameraActive ? (
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Live Camera Active
                </span>
              ) : (
                <span className="text-[9px] font-mono text-sync flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sync animate-ping" />
                  Scanner Ready
                </span>
              )}
            </div>
          </div>

          {/* Primary Action Buttons: Camera Scanner & Image Upload */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={toggleCamera}
              className={`px-4 py-3 rounded-lg font-arcade text-xs uppercase tracking-wider flex items-center gap-2 transition font-bold shadow-lg cursor-pointer ${
                cameraActive
                  ? 'bg-red-500 hover:bg-red-400 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.35)]'
              }`}
            >
              <span className="text-base">{cameraActive ? '🛑' : '📹'}</span>
              <span>{cameraActive ? 'CLOSE CAMERA SCANNER' : 'LAUNCH LIVE CAMERA SCANNER'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-3 rounded-lg bg-[#121727] hover:bg-[#182035] border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-arcade text-xs uppercase tracking-wider flex items-center gap-2 transition font-bold shadow-md cursor-pointer"
            >
              <span className="text-base">🖼️</span>
              <span>UPLOAD QR IMAGE / SCREENSHOT</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Live Camera Viewfinder Overlay */}
          {cameraActive && (
            <div className="relative rounded-xl overflow-hidden border-2 border-emerald-400 bg-black shadow-[0_0_35px_rgba(16,185,129,0.3)] mt-3">
              <video
                ref={videoRef}
                className="w-full h-72 sm:h-96 object-cover bg-black mx-auto"
                autoPlay
                playsInline
                muted
              />
              {/* Laser scanline */}
              <div className="pointer-events-none absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-scanline" />

              {/* Reticle targeting box */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-emerald-400/40 rounded-2xl relative shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-arcade text-emerald-300 bg-black/75 px-3 py-1.5 rounded tracking-widest border border-emerald-500/40 animate-pulse text-center">
                      HOLD PARTICIPANT QR INSIDE FRAME
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Camera Controls Top Right */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                  className="px-2.5 py-1.5 rounded-lg bg-black/80 hover:bg-black text-white text-[10px] font-arcade border border-slate-700 flex items-center gap-1.5 backdrop-blur-sm cursor-pointer shadow"
                  title="Switch between front and rear cameras"
                >
                  <span>🔄</span>
                  <span>FLIP CAM</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-2.5 py-1.5 rounded-lg bg-red-600/85 hover:bg-red-600 text-white text-[10px] font-arcade border border-red-500 flex items-center gap-1 backdrop-blur-sm cursor-pointer shadow"
                >
                  <span>✕</span>
                  <span>STOP</span>
                </button>
              </div>

              <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
                <span className="inline-block px-3.5 py-1 rounded-full bg-black/85 text-[10px] font-mono text-slate-300 border border-slate-700">
                  Optical Lens Active ({cameraFacing === 'environment' ? 'Rear Camera' : 'Front Camera'}) · Auto-decodes on sight
                </span>
              </div>
            </div>
          )}

          {/* Camera Permission / Error Warning */}
          {cameraError && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/50 text-red-300 text-xs font-mono space-y-1">
              <div className="font-arcade text-[10px] text-red-400 uppercase flex items-center gap-1.5">
                <span>⚠️</span> CAMERA ACCESS NOTICE
              </div>
              <p>{cameraError}</p>
              <p className="text-[10px] text-slate-400">
                You can also click <strong>UPLOAD QR IMAGE</strong> to scan a screenshot, use a USB barcode gun, or click <strong>CHECK IN</strong> directly in the roster table below.
              </p>
            </div>
          )}

          {/* Manual Input & Barcode Gun Scanner Field */}
          <div className="pt-2">
            <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-arcade">
              MANUAL PASS ID / BARCODE GUN SCANNER / EMAIL INPUT:
            </label>
            <form onSubmit={handleScanSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Scan QR with barcode gun or type Pass ID (e.g. CF5-ZJF2DZ or student email)..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                className="flex-1 rounded-md bg-[#080a12] border border-slate-700 px-4 py-3 text-xs text-white outline-none focus:border-amber-400 font-mono placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={scanning}
                className="px-6 py-3 rounded bg-amber-500 hover:bg-amber-400 text-black font-arcade text-[10px] font-bold uppercase tracking-wider transition shadow-lg shrink-0 cursor-pointer disabled:opacity-50"
              >
                {scanning ? 'CHECKING...' : 'VERIFY & CHECK IN >>'}
              </button>
            </form>
          </div>

          {/* Quick Test Demo Chips */}
          {allTeams.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-arcade tracking-wider mb-2 flex items-center gap-1">
                <span>⚡</span> FAST TEST SCANS (CLICK TO TEST INSTANT CHECK-IN):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allTeams.flatMap((t) => (t.roster || t.members || []).map((m) => ({ member: m, team: t }))).slice(0, 6).map(({ member, team }, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDirectMemberCheckIn(member, team)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono border transition flex items-center gap-1.5 cursor-pointer ${
                      member.checkedIn
                        ? 'bg-sync/10 border-sync/30 text-sync line-through opacity-70'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-300'
                    }`}
                    title={`Click to simulate scanning ${member.name} (${team.name})`}
                  >
                    <span>{member.checkedIn ? '✓' : '⚡'}</span>
                    <span>{member.name || member.email?.split('@')[0]}</span>
                    <span className="text-[9px] text-slate-400 uppercase">({team.name})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {scanError && (
            <div className="p-3 rounded bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-mono">
              ⚠️ {scanError}
            </div>
          )}
        </div>

        {/* Active Scanned Squad Details */}
        {scanResult && (
          <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-6 space-y-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-arcade text-base text-white">{scanResult.team.name}</h3>
                  <span className="px-2.5 py-0.5 rounded bg-tactical text-black font-arcade text-[9px] font-bold">
                    TABLE: {scanResult.team.tableNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Just Checked In: <strong className="text-sync">{scanResult.scannedMember.name}</strong> ({scanResult.scannedMember.email})
                </p>
              </div>

              {scanResult.isComplete ? (
                <span className="px-3.5 py-1.5 rounded bg-sync/15 border border-sync text-sync text-xs font-arcade flex items-center gap-1.5 shadow-md">
                  ✓ SQUAD 100% PRESENT (AUTHORIZED TO ENTER)
                </span>
              ) : (
                <span className="px-3.5 py-1.5 rounded bg-amber-500/15 border border-amber-500 text-amber-300 text-xs font-arcade flex items-center gap-1.5">
                  ⏳ PARTIAL ARRIVAL ({scanResult.checkedInCount} of {scanResult.totalMembers} PRESENT)
                </span>
              )}
            </div>

            {/* Staggered Arrival Notice */}
            {!scanResult.isComplete && (
              <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-500/40 text-amber-300 space-y-1 text-xs font-mono">
                <div className="font-arcade text-[10px] text-amber-400 uppercase">
                  ⚠️ WAITING FOR REMAINING SQUAD MEMBERS
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {scanResult.scannedMember.name} has been marked present at the gate. As per Codefiesta 5.0 on-ground protocol, this squad <strong>cannot proceed into the hackathon hall</strong> until all {scanResult.totalMembers} members arrive. Please direct present members to the waiting lounge.
                </p>
              </div>
            )}

            {/* Roster Checklist */}
            <div className="space-y-2">
              <span className="text-[10px] font-arcade text-slate-400 uppercase block">
                SQUAD ROSTER & ATTENDANCE STATUS:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {scanResult.team.roster.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border flex items-center justify-between gap-2 ${
                      m.checkedIn
                        ? 'bg-sync/10 border-sync/40 text-slate-200'
                        : 'bg-[#10131e] border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                        <span>{m.checkedIn ? '✓' : '⏳'}</span>
                        <span>{m.name || m.email.split('@')[0]}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono truncate">{m.email}</div>
                    </div>
                    <div>
                      {m.checkedIn ? (
                        <span className="px-2 py-0.5 rounded bg-sync/20 text-sync font-arcade text-[8px] font-bold">
                          PRESENT
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDirectMemberCheckIn(m, scanResult.team)}
                          className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-arcade text-[8px] font-bold uppercase transition cursor-pointer"
                        >
                          ⚡ CHECK IN
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Master Registered Squads Roster Table */}
        <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-6 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-arcade text-xs text-white uppercase tracking-wider flex items-center gap-2">
                <span>📋</span> MASTER ENTRANCE DESK ROSTER ({allTeams.length} SQUADS)
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Real-time check-in ledger. Click &apos;⚡ CHECK IN&apos; next to any member for instant admittance.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search squad or member..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="rounded bg-[#080a12] border border-slate-700 px-3 py-1.5 text-xs text-white font-mono placeholder:text-slate-500 outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="space-y-3">
            {allTeams
              .filter((t) => {
                if (!rosterSearch.trim()) return true
                const q = rosterSearch.toLowerCase()
                const matchTeam = (t.name || '').toLowerCase().includes(q) || (t.code || '').toLowerCase().includes(q)
                const matchMember = (t.roster || t.members || []).some(
                  (m) => (m.name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q)
                )
                return matchTeam || matchMember
              })
              .map((team, idx) => {
                const roster = team.roster || team.members || []
                const presentCount = roster.filter((m) => m.checkedIn).length
                const isComplete = roster.length > 0 && presentCount >= roster.length

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition ${
                      isComplete
                        ? 'bg-sync/5 border-sync/30'
                        : presentCount > 0
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-[#090c15] border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold font-arcade text-white uppercase">{team.name}</span>
                        <span className="text-[10px] font-mono text-tactical bg-tactical/10 px-2 py-0.5 rounded border border-tactical/20">
                          {team.tableNumber ? `TABLE ${team.tableNumber}` : 'TABLE PENDING'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{team.code}</span>
                      </div>
                      <div>
                        {isComplete ? (
                          <span className="px-2.5 py-1 rounded-full bg-sync/20 text-sync text-[9px] font-arcade font-bold border border-sync/40">
                            ✓ 100% FULLY PRESENT ({presentCount}/{roster.length})
                          </span>
                        ) : presentCount > 0 ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-arcade font-bold border border-amber-500/40">
                            ⏳ PARTIAL ({presentCount}/{roster.length} PRESENT)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[9px] font-arcade border border-slate-700">
                            0/{roster.length} PRESENT (AWAITING)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {roster.map((m, mIdx) => (
                        <div
                          key={mIdx}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs font-mono ${
                            m.checkedIn
                              ? 'bg-sync/10 border-sync/30 text-slate-200'
                              : 'bg-[#060810] border-slate-800/80 text-slate-400'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate flex items-center gap-1">
                              <span>{m.checkedIn ? '✓' : '⏳'}</span>
                              <span className="truncate">{m.name || m.email?.split('@')[0]}</span>
                            </div>
                            <div className="text-[9px] text-slate-400 truncate">{m.email}</div>
                          </div>
                          <div className="shrink-0">
                            {m.checkedIn ? (
                              <span className="px-1.5 py-0.5 rounded bg-sync/20 text-sync text-[8px] font-arcade font-bold">
                                IN
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDirectMemberCheckIn(m, team)}
                                className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-arcade text-[8px] font-bold uppercase transition cursor-pointer"
                                title={`Check in ${m.name}`}
                              >
                                CHECK IN
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </main>

      {/* FULL-SCREEN CELEBRATION MODAL: ALL SQUAD MEMBERS VERIFIED */}
      {showCelebration && scanResult && scanResult.isComplete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b101c] border-2 border-sync rounded-2xl p-6 sm:p-10 max-w-lg w-full text-center space-y-6 shadow-[0_0_60px_rgba(34,197,94,0.3)] relative animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-sync/20 border-2 border-sync text-sync text-3xl flex items-center justify-center mx-auto animate-bounce">
              ✓
            </div>

            <div>
              <span className="text-[10px] font-arcade text-sync uppercase tracking-widest block mb-1">
                GATE CLEARANCE VERIFIED // CODEFIESTA 5.0
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-arcade text-white tracking-wide">
                ALL SQUAD MEMBERS SCANNED!
              </h2>
              <div className="text-lg font-arcade text-tactical mt-2">
                WELCOME TEAM: {scanResult.team.name}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#080b13] border border-slate-800 text-xs font-mono space-y-2 text-left">
              <div className="flex items-center justify-between text-slate-300">
                <span>Total Squad Members:</span>
                <span className="font-bold text-white font-arcade">{scanResult.totalMembers} Present (100%)</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Assigned Table:</span>
                <span className="font-bold text-tactical font-arcade">{scanResult.team.tableNumber}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Entry Status:</span>
                <span className="text-sync font-bold">APPROVED FOR VENUE & KITS</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              Direct the entire squad to proceed to the main registration desk for badge kit collection and workstation table setup.
            </p>

            <button
              type="button"
              onClick={() => setShowCelebration(false)}
              className="w-full py-4 rounded-xl bg-sync hover:bg-[#18ba9b] text-black font-arcade text-xs font-bold uppercase tracking-widest transition shadow-xl cursor-pointer"
            >
              CONFIRM ENTRY & SCAN NEXT TEAM &gt;&gt;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
