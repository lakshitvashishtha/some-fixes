import React from 'react'

export default function Footer() {
  const scrollToTop = () => {
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { duration: 1.2 })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <footer className="relative w-full bg-[#06080e] border-t-2 border-slate-800/80 text-slate-300 font-sans z-30">
      {/* Subtle top accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-arcadeYellow via-arcadeOrange to-arcadeCyan opacity-80" />

      <div className="max-w-6xl mx-auto px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800/60">
          
          {/* Column 1: Event & Address */}
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-pixel text-arcadeYellow tracking-widest uppercase block mb-1">
                // CODE WARRIOR CLUB
              </span>
              <h2 className="text-xl sm:text-2xl font-pixel font-black text-white tracking-wider">
                CODEFIESTA 5.0
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Global Institute of Technology, Jaipur
              <br />
              ITS 1, IT Park Road, Sitapura Industrial Area, Sitapura, Jaipur, Rajasthan 302022
            </p>
            <p className="text-xs font-mono text-slate-300">
              <span className="text-slate-500">Email:</span>{' '}
              <a href="mailto:codefiesta@gitjaipur.com" className="text-arcadeCyan hover:underline">
                codefiesta@gitjaipur.com
              </a>
            </p>
          </div>

          {/* Column 2: Student Coordinators */}
          <div className="space-y-3">
            <span className="text-[10px] font-pixel text-arcadeOrange tracking-widest uppercase block mb-1">
              // COORDINATORS
            </span>
            <div className="space-y-2 text-xs">
              <div className="bg-[#0b0e17] border border-slate-800/80 p-2.5 rounded-lg">
                <div className="font-bold text-white flex items-center justify-between">
                  <span>Durgesh Singh</span>
                  <span className="text-[9px] font-mono text-arcadeYellow font-normal">LEAD</span>
                </div>
                <a
                  href="https://wa.me/919234629282"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 font-mono text-[11px] block mt-1 transition-colors"
                >
                  📱 +91 9234629282
                </a>
              </div>

              <div className="bg-[#0b0e17] border border-slate-800/80 p-2.5 rounded-lg">
                <div className="font-bold text-white flex items-center justify-between">
                  <span>Aman Goyal</span>
                  <span className="text-[9px] font-mono text-arcadeYellow font-normal">DESIGN</span>
                </div>
                <a
                  href="https://wa.me/918824751125"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 font-mono text-[11px] block mt-1 transition-colors"
                >
                  📱 +91 8824751125
                </a>
              </div>
            </div>
          </div>

          {/* Column 3: Social Media (Only Instagram, LinkedIn, Facebook) */}
          <div className="space-y-3 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-pixel text-arcadeCyan tracking-widest uppercase block mb-1">
                // CONNECT
              </span>
              <p className="text-xs text-slate-400 mb-3">
                Official transmission channels:
              </p>
              
              <div className="flex flex-col gap-2 font-mono text-xs">
                <a
                  href="https://www.instagram.com/codefiesta_git"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 bg-[#0b0e17] hover:bg-[#121726] border border-slate-800 hover:border-pink-500/50 px-3 py-2 rounded-lg text-slate-300 hover:text-white transition-all group"
                >
                  <span className="text-pink-400 group-hover:scale-110 transition-transform">📷</span>
                  <span>Instagram</span>
                  <span className="ml-auto text-[10px] text-slate-600 group-hover:text-pink-400">@codefiesta_git</span>
                </a>

                <a
                  href="https://www.linkedin.com/school/global-institute-of-technology-jaipur/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 bg-[#0b0e17] hover:bg-[#121726] border border-slate-800 hover:border-sky-500/50 px-3 py-2 rounded-lg text-slate-300 hover:text-white transition-all group"
                >
                  <span className="text-sky-400 group-hover:scale-110 transition-transform">💼</span>
                  <span>LinkedIn</span>
                  <span className="ml-auto text-[10px] text-slate-600 group-hover:text-sky-400">GIT Jaipur</span>
                </a>

                <a
                  href="https://www.facebook.com/gitjaipurofficial/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 bg-[#0b0e17] hover:bg-[#121726] border border-slate-800 hover:border-blue-500/50 px-3 py-2 rounded-lg text-slate-300 hover:text-white transition-all group"
                >
                  <span className="text-blue-400 group-hover:scale-110 transition-transform">👥</span>
                  <span>Facebook</span>
                  <span className="ml-auto text-[10px] text-slate-600 group-hover:text-blue-400">gitjaipurofficial</span>
                </a>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={scrollToTop}
                className="w-full btn-ribbed bg-[#111522] hover:bg-slate-800 active:translate-y-0.5 text-slate-300 hover:text-white font-pixel text-[9px] py-2 px-3 rounded border border-slate-700 transition uppercase tracking-wider text-center"
              >
                ▲ Back to Top
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Clean Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 font-mono text-[11px] text-center sm:text-left">
          <div>
            © 2026 Codefiesta 5.0 • Global Institute of Technology, Jaipur.
          </div>
          <div className="text-[10px] text-slate-600">
            All rights reserved.
          </div>
        </div>

      </div>
    </footer>
  )
}

