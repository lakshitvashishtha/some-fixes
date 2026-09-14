const COORDINATORS = [
  {
    name: 'Durgesh Singh',
    tag: 'LEAD',
    phone: '+91 9234629282',
    whatsapp: 'https://wa.me/+919234629282',
  },
]

const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    handle: '_gitjaipur',
    href: 'https://www.instagram.com/_gitjaipur',
    icon: 'ig',
  },
  {
    label: 'LinkedIn',
    handle: 'GIT Jaipur',
    href: 'https://www.linkedin.com/school/global-institute-of-technology-jaipur/',
    icon: 'li',
  },
  {
    label: 'Facebook',
    handle: 'gitjaipurofficial',
    href: 'https://www.facebook.com/gitjaipurofficial/',
    icon: 'fb',
  },
]

function SocialIcon({ type }) {
  if (type === 'ig') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4.5" />
      </svg>
    )
  }
  if (type === 'li') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4v15h-4V8zm7.5 0h3.8v2.05h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V23h-4v-7.9c0-1.88-.03-4.3-2.62-4.3-2.63 0-3.03 2.05-3.03 4.17V23H8V8z" />
      </svg>
    )
  }
  if (type === 'fb') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    )
  }
  if (type === 'wa') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.301-.15-1.776-.876-2.052-.976-.275-.1-.476-.15-.676.15-.2.301-.777.977-.952 1.177-.175.2-.351.226-.652.075-.301-.15-1.272-.469-2.424-1.496-.897-.798-1.503-1.784-1.679-2.085-.175-.3-.019-.462.131-.612.136-.135.301-.351.451-.527.151-.175.201-.301.301-.501.101-.2.051-.376-.025-.526-.075-.15-.676-1.631-.927-2.233-.244-.587-.492-.507-.676-.516-.175-.01-.376-.01-.577-.01-.2 0-.526.075-.802.376-.275.301-1.053 1.028-1.053 2.508 0 1.48 1.078 2.909 1.229 3.11.15.2 2.122 3.24 5.141 4.544.718.31 1.279.495 1.716.634.721.23 1.378.197 1.897.12.578-.086 1.776-.726 2.026-1.428.251-.702.251-1.304.176-1.429-.076-.125-.276-.2-.577-.35zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.99-1.408A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
      </svg>
    )
  }
  return null
}

export default function Footer() {
  const scrollToTop = () => {
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { duration: 1.2 })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <footer className="relative w-full border-t border-amber-400/15 bg-[#030712]">
      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Column 1 */}
        <div>
          <span className="font-pixel text-[9px] text-amber-400/60 tracking-[0.2em] uppercase">
            // Code Warrior Club
          </span>
          <h2
            className="font-pixel font-black text-white uppercase mt-2 mb-4"
            style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)', letterSpacing: '0.06em' }}
          >
            Codefiesta 5.0
          </h2>
          <p className="text-[11px] leading-relaxed text-slate-400 max-w-[260px]">
            Global Institute of Technology, Jaipur
            <br />
            ITS 1, IT Park Road, Sitapura Industrial Area, Sitapura, Jaipur,
            <br />
            Rajasthan 302022
          </p>
          <a
            href="mailto:codefiesta@gitjaipur.com"
            className="inline-block mt-3 text-[11px] text-cyan-400/80 hover:text-cyan-300 transition-colors"
          >
            Email: codefiesta@gitjaipur.com
          </a>
        </div>

        {/* Column 2 */}
        <div>
          <span className="font-pixel text-[9px] text-amber-400/60 tracking-[0.2em] uppercase">
            // Coordinators
          </span>
          <div className="mt-3 flex flex-col gap-3">
            {COORDINATORS.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-amber-400/15 bg-[#0a0f1a]/80"
              >
                <div>
                  <span className="font-pixel text-[11px] text-white font-bold tracking-wide">
                    {c.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-cyan-400/70">📞</span>
                    <a
                      href={c.whatsapp || "https://wa.me/+919234629282"}
                      target="_blank"
                      rel="noreferrer"
                      className="font-pixel text-[10px] text-cyan-400/80 hover:text-cyan-300 transition-colors"
                    >
                      {c.phone}
                    </a>
                  </div>
                </div>
                <span className="font-pixel text-[8px] text-amber-400/70 tracking-widest uppercase px-2 py-0.5 border border-amber-400/20 rounded bg-amber-400/5">
                  {c.tag}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3 */}
        <div>
          <span className="font-pixel text-[9px] text-amber-400/60 tracking-[0.2em] uppercase">
            // Connect
          </span>
          <p className="text-[10px] text-slate-500 mt-1 mb-3">Official transmission channels:</p>
          <div className="flex flex-col gap-2.5">
            {SOCIAL_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-amber-400/12 bg-[#0a0f1a]/60 text-slate-300 hover:border-amber-400/40 hover:text-white transition-all group"
              >
                <span className="text-amber-400/70 group-hover:text-amber-300 transition-colors">
                  <SocialIcon type={item.icon} />
                </span>
                <span className="font-pixel text-[10px] tracking-wide">{item.label}</span>
                <span className="ml-auto font-pixel text-[9px] text-slate-500 group-hover:text-slate-400 transition-colors">
                  {item.handle}
                </span>
              </a>
            ))}
          </div>

          <button
            onClick={scrollToTop}
            className="mt-5 w-full font-pixel text-[9px] tracking-widest uppercase text-amber-400/70 border border-amber-400/20 rounded-lg py-2.5 hover:bg-amber-400/10 hover:text-amber-300 hover:border-amber-400/40 transition-all cursor-pointer"
          >
            ▲ Back to Top
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-amber-400/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="font-pixel text-[8px] text-slate-600 tracking-wider">
          © 2026 Codefiesta 5.0 · Global Institute of Technology, Jaipur.
        </span>
        <span className="font-pixel text-[8px] text-slate-600 tracking-wider">
          All rights reserved.
        </span>
      </div>
    </footer>
  )
}
