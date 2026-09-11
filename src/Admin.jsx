import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ADMIN_VAULT_KEY,
  getHackathonStateApi,
  verifyAdminPasskeyApi,
  toggleProblemStatementsApi,
  toggleEvaluationRoundApi,
  broadcastAnnouncementApi,
  assignTableApi,
  provisionMentorApi,
  provisionCoordinatorApi,
  removeMentorApi,
  updateMentorApi,
  removeCoordinatorApi,
  updateCoordinatorApi,
  getGateTeamsApi,
  getAllRegisteredTeamsApi,
  fetchMyTeams,
  verifyTeamPaymentApi,
  getRegistrationsLedgerApi,
  syncWithSharedStore,
  revertTeamPaymentApi,
  resetUserPasswordApi,
  removeAttendeeApi,
  reinstateAttendeeApi,
  updateProblemStatementsApi,
  DEFAULT_PROBLEM_STATEMENTS,
  getApiOrigin,
} from './api'
import { QRCodeSvg } from './qrGenerator.jsx'

export default function Admin() {
  const [authorized, setAuthorized] = useState(false)
  const [passkeyInput, setPasskeyInput] = useState('')
  const [authError, setAuthError] = useState('')
  const [activeTab, setActiveTab] = useState('registrations') // 'registrations' | 'problems' | 'tables' | 'broadcast' | 'mentors' | 'scores'
  const [hackState, setHackState] = useState(null)
  const [teams, setTeams] = useState([])
  const [notice, setNotice] = useState('')

  // Form states
  const [broadcastText, setBroadcastText] = useState('')
  const [broadcastPriority, setBroadcastPriority] = useState('normal')
  const [mentorName, setMentorName] = useState('')
  const [mentorEmail, setMentorEmail] = useState('')
  const [mentorPassword, setMentorPassword] = useState('')
  const [mentorTrack, setMentorTrack] = useState('agentic_ai')
  const [mentorTables, setMentorTables] = useState('')
  const [coordName, setCoordName] = useState('')
  const [coordEmail, setCoordEmail] = useState('')
  const [coordPassword, setCoordPassword] = useState('')
  const [coordGate, setCoordGate] = useState('Sitapura Main Entrance')
  const [gateTeams, setGateTeams] = useState([])
  const [tableEdits, setTableEdits] = useState({})
  const [editingTableTeamId, setEditingTableTeamId] = useState(null)

  // Mentor & Coordinator Edit & Share States
  const [editingMentor, setEditingMentor] = useState(null)
  const [shareMentorData, setShareMentorData] = useState(null)
  const [editingCoord, setEditingCoord] = useState(null)
  const [shareCoordData, setShareCoordData] = useState(null)
  const [copiedKey, setCopiedKey] = useState('')

  const handleCopyText = (key, text) => {
    navigator.clipboard?.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 2500)
  }

  // Registrations & Spreadsheet states
  const [candidatesLedger, setCandidatesLedger] = useState([])
  const [regSearch, setRegSearch] = useState('')
  const [regFilter, setRegFilter] = useState('all') // 'all' | 'verified' | 'pending'
  const [verifyingTeamId, setVerifyingTeamId] = useState(null)

  // Payment Verification Double Confirmation States
  const [doubleConfirmTeam, setDoubleConfirmTeam] = useState(null)
  const [doubleConfirmChecked, setDoubleConfirmChecked] = useState(false)
  const [revertConfirmTeam, setRevertConfirmTeam] = useState(null)

  // Candidate Look Live Preview Modal
  const [previewCandidateData, setPreviewCandidateData] = useState(null)

  // Candidate Password Change Modal
  const [pwdResetCandidate, setPwdResetCandidate] = useState(null)
  const [newPasswordVal, setNewPasswordVal] = useState('')
  const [pwdResetLoading, setPwdResetLoading] = useState(false)

  // Confirmed Attendees & Early Exit States
  const [verifiedAttendeesFilter, setVerifiedAttendeesFilter] = useState('all') // 'all' | 'active' | 'early_exit'
  const [verifiedAttendeesSearch, setVerifiedAttendeesSearch] = useState('')
  const [earlyExitCandidate, setEarlyExitCandidate] = useState(null)
  const [earlyExitOption, setEarlyExitOption] = useState('mark') // 'mark' | 'drop'

  // Problem Statements Editor & Live Simulator
  const [problemTracks, setProblemTracks] = useState([])
  const [editingTrack, setEditingTrack] = useState(null)
  const [trackModalData, setTrackModalData] = useState(null)
  const [isTracksDirty, setIsTracksDirty] = useState(false)
  const [trackSimulatorMode, setTrackSimulatorMode] = useState('unlocked') // 'unlocked' | 'locked'

  // Refresh state
  const reloadState = async () => {
    try {
      await syncWithSharedStore()
      const res = await getHackathonStateApi()
      if (res?.state) {
        setHackState(res.state)
        setProblemTracks((prev) => {
          if (editingTrack || trackModalData || isTracksDirty) return prev
          if (prev.length > 0 && !res.state.problemStatements) return prev
          return res.state.problemStatements || DEFAULT_PROBLEM_STATEMENTS
        })
      }
      const teamsRes = await getAllRegisteredTeamsApi()
      if (teamsRes?.teams) setTeams(teamsRes.teams)
      const gateRes = await getGateTeamsApi()
      if (gateRes?.teams) setGateTeams(gateRes.teams)
      const regRes = await getRegistrationsLedgerApi(ADMIN_VAULT_KEY)
      if (regRes?.candidates) setCandidatesLedger(regRes.candidates)
      if (!teamsRes?.teams && regRes?.teams) setTeams(regRes.teams)
    } catch {}
  }

  // Force authoritative refresh from shared store without logging out
  const [isSyncing, setIsSyncing] = useState(false)
  const handleManualSync = async () => {
    setIsSyncing(true)
    setNotice('')
    try {
      const syncResult = await syncWithSharedStore(true)

      const res = await getHackathonStateApi()
      if (res?.state) {
        setHackState(res.state)
        if (res.state.problemStatements) {
          setProblemTracks(res.state.problemStatements)
        }
      }

      const regRes = await getRegistrationsLedgerApi(ADMIN_VAULT_KEY)
      if (regRes?.candidates) {
        setCandidatesLedger(regRes.candidates)
      }
      if (regRes?.teams) {
        setTeams(regRes.teams)
      } else {
        const teamsRes = await getAllRegisteredTeamsApi()
        if (teamsRes?.teams) setTeams(teamsRes.teams)
      }

      const gateRes = await getGateTeamsApi()
      if (gateRes?.teams) setGateTeams(gateRes.teams)

      const teamCount = regRes?.teams?.length || syncResult?.teams?.length || teams.length
      const candCount = regRes?.candidates?.length || candidatesLedger.length
      setNotice(`✅ Data Synced Fresh! Loaded ${teamCount} squads and ${candCount} candidates from shared database.`)
      setTimeout(() => setNotice(''), 4500)
    } catch (err) {
      setNotice('Sync error: ' + err.message)
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    if (authorized) {
      reloadState()
      const interval = setInterval(reloadState, 3000)
      const onSync = () => reloadState()
      window.addEventListener('codefiesta_teams_updated', onSync)
      window.addEventListener('hackathon:state-updated', onSync)
      window.addEventListener('storage', onSync)
      return () => {
        clearInterval(interval)
        window.removeEventListener('codefiesta_teams_updated', onSync)
        window.removeEventListener('hackathon:state-updated', onSync)
        window.removeEventListener('storage', onSync)
      }
    }
  }, [authorized])

  const handleUnlock = async (e) => {
    e.preventDefault()
    setAuthError('')
    try {
      await verifyAdminPasskeyApi(passkeyInput.trim())
      setAuthorized(true)
    } catch (err) {
      setAuthError('Access Denied: Invalid Security Passkey')
    }
  }

  const handleToggleRound = async (roundKey, open) => {
    // Instant optimistic update
    setHackState((prev) => {
      const copy = { ...(prev || {}) }
      copy.evaluationRounds = { ...(copy.evaluationRounds || {}), [roundKey]: open }
      return copy
    })
    try {
      await toggleEvaluationRoundApi(roundKey, open, ADMIN_VAULT_KEY)
      setNotice(`✓ ${roundKey === 'round2' ? 'Second Assessment Round (Round 2)' : 'First Assessment Round (Round 1)'} is now ${open ? 'OPEN FOR MENTORS' : 'LOCKED'}.`)
      reloadState()
      setTimeout(() => setNotice(''), 3500)
    } catch {
      setNotice('Error updating round state.')
      reloadState()
    }
  }

  const handleToggleProblems = async (release) => {
    try {
      await toggleProblemStatementsApi(release, ADMIN_VAULT_KEY)
      setNotice(release ? '✓ Problem statements released live to all squads!' : '🔒 Problem statements classified and locked.')
      reloadState()
      setTimeout(() => setNotice(''), 3500)
    } catch {
      setNotice('Error toggling problem statements.')
    }
  }

  const handleBroadcast = async (e) => {
    e.preventDefault()
    if (!broadcastText.trim()) return
    try {
      await broadcastAnnouncementApi(broadcastText.trim(), broadcastPriority, ADMIN_VAULT_KEY)
      setBroadcastText('')
      setNotice('✓ Announcement broadcast live to all participant HUDs!')
      reloadState()
      setTimeout(() => setNotice(''), 3500)
    } catch {
      setNotice('Error broadcasting message.')
    }
  }

  const handleAssignTable = async (teamId, tableNumber) => {
    const cleanTable = (tableNumber || '').toUpperCase().trim()
    const finalTable = cleanTable && cleanTable !== 'UNASSIGNED' ? cleanTable : null

    // Instant optimistic state update
    setHackState((prev) => ({
      ...(prev || {}),
      tableAssignments: {
        ...(prev?.tableAssignments || {}),
        [teamId]: finalTable,
      },
    }))
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, tableNumber: finalTable } : t))
    )
    setTableEdits((prev) => ({
      ...prev,
      [teamId]: finalTable || '',
    }))

    try {
      await assignTableApi(teamId, finalTable || '', ADMIN_VAULT_KEY)
      setNotice(finalTable ? `✓ Table ${finalTable} assigned successfully.` : '✓ Table assignment cleared.')
      await reloadState()
      setTimeout(() => setNotice(''), 3500)
    } catch (err) {
      setNotice('Error assigning table: ' + err.message)
    }
  }

  const handleProvisionCoordinator = async (e) => {
    e.preventDefault()
    if (!coordEmail.trim() || !coordPassword.trim()) return
    const name = coordName.trim()
    const email = coordEmail.trim().toLowerCase()
    const password = coordPassword.trim()
    const gate = coordGate.trim() || 'Sitapura Main Entrance'

    try {
      if (editingCoord) {
        await updateCoordinatorApi(
          editingCoord.id || editingCoord.email,
          { name, email, password, gate },
          ADMIN_VAULT_KEY
        )
        setNotice(`✓ Coordinator "${name}" updated successfully.`)
        setEditingCoord(null)
      } else {
        await provisionCoordinatorApi(
          { name, email, password, gate },
          ADMIN_VAULT_KEY
        )
        setNotice('✓ Entry Gate Coordinator created and provisioned.')
      }

      const gatePortalUrl = `${window.location.origin}/entry-gate-scanner-7294`
      const inviteMsg = `Codefiesta 5.0 — Gate Scanner Access Credentials
Gate Portal: ${gatePortalUrl}
Staff Name: ${name}
Login Email: ${email}
Password: ${password}
Assigned Gate: ${gate}`

      setShareCoordData({
        name,
        email,
        password,
        gate,
        url: gatePortalUrl,
        formatted: inviteMsg,
      })

      setCoordName('')
      setCoordEmail('')
      setCoordPassword('')
      reloadState()
      setTimeout(() => setNotice(''), 3500)
    } catch {
      setNotice('Error provisioning coordinator.')
    }
  }

  const handleEditCoordinator = (coord) => {
    setEditingCoord(coord)
    setCoordName(coord.name || '')
    setCoordEmail(coord.email || '')
    setCoordPassword(coord.password || '')
    setCoordGate(coord.gate || 'Sitapura Main Entrance')
  }

  const handleCancelCoordEdit = () => {
    setEditingCoord(null)
    setCoordName('')
    setCoordEmail('')
    setCoordPassword('')
    setCoordGate('Sitapura Main Entrance')
  }

  const handleRemoveCoordinator = async (coordId, coordName) => {
    if (!window.confirm(`Are you sure you want to remove gate coordinator "${coordName}"?`)) return
    try {
      await removeCoordinatorApi(coordId, ADMIN_VAULT_KEY)
      setNotice(`✓ Coordinator "${coordName}" removed.`)
      reloadState()
      setTimeout(() => setNotice(''), 3000)
    } catch {
      setNotice('Error removing coordinator.')
    }
  }

  const handleShareCoordinator = (coord) => {
    const gatePortalUrl = `${window.location.origin}/entry-gate-scanner-7294`
    const inviteMsg = `Codefiesta 5.0 — Gate Scanner Access Credentials
Gate Portal: ${gatePortalUrl}
Staff Name: ${coord.name || 'Coordinator'}
Login Email: ${coord.email}
Password: ${coord.password || 'gate123'}
Assigned Gate: ${coord.gate || 'Main Entrance'}`

    setShareCoordData({
      name: coord.name,
      email: coord.email,
      password: coord.password || 'gate123',
      gate: coord.gate || 'Main Entrance',
      url: gatePortalUrl,
      formatted: inviteMsg,
    })
  }

  const handleProvisionMentor = async (e) => {
    e.preventDefault()
    if (!mentorEmail.trim() || !mentorPassword.trim()) return
    const name = mentorName.trim()
    const email = mentorEmail.trim().toLowerCase()
    const password = mentorPassword.trim()
    const track = mentorTrack
    const tables = mentorTables.trim() || 'Awaiting On-Ground Table Allocation'

    try {
      if (editingMentor) {
        await updateMentorApi(
          editingMentor.id || editingMentor.email,
          { name, email, password, track, tables },
          ADMIN_VAULT_KEY
        )
        setNotice(`✓ Mentor "${name}" updated successfully.`)
        setEditingMentor(null)
      } else {
        await provisionMentorApi(
          { name, email, password, track, tables },
          ADMIN_VAULT_KEY
        )
        setNotice('✓ Mentor account created and provisioned.')
      }

      const mentorPortalUrl = `${window.location.origin}/mentor`
      const inviteMsg = `Codefiesta 5.0 — Official Mentor Evaluation Access
Mentor Portal: ${mentorPortalUrl}
Mentor: ${name}
Login Email: ${email}
Password: ${password}
Assigned Tables: ${tables}
Track: ${track}`

      setShareMentorData({
        name,
        email,
        password,
        track,
        tables,
        url: mentorPortalUrl,
        formatted: inviteMsg,
      })

      setMentorName('')
      setMentorEmail('')
      setMentorPassword('')
      setMentorTables('')
      reloadState()
      setTimeout(() => setNotice(''), 3500)
    } catch {
      setNotice('Error provisioning mentor.')
    }
  }

  const handleEditMentor = (mentor) => {
    setEditingMentor(mentor)
    setMentorName(mentor.name || '')
    setMentorEmail(mentor.email || '')
    setMentorPassword(mentor.password || '')
    setMentorTrack(mentor.track || 'agentic_ai')
    setMentorTables(mentor.tables || '')
  }

  const handleCancelMentorEdit = () => {
    setEditingMentor(null)
    setMentorName('')
    setMentorEmail('')
    setMentorPassword('')
    setMentorTables('')
  }

  const handleRemoveMentor = async (mentorId, mentorName) => {
    if (!window.confirm(`Are you sure you want to remove mentor "${mentorName}"?`)) return
    try {
      await removeMentorApi(mentorId, ADMIN_VAULT_KEY)
      setNotice(`✓ Mentor "${mentorName}" removed.`)
      reloadState()
      setTimeout(() => setNotice(''), 3000)
    } catch {
      setNotice('Error removing mentor.')
    }
  }

  const handleShareMentor = (mentor) => {
    const mentorPortalUrl = `${window.location.origin}/mentor`
    const inviteMsg = `Codefiesta 5.0 — Official Mentor Evaluation Access
Mentor Portal: ${mentorPortalUrl}
Mentor: ${mentor.name || 'Mentor'}
Login Email: ${mentor.email}
Password: ${mentor.password || 'mentor123'}
Assigned Tables: ${mentor.tables || 'On-Ground Selection'}
Track: ${mentor.track || 'All Tracks'}`

    setShareMentorData({
      name: mentor.name,
      email: mentor.email,
      password: mentor.password || 'mentor123',
      track: mentor.track || 'All Tracks',
      tables: mentor.tables || 'On-Ground Selection',
      url: mentorPortalUrl,
      formatted: inviteMsg,
    })
  }

  const handleVerifyPayment = async (teamId, verified = true, notes = '') => {
    setVerifyingTeamId(teamId)
    try {
      const res = await verifyTeamPaymentApi(teamId, verified, notes, ADMIN_VAULT_KEY)
      if (verified) {
        setNotice(`✓ Payment verified! Official confirmation email dispatched to ${res.emailDispatched?.to} for team "${res.team?.name}" (UTR: ${res.team?.payment?.utr}).`)
      } else {
        setNotice(`Payment marked as rejected for team "${res.team?.name}".`)
      }
      reloadState()
      setTimeout(() => setNotice(''), 4500)
    } catch (err) {
      setNotice('Error verifying payment: ' + err.message)
    } finally {
      setVerifyingTeamId(null)
    }
  }

  // Payment Verification Double-Confirmation Handlers
  const handleInitiateVerifyPayment = (candidate) => {
    setDoubleConfirmTeam(candidate)
    setDoubleConfirmChecked(false)
  }

  const handleExecuteDoubleVerifyPayment = async () => {
    if (!doubleConfirmTeam) return
    const teamId = doubleConfirmTeam.teamId
    setDoubleConfirmTeam(null)
    await handleVerifyPayment(teamId, true, 'UTR matched and authorized by Admin')
  }

  // Revert Payment Verification Handlers
  const handleInitiateRevertPayment = (candidate) => {
    setRevertConfirmTeam(candidate)
  }

  const handleExecuteRevertPayment = async () => {
    if (!revertConfirmTeam) return
    const teamId = revertConfirmTeam.teamId
    setRevertConfirmTeam(null)
    setVerifyingTeamId(teamId)
    try {
      await revertTeamPaymentApi(teamId, ADMIN_VAULT_KEY)
      setNotice(`✓ Payment status reverted to Pending Bank Match for squad ID: ${teamId}.`)
      reloadState()
      setTimeout(() => setNotice(''), 4500)
    } catch (err) {
      setNotice('Error reverting payment: ' + err.message)
    } finally {
      setVerifyingTeamId(null)
    }
  }

  // Password Reset Handlers
  const handleInitiatePasswordReset = (candidate) => {
    setPwdResetCandidate(candidate)
    setNewPasswordVal('cf5_' + Math.random().toString(36).slice(2, 7))
  }

  const handleExecutePasswordReset = async (e) => {
    e?.preventDefault()
    if (!pwdResetCandidate || !newPasswordVal) return
    setPwdResetLoading(true)
    try {
      await resetUserPasswordApi(pwdResetCandidate.email, newPasswordVal, ADMIN_VAULT_KEY)
      setNotice(`✓ Password reset for ${pwdResetCandidate.email}! New passkey: ${newPasswordVal}`)
      setPwdResetCandidate(null)
      setTimeout(() => setNotice(''), 7000)
    } catch (err) {
      setNotice('Error updating password: ' + err.message)
    } finally {
      setPwdResetLoading(false)
    }
  }

  // Early Exit & Removal Handlers
  const handleInitiateEarlyExit = (candidate) => {
    setEarlyExitCandidate(candidate)
    setEarlyExitOption('mark')
  }

  const handleExecuteEarlyExit = async () => {
    if (!earlyExitCandidate) return
    const candidate = earlyExitCandidate
    setEarlyExitCandidate(null)
    try {
      await removeAttendeeApi(
        candidate.teamId,
        candidate.email,
        earlyExitOption === 'mark',
        ADMIN_VAULT_KEY
      )
      setNotice(`✓ Updated roster: ${candidate.candidateName} ${earlyExitOption === 'mark' ? 'marked as Early Exit' : 'removed from squad'}.`)
      reloadState()
      setTimeout(() => setNotice(''), 4500)
    } catch (err) {
      setNotice('Error removing candidate: ' + err.message)
    }
  }

  const handleReinstateAttendee = async (candidate) => {
    try {
      await reinstateAttendeeApi(candidate.teamId, candidate.email, ADMIN_VAULT_KEY)
      setNotice(`✓ Reinstated ${candidate.candidateName} back to active squad attendance.`)
      reloadState()
      setTimeout(() => setNotice(''), 4500)
    } catch (err) {
      setNotice('Error reinstating candidate: ' + err.message)
    }
  }

  // Problem Statements Editor Handlers
  const handleSaveProblemStatements = async () => {
    try {
      await updateProblemStatementsApi(problemTracks, ADMIN_VAULT_KEY)
      setNotice('✓ Official problem statements saved and published live to all participant cockpits!')
      setIsTracksDirty(false)
      reloadState()
      setTimeout(() => setNotice(''), 4500)
    } catch (err) {
      setNotice('Error saving problem statements: ' + err.message)
    }
  }

  const handleAddProblemTrack = () => {
    setIsTracksDirty(true)
    setTrackModalData({
      id: 'track_' + Date.now().toString(36),
      title: '',
      icon: '💡',
      tagline: '',
      brief: '',
      problemStatementsText: 'AI-Based early warning and landslide Risk Monitoring System in NER\nAI-Based Smart Logistics and Accessibility Intelligence Platform for North Eastern Region (NER)\nSolar-Powered Smart Mini Cold Storage System for Fresh Vegetables in NER',
      isNew: true,
    })
  }

  const handleEditProblemTrack = (track) => {
    setIsTracksDirty(true)
    const list = Array.isArray(track.problemStatements) && track.problemStatements.length > 0
      ? track.problemStatements
      : (Array.isArray(track.deliverables) ? track.deliverables : [])
    setTrackModalData({
      ...track,
      problemStatementsText: list.join('\n'),
      isNew: false,
    })
  }

  const handleSaveTrackModal = async (e) => {
    e?.preventDefault()
    if (!trackModalData) return
    if (!trackModalData.title.trim()) {
      alert('Track title is required.')
      return
    }

    const raw = trackModalData.problemStatementsText !== undefined
      ? trackModalData.problemStatementsText
      : (trackModalData.problemStatements
          ? (Array.isArray(trackModalData.problemStatements) ? trackModalData.problemStatements.join('\n') : trackModalData.problemStatements)
          : (Array.isArray(trackModalData.deliverables) ? trackModalData.deliverables.join('\n') : (trackModalData.deliverables || '')))

    const statements = typeof raw === 'string'
      ? (raw.includes('\n')
          ? raw.split('\n').map((s) => s.trim()).filter(Boolean)
          : raw.split(',').map((s) => s.trim()).filter(Boolean))
      : (Array.isArray(raw) ? raw : [])

    const finalStatements = statements.length > 0
      ? statements
      : [
          'AI-Based early warning and landslide Risk Monitoring System in NER',
          'AI-Based Smart Logistics and Accessibility Intelligence Platform for North Eastern Region (NER)',
          'Solar-Powered Smart Mini Cold Storage System for Fresh Vegetables in North Eastern Region (NER)'
        ]

    const formatted = {
      id: trackModalData.id || ('track_' + Date.now().toString(36)),
      title: trackModalData.title.trim(),
      icon: trackModalData.icon.trim() || '💡',
      tagline: trackModalData.tagline.trim(),
      brief: trackModalData.brief.trim(),
      problemStatements: finalStatements,
      deliverables: finalStatements,
    }

    let updatedList
    if (trackModalData.isNew) {
      updatedList = [formatted, ...problemTracks]
    } else {
      updatedList = problemTracks.map((t) => (t.id === formatted.id ? formatted : t))
    }

    setProblemTracks(updatedList)
    setTrackModalData(null)
    setIsTracksDirty(false)

    try {
      await updateProblemStatementsApi(updatedList, ADMIN_VAULT_KEY)
      setNotice(`✓ Track "${formatted.title}" saved and published live to participant vault!`)
      reloadState()
      setTimeout(() => setNotice(''), 4500)
    } catch (err) {
      setNotice('Error saving track: ' + err.message)
    }
  }

  const handleDeleteProblemTrack = async (trackId) => {
    if (problemTracks.length <= 1) {
      alert('At least one track must be maintained.')
      return
    }
    if (confirm('Delete this problem track? Teams assigned to it will need to re-select.')) {
      const updated = problemTracks.filter((t) => t.id !== trackId)
      setProblemTracks(updated)
      if (editingTrack?.id === trackId) setEditingTrack(null)
      try {
        await updateProblemStatementsApi(updated, ADMIN_VAULT_KEY)
        setNotice('✓ Problem track removed and vault updated.')
        reloadState()
        setTimeout(() => setNotice(''), 3500)
      } catch (err) {
        setNotice('Error deleting track: ' + err.message)
      }
    }
  }

  const handleExportCSV = () => {
    if (!candidatesLedger.length) {
      alert('No registration records available to export.')
      return
    }

    const headers = [
      'Team Name',
      'College Name',
      'Candidate Name',
      'Role',
      'Email',
      'Contact Number',
      'College ID / Roll Number',
      'Course',
      'Academic Year',
      'Gender',
      'Member Invite Status',
      'Transaction ID (UTR)',
      'Payment Status',
      'Amount (INR)',
      'Registered At',
      'Verified At',
    ]

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }

    const rows = candidatesLedger.map((c) => [
      escapeCsv(c.teamName),
      escapeCsv(c.collegeName),
      escapeCsv(c.candidateName),
      escapeCsv(c.role),
      escapeCsv(c.email),
      escapeCsv(c.phone),
      escapeCsv(c.rollNumber),
      escapeCsv(c.course || 'CSE'),
      escapeCsv(c.year || '1st'),
      escapeCsv(c.gender || 'male'),
      escapeCsv(
        c.isConfirmed || c.inviteStatus === 'accepted' || c.status === 'accepted' || c.role === 'leader'
          ? 'Confirmed & Joined'
          : 'Invite Pending'
      ),
      escapeCsv(c.utr),
      escapeCsv(c.paymentStatus),
      escapeCsv(c.amount),
      escapeCsv(c.submittedAt),
      escapeCsv(c.verifiedAt || 'Pending'),
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `codefiesta_5.0_candidates_spreadsheet_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const filteredCandidates = useMemo(() => {
    return candidatesLedger.filter((c) => {
      const q = regSearch.trim().toLowerCase()
      const matchSearch =
        !q ||
        (c.candidateName && c.candidateName.toLowerCase().includes(q)) ||
        (c.teamName && c.teamName.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.collegeName && c.collegeName.toLowerCase().includes(q)) ||
        (c.utr && c.utr.toLowerCase().includes(q))

      const isMemberConfirmed =
        c.isConfirmed ||
        c.inviteStatus === 'accepted' ||
        c.inviteStatus === 'confirmed' ||
        c.status === 'accepted' ||
        c.status === 'confirmed' ||
        c.role === 'leader'

      let matchFilter = true
      if (regFilter === 'verified') matchFilter = c.paymentStatus === 'verified'
      if (regFilter === 'pending') matchFilter = c.paymentStatus === 'submitted'
      if (regFilter === 'unpaid') matchFilter = c.paymentStatus === 'not_submitted'
      if (regFilter === 'confirmed') matchFilter = isMemberConfirmed
      if (regFilter === 'pending_invite') matchFilter = !isMemberConfirmed

      return matchSearch && matchFilter
    })
  }, [candidatesLedger, regSearch, regFilter])

  // Passkey Lock Screen
  if (!authorized) {
    return (
      <div className="min-h-dvh w-full bg-[#05070c] text-slate-200 font-mono flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0a0d16] border border-red-500/40 rounded-xl p-6 sm:p-8 shadow-[0_0_40px_rgba(239,68,68,0.15)] relative">
          <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-800">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="font-arcade text-xs text-red-400 tracking-wider">
              STEALTH COMMAND VAULT // ACCESS RESTRICTED
            </span>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1.5">
                Master Security Passkey
              </label>
              <input
                type="password"
                placeholder="Enter master passkey..."
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                className="w-full rounded bg-[#0f1320] border border-slate-700 px-3.5 py-3 text-xs text-white outline-none focus:border-red-500 font-mono"
                required
              />
            </div>

            {authError && <p className="text-xs text-red-400 font-mono">{authError}</p>}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-500 active:scale-95 text-white font-arcade text-[10px] py-3.5 rounded tracking-widest uppercase transition shadow-lg"
            >
              AUTHENTICATE COMMAND &gt;&gt;
            </button>
          </form>

          <p className="mt-4 text-center text-[9px] text-slate-600 font-mono">
            Protected endpoint · Authorized Codefiesta 5.0 personnel only.
          </p>
        </div>
      </div>
    )
  }

  const released = hackState?.problemStatementsReleased ?? false
  const announcements = hackState?.announcements || []
  const mentors = hackState?.mentors || []
  const evaluations = hackState?.evaluations || []

  return (
    <div className="min-h-dvh w-full bg-[#070910] text-slate-200 font-mono">
      {/* Header Bar */}
      <header className="h-16 border-b border-slate-800 bg-[#0a0d17] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-red-500/20 border border-red-500 text-red-400 font-arcade text-xs flex items-center justify-center font-bold">
            HQ
          </div>
          <div>
            <div className="font-arcade text-xs text-white tracking-wider flex items-center gap-2">
              CODEFIESTA 5.0 <span className="text-red-400 text-[10px]">OPS VAULT</span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono">
              On-Ground Hackathon Command Desk
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-[10px] font-arcade text-slate-400 hover:text-white px-2.5 py-1.5 rounded border border-slate-800"
          >
            ← Participant View
          </Link>
          <button
            type="button"
            onClick={() => setAuthorized(false)}
            className="text-[10px] font-arcade text-red-400 hover:underline"
          >
            Lock Desk
          </button>
        </div>
      </header>

      {/* Main Command Room */}
      <main className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
        {notice && (
          <div className="p-3.5 rounded bg-tactical/10 border border-tactical text-tactical text-xs font-mono">
            {notice}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {[
            { id: 'registrations', label: '1. Master Registrations', icon: '📊' },
            { id: 'verified_attendees', label: '2. Confirmed Attendees & Early Exit', icon: '✅' },
            { id: 'problems', label: '3. Problem Statements & Editor', icon: '🎯' },
            { id: 'eval_rounds', label: '4. Assessment Rounds (R1 & R2)', icon: '⚖️' },
            { id: 'tables', label: '5. Table Allocations', icon: '📍' },
            { id: 'gate', label: '6. Entry Gate & Coordinators', icon: '🚪' },
            { id: 'broadcast', label: '7. Live Announcements', icon: '📢' },
            { id: 'mentors', label: '8. Mentor Provisioning', icon: '👥' },
            { id: 'scores', label: '9. Live Leaderboard', icon: '🏆' },
            { id: 'sysreset', label: '10. System Reset', icon: '🗑️' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded text-xs font-arcade transition flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-tactical text-black font-bold'
                  : 'bg-[#0f121d] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: Master Registrations Ledger & UTR Matching Spreadsheet */}
        {activeTab === 'registrations' && (
          <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-6 space-y-6">
            {/* Header & Export Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  <h2 className="font-arcade text-sm text-white uppercase tracking-wider">
                    MASTER REGISTRATION SPREADSHEET &amp; UTR PAYMENT VERIFICATION
                  </h2>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Live spreadsheet of all candidate registrations. Match incoming ₹800 UPI payments against bank statements, approve UTRs, and dispatch official confirmation emails.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleManualSync}
                  className="px-3.5 py-2.5 rounded bg-[#131728] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white font-arcade text-[10px] uppercase transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-500/10"
                  title="Force re-sync and load newest registrations from live shared store"
                >
                  <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
                  <span>{isSyncing ? 'SYNCING...' : 'SYNC DATA'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-[10px] font-bold uppercase tracking-wider transition shadow-lg flex items-center gap-2"
                >
                  <span>📥</span>
                  <span>EXPORT SPREADSHEET (CSV / EXCEL)</span>
                </button>
              </div>
            </div>

            {/* Stat Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="p-4 rounded-lg bg-[#0e1220] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Candidates</span>
                <span className="font-arcade text-2xl text-white mt-1 block">
                  {candidatesLedger.length}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">Enrolled across all teams</span>
              </div>
              <div className="p-4 rounded-lg bg-[#0e1220] border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]">
                <span className="text-[10px] font-mono text-emerald-400 uppercase block">Confirmed &amp; Joined</span>
                <span className="font-arcade text-2xl text-emerald-400 mt-1 block">
                  {
                    candidatesLedger.filter(
                      (c) =>
                        c.isConfirmed ||
                        c.inviteStatus === 'accepted' ||
                        c.status === 'accepted' ||
                        c.role === 'leader'
                    ).length
                  }
                </span>
                <span className="text-[9px] text-emerald-500/70 font-mono">Accepted &amp; on-deck</span>
              </div>
              <div className="p-4 rounded-lg bg-[#0e1220] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Squads</span>
                <span className="font-arcade text-2xl text-cyan-400 mt-1 block">
                  {new Set(candidatesLedger.map((c) => c.teamId)).size}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">Registered teams</span>
              </div>
              <div className="p-4 rounded-lg bg-[#0e1220] border border-emerald-500/30">
                <span className="text-[10px] font-mono text-emerald-400 uppercase block">Verified &amp; Paid</span>
                <span className="font-arcade text-2xl text-emerald-400 mt-1 block">
                  {new Set(candidatesLedger.filter((c) => c.paymentStatus === 'verified').map((c) => c.teamId)).size}
                </span>
                <span className="text-[9px] text-emerald-500/70 font-mono">Passes issued &amp; emailed</span>
              </div>
              <div className="p-4 rounded-lg bg-[#14121a] border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                <span className="text-[10px] font-mono text-amber-400 uppercase block">Pending Bank Match</span>
                <span className="font-arcade text-2xl text-amber-400 mt-1 block">
                  {new Set(candidatesLedger.filter((c) => c.paymentStatus === 'submitted').map((c) => c.teamId)).size}
                </span>
                <span className="text-[9px] text-amber-500/70 font-mono">Awaiting UTR match</span>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0e1220] p-3 rounded-lg border border-slate-800">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search Candidate, Team, Email, College, or 12-digit UTR..."
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-[#090b14] border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-tactical font-mono"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-arcade text-slate-400">Filter:</span>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'confirmed', label: '✓ Confirmed & Joined' },
                  { id: 'pending_invite', label: '⏳ Pending Invites' },
                  { id: 'pending', label: 'Pending UTR' },
                  { id: 'verified', label: 'Verified' },
                  { id: 'unpaid', label: 'Unpaid' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRegFilter(f.id)}
                    className={`px-2.5 py-1.5 rounded text-[10px] font-arcade uppercase transition ${
                      regFilter === f.id
                        ? 'bg-tactical text-black font-bold'
                        : 'bg-[#151928] text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Master Candidates Spreadsheet Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#080b14]">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0d1120] text-[10px] font-arcade text-slate-300 uppercase tracking-wider">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Team Name</th>
                    <th className="py-3 px-4">College Name</th>
                    <th className="py-3 px-4">Candidate Name</th>
                    <th className="py-3 px-4">Course / Year</th>
                    <th className="py-3 px-4">Emails</th>
                    <th className="py-3 px-4">Contact Number</th>
                    <th className="py-3 px-4">Transaction ID (UTR)</th>
                    <th className="py-3 px-4">Assigned Table</th>
                    <th className="py-3 px-4">Payment Status &amp; Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 font-mono text-xs">
                        No registration records found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((c, idx) => {
                      const isVerified = c.paymentStatus === 'verified'
                      const isSubmitted = c.paymentStatus === 'submitted'
                      const isLeader = c.role === 'leader'

                      return (
                        <tr
                          key={`${c.teamId}-${c.email}-${idx}`}
                          className={`hover:bg-[#111628] transition ${
                            isSubmitted ? 'bg-amber-500/[0.03]' : ''
                          }`}
                        >
                          {/* Row Index */}
                          <td className="py-3 px-4 text-slate-500 text-[10px]">
                            {idx + 1}
                          </td>

                          {/* 1. Team Name */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-arcade text-xs text-white block">
                              {c.teamName}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] text-slate-500 font-mono">
                                ID: {c.teamId}
                              </span>
                              {c.teamConfirmedCount !== undefined && (
                                <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold">
                                  Roster: {c.teamConfirmedCount}/{c.teamTotalCount || 4}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. College Name */}
                          <td className="py-3 px-4 max-w-[200px] truncate text-slate-300" title={c.collegeName}>
                            {c.collegeName || '—'}
                          </td>

                          {/* 3. Candidate Name */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-medium">
                                {c.candidateName}
                              </span>
                              {isLeader ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[8px] font-arcade">
                                  LEADER
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[8px] font-arcade">
                                  MEMBER
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setPreviewCandidateData(c)}
                                className="px-1.5 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 font-mono text-[8px] flex items-center gap-0.5 transition ml-1"
                                title="Preview how this candidate sees their pass and cockpit"
                              >
                                <span>👁️</span>
                                <span>Preview</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInitiatePasswordReset(c)}
                                className="px-1.5 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-300 font-mono text-[8px] flex items-center gap-0.5 transition"
                                title="Change or Reset password for this student"
                              >
                                <span>🔑</span>
                                <span>Reset Pwd</span>
                              </button>
                            </div>
                            <div className="text-[9px] text-slate-500 font-mono mt-1 flex flex-wrap items-center gap-2">
                              {c.rollNumber && <span>ID: {c.rollNumber}</span>}
                              {!isLeader ? (
                                (() => {
                                  const isMemberJoined =
                                    c.isConfirmed ||
                                    c.inviteStatus === 'accepted' ||
                                    c.inviteStatus === 'confirmed' ||
                                    c.status === 'accepted' ||
                                    c.status === 'confirmed'

                                  return (
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border ${
                                        isMemberJoined
                                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                          : 'bg-amber-500/15 text-amber-400 border-amber-500/40 animate-pulse'
                                      }`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          isMemberJoined ? 'bg-emerald-400' : 'bg-amber-400'
                                        }`}
                                      />
                                      <span>
                                        {isMemberJoined ? '✓ CONFIRMED & JOINED' : '⏳ INVITE PENDING'}
                                      </span>
                                    </span>
                                  )
                                })()
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tactical/15 text-tactical border border-tactical/30 font-mono text-[9px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-tactical" />
                                  <span>✓ SQUAD LEADER (JOINED)</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. Course / Year */}
                          <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                            <div>{c.course || 'CSE'} ({c.year || '1st'} Yr)</div>
                            <div className="text-[9px] text-slate-500 capitalize">{c.gender || 'male'}</div>
                          </td>

                          {/* 5. Emails */}
                          <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                            <a
                              href={`mailto:${c.email}`}
                              className="text-cyan-400 hover:underline font-mono text-[11px]"
                            >
                              {c.email}
                            </a>
                          </td>

                          {/* 5. Contact Number */}
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300">
                            {c.phone || '—'}
                          </td>

                          {/* 6. Transaction ID (UTR) */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {c.utr && c.utr !== 'NOT_SUBMITTED' ? (
                              <div className="inline-flex items-center gap-1.5">
                                <span className={`px-2 py-1 rounded font-mono text-xs font-bold ${
                                  isVerified
                                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500 font-bold animate-pulse'
                                }`}>
                                  {c.utr}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(c.utr)
                                    setNotice(`✓ Copied UTR ${c.utr} to clipboard`)
                                    setTimeout(() => setNotice(''), 2000)
                                  }}
                                  title="Copy UTR to match with bank account"
                                  className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700"
                                >
                                  📋
                                </button>
                              </div>
                            ) : (
                              <span className="text-red-400 text-[10px] font-arcade">
                                NOT SUBMITTED
                              </span>
                            )}
                            <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                              Fee: ₹{c.amount || 800}
                            </div>
                          </td>

                          {/* Workstation Table Allocation */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {editingTableTeamId === c.teamId ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={tableEdits[c.teamId] !== undefined ? tableEdits[c.teamId] : ((hackState?.tableAssignments || {})[c.teamId] || '')}
                                  onChange={(e) => setTableEdits({ ...tableEdits, [c.teamId]: e.target.value })}
                                  placeholder="e.g. T-01"
                                  className="w-20 rounded bg-[#161a28] border border-tactical px-2 py-1 text-[10px] text-tactical font-mono uppercase text-center font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await handleAssignTable(c.teamId, tableEdits[c.teamId] || '')
                                    setEditingTableTeamId(null)
                                  }}
                                  className="text-xs text-emerald-400 hover:text-white px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTableTeamId(null)}
                                  className="text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {(hackState?.tableAssignments || {})[c.teamId] ? (
                                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold">
                                    {(hackState?.tableAssignments || {})[c.teamId]}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px] font-mono italic">
                                    Unassigned
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTableTeamId(c.teamId)
                                    setTableEdits({ ...tableEdits, [c.teamId]: (hackState?.tableAssignments || {})[c.teamId] || '' })
                                  }}
                                  className="text-[9px] font-mono text-tactical hover:underline uppercase"
                                >
                                  {(hackState?.tableAssignments || {})[c.teamId] ? 'Edit' : '+ Assign'}
                                </button>
                              </div>
                            )}
                          </td>

                          {/* 7. Payment Status & Verification Actions */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isVerified ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500 text-emerald-300 font-arcade text-[9px] flex items-center gap-1">
                                    <span>✓</span>
                                    <span>UTR MATCHED &amp; VERIFIED</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleInitiateRevertPayment(c)}
                                    className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-arcade text-[8px] uppercase transition flex items-center gap-1"
                                    title="Undo verification if approved by mistake"
                                  >
                                    <span>↩️</span>
                                    <span>Revert to Pending</span>
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 text-[9px] text-emerald-400/80 font-mono">
                                  <span>✉️ Confirmation Email Dispatched</span>
                                  <button
                                    type="button"
                                    onClick={() => handleVerifyPayment(c.teamId, true, 'Admin re-dispatched confirmation email')}
                                    disabled={verifyingTeamId === c.teamId}
                                    className="text-slate-400 hover:text-white underline text-[9px]"
                                  >
                                    Re-send
                                  </button>
                                </div>
                              </div>
                            ) : isSubmitted ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleInitiateVerifyPayment(c)}
                                  disabled={verifyingTeamId === c.teamId}
                                  className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-arcade text-[9px] font-bold uppercase tracking-wider transition shadow flex items-center gap-1"
                                >
                                  {verifyingTeamId === c.teamId ? (
                                    <span>VERIFYING...</span>
                                  ) : (
                                    <>
                                      <span>✓</span>
                                      <span>MATCH UTR &amp; SEND MAIL</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleVerifyPayment(c.teamId, false, 'Invalid UTR rejected by admin')}
                                  disabled={verifyingTeamId === c.teamId}
                                  className="px-2 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-400 font-arcade text-[9px] uppercase transition"
                                >
                                  ✕ Reject
                                </button>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-400 font-arcade text-[9px]">
                                ✕ UNPAID
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded bg-[#090c16] border border-slate-800 text-[10px] text-slate-400 font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                Showing <strong className="text-white">{filteredCandidates.length}</strong> of <strong className="text-white">{candidatesLedger.length}</strong> total candidate registration records.
              </div>
              <div className="text-[9px] text-slate-500">
                Clicking &quot;MATCH UTR &amp; SEND MAIL&quot; verifies registration and transmits official confirmation email to the Team Leader.
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Confirmed Attendees & Early Exit Desk */}
        {activeTab === 'verified_attendees' && (() => {
          const verifiedCandidates = candidatesLedger.filter((c) => c.paymentStatus === 'verified')
          const activeCandidates = verifiedCandidates.filter((c) => !c.earlyExit)
          const earlyExitCandidates = verifiedCandidates.filter((c) => c.earlyExit)

          const q = verifiedAttendeesSearch.trim().toLowerCase()
          const filtered = verifiedCandidates.filter((c) => {
            const matchSearch =
              !q ||
              (c.candidateName && c.candidateName.toLowerCase().includes(q)) ||
              (c.teamName && c.teamName.toLowerCase().includes(q)) ||
              (c.email && c.email.toLowerCase().includes(q)) ||
              (c.collegeName && c.collegeName.toLowerCase().includes(q)) ||
              (c.tableNumber && c.tableNumber.toLowerCase().includes(q))

            let matchFilter = true
            if (verifiedAttendeesFilter === 'active') matchFilter = !c.earlyExit
            if (verifiedAttendeesFilter === 'early_exit') matchFilter = !!c.earlyExit

            return matchSearch && matchFilter
          })

          return (
            <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="font-arcade text-sm text-white uppercase flex items-center gap-2">
                    <span>✅</span> CONFIRMED ATTENDEES &amp; EARLY EXIT DESK
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Live roster of paid, verified participants. Manage on-ground early exits or drop candidates without affecting squad payment.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleManualSync}
                  className="px-3.5 py-2.5 rounded bg-[#131728] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white font-arcade text-[10px] uppercase transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-500/10 self-start sm:self-auto"
                  title="Force re-sync and load newest registrations from live shared store"
                >
                  <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
                  <span>{isSyncing ? 'SYNCING...' : 'SYNC DATA'}</span>
                </button>
              </div>

              {/* Stat Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-[#0e1220] border border-emerald-500/30">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase block">Verified Students</span>
                  <span className="font-arcade text-2xl text-emerald-400 mt-1 block">
                    {verifiedCandidates.length}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">100% payment matched</span>
                </div>
                <div className="p-4 rounded-lg bg-[#0e1220] border border-cyan-500/30">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase block">Active On-Ground</span>
                  <span className="font-arcade text-2xl text-cyan-300 mt-1 block">
                    {activeCandidates.length}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Currently participating</span>
                </div>
                <div className="p-4 rounded-lg bg-[#14121a] border border-amber-500/40">
                  <span className="text-[10px] font-mono text-amber-400 uppercase block">Early Exited / Dropped</span>
                  <span className="font-arcade text-2xl text-amber-400 mt-1 block">
                    {earlyExitCandidates.length}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Left event early</span>
                </div>
                <div className="p-4 rounded-lg bg-[#0e1220] border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Verified Squads</span>
                  <span className="font-arcade text-2xl text-white mt-1 block">
                    {new Set(verifiedCandidates.map((c) => c.teamId)).size}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Teams on leaderboard</span>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0e1220] p-3 rounded-lg border border-slate-800">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                  <input
                    type="text"
                    placeholder="Search Verified Student, Squad, Email, College, or Table..."
                    value={verifiedAttendeesSearch}
                    onChange={(e) => setVerifiedAttendeesSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-[#090b14] border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-tactical font-mono"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-arcade text-slate-400">Status:</span>
                  {[
                    { id: 'all', label: `All (${verifiedCandidates.length})` },
                    { id: 'active', label: `Active (${activeCandidates.length})` },
                    { id: 'early_exit', label: `Early Exited (${earlyExitCandidates.length})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setVerifiedAttendeesFilter(f.id)}
                      className={`px-2.5 py-1.5 rounded text-[10px] font-arcade uppercase transition ${
                        verifiedAttendeesFilter === f.id
                          ? 'bg-tactical text-black font-bold'
                          : 'bg-[#151928] text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#080b14]">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#0d1120] text-[10px] font-arcade text-slate-300 uppercase tracking-wider">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Student Name &amp; Role</th>
                      <th className="py-3 px-4">Squad &amp; Table</th>
                      <th className="py-3 px-4">College &amp; Course</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Attendance Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 font-mono text-xs">
                          No verified attendees found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((c, idx) => {
                        const isLeader = c.role === 'leader'
                        const isEarly = !!c.earlyExit

                        return (
                          <tr
                            key={`${c.teamId}-${c.email}-${idx}`}
                            className={`hover:bg-[#111628] transition ${
                              isEarly ? 'bg-amber-950/20 text-slate-400' : ''
                            }`}
                          >
                            <td className="py-3 px-4 text-slate-500 text-[10px]">{idx + 1}</td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-medium ${isEarly ? 'line-through text-slate-400' : 'text-white'}`}>
                                  {c.candidateName}
                                </span>
                                {isLeader ? (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[8px] font-arcade">
                                    LEADER
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[8px] font-arcade">
                                    MEMBER
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                                {c.rollNumber && <span>ID: {c.rollNumber}</span>}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-arcade text-xs text-white block">
                                {c.teamName}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {(hackState?.tableAssignments || {})[c.teamId] || c.tableNumber ? (
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[9px] font-mono font-bold">
                                    Table {(hackState?.tableAssignments || {})[c.teamId] || c.tableNumber}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-500 font-mono italic">
                                    No table assigned
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 max-w-[180px] truncate text-slate-300">
                              <div className="truncate" title={c.collegeName}>{c.collegeName || '—'}</div>
                              <div className="text-[9px] text-slate-500">{c.course || 'CSE'} ({c.year || '1st'} Yr)</div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div><a href={`mailto:${c.email}`} className="text-cyan-400 hover:underline font-mono text-[11px]">{c.email}</a></div>
                              <div className="text-[10px] text-slate-400 font-mono">{c.phone || '—'}</div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isEarly ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/40 text-[9px] font-mono font-bold">
                                  <span>⚠️</span>
                                  <span>EARLY EXIT / DROPPED</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>✓ ACTIVE ATTENDEE</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewCandidateData(c)}
                                  className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 font-mono text-[9px] flex items-center gap-1 transition"
                                  title="Preview Participant Digital Pass & Cockpit"
                                >
                                  <span>👁️</span>
                                  <span>Pass</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInitiatePasswordReset(c)}
                                  className="px-2 py-1 rounded bg-purple-950 hover:bg-purple-900 border border-purple-700/60 text-purple-300 font-mono text-[9px] flex items-center gap-1 transition"
                                  title="Change or reset password for this student"
                                >
                                  <span>🔑</span>
                                  <span>Pwd</span>
                                </button>
                                {!isEarly ? (
                                  <button
                                    type="button"
                                    onClick={() => handleInitiateEarlyExit(c)}
                                    className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-mono text-[9px] font-bold flex items-center gap-1 transition"
                                    title="Mark this student as Early Exit / Dropped"
                                  >
                                    <span>🚪</span>
                                    <span>Early Exit</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleReinstateAttendee(c)}
                                    className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-mono text-[9px] font-bold flex items-center gap-1 transition"
                                    title="Reinstate student back to active attendance"
                                  >
                                    <span>↩️</span>
                                    <span>Reinstate</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

        {/* TAB 3: Problem Statements Live Editor & Participant Simulator */}
        {activeTab === 'problems' && (
          <div className="space-y-6">
            {/* Top Control Bar */}
            <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-arcade text-sm text-white uppercase flex items-center gap-2">
                    <span>🎯</span> PROBLEM STATEMENTS &amp; LIVE TRACK EDITOR
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Edit challenge briefs, add tracks, and preview exactly what participants see in real time.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleAddProblemTrack}
                    className="px-3 py-2 rounded bg-tactical hover:bg-[#e6a600] text-black font-arcade text-[10px] uppercase font-bold flex items-center gap-1.5 transition"
                  >
                    <span>+</span>
                    <span>Add New Track</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProblemStatements}
                    className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-[10px] uppercase font-bold flex items-center gap-1.5 transition shadow-lg"
                  >
                    <span>💾</span>
                    <span>Save &amp; Publish Changes</span>
                  </button>
                </div>
              </div>

              {/* Release Gate Controls */}
              <div className="p-4 rounded-lg bg-[#111422] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-arcade text-slate-400 uppercase block mb-1">
                    Participant Visibility Status
                  </span>
                  {released ? (
                    <div className="text-sm font-arcade text-sync flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sync animate-pulse" />
                      LIVE // UNLOCKED ON PARTICIPANT DASHBOARDS
                    </div>
                  ) : (
                    <div className="text-sm font-arcade text-amber-400 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      CLASSIFIED // LOCKED &amp; HIDDEN IN VAULT
                    </div>
                  )}
                </div>

                {released ? (
                  <button
                    type="button"
                    onClick={() => handleToggleProblems(false)}
                    className="px-4 py-2.5 rounded bg-amber-500/20 border border-amber-500 text-amber-300 font-arcade text-[10px] uppercase hover:bg-amber-500/30 transition"
                  >
                    🔒 LOCK TRACKS VAULT
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleProblems(true)}
                    className="px-5 py-2.5 rounded bg-sync hover:bg-[#18ba9b] text-black font-arcade text-[10px] uppercase font-bold tracking-wider transition shadow-lg"
                  >
                    🚀 REVEAL TRACKS TO SQUADS &gt;&gt;
                  </button>
                )}
              </div>
            </div>

            {/* Track Editor Grid */}
            <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-arcade text-xs text-white uppercase">
                  ACTIVE PROBLEM TRACKS ({problemTracks.length})
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  Click &quot;Edit&quot; to modify problem statements, titles and descriptions
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {problemTracks.map((track) => {
                  const isEditing = editingTrack?.id === track.id
                  return (
                    <div
                      key={track.id}
                      className={`p-5 rounded-xl border transition-all ${
                        isEditing
                          ? 'bg-[#121727] border-tactical shadow-[0_0_20px_rgba(255,184,0,0.1)]'
                          : 'bg-[#0e1220] border-slate-800'
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-3 font-mono">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                            <span className="text-[10px] font-arcade text-tactical uppercase">
                              EDITING TRACK: {track.id}
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setProblemTracks(
                                    problemTracks.map((t) => (t.id === editingTrack.id ? editingTrack : t))
                                  )
                                  setEditingTrack(null)
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-500 text-black text-[9px] font-arcade font-bold uppercase"
                              >
                                Done
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTrack(null)}
                                className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-[9px] font-arcade uppercase"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            <div className="col-span-1">
                              <label className="text-[9px] uppercase text-slate-400 block mb-1">Icon</label>
                              <input
                                type="text"
                                value={editingTrack.icon || '🎯'}
                                onChange={(e) => setEditingTrack({ ...editingTrack, icon: e.target.value })}
                                className="w-full text-center py-1.5 rounded bg-[#090b14] border border-slate-700 text-sm text-white font-mono"
                              />
                            </div>
                            <div className="col-span-3">
                              <label className="text-[9px] uppercase text-slate-400 block mb-1">Title</label>
                              <input
                                type="text"
                                value={editingTrack.title || ''}
                                onChange={(e) => setEditingTrack({ ...editingTrack, title: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded bg-[#090b14] border border-slate-700 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] uppercase text-slate-400 block mb-1">Tagline</label>
                            <input
                              type="text"
                              value={editingTrack.tagline || ''}
                              onChange={(e) => setEditingTrack({ ...editingTrack, tagline: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded bg-[#090b14] border border-slate-700 text-xs text-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] uppercase text-slate-400 block mb-1">Problem Statement Brief</label>
                            <textarea
                              rows={3}
                              value={editingTrack.brief || ''}
                              onChange={(e) => setEditingTrack({ ...editingTrack, brief: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded bg-[#090b14] border border-slate-700 text-xs text-slate-200 font-mono leading-relaxed"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] uppercase text-tactical block mb-1 font-bold">
                              Problem Statements (one per line or comma separated)
                            </label>
                            <textarea
                              rows={3}
                              value={
                                Array.isArray(editingTrack.problemStatements)
                                  ? editingTrack.problemStatements.join('\n')
                                  : (Array.isArray(editingTrack.deliverables) ? editingTrack.deliverables.join('\n') : (editingTrack.deliverables || ''))
                              }
                              onChange={(e) => {
                                const val = e.target.value
                                const list = val.includes('\n')
                                  ? val.split('\n').map((s) => s.trim()).filter(Boolean)
                                  : val.split(',').map((s) => s.trim()).filter(Boolean)
                                setEditingTrack({
                                  ...editingTrack,
                                  problemStatements: list,
                                  deliverables: list,
                                })
                              }}
                              className="w-full px-2.5 py-1.5 rounded bg-[#090b14] border border-slate-700 text-xs text-white font-mono leading-relaxed"
                              placeholder="e.g. AI-Based early warning and landslide Risk Monitoring System in NER"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col justify-between h-full space-y-3 font-mono">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-2xl">{track.icon}</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleEditProblemTrack(track)}
                                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-tactical text-[9px] font-arcade uppercase transition"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProblemTrack(track.id)}
                                  className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[9px] font-arcade uppercase transition"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            <h4 className="text-white font-bold text-sm font-sans">{track.title}</h4>
                            <p className="text-[11px] text-tactical font-mono mt-0.5">{track.tagline}</p>
                            <p className="text-xs text-slate-300 font-mono mt-2 leading-relaxed line-clamp-3">
                              {track.brief}
                            </p>
                          </div>

                          {((Array.isArray(track.problemStatements) && track.problemStatements.length > 0) || (Array.isArray(track.deliverables) && track.deliverables.length > 0)) && (
                            <div className="pt-2 border-t border-slate-800/80">
                              <span className="text-[9px] font-arcade uppercase text-tactical block mb-1">
                                Problem Statements ({((track.problemStatements || track.deliverables || []).length)}):
                              </span>
                              <ul className="text-[10px] text-slate-300 space-y-1 font-mono">
                                {(track.problemStatements || track.deliverables || []).map((ps, i) => (
                                  <li key={i} className="flex items-start gap-1.5 leading-snug">
                                    <span className="text-tactical shrink-0">▸</span>
                                    <span>{ps}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* LIVE PARTICIPANT PREVIEW (SIMULATOR) */}
            <div className="bg-[#0a0d17] border border-tactical/30 rounded-xl p-6 space-y-5 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                  <div>
                    <h3 className="font-arcade text-xs text-white uppercase tracking-wider flex items-center gap-2">
                      <span>👁️</span> LIVE PARTICIPANT VIEW SIMULATOR
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Exact replica of how registered squads experience problem statements in their dashboard.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-[#121626] p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTrackSimulatorMode('unlocked')}
                    className={`px-3 py-1.5 rounded text-[10px] font-arcade uppercase transition ${
                      trackSimulatorMode === 'unlocked'
                        ? 'bg-sync text-black font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🔓 Unlocked View
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackSimulatorMode('locked')}
                    className={`px-3 py-1.5 rounded text-[10px] font-arcade uppercase transition ${
                      trackSimulatorMode === 'locked'
                        ? 'bg-amber-500 text-black font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🔒 Locked Vault View
                  </button>
                </div>
              </div>

              {trackSimulatorMode === 'locked' ? (
                <div className="p-8 rounded-2xl bg-[#0e1324] border border-amber-500/30 text-amber-300 text-center space-y-3 font-mono">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-3xl mx-auto">
                    🔒
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    SECURITY CLEARANCE LEVEL 4 ENCRYPTION
                  </div>
                  <h4 className="text-xl font-bold font-sans text-white uppercase">
                    Problem Statements &amp; Track Themes Classified
                  </h4>
                  <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                    To guarantee fair competition across all registered squads, specific hackathon challenge statements are held under cryptographic director vault encryption. The Admin Ops Center will unveil tracks live on hackathon morning.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-sync/10 border border-sync/40 text-sync flex items-start gap-3">
                    <span className="text-2xl">🔓</span>
                    <div>
                      <div className="text-xs font-bold font-sans uppercase tracking-wider text-sync">
                        OFFICIAL PROBLEM STATEMENTS UNLOCKED &amp; LIVE
                      </div>
                      <p className="text-[11px] font-mono text-slate-300 mt-0.5">
                        Admin Ops Center has unlocked hackathon challenges. Squad leaders can review challenge briefs and select their track.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {problemTracks.map((track, i) => (
                      <div
                        key={track.id || i}
                        className="p-5 rounded-2xl bg-[#0e1220] border border-slate-800 shadow-lg space-y-3 font-mono flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-3xl">{track.icon}</span>
                            {i === 0 && (
                              <span className="px-2.5 py-1 rounded-full bg-tactical text-black font-mono text-[10px] uppercase font-bold shadow">
                                SAMPLE ACTIVE TRACK
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold font-sans text-white">{track.title}</h4>
                          <p className="text-xs text-tactical font-mono mt-0.5">{track.tagline}</p>
                          <p className="text-xs text-slate-300 font-mono mt-2 leading-relaxed">
                            {track.brief}
                          </p>
                        </div>

                        {((Array.isArray(track.problemStatements) && track.problemStatements.length > 0) || (Array.isArray(track.deliverables) && track.deliverables.length > 0)) && (
                          <div className="pt-3 border-t border-slate-800 space-y-1.5">
                            <span className="text-[10px] font-arcade text-tactical uppercase font-bold flex items-center gap-1.5">
                              <span>🎯</span> PROBLEM STATEMENTS:
                            </span>
                            <ul className="text-[11px] text-slate-200 space-y-1 font-mono list-disc list-inside">
                              {(track.problemStatements || track.deliverables || []).map((ps, di) => (
                                <li key={di} className="leading-snug">{ps}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Assessment Rounds Controller (Non-Time-Specific Manual Gate) */}
        {activeTab === 'eval_rounds' && (
          <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">⚖️</span>
                <h2 className="font-arcade text-sm text-white uppercase tracking-wider">
                  ASSESSMENT ROUNDS CONTROLLER (GROUND-DRIVEN MANUAL GATES)
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Open and lock evaluation rounds on-ground dynamically. Completely decoupled from hardcoded clocks to adapt to real event schedule delays or advancements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ROUND 1: First Assessment Round */}
              {(() => {
                const isR1Open = !!hackState?.evaluationRounds?.round1
                const r1Count = (hackState?.evaluations || []).filter(
                  (e) => e.round === 'round1' || !e.round
                ).length
                return (
                  <div className={`p-6 rounded-xl border flex flex-col justify-between space-y-5 transition ${
                    isR1Open
                      ? 'bg-[#0f1b1c] border-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                      : 'bg-[#10131e] border-slate-800'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                        <span className="font-arcade text-xs text-white uppercase">
                          FIRST ASSESSMENT ROUND (5:00 PM)
                        </span>
                        {isR1Open ? (
                          <span className="px-2.5 py-1 rounded bg-cyan-500/20 border border-cyan-500 text-cyan-300 font-arcade text-[9px] flex items-center gap-1.5 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            OPEN FOR MENTORS
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded bg-red-500/15 border border-red-500/40 text-red-400 font-arcade text-[9px] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            LOCKED (CLOSED)
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 font-mono leading-relaxed mb-4">
                        Architecture review, idea validation, code repo initialization, and tech stack evaluation at participant tables.
                      </p>

                      <div className="p-3 rounded bg-[#080a12] border border-slate-800 text-[10px] font-mono flex items-center justify-between">
                        <span className="text-slate-400">Teams Evaluated:</span>
                        <span className="font-arcade text-cyan-300">
                          {r1Count} / {teams.length || '—'} Teams Graded
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleRound('round1', true)}
                          className={`py-3 px-2 rounded text-[10px] font-arcade uppercase font-bold tracking-wider transition flex items-center justify-center gap-1.5 ${
                            isR1Open
                              ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] border-2 border-cyan-300'
                              : 'bg-[#141824] hover:bg-[#1b2234] text-slate-300 border border-slate-700'
                          }`}
                        >
                          <span>🟢</span>
                          <span>{isR1Open ? 'ACTIVE: OPEN' : 'OPEN ROUND 1'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleRound('round1', false)}
                          className={`py-3 px-2 rounded text-[10px] font-arcade uppercase font-bold tracking-wider transition flex items-center justify-center gap-1.5 ${
                            !isR1Open
                              ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] border-2 border-red-400'
                              : 'bg-[#141824] hover:bg-[#1b2234] text-slate-300 border border-slate-700'
                          }`}
                        >
                          <span>🔒</span>
                          <span>{!isR1Open ? 'ACTIVE: LOCKED' : 'LOCK ROUND 1'}</span>
                        </button>
                      </div>
                      <div className="text-center text-[9px] font-mono text-slate-500">
                        Current Status: <span className={isR1Open ? 'text-cyan-400 font-bold' : 'text-red-400 font-bold'}>{isR1Open ? 'UNLOCKED FOR MENTORS' : 'PERMANENTLY LOCKED'}</span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* ROUND 2: Second Assessment Round */}
              {(() => {
                const isR2Open = !!hackState?.evaluationRounds?.round2
                const r2Count = (hackState?.evaluations || []).filter(
                  (e) => e.round === 'round2'
                ).length
                return (
                  <div className={`p-6 rounded-xl border flex flex-col justify-between space-y-5 transition ${
                    isR2Open
                      ? 'bg-[#1b120f] border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                      : 'bg-[#10131e] border-slate-800'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                        <span className="font-arcade text-xs text-white uppercase">
                          SECOND ASSESSMENT ROUND (11:00 PM)
                        </span>
                        {isR2Open ? (
                          <span className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500 text-amber-300 font-arcade text-[9px] flex items-center gap-1.5 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            OPEN FOR MENTORS
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded bg-red-500/15 border border-red-500/40 text-red-400 font-arcade text-[9px] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            LOCKED (CLOSED)
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 font-mono leading-relaxed mb-4">
                        Midnight progress triage, API and smart contract integration, UX & prototype demo evaluation at assigned tables.
                      </p>

                      <div className="p-3 rounded bg-[#080a12] border border-slate-800 text-[10px] font-mono flex items-center justify-between">
                        <span className="text-slate-400">Teams Evaluated:</span>
                        <span className="font-arcade text-amber-300">
                          {r2Count} / {teams.length || '—'} Teams Graded
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleRound('round2', true)}
                          className={`py-3 px-2 rounded text-[10px] font-arcade uppercase font-bold tracking-wider transition flex items-center justify-center gap-1.5 ${
                            isR2Open
                              ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] border-2 border-amber-300'
                              : 'bg-[#141824] hover:bg-[#1b2234] text-slate-300 border border-slate-700'
                          }`}
                        >
                          <span>🟢</span>
                          <span>{isR2Open ? 'ACTIVE: OPEN' : 'OPEN ROUND 2'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleRound('round2', false)}
                          className={`py-3 px-2 rounded text-[10px] font-arcade uppercase font-bold tracking-wider transition flex items-center justify-center gap-1.5 ${
                            !isR2Open
                              ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] border-2 border-red-400'
                              : 'bg-[#141824] hover:bg-[#1b2234] text-slate-300 border border-slate-700'
                          }`}
                        >
                          <span>🔒</span>
                          <span>{!isR2Open ? 'ACTIVE: LOCKED' : 'LOCK ROUND 2'}</span>
                        </button>
                      </div>
                      <div className="text-center text-[9px] font-mono text-slate-500">
                        Current Status: <span className={isR2Open ? 'text-amber-400 font-bold' : 'text-red-400 font-bold'}>{isR2Open ? 'UNLOCKED FOR MENTORS' : 'PERMANENTLY LOCKED'}</span>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

                {/* TAB 2: Table Allocation Matrix */}
        {activeTab === 'tables' && (
          <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
              <div>
                <h2 className="font-arcade text-sm text-white uppercase mb-1">
                  PHYSICAL TABLE NUMBER ALLOCATIONS
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Assign on-ground workstation tables (e.g. Table T-01, Table A-14) at GIT Jaipur. Automatically syncs to participant passes and HUD.
                </p>
              </div>
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleManualSync}
                className="px-3.5 py-2.5 rounded bg-[#131728] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white font-arcade text-[10px] uppercase transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-500/10 self-start sm:self-auto"
                title="Force re-sync and load newest registrations from live shared store"
              >
                <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
                <span>{isSyncing ? 'SYNCING...' : 'SYNC DATA'}</span>
              </button>
            </div>

            <div className="space-y-3">
              {teams.length === 0 ? (
                <p className="text-xs text-slate-500">No registered teams yet.</p>
              ) : (
                teams.map((t) => {
                  const currentTable = (hackState?.tableAssignments || {})[t.id] || t.tableNumber || ''
                  const editVal = tableEdits[t.id] !== undefined ? tableEdits[t.id] : currentTable
                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-lg bg-[#111422] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-arcade text-xs text-white flex items-center gap-2">
                          <span>{t.name}</span>
                          {currentTable ? (
                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 font-mono text-[9px] font-bold">
                              Table {currentTable}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[9px]">
                              ● Unassigned
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Leader: {t.leader?.name || t.leader?.email} · College: {t.leader?.college || 'Participant'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editVal}
                          onChange={(e) => setTableEdits({ ...tableEdits, [t.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAssignTable(t.id, editVal)
                            }
                          }}
                          className="w-28 rounded bg-[#161a28] border border-slate-700 px-2.5 py-1.5 text-xs text-tactical font-mono uppercase text-center font-bold"
                          placeholder="e.g. T-01"
                        />
                        <button
                          type="button"
                          onClick={() => handleAssignTable(t.id, editVal)}
                          className="px-3 py-1.5 rounded bg-tactical text-black font-arcade text-[9px] uppercase font-bold hover:bg-[#e6a600] transition"
                        >
                          ASSIGN
                        </button>
                        {currentTable && (
                          <button
                            type="button"
                            onClick={() => {
                              setTableEdits({ ...tableEdits, [t.id]: '' })
                              handleAssignTable(t.id, '')
                            }}
                            className="px-2.5 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-arcade text-[9px] uppercase transition"
                          >
                            CLEAR
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* TAB: Entry Gate Coordinators & Check-in Hub */}
        {activeTab === 'gate' && (
          <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="font-arcade text-sm text-white uppercase mb-1">
                  ENTRY COORDINATOR & GATE SCANNER HUB
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Provision gate check-in staff, manage unique QR scanners, and track staggered team arrivals.
                </p>
              </div>

              <Link
                to="/entry-gate-scanner-7294"
                target="_blank"
                className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-arcade text-[10px] font-bold uppercase tracking-wider transition shadow-md flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>📷</span>
                <span>OPEN GATE SCANNER PORTAL ↗</span>
              </Link>
            </div>

            {/* Live Gate Attendance Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded bg-[#101422] border border-slate-800 text-center">
                <span className="text-[9px] font-arcade text-slate-400 uppercase">SQUADS REGISTERED</span>
                <div className="text-lg font-bold font-mono text-white mt-1">{gateTeams.length || teams.length}</div>
              </div>
              <div className="p-3.5 rounded bg-[#101422] border border-sync/40 text-center">
                <span className="text-[9px] font-arcade text-sync uppercase">FULLY PRESENT (100%)</span>
                <div className="text-lg font-bold font-mono text-sync mt-1">
                  {gateTeams.filter((t) => t.isFullyPresent).length}
                </div>
              </div>
              <div className="p-3.5 rounded bg-[#101422] border border-amber-500/40 text-center">
                <span className="text-[9px] font-arcade text-amber-400 uppercase">PARTIALLY PRESENT</span>
                <div className="text-lg font-bold font-mono text-amber-300 mt-1">
                  {gateTeams.filter((t) => t.isPartiallyPresent).length}
                </div>
              </div>
              <div className="p-3.5 rounded bg-[#101422] border border-slate-800 text-center">
                <span className="text-[9px] font-arcade text-slate-400 uppercase">TOTAL ATTENDEES IN</span>
                <div className="text-lg font-bold font-mono text-white mt-1">
                  {gateTeams.reduce((acc, t) => acc + (t.presentCount || 0), 0)}
                </div>
              </div>
            </div>

            {/* Shareable Coordinator Invite Box */}
            {shareCoordData && (
              <div className="p-4 rounded-xl bg-[#0c1815] border border-emerald-500/50 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-arcade text-emerald-400 uppercase">
                      COORDINATOR ACCESS LINK & CREDENTIALS READY
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShareCoordData(null)}
                    className="text-xs text-slate-400 hover:text-white font-mono"
                  >
                    ✕ Dismiss
                  </button>
                </div>
                <div className="p-3 rounded bg-[#060e0c] border border-emerald-900/60 font-mono text-xs text-slate-300 space-y-1">
                  <div><span className="text-slate-500">Scanner Link:</span> <a href={shareCoordData.url} target="_blank" rel="noreferrer" className="text-emerald-400 underline">{shareCoordData.url}</a></div>
                  <div><span className="text-slate-500">Staff Name:</span> <span className="text-white font-bold">{shareCoordData.name}</span></div>
                  <div><span className="text-slate-500">Login Email:</span> <span className="text-emerald-300">{shareCoordData.email}</span></div>
                  <div><span className="text-slate-500">Password:</span> <span className="text-tactical font-bold">{shareCoordData.password}</span></div>
                  <div><span className="text-slate-500">Gate:</span> <span className="text-slate-200">{shareCoordData.gate}</span></div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopyText('coord_all', shareCoordData.formatted)}
                    className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-[10px] font-bold uppercase transition flex items-center gap-1.5"
                  >
                    <span>{copiedKey === 'coord_all' ? '✓ COPIED ALL!' : '📋 COPY LINK & CREDENTIALS'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyText('coord_url', shareCoordData.url)}
                    className="px-3 py-1.5 rounded bg-[#13271f] hover:bg-[#193a2c] text-emerald-300 border border-emerald-500/40 font-mono text-[11px] transition"
                  >
                    {copiedKey === 'coord_url' ? '✓ LINK COPIED!' : '🔗 COPY LINK ONLY'}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareCoordData.formatted)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded bg-[#10301a] hover:bg-[#154224] text-emerald-300 border border-emerald-600/40 font-mono text-[11px] transition flex items-center gap-1"
                  >
                    <span>💬</span>
                    <span>SEND VIA WHATSAPP</span>
                  </a>
                </div>
              </div>
            )}

            {/* Create / Edit Coordinator Form */}
            <div className="p-5 rounded-lg bg-[#0e121e] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-arcade text-xs text-tactical uppercase">
                  {editingCoord ? 'EDIT ENTRY COORDINATOR ACCOUNT' : 'CREATE NEW ENTRY COORDINATOR ACCOUNT'}
                </h3>
                {editingCoord && (
                  <button
                    type="button"
                    onClick={handleCancelCoordEdit}
                    className="text-xs font-mono text-slate-400 hover:text-white"
                  >
                    [ Cancel Edit ]
                  </button>
                )}
              </div>
              <form onSubmit={handleProvisionCoordinator} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Staff / Coordinator Name"
                  value={coordName}
                  onChange={(e) => setCoordName(e.target.value)}
                  className="rounded bg-[#090b12] border border-slate-700 px-3 py-2 text-xs text-white outline-none font-mono"
                  required
                />
                <input
                  type="email"
                  placeholder="Coordinator Email"
                  value={coordEmail}
                  onChange={(e) => setCoordEmail(e.target.value)}
                  className="rounded bg-[#090b12] border border-slate-700 px-3 py-2 text-xs text-white outline-none font-mono"
                  required
                />
                <input
                  type="text"
                  placeholder="Password"
                  value={coordPassword}
                  onChange={(e) => setCoordPassword(e.target.value)}
                  className="rounded bg-[#090b12] border border-slate-700 px-3 py-2 text-xs text-white outline-none font-mono"
                  required
                />
                <button
                  type="submit"
                  className="rounded bg-tactical hover:bg-[#e6a600] text-black font-arcade text-[10px] font-bold py-2 uppercase tracking-wider transition"
                >
                  {editingCoord ? 'UPDATE COORDINATOR >>' : 'PROVISION COORDINATOR >>'}
                </button>
              </form>
            </div>

            {/* List of Provisioned Coordinators */}
            <div>
              <h3 className="font-arcade text-xs text-white uppercase mb-3">
                ACTIVE GATE COORDINATORS
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(hackState?.coordinators || []).map((c, i) => (
                  <div key={i} className="p-3.5 rounded bg-[#101422] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-arcade text-xs text-white flex items-center gap-2">
                        <span>{c.name}</span>
                        <span className="text-[9px] text-amber-400 font-mono bg-amber-950/30 border border-amber-500/30 px-2 py-0.5 rounded">
                          {c.gate || 'Main Gate'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{c.email}</div>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleShareCoordinator(c)}
                        className="px-2.5 py-1 rounded bg-[#13271f] hover:bg-[#193a2c] text-emerald-300 border border-emerald-500/30 font-mono text-[10px] transition flex items-center gap-1"
                        title="Copy direct scanner link & credentials"
                      >
                        <span>📋</span>
                        <span>Copy Link</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditCoordinator(c)}
                        className="px-2.5 py-1 rounded bg-[#161c2e] hover:bg-[#1e243a] text-slate-300 border border-slate-700 font-mono text-[10px] transition"
                        title="Edit coordinator"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoordinator(c.id || c.email, c.name)}
                        className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-mono text-[10px] transition"
                        title="Remove coordinator"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

                {/* TAB 3: Announcements Broadcaster */}
        {activeTab === 'broadcast' && (
          <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-6 space-y-5">
            <div>
              <h2 className="font-arcade text-sm text-white uppercase mb-1">
                REAL-TIME ANNOUNCEMENT BROADCAST DESK
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Broadcast instant live notifications to all participant screens (e.g. meal times, mentor calls, code freeze).
              </p>
            </div>

            <form onSubmit={handleBroadcast} className="p-4 rounded-lg bg-[#111422] border border-slate-800 space-y-3">
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">
                  Announcement Message
                </label>
                <textarea
                  rows={3}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="e.g. Mentor Round 1 begins in 15 minutes! Please be present at your assigned tables."
                  className="w-full rounded bg-[#161a28] border border-slate-700 p-3 text-xs text-white outline-none focus:border-tactical font-mono"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase text-slate-400">Priority:</span>
                  <label className="text-xs font-mono flex items-center gap-1">
                    <input
                      type="radio"
                      name="priority"
                      value="normal"
                      checked={broadcastPriority === 'normal'}
                      onChange={() => setBroadcastPriority('normal')}
                    />
                    Normal
                  </label>
                  <label className="text-xs font-mono text-tactical flex items-center gap-1">
                    <input
                      type="radio"
                      name="priority"
                      value="urgent"
                      checked={broadcastPriority === 'urgent'}
                      onChange={() => setBroadcastPriority('urgent')}
                    />
                    Urgent Alert
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-ribbed bg-tactical text-black font-arcade text-[9px] px-6 py-2.5 rounded uppercase font-bold tracking-wider"
                >
                  PUSH BROADCAST &gt;&gt;
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <span className="text-[10px] font-arcade text-slate-400 uppercase block">Broadcast History</span>
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-3 rounded bg-[#0f121d] border border-slate-800 text-xs font-mono flex items-center justify-between gap-2"
                >
                  <span>{ann.text}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">{ann.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Mentor Provisioning */}
        {activeTab === 'mentors' && (
          <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="font-arcade text-sm text-white uppercase mb-1">
                  MENTOR PROVISIONING &amp; CREDENTIALS
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Create login access for mentors to grade teams at their assigned tables via the scoring portal.
                </p>
              </div>

              <Link
                to="/mentor"
                target="_blank"
                className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-[10px] font-bold uppercase tracking-wider transition shadow-md flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>⚖️</span>
                <span>OPEN MENTOR EVALUATION PORTAL ↗</span>
              </Link>
            </div>

            {/* Shareable Mentor Invite Box */}
            {shareMentorData && (
              <div className="p-4 rounded-xl bg-[#0c1815] border border-emerald-500/50 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-arcade text-emerald-400 uppercase">
                      OFFICIAL MENTOR ACCESS LINK & CREDENTIALS READY
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShareMentorData(null)}
                    className="text-xs text-slate-400 hover:text-white font-mono"
                  >
                    ✕ Dismiss
                  </button>
                </div>
                <div className="p-3 rounded bg-[#060e0c] border border-emerald-900/60 font-mono text-xs text-slate-300 space-y-1">
                  <div><span className="text-slate-500">Mentor Portal Link:</span> <a href={shareMentorData.url} target="_blank" rel="noreferrer" className="text-emerald-400 underline">{shareMentorData.url}</a></div>
                  <div><span className="text-slate-500">Mentor Name:</span> <span className="text-white font-bold">{shareMentorData.name}</span></div>
                  <div><span className="text-slate-500">Login Email:</span> <span className="text-emerald-300">{shareMentorData.email}</span></div>
                  <div><span className="text-slate-500">Password:</span> <span className="text-tactical font-bold">{shareMentorData.password}</span></div>
                  <div><span className="text-slate-500">Assigned Tables:</span> <span className="text-slate-200">{shareMentorData.tables}</span></div>
                  <div><span className="text-slate-500">Evaluation Track:</span> <span className="text-slate-200">{shareMentorData.track}</span></div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopyText('mentor_all', shareMentorData.formatted)}
                    className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-[10px] font-bold uppercase transition flex items-center gap-1.5"
                  >
                    <span>{copiedKey === 'mentor_all' ? '✓ COPIED ALL!' : '📋 COPY LINK & CREDENTIALS'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyText('mentor_url', shareMentorData.url)}
                    className="px-3 py-1.5 rounded bg-[#13271f] hover:bg-[#193a2c] text-emerald-300 border border-emerald-500/40 font-mono text-[11px] transition"
                  >
                    {copiedKey === 'mentor_url' ? '✓ LINK COPIED!' : '🔗 COPY LINK ONLY'}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareMentorData.formatted)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded bg-[#10301a] hover:bg-[#154224] text-emerald-300 border border-emerald-600/40 font-mono text-[11px] transition flex items-center gap-1"
                  >
                    <span>💬</span>
                    <span>SEND VIA WHATSAPP</span>
                  </a>
                </div>
              </div>
            )}

            <form onSubmit={handleProvisionMentor} className="p-4 rounded-lg bg-[#111422] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="font-arcade text-xs text-tactical uppercase">
                  {editingMentor ? 'EDIT MENTOR ACCOUNT & ASSIGNMENTS' : 'CREATE NEW MENTOR ACCOUNT'}
                </span>
                {editingMentor && (
                  <button
                    type="button"
                    onClick={handleCancelMentorEdit}
                    className="text-xs font-mono text-slate-400 hover:text-white"
                  >
                    [ Cancel Edit ]
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Mentor Name</label>
                  <input
                    type="text"
                    placeholder="Dr. Rajesh Sharma"
                    value={mentorName}
                    onChange={(e) => setMentorName(e.target.value)}
                    className="w-full rounded bg-[#161a28] border border-slate-700 p-2 text-xs text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Mentor Email</label>
                  <input
                    type="email"
                    placeholder="mentor@example.com"
                    value={mentorEmail}
                    onChange={(e) => setMentorEmail(e.target.value)}
                    className="w-full rounded bg-[#161a28] border border-slate-700 p-2 text-xs text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Password</label>
                  <input
                    type="text"
                    placeholder="Password for mentor..."
                    value={mentorPassword}
                    onChange={(e) => setMentorPassword(e.target.value)}
                    className="w-full rounded bg-[#161a28] border border-slate-700 p-2 text-xs text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Assigned Tables (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Table T-01 to T-15"
                    value={mentorTables}
                    onChange={(e) => setMentorTables(e.target.value)}
                    className="w-full rounded bg-[#161a28] border border-slate-700 p-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="btn-ribbed bg-sync text-black font-arcade text-[9px] px-5 py-2.5 rounded font-bold uppercase"
                >
                  {editingMentor ? 'UPDATE MENTOR ACCOUNT >>' : 'CREATE MENTOR ACCOUNT >>'}
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <span className="text-[10px] font-arcade text-slate-400 uppercase block">Active Mentors</span>
              {mentors.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-mono rounded bg-[#0f121d] border border-slate-800">
                  No provisioned mentors yet.
                </div>
              ) : (
                mentors.map((m, i) => (
                  <div
                    key={m.id || i}
                    className="p-3.5 rounded bg-[#0f121d] border border-slate-800 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{m.name}</span>
                        <span className="text-[10px] text-tactical font-arcade bg-[#161a28] px-2 py-0.5 rounded border border-slate-800">
                          {m.tables || 'Tables: Awaiting Allocation'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{m.email}</div>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleShareMentor(m)}
                        className="px-2.5 py-1 rounded bg-[#13271f] hover:bg-[#193a2c] text-emerald-300 border border-emerald-500/30 font-mono text-[10px] transition flex items-center gap-1"
                        title="Copy direct mentor login link & credentials"
                      >
                        <span>📋</span>
                        <span>Copy Link</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditMentor(m)}
                        className="px-2.5 py-1 rounded bg-[#161c2e] hover:bg-[#1e243a] text-slate-300 border border-slate-700 font-mono text-[10px] transition"
                        title="Edit mentor"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMentor(m.id || m.email, m.name)}
                        className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-mono text-[10px] transition"
                        title="Remove mentor"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: Live Scores & Leaderboard */}
        {activeTab === 'scores' && (
          <div className="bg-[#0b0e18] border border-slate-800 rounded-xl p-6 space-y-5">
            <div>
              <h2 className="font-arcade text-sm text-white uppercase mb-1">
                LIVE ON-GROUND LEADERBOARD & LOCKED SCORES
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Real-time scores permanently locked by on-ground mentors across all tables.
              </p>
            </div>

            {evaluations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono rounded bg-[#0f121d] border border-slate-800">
                No evaluations submitted yet. Mentors will grade teams at their tables during evaluation rounds.
              </div>
            ) : (
              <div className="space-y-3">
                {evaluations.map((ev, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg bg-[#111422] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-arcade text-xs text-white">{ev.teamName || 'Squad'}</span>
                        <span className="px-2 py-0.5 rounded bg-tactical text-black font-arcade text-[8px] font-bold">
                          {ev.tableNumber}
                        </span>
                        <span className="text-[9px] font-mono text-sync">🔒 LOCKED</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">
                        Mentor: {ev.mentorName || ev.mentorEmail} · Innovation: {ev.scores.innovation}/30 · Tech: {ev.scores.tech}/30 · Feasibility: {ev.scores.feasibility}/20 · Pitch: {ev.scores.pitch}/20
                      </div>
                      {ev.notes && (
                        <div className="text-[11px] text-slate-300 font-mono mt-1.5 italic">
                          "{ev.notes}"
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-arcade text-lg text-tactical">{ev.total}</div>
                      <div className="text-[8px] font-mono text-slate-400">TOTAL / 100</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* TAB 9: System Reset */}
        {activeTab === 'sysreset' && (
          <div className="bg-[#0b0e18] border border-red-900 rounded-xl p-6 space-y-6">
            <div>
              <h2 className="font-arcade text-sm text-red-400 uppercase mb-1">⚠ SYSTEM RESET — DANGER ZONE</h2>
              <p className="text-xs text-slate-400 font-mono">
                Use these controls to wipe stale test data from local storage and the shared store.
                Mentors, coordinators, and announcements are <span className="text-tactical font-bold">NOT</span> affected — only registration data is cleared.
              </p>
            </div>

            {/* Clear All Registrations */}
            <div className="p-5 rounded-lg border border-red-900/60 bg-red-950/10 space-y-4">
              <div>
                <div className="font-arcade text-xs text-red-300 mb-1">WIPE ALL REGISTRATIONS & USERS</div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Deletes all registered teams, squad members, payment records, and user accounts from this browser's localStorage AND from the shared store (shared_db.json). 
                  Problem statements, mentors, coordinators, announcements, and table allocations are preserved.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const confirmed = window.confirm(
                    '⚠️ WIPE ALL REGISTRATIONS?\n\nThis will permanently delete:\n• All registered squads\n• All team members\n• All payment records\n• All user accounts\n\nMentors, coordinators, announcements and table assignments are preserved.\n\nType OK to confirm.'
                  )
                  if (!confirmed) return
                  // Wipe localStorage keys
                  const keysToWipe = ['cf_teams', 'cf_all_users', 'cf_auth_user', 'cf_logged_out']
                  keysToWipe.forEach((k) => { try { localStorage.removeItem(k) } catch {} })
                  // Push empty teams+users to shared store
                  try {
                    await fetch(`${getApiOrigin()}/api/shared-store`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-vault-passkey': ADMIN_VAULT_KEY
                      },
                      body: JSON.stringify({ wipe: true, teams: [], users: [], passkey: ADMIN_VAULT_KEY }),
                    })
                  } catch {}
                  setNotice('✅ All registration and user data wiped. Shared store cleared. Mentors, coordinators, and announcements preserved.')
                  setActiveTab('registrations')
                }}
                className="px-5 py-2.5 bg-red-700 hover:bg-red-600 text-white font-arcade text-[10px] rounded-lg border border-red-600 transition-colors"
              >
                🗑️ WIPE ALL REGISTRATIONS
              </button>
            </div>

            {/* Clear This Browser Only */}
            <div className="p-5 rounded-lg border border-amber-900/60 bg-amber-950/10 space-y-4">
              <div>
                <div className="font-arcade text-xs text-amber-300 mb-1">REFRESH LOCAL CACHE (WITHOUT LOGGING OUT)</div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Purges stale registration caches from this browser and immediately pulls fresh records from the shared store (shared_db.json). Your admin login session is completely preserved.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const confirmed = window.confirm('Refresh this browser from live shared database? Stale cache will be purged and fresh data loaded without logging you out.')
                  if (!confirmed) return
                  const keysToWipe = ['cf_teams', 'cf_all_users', 'cf_sealed_ops_state']
                  keysToWipe.forEach((k) => { try { localStorage.removeItem(k) } catch {} })
                  await handleManualSync()
                  setNotice('✅ Local cache refreshed from live database! You remain logged in.')
                }}
                className="px-5 py-2.5 bg-amber-700 hover:bg-amber-600 text-white font-arcade text-[10px] rounded-lg border border-amber-600 transition-colors"
              >
                🧹 REFRESH FROM DATABASE (KEEP LOGIN)
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: PAYMENT DOUBLE-CONFIRMATION (ASKED TWICE)                       */}
      {/* ========================================================================= */}
      {doubleConfirmTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0b0e18] border-2 border-tactical rounded-2xl p-6 shadow-2xl shadow-tactical/20 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded bg-tactical/20 border border-tactical/50 text-tactical font-arcade text-[9px] font-bold">
                  STEP 2 OF 2: AUDIT CHECK
                </span>
                <h3 className="font-arcade text-base text-white mt-1">CONFIRM PAYMENT MATCH</h3>
              </div>
              <button
                type="button"
                onClick={() => setDoubleConfirmTeam(null)}
                className="text-slate-500 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#111422] border border-slate-800 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Squad Name:</span>
                <span className="text-white font-bold">{doubleConfirmTeam.teamName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Leader / Contact:</span>
                <span className="text-slate-300">{doubleConfirmTeam.candidateName} ({doubleConfirmTeam.email})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Required Amount:</span>
                <span className="text-emerald-400 font-bold">₹800 INR</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                <span className="text-slate-500">Claimed 12-Digit UTR:</span>
                <span className="px-2.5 py-1 rounded bg-black border border-slate-700 text-tactical font-bold font-mono tracking-widest text-sm">
                  {doubleConfirmTeam.paymentReference || doubleConfirmTeam.utr || 'NOT GIVEN'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                ⚠️ Double Verification Check:
              </p>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Confirming this payment will unlock digital QR entry passes, unfreeze problem track selection, and confirm physical workstation allocation for all squad members.
              </p>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-lg bg-[#161a28] border border-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={doubleConfirmChecked}
                onChange={(e) => setDoubleConfirmChecked(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-600 text-tactical focus:ring-tactical"
              />
              <span className="text-xs text-white font-mono font-medium">
                I confirm that I have physically verified the ₹800 transaction credit in our bank account statement for this 12-digit UTR.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDoubleConfirmTeam(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-arcade text-[10px]"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={!doubleConfirmChecked}
                onClick={handleExecuteDoubleVerifyPayment}
                className="px-5 py-2.5 rounded-lg bg-tactical hover:bg-[#e6a600] disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-black font-arcade text-[10px] font-bold shadow-lg shadow-tactical/20 transition"
              >
                CONFIRM & ISSUE DIGITAL PASSES &gt;&gt;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REVERT PAYMENT STATUS (UNDO MISTAKE)                             */}
      {/* ========================================================================= */}
      {revertConfirmTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0b0e18] border-2 border-red-500 rounded-2xl p-6 shadow-2xl shadow-red-500/20 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/50 text-red-400 font-arcade text-[9px] font-bold">
                  REVERT CONFIRMATION
                </span>
                <h3 className="font-arcade text-base text-white mt-1">REVERT PAYMENT STATUS?</h3>
              </div>
              <button
                type="button"
                onClick={() => setRevertConfirmTeam(null)}
                className="text-slate-500 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/50 text-xs font-mono space-y-2">
              <p className="text-slate-300">
                Are you sure you want to revert squad <strong className="text-white">"{revertConfirmTeam.teamName}"</strong> back to <span className="text-amber-400 font-bold">Pending Bank Match</span>?
              </p>
              <p className="text-slate-400 text-[11px]">
                This will lock their digital access passes and require bank re-verification. Use this if a payment was approved by mistake.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRevertConfirmTeam(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-arcade text-[10px]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleExecuteRevertPayment}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-arcade text-[10px] font-bold transition shadow-lg shadow-red-600/30"
              >
                YES, REVERT TO PENDING
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CANDIDATE LOOK LIVE PREVIEW (DIGITAL PASS & COCKPIT VIEW)        */}
      {/* ========================================================================= */}
      {previewCandidateData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-[#080b13] border-2 border-tactical rounded-2xl p-6 shadow-2xl shadow-tactical/30 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-arcade text-tactical tracking-wider">
                  CANDIDATE DASHBOARD PREVIEW SIMULATOR
                </span>
                <h3 className="font-arcade text-base text-white">DIGITAL ACCESS PASS</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCandidateData(null)}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-mono"
              >
                ESC / CLOSE [✕]
              </button>
            </div>

            {/* Candidate High-Tech Pass Card */}
            <div className="relative rounded-2xl bg-gradient-to-b from-[#121626] to-[#0a0d17] border border-tactical/40 p-6 shadow-xl space-y-5 overflow-hidden">
              {/* Corner Watermarks */}
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-tactical/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute top-3 right-4 font-arcade text-[9px] text-slate-500 tracking-widest">
                GIT // 2026 // ADMISSION PASS
              </div>

              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-tactical/20 border border-tactical flex items-center justify-center font-arcade text-tactical text-lg font-bold">
                  CF
                </div>
                <div>
                  <div className="font-arcade text-sm text-white tracking-wide">
                    CODEFIESTA 5.0
                  </div>
                  <div className="text-[10px] font-mono text-tactical">
                    NATIONAL 36-HOUR HACKATHON // GIT JAIPUR
                  </div>
                </div>
              </div>

              {/* Pass Content Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-[#070911]/90 rounded-xl p-4 border border-slate-800/80">
                <div className="sm:col-span-2 space-y-2 font-mono text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Participant Name</div>
                    <div className="text-white font-bold text-sm tracking-wide">
                      {previewCandidateData.candidateName}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase">Role</div>
                      <div className="text-tactical font-bold uppercase">{previewCandidateData.role || 'Member'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase">Squad</div>
                      <div className="text-white font-bold truncate">{previewCandidateData.teamName}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase">College</div>
                      <div className="text-slate-300 truncate">{previewCandidateData.college || 'Engineering'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase">Workstation</div>
                      <div className="text-cyan-400 font-bold">
                        {previewCandidateData.tableNumber ? `Table ${previewCandidateData.tableNumber}` : 'Pending Check-in'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-[9px] text-slate-500 uppercase">Selected Track</div>
                    <div className="text-slate-200 text-[11px]">
                      {previewCandidateData.trackName || previewCandidateData.track || 'Track Selection Unlocked on Check-in'}
                    </div>
                  </div>
                </div>

                {/* QR Access Code Box */}
                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-white p-2.5 shadow-inner">
                  <QRCodeSvg
                    value={JSON.stringify({
                      v: 'CF5',
                      tid: previewCandidateData.teamId,
                      tname: previewCandidateData.teamName,
                      email: previewCandidateData.email,
                      name: previewCandidateData.candidateName,
                      role: previewCandidateData.role,
                    })}
                    size={120}
                  />
                  <span className="mt-1 text-[8px] font-mono font-bold text-black uppercase tracking-tighter">
                    SCAN TO VERIFY
                  </span>
                </div>
              </div>

              {/* Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">Status:</span>
                  {previewCandidateData.earlyExit ? (
                    <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500 text-red-400 font-bold text-[10px]">
                      DEPARTED // EARLY EXIT
                    </span>
                  ) : previewCandidateData.paymentVerified ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-bold text-[10px]">
                      ✓ PAYMENT VERIFIED & PASS ISSUED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500 text-amber-400 font-bold text-[10px]">
                      ● PENDING BANK CLEARANCE
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">
                  ID: {previewCandidateData.teamId?.slice(0, 10)}...
                </div>
              </div>
            </div>

            <div className="text-center font-mono text-[11px] text-slate-400">
              This preview matches exactly what the candidate sees in their dashboard pass widget at the venue gate.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CHANGE CANDIDATE PASSWORD / PASSKEY                              */}
      {/* ========================================================================= */}
      {pwdResetCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0b0e18] border-2 border-tactical rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded bg-tactical/20 border border-tactical/50 text-tactical font-arcade text-[9px] font-bold">
                  OPS DESK // RESCUE OVERRIDE
                </span>
                <h3 className="font-arcade text-base text-white mt-1">RESET CANDIDATE PASSKEY</h3>
              </div>
              <button
                type="button"
                onClick={() => setPwdResetCandidate(null)}
                className="text-slate-500 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111422] border border-slate-800 text-xs font-mono space-y-1">
              <div className="text-slate-400">Candidate: <strong className="text-white">{pwdResetCandidate.candidateName}</strong></div>
              <div className="text-slate-400">Email: <strong className="text-tactical">{pwdResetCandidate.email}</strong></div>
              <div className="text-slate-400">Squad: <span className="text-slate-200">{pwdResetCandidate.teamName}</span></div>
            </div>

            <form onSubmit={handleExecutePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  New Passkey / Password:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    className="flex-1 rounded-lg bg-[#161a28] border border-slate-700 px-3 py-2 text-sm text-white font-mono"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPasswordVal('cf5_' + Math.random().toString(36).slice(2, 7))}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-tactical font-arcade text-[9px] border border-slate-700"
                    title="Generate Random"
                  >
                    🎲 RANDOM
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  Tell the candidate this new passkey so they can immediately log in from the portal.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPwdResetCandidate(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-arcade text-[10px]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={pwdResetLoading || !newPasswordVal}
                  className="px-5 py-2.5 rounded-lg bg-tactical hover:bg-[#e6a600] disabled:bg-slate-800 text-black font-arcade text-[10px] font-bold shadow-lg shadow-tactical/20"
                >
                  {pwdResetLoading ? 'UPDATING...' : 'UPDATE PASSKEY >>'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: EARLY EXIT / REMOVE CANDIDATE                                    */}
      {/* ========================================================================= */}
      {earlyExitCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0b0e18] border-2 border-red-500/70 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/50 text-red-400 font-arcade text-[9px] font-bold">
                  ATTENDANCE AUDIT DESK
                </span>
                <h3 className="font-arcade text-base text-white mt-1">MANAGE ROSTER / EARLY EXIT</h3>
              </div>
              <button
                type="button"
                onClick={() => setEarlyExitCandidate(null)}
                className="text-slate-500 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111422] border border-slate-800 text-xs font-mono space-y-1">
              <div className="text-slate-400">Candidate: <strong className="text-white">{earlyExitCandidate.candidateName}</strong></div>
              <div className="text-slate-400">Email: <span className="text-slate-300">{earlyExitCandidate.email}</span></div>
              <div className="text-slate-400">Squad: <span className="text-tactical">{earlyExitCandidate.teamName}</span></div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <label
                onClick={() => setEarlyExitOption('mark')}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  earlyExitOption === 'mark'
                    ? 'bg-amber-500/10 border-amber-500/60 text-amber-200'
                    : 'bg-[#111422] border-slate-800 text-slate-400 hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="earlyExitAction"
                  checked={earlyExitOption === 'mark'}
                  onChange={() => setEarlyExitOption('mark')}
                  className="mt-0.5 text-amber-500"
                />
                <div>
                  <div className="font-bold text-white">Mark as Early Exit / Departed (Recommended)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Keeps payment and team history intact, but flags candidate as left the venue. You can reinstate them later anytime with one click.
                  </div>
                </div>
              </label>

              <label
                onClick={() => setEarlyExitOption('drop')}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  earlyExitOption === 'drop'
                    ? 'bg-red-500/10 border-red-500/60 text-red-200'
                    : 'bg-[#111422] border-slate-800 text-slate-400 hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="earlyExitAction"
                  checked={earlyExitOption === 'drop'}
                  onChange={() => setEarlyExitOption('drop')}
                  className="mt-0.5 text-red-500"
                />
                <div>
                  <div className="font-bold text-red-300">Permanently Remove from Squad</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Removes candidate from the squad roster entirely. Use if registered by mistake or not attending.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEarlyExitCandidate(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-arcade text-[10px]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleExecuteEarlyExit}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-arcade text-[10px] font-bold shadow-lg shadow-red-600/30"
              >
                APPLY ATTENDANCE UPDATE &gt;&gt;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: ADD / EDIT PROBLEM TRACK                                         */}
      {/* ========================================================================= */}
      {trackModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0b0e18] border-2 border-tactical rounded-2xl p-6 shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded bg-tactical/20 border border-tactical/50 text-tactical font-arcade text-[9px] font-bold">
                  {trackModalData.isNew ? 'TRACK CREATOR' : 'TRACK EDITOR'}
                </span>
                <h3 className="font-arcade text-base text-white mt-1">
                  {trackModalData.isNew ? 'ADD NEW PROBLEM STATEMENT' : 'EDIT PROBLEM STATEMENT'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTrackModalData(null)
                  setIsTracksDirty(false)
                }}
                className="text-slate-500 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTrackModal} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="text-[10px] uppercase text-slate-400 block mb-1 font-bold">Icon</label>
                  <input
                    type="text"
                    required
                    value={trackModalData.icon}
                    onChange={(e) => setTrackModalData({ ...trackModalData, icon: e.target.value })}
                    className="w-full text-center py-2 rounded-lg bg-[#161a28] border border-slate-700 text-lg text-white font-mono"
                    placeholder="💡"
                  />
                  <div className="flex justify-center gap-1 mt-1.5 text-sm cursor-pointer select-none">
                    {['🤖', '🌐', '💡', '🛡️', '💳', '🏥', '🚀'].map((em) => (
                      <span
                        key={em}
                        onClick={() => setTrackModalData({ ...trackModalData, icon: em })}
                        className="hover:scale-125 transition-transform"
                      >
                        {em}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="col-span-3">
                  <label className="text-[10px] uppercase text-slate-400 block mb-1 font-bold">
                    Track Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={trackModalData.title}
                    onChange={(e) => setTrackModalData({ ...trackModalData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#161a28] border border-slate-700 text-sm text-white font-sans font-bold"
                    placeholder="e.g. Autonomous Drones & Swarm Robotics"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400 block mb-1 font-bold">Tagline</label>
                <input
                  type="text"
                  value={trackModalData.tagline}
                  onChange={(e) => setTrackModalData({ ...trackModalData, tagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#161a28] border border-slate-700 text-xs text-tactical"
                  placeholder="e.g. UAV pathfinding, collision avoidance & telemetry intelligence"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400 block mb-1 font-bold">
                  Problem Statement Brief <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={trackModalData.brief}
                  onChange={(e) => setTrackModalData({ ...trackModalData, brief: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#161a28] border border-slate-700 text-xs text-slate-200 leading-relaxed"
                  placeholder="Describe the real-world challenge, technical scope, and expected impact for participant squads..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase text-tactical block font-bold">
                    Problem Statements (one per line or comma separated)
                  </label>
                  <span className="text-[9px] font-mono text-slate-400">Listed as challenges on Dashboard</span>
                </div>
                <textarea
                  rows={4}
                  value={
                    trackModalData.problemStatementsText !== undefined
                      ? trackModalData.problemStatementsText
                      : (Array.isArray(trackModalData.problemStatements)
                          ? trackModalData.problemStatements.join('\n')
                          : (Array.isArray(trackModalData.deliverables)
                              ? trackModalData.deliverables.join('\n')
                              : (trackModalData.deliverables || '')))
                  }
                  onChange={(e) => setTrackModalData({ ...trackModalData, problemStatementsText: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#161a28] border border-slate-700 text-xs text-white font-mono leading-relaxed"
                  placeholder="e.g.&#10;AI-Based early warning and landslide Risk Monitoring System in NER&#10;AI-Based Smart Logistics and Accessibility Intelligence Platform for North Eastern Region (NER)&#10;Solar-Powered Smart Mini Cold Storage System for Fresh Vegetables in NER"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setTrackModalData(null)
                    setIsTracksDirty(false)
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-arcade text-[10px]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-tactical hover:bg-[#e6a600] text-black font-arcade text-[10px] font-bold shadow-lg shadow-tactical/20 transition"
                >
                  {trackModalData.isNew ? '🚀 PUBLISH TRACK TO VAULT >>' : '💾 SAVE TRACK CHANGES >>'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
