export default function InfoModal({ open, title, content, onClose }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-[#0c2527] border-4 border-slate-900 rounded-2xl p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-teal-600/60">
          <div className="flex items-center gap-2 font-pixel text-yellow-300 text-sm">
            <span className="w-3 h-3 bg-yellow-400 inline-block"></span>
            <h3 className="">{title}</h3>
          </div>
          <button className="w-8 h-8 flex items-center justify-center font-pixel text-slate-900 bg-white hover:bg-yellow-300 rounded border-2 border-slate-900 transition" onClick={onClose}>✕</button>
        </div>
        <div className="py-5 font-sans text-sm text-teal-100 space-y-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: content }}></div>
        <div className="pt-3 border-t border-teal-600/60 flex justify-end">
          <button className="px-5 py-2 font-pixel text-xs bg-arcadeYellow text-slate-900 border-2 border-slate-900 rounded hover:bg-yellow-400 uppercase font-bold" onClick={onClose}>
            Close Window
          </button>
        </div>
      </div>
    </div>
  )
}
