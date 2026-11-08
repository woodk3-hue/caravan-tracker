import { useEffect, useState } from 'react'
import { Gauge, Route, Fuel, Wrench, MapPin, Database, Moon, Sun } from 'lucide-react'
import { useStore } from './useStore.js'
import Dashboard from './views/Dashboard.jsx'
import Legs from './views/Legs.jsx'
import FuelLog from './views/FuelLog.jsx'
import Maintenance from './views/Maintenance.jsx'
import Sites from './views/Sites.jsx'
import Data from './views/Data.jsx'

const tabs = [
  ['home', 'Home', Gauge], ['legs', 'Legs', Route], ['fuel', 'Fuel', Fuel],
  ['maint', 'Service', Wrench], ['sites', 'Sites', MapPin], ['data', 'Data', Database]
]

export default function App() {
  const { data, update, replace } = useStore()
  const [tab, setTab] = useState('home')
  const [openForm, setOpenForm] = useState(null) // {tab, kind}
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch {}
  }, [dark])

  if (!data) return <div className="p-8 text-center text-slate-500">Loading…</div>

  const go = (t, form) => { setTab(t); setOpenForm(form ? { tab: t, form } : null) }
  const props = { data, update, replace, go, openForm: openForm?.tab === tab ? openForm.form : null, clearForm: () => setOpenForm(null) }

  return (
    <div className="mx-auto max-w-lg min-h-screen pb-24" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <button aria-label="Toggle theme" onClick={() => setDark(d => !d)}
        className="fixed top-3 right-3 z-40 p-2 rounded-full bg-slate-200 dark:bg-slate-800"
        style={{ marginTop: 'env(safe-area-inset-top)' }}>
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <main className="p-4 pt-5">
        {tab === 'home' && <Dashboard {...props} />}
        {tab === 'legs' && <Legs {...props} />}
        {tab === 'fuel' && <FuelLog {...props} />}
        {tab === 'maint' && <Maintenance {...props} />}
        {tab === 'sites' && <Sites {...props} />}
        {tab === 'data' && <Data {...props} />}
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto max-w-lg grid grid-cols-6">
          {tabs.map(([id, label, Icon]) => (
            <button key={id} onClick={() => go(id)}
              className={`flex flex-col items-center gap-0.5 py-2 min-h-[56px] text-[11px] ${tab === id ? 'text-teal-600 dark:text-teal-400 font-semibold' : 'text-slate-500'}`}>
              <Icon size={22} />{label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
