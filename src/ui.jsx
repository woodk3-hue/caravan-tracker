import { X } from 'lucide-react'

export function Field({ label, error, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-slate-50 dark:bg-slate-950 p-4 pb-8"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button aria-label="Close" className="p-2" onClick={onClose}><X /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Empty({ children }) {
  return <p className="text-center text-slate-500 py-10">{children}</p>
}

export function Header({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      {action}
    </div>
  )
}
