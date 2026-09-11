import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CreateTeam() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/dashboard', { replace: true })
  }, [navigate])

  return (
    <div className="h-dvh w-full bg-[#07080e] flex items-center justify-center font-mono text-tactical text-xs">
      REDIRECTING TO SQUAD FORMATION COCKPIT...
    </div>
  )
}
