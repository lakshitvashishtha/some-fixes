import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Auth from './Auth.jsx'
import Dashboard from './Dashboard.jsx'
import CreateTeam from './CreateTeam.jsx'
import InvitePage from './Invite.jsx'
import Payment from './Payment.jsx'
import Admin from './Admin.jsx'
import Mentor from './Mentor.jsx'
import GateCoordinator from './GateCoordinator.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-team" element={<CreateTeam />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/cf5-ops-command-vault-9842" element={<Admin />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/mentor-eval-desk-4189" element={<Mentor />} />
        <Route path="/mentor" element={<Mentor />} />
        <Route path="/eval" element={<Mentor />} />
        <Route path="/entry-gate-scanner-7294" element={<GateCoordinator />} />
        <Route path="/gate" element={<GateCoordinator />} />
        <Route path="/scanner" element={<GateCoordinator />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)