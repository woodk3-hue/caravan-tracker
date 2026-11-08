import { useEffect, useState } from 'react'
import { Plus, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react'
import { Field, Sheet, Header } from '../ui.jsx'
import { nowLocal, num, nf, fmtDate, currentOdo, maintStatus } from '../util.js'
import { uid } from '../storage.js'

const colors = { ok: 'text-emerald-600', soon: 'text-amber-600', overdue: 'text-red-500' }

export default function Maintenance({ data, update, openForm, clearForm }) {
  const [rec, setRec] = useState(null)   // item id or '' (pick)
  const [adding, setAdding] = useState(false)
  useEffect(() => { if (openForm === 'record') { setRec(''); clearForm() } }, [openForm])
  const odo = currentOdo(data)
  const del = (id) => confirm('Remove this checklist item and its history?') && update(d => { d.maintenance = d.maintenance.filter(i => i.id !== id) })

  return (
    <>
      <Header title="Maintenance" action={<button className="btn" onClick={() => setAdding(true)}><Plus size={18} />Item</button>} />
      <p className="text-sm text-slate-500 mb-3">Current odometer: {nf(odo)} km</p>
      <div className="space-y-2">
        {data.maintenance.map(i => {
          const st = maintStatus(i, odo)
          const last = i.history[0]
          return (
            <div key={i.id} className="card">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{i.name}</p>
                  <p className="text-xs text-slate-500">Every {i.intervalKm ? `${nf(i.intervalKm)} km` : ''}{i.intervalKm && i.intervalMonths ? ' / ' : ''}{i.intervalMonths ? `${i.intervalMonths} mo` : ''}</p>
                  <p className={`text-sm mt-1 flex items-center gap-1 ${colors[st.level]}`}>
                    {st.level === 'ok' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    {!last ? 'Never done · ' : ''}
                    {st.kmLeft != null && (st.kmLeft < 0 ? `${nf(-st.kmLeft)} km overdue` : `${nf(st.kmLeft)} km left`)}
                    {st.daysLeft != null && ` · ${st.daysLeft < 0 ? `${-st.daysLeft} days overdue` : `${st.daysLeft} days left`}`}
                  </p>
                  {last && <p className="text-xs text-slate-500">Last: {fmtDate(last.date)} @ {nf(last.odo)} km{last.notes ? ` — ${last.notes}` : ''}</p>}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <button className="btn !min-h-[40px] !px-3 text-sm" onClick={() => setRec(i.id)}>Done</button>
                  <button aria-label="Delete item" className="text-slate-400" onClick={() => del(i.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {rec !== null && <RecordForm data={data} initial={rec} onClose={() => setRec(null)}
        onSave={(id, entry) => { update(d => { d.maintenance.find(i => i.id === id).history.unshift(entry) }); setRec(null) }} />}
      {adding && <ItemForm onClose={() => setAdding(false)}
        onSave={it => { update(d => { d.maintenance.push(it) }); setAdding(false) }} />}
    </>
  )
}

function RecordForm({ data, initial, onClose, onSave }) {
  const [f, setF] = useState({ id: initial || data.maintenance[0]?.id || '', date: nowLocal().slice(0, 10), odo: currentOdo(data) || '', notes: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const odo = num(f.odo)
  const err = f.odo !== '' && odo < 0 ? 'Must be positive' : ''
  const valid = f.id && !isNaN(odo) && !err
  return (
    <Sheet title="Record maintenance" onClose={onClose}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); valid && onSave(f.id, { id: uid(), date: f.date, odo, notes: f.notes }) }}>
        <Field label="Item"><select className="input" value={f.id} onChange={set('id')}>{data.maintenance.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
        <Field label="Date completed"><input type="date" className="input" value={f.date} onChange={set('date')} required /></Field>
        <Field label="Odometer (km)" error={err}><input type="number" inputMode="decimal" className={`input ${err ? 'input-err' : ''}`} value={f.odo} onChange={set('odo')} required /></Field>
        <Field label="Notes"><textarea rows={2} className="input" value={f.notes} onChange={set('notes')} /></Field>
        <button className="btn w-full" disabled={!valid}>Mark completed</button>
      </form>
    </Sheet>
  )
}

function ItemForm({ onClose, onSave }) {
  const [f, setF] = useState({ name: '', intervalKm: '', intervalMonths: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const km = num(f.intervalKm), mo = num(f.intervalMonths)
  const valid = f.name.trim() && (km > 0 || mo > 0)
  return (
    <Sheet title="New checklist item" onClose={onClose}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); valid && onSave({ id: uid(), name: f.name.trim(), intervalKm: km > 0 ? km : 0, intervalMonths: mo > 0 ? mo : 0, history: [] }) }}>
        <Field label="Name"><input className="input" value={f.name} onChange={set('name')} required /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Every (km)"><input type="number" inputMode="numeric" className="input" value={f.intervalKm} onChange={set('intervalKm')} /></Field>
          <Field label="Every (months)"><input type="number" inputMode="numeric" className="input" value={f.intervalMonths} onChange={set('intervalMonths')} /></Field>
        </div>
        <p className="text-xs text-slate-500">Set a km interval, a time interval, or both.</p>
        <button className="btn w-full" disabled={!valid}>Add item</button>
      </form>
    </Sheet>
  )
}
