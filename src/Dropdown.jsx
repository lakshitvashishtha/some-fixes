import { useEffect, useRef, useState } from 'react'

function ChevronIcon({ open }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200 ${
        open ? 'rotate-180' : ''
      }`}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M5 7.5 L10 12.5 L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-tactical"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select',
  searchable = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const filtered = searchable
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options

  return (
    <div ref={rootRef} className="relative mt-1">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          setOpen(!open)
          setQuery('')
        }}
        className={`flex w-full items-center justify-between rounded-md bg-[#090b12] border border-slate-700/80 px-3 py-2 sm:py-2.5 text-left text-[11px] sm:text-sm transition-colors ${
          open ? 'border-tactical' : 'hover:border-slate-600'
        }`}
      >
        <span
          className={`truncate ${
            value ? 'text-white' : 'text-slate-500'
          }`}
        >
          {value || placeholder}
        </span>
        <ChevronIcon open={open} />
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-slate-700 bg-[#10131c] shadow-2xl">
          {searchable && (
            <div className="border-b border-slate-700/60 p-1.5">
              <input
                autoFocus
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded bg-[#090b12] border border-slate-700/70 px-2.5 py-1.5 text-[11px] sm:text-sm text-white outline-none placeholder:text-slate-500 focus:border-tactical"
              />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto py-1">
            {searchable && query.trim() && !options.some((o) => o.toLowerCase() === query.trim().toLowerCase()) && (
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] sm:text-sm transition-colors bg-[#141b2a] hover:bg-tactical hover:text-black text-tactical font-mono border-b border-slate-700/80 sticky top-0 z-10"
                onClick={() => {
                  onChange(query.trim())
                  setOpen(false)
                }}
              >
                <span className="truncate">
                  + Use "{query.trim()}"
                </span>
                <span className="text-[9px] uppercase font-arcade px-1.5 py-0.5 rounded bg-tactical/20 border border-tactical/40 shrink-0">
                  Custom
                </span>
              </button>
            )}
            {filtered.length === 0 && !query.trim() && (
              <p className="px-3 py-2 text-[11px] sm:text-sm text-slate-500">
                No matches found
              </p>
            )}
            {filtered.map((option) => (
              <button
                key={option}
                type="button"
                className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 sm:py-2 text-left text-[11px] sm:text-sm transition-colors hover:bg-[#1b2030] ${
                  value === option
                    ? 'text-tactical'
                    : 'text-slate-300'
                }`}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
              >
                <span className="truncate">{option}</span>
                {value === option && <CheckIcon />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dropdown