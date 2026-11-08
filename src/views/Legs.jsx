import { useEffect, useState } from 'react'
import { Plus, Trash2, Truck, Car } from 'lucide-react'
import { Pencil } from 'lucide-react'
import { Field, Sheet, Empty, Header } from '../ui.jsx'
import { nowLocal, num, nf, fmtDateTime, legDistance, currentOdo } from '../util.js'
import { uid } from '../storage.js'

// Caravan has no odometer: running total is the sum of leg distances in date order
function renumber(legs) {
  legs.sort((a, b) => a.date.localeCompare(b.date))
  let t = 0
  legs.forEach(l => { const km = legDistance(l); l.odoStart = t; l.odoEnd = t + km; t += km })
}

export default function Legs({ data, update, openForm, clearForm }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { if (openForm === 'new') { setOpen(true); clearForm() } }, [openForm])
  const legs = [...data.legs].sort((a, b) => b.date.localeCompare(a.date))
  const del = (id) => confirm('Delete this leg?') && update(d => { d.legs = d.legs.filter(l => l.id !== id); renumber(d.legs) })

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
            <p className="text-xs text-slate-500 mt-1">Caravan total: {nf(l.odoEnd)} km</p>
            {l.notes && <p className="text-sm mt-1">{l.notes}</p>}
            <div className="flex gap-4 mt-1 text-slate-400">
              <button aria-label="Edit" className="p-1" onClick={() => setOpen(l)}><Pencil size={16} /></button>
              <button aria-label="Delete" className="p-1" onClick={() => del(l.id)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      {open && <LegForm data={data} initial={open === true ? null : open} onClose={() => setOpen(false)}
        onSave={leg => { update(d => { const i = d.legs.findIndex(x => x.id === leg.id); if (i >= 0) d.legs[i] = leg; else d.legs.push(leg); renumber(d.legs) }); setOpen(false) }} />}
    </>
  )
}

function LegForm({ data, initial, onClose, onSave }) {
  const [f, setF] = useState(initial ? { ...initial, km: legDistance(initial) } : {
    date: nowLocal(), km: '', from: '', to: '', towing: true, notes: ''
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const km = num(f.km)
  const kmErr = f.km !== '' && !(km > 0) ? 'Distance must be greater than 0' : ''
  const valid = km > 0
  const before = initial ? initial.odoStart : currentOdo(data)

  return (
    <Sheet title={initial ? 'Edit trip leg' : 'New trip leg'} onClose={onClose}>
      <form className="space-y-3" onSubmit={ev => { ev.preventDefault(); if (!valid) return; const { km: _k, ...rest } = f; onSave({ ...rest, id: initial?.id ?? uid(), odoStart: before, odoEnd: before + km }) }}>
        <Field label="Date & time"><input type="datetime-local" className="input" value={f.date} onChange={set('date')} required /></Field>
        <Field label="Distance travelled (km)" error={kmErr}><input type="number" inputMode="decimal" step="any" className={`input ${kmErr ? 'input-err' : ''}`} value={f.km} onChange={set('km')} required /></Field>
        {valid && <p className="text-center font-semibold text-teal-600 dark:text-teal-400">Caravan total after: {nf(before + km, 1)} km</p>}
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
