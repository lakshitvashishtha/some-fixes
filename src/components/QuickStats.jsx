export default function QuickStats() {
  return (
    <>
      {/* Bottom-left stats */}
      <aside className="hidden sm:flex flex-col gap-4 absolute bottom-8 sm:bottom-12 left-4 sm:left-10 z-30 pointer-events-auto">
        <div className="flex items-center gap-3 sm:gap-4 bg-[#0a1f22]/90 backdrop-blur-md border border-teal-500/30 px-4 sm:px-5 py-2.5 sm:py-3.5 rounded-xl shadow-2xl text-white">
          <span className="font-pixel text-3xl sm:text-4xl text-yellow-300">24H</span>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-bold tracking-wider font-pixel uppercase text-slate-200">Non-Stop</span>
            <span className="text-[11px] sm:text-xs text-teal-300">Creative Hackathon</span>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 bg-[#0a1f22]/90 backdrop-blur-md border border-teal-500/30 px-4 sm:px-5 py-2.5 sm:py-3.5 rounded-xl shadow-2xl text-white">
          <span className="font-pixel text-3xl sm:text-4xl text-arcadeOrange">1000+</span>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-bold tracking-wider font-pixel uppercase text-slate-200">Engineers</span>
            <span className="text-[11px] sm:text-xs text-teal-300">Global Participation</span>
          </div>
        </div>
      </aside>

      {/* Bottom-right date card */}
      <aside className="hidden sm:flex absolute bottom-8 sm:bottom-12 right-4 sm:right-10 z-30 pointer-events-auto">
        <div className="flex items-center gap-4 sm:gap-6 bg-[#0a1f22]/90 backdrop-blur-md border border-teal-500/30 px-6 sm:px-8 py-4 sm:py-6 rounded-2xl shadow-2xl text-white">
          <span className="font-pixel text-5xl sm:text-6xl text-arcadeYellow">8–9</span>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-bold tracking-wider font-pixel uppercase text-slate-200">OCT</span>
            <span className="text-sm sm:text-base text-teal-300">Event Date</span>
          </div>
        </div>
      </aside>

      {/* Mobile bottom stats - compact horizontal layout */}
      <aside className="flex sm:hidden absolute bottom-4 left-4 right-4 z-30 pointer-events-auto">
        <div className="flex items-center justify-between w-full gap-1.5 bg-[#0a1f22]/90 backdrop-blur-md border border-teal-500/30 px-2.5 py-1.5 rounded-xl shadow-2xl text-white">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-xs text-yellow-300">24H</span>
            <span className="text-[8px] font-pixel uppercase text-slate-200">Non-Stop</span>
          </div>
          <div className="w-px h-4 bg-teal-500/30"></div>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-xs text-arcadeOrange">1000+</span>
            <span className="text-[8px] font-pixel uppercase text-slate-200">Engineers</span>
          </div>
          <div className="w-px h-4 bg-teal-500/30"></div>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-xs text-arcadeYellow">8-9</span>
            <span className="text-[8px] font-pixel uppercase text-slate-200">OCT</span>
          </div>
        </div>
      </aside>
    </>
  )
}
