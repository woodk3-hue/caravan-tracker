import { useRef, useState } from 'react'
import { Download, Upload, Trash2 } from 'lucide-react'
import { Header, Field } from '../ui.jsx'
import { exportJson, validateImport, emptyData } from '../storage.js'
import { tankL } from '../util.js'

export default function Data({ data, update, replace }) {
  const file = useRef()
  const [msg, setMsg] = useState(null)

  const onFile = async (e) => {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    try {
      const next = validateImport(JSON.parse(await f.text()))
      const s = `${next.legs.length} legs, ${next.fuel.length} fuel entries, ${next.sites.length} sites, ${next.maintenance.length} service items`
      if (!confirm(`Replace ALL current data with this backup?\n\n${s}`)) return
      replace(next)
      setMsg({ ok: true, text: 'Backup restored.' })
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not read file' })
    }
  }

  return (
    <>
      <Header title="Data & backup" />
      <div className="card mb-3">
        <Field label="Vehicle fuel tank size (litres)">
          <input type="number" inputMode="decimal" min="1" className="input" value={data.settings?.tankL ?? 120}
            onChange={e => { const v = e.target.value; update(d => { d.settings = { ...d.settings, tankL: v === '' ? '' : Number(v) } }) }} />
        </Field>
        <p className="text-xs text-slate-500 mt-1">Fill-ups larger than this are flagged. Currently {tankL(data)} L.</p>
      </div>
      <div className="card space-y-3">
        <p className="text-sm text-slate-500">All data is stored on this device only. Export regularly to keep a backup.</p>
        <p className="text-sm">{data.legs.length} legs · {data.fuel.length} fuel entries · {data.sites.length} sites</p>
        <button className="btn w-full" onClick={() => exportJson(data)}><Download size={18} />Export backup (JSON)</button>
        <button className="btn-ghost w-full" onClick={() => file.current.click()}><Upload size={18} />Import backup</button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{msg.text}</p>}
      </div>
      <button className="btn-ghost w-full mt-4 !text-red-500" onClick={() => confirm('Erase ALL data? This cannot be undone.') && replace(emptyData())}>
        <Trash2 size={18} />Erase all data
      </button>
    </>
  )
}
