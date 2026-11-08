import { useEffect, useState } from 'react'
import { Plus, Trash2, Truck, Car } from 'lucide-react'
import { Field, Sheet, Empty, Header } from '../ui.jsx'
import { nowLocal, num, nf, fmtDateTime, legDistance, currentOdo } from '../util.js'
import { uid } from '../storage.js'

export default function Legs({ data, update, openForm, clearForm }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { if (openForm === 'new') { setOpen(true); clearForm() } }, [openForm])
  const legs = [...data.legs].sort((a, b) => b.date.localeCompare(a.date))
  const del = (id) => confirm('Delete this leg?') && update(d => { d.legs = d.legs.filter(l => l.id !== id) })

  return (
    <>
      <Header title="Trip legs" action={<button className="btn" onClick={() => setOpen(true)}><Plus size={18} />Add</button>} />
      {legs.length === 0 && <Empty>No legs yet. Tap Add to log your first drive.</Empty>}
      <div className="space-y-2">
        {legs.map(l => (
          <div key={l.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{l.from || '?'} → {l.to || '?'}</p>
                <p className="text-xs text-slate-500">{fmtDateTime(l.date)}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{nf(legDistance(l))} km</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">{l.towing ? <><Truck size={12} />Towing</> : <><Car size={12} />Uncoupled</>}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">ODO {nf(l.odoStart)} → {nf(l.odoEnd)}</p>
            {l.notes && <p className="text-sm mt-1">{l.notes}</p>}
            <button aria-label="Delete" className="mt-1 text-slate-400" onClick={() => del(l.id)}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      {open && <LegForm data={data} onClose={() => setOpen(false)}
        onSave={leg => { update(d => { d.legs.push(leg) }); setOpen(false) }} />}
    </>
  )
}

function LegForm({ data, onClose, onSave }) {
  const [f, setF] = useState({
    date: nowLocal(), odoStart: currentOdo(data) || '', odoEnd: '', from: '', to: '', towing: true, notes: ''
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const s = num(f.odoStart), e = num(f.odoEnd)
  const endErr = f.odoEnd !== '' && !isNaN(s) && e < s ? 'End odometer cannot be lower than start' : ''
  const startErr = f.odoStart !== '' && s < 0 ? 'Must be positive' : ''
  const valid = !isNaN(s) && !isNaN(e) && !endErr && !startErr
  const dist = valid ? e - s : null

  return (
    <Sheet title="New trip leg" onClose={onClose}>
      <form className="space-y-3" onSubmit={ev => { ev.preventDefault(); valid && onSave({ id: uid(), ...f, odoStart: s, odoEnd: e }) }}>
        <Field label="Date & time"><input type="datetime-local" className="input" value={f.date} onChange={set('date')} required /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Start ODO (km)" error={startErr}><input type="number" inputMode="decimal" className={`input ${startErr ? 'input-err' : ''}`} value={f.odoStart} onChange={set('odoStart')} required /></Field>
          <Field label="End ODO (km)" error={endErr}><input type="number" inputMode="decimal" className={`input ${endErr ? 'input-err' : ''}`} value={f.odoEnd} onChange={set('odoEnd')} required /></Field>
        </div>
        {dist != null && <p className="text-center font-semibold text-teal-600 dark:text-teal-400">Distance: {nf(dist, 1)} km</p>}
        <div className="grid grid-cols-2 gap-2">
          <Field label="From"><input className="input" value={f.from} onChange={set('from')} /></Field>
          <Field label="To"><input className="input" value={f.to} onChange={set('to')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[[true, 'Towing caravan', Truck], [false, 'Uncoupled', Car]].map(([v, l, Icon]) => (
            <button type="button" key={l} onClick={() => setF({ ...f, towing: v })}
              className={`min-h-[44px] rounded-xl flex items-center justify-center gap-2 font-medium ${f.towing === v ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}><Icon size={18} />{l}</button>
          ))}
        </div>
        <Field label="Road conditions / weather"><textarea rows={2} className="input" placeholder="Bitumen, corrugations, wet weather…" value={f.notes} onChange={set('notes')} /></Field>
        <button className="btn w-full" disabled={!valid}>Save leg</button>
      </form>
    </Sheet>
  )
}
