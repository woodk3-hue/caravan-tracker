import { useRef, useState } from 'react'
import { Download, Upload, Trash2 } from 'lucide-react'
import { Header, Field } from '../ui.jsx'
import { exportJson, validateImport, emptyData } from '../storage.js'
import { tankL } from '../util.js'

export default function Data({ data, update, replace }) {
  const file = useRef()
  const [msg, setMsg] = useState(null)
  const cv = data.caravan || {}
  const setCv = (k, numeric) => (e) => {
    const v = e.target.value
    update(d => { d.caravan = { ...d.caravan, [k]: numeric ? (v === '' ? '' : Number(v)) : v } })
  }

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
      <Header title="Caravan & data" />
      <div className="card mb-3 space-y-3">
        <h2 className="font-semibold">My caravan <span className="text-xs font-normal text-slate-500">(all optional)</span></h2>
        <Field label="Nickname (optional)"><input className="input" placeholder="e.g. Bessie" value={cv.nickname || ''} onChange={setCv('nickname')} /></Field>
        <Field label="Caravan name / make / model"><input className="input" placeholder="e.g. Jayco Journey 17ft" value={cv.type || ''} onChange={setCv('type')} /></Field>
        <Field label="Rego number"><input className="input uppercase" value={cv.rego || ''} onChange={setCv('rego')} /></Field>
        <p className="label !mb-0 pt-1">Registration</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Rego due date"><input type="date" className="input" value={cv.regoDue || ''} onChange={setCv('regoDue')} /></Field>
          <Field label="Amount ($)"><input type="number" inputMode="decimal" step="any" min="0" className="input" value={cv.regoAmount ?? ''} onChange={setCv('regoAmount', true)} /></Field>
        </div>
        <p className="label !mb-0 pt-1">Insurance</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Insurer"><input className="input" value={cv.insurer || ''} onChange={setCv('insurer')} /></Field>
          <Field label="Policy number"><input className="input" value={cv.policy || ''} onChange={setCv('policy')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Insurance due date"><input type="date" className="input" value={cv.insuranceDue || ''} onChange={setCv('insuranceDue')} /></Field>
          <Field label="Amount ($)"><input type="number" inputMode="decimal" step="any" min="0" className="input" value={cv.insuranceAmount ?? ''} onChange={setCv('insuranceAmount', true)} /></Field>
        </div>
      </div>
      <div className="card mb-3">
        <Field label="Vehicle fuel tank size (litres, optional)">
          <input type="number" inputMode="decimal" min="1" className="input" placeholder="e.g. 120" value={data.settings?.tankL ?? ''}
            onChange={e => { const v = e.target.value; update(d => { d.settings = { ...d.settings, tankL: v === '' ? '' : Number(v) } }) }} />
        </Field>
        <p className="text-xs text-slate-500 mt-1">Used to estimate how far a full tank takes you. No limits are applied to fill-ups.</p>
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
