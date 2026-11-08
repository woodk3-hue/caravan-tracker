import { useEffect, useState } from 'react'
import { Plus, Trash2, Zap, Fuel } from 'lucide-react'
import { Pencil } from 'lucide-react'
import { Field, Sheet, Empty, Header } from '../ui.jsx'
import { nowLocal, num, nf, fmtDateTime, currentOdo } from '../util.js'
import { uid } from '../storage.js'

export default function FuelLog({ data, update, openForm, clearForm }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { if (openForm === 'new') { setOpen(true); clearForm() } }, [openForm])
  const list = [...data.fuel].sort((a, b) => b.date.localeCompare(a.date))
  const del = (id) => confirm('Delete this entry?') && update(d => { d.fuel = d.fuel.filter(x => x.id !== id) })

  return (
    <>
      <Header title="Fuel & power" action={<button className="btn" onClick={() => setOpen(true)}><Plus size={18} />Add</button>} />
      {list.length === 0 && <Empty>No fill-ups or charges yet.</Empty>}
      <div className="space-y-2">
        {list.map(x => (
          <div key={x.id} className="card flex justify-between">
            <div>
              <p className="font-semibold flex items-center gap-1">{x.kwh ? <Zap size={16} /> : <Fuel size={16} />}{x.kwh ? `${nf(x.kwh, 1)} kWh` : `${nf(x.litres, 1)} L`}</p>
              <p className="text-xs text-slate-500">{fmtDateTime(x.date)} · ODO {nf(x.odo)}</p>
              {x.location && <p className="text-sm">{x.location}</p>}
              <div className="flex gap-4 mt-1 text-slate-400">
                <button aria-label="Edit" className="p-1" onClick={() => setOpen(x)}><Pencil size={16} /></button>
                <button aria-label="Delete" className="p-1" onClick={() => del(x.id)}><Trash2 size={16} /></button>
              </div>
            </div>
            <p className="text-lg font-bold">${nf(x.cost, 2)}</p>
          </div>
        ))}
      </div>
      {open && <FuelForm data={data} initial={open === true ? null : open} onClose={() => setOpen(false)} onSave={e => { update(d => { const i = d.fuel.findIndex(x => x.id === e.id); if (i >= 0) d.fuel[i] = e; else d.fuel.push(e) }); setOpen(false) }} />}
    </>
  )
}

function FuelForm({ data, initial, onClose, onSave }) {
  const [f, setF] = useState(initial
    ? { date: initial.date, odo: initial.odo, type: initial.kwh ? 'power' : 'fuel', amount: initial.kwh ?? initial.litres, cost: initial.cost || '', location: initial.location || '' }
    : { date: nowLocal(), odo: currentOdo(data) || '', type: 'fuel', amount: '', cost: '', location: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const odo = num(f.odo), amt = num(f.amount), cost = num(f.cost)
  const odoErr = f.odo !== '' && odo < 0 ? 'Must be positive' : ''
  const valid = !isNaN(odo) && !odoErr && amt > 0 && (f.cost === '' || cost >= 0)
  const submit = (ev) => {
    ev.preventDefault()
    if (!valid) return
    onSave({ id: initial?.id ?? uid(), date: f.date, odo, cost: isNaN(cost) ? 0 : cost, location: f.location,
      ...(f.type === 'fuel' ? { litres: amt } : { kwh: amt }) })
  }
  return (
    <Sheet title={initial ? 'Edit entry' : 'Log fuel / power'} onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-2">
          {[['fuel', 'Fuel (L)'], ['power', 'Power (kWh)']].map(([v, l]) => (
            <button type="button" key={v} onClick={() => setF({ ...f, type: v })}
              className={`min-h-[44px] rounded-xl font-medium ${f.type === v ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>{l}</button>
          ))}
        </div>
        <Field label="Date & time"><input type="datetime-local" className="input" value={f.date} onChange={set('date')} required /></Field>
        <Field label="Odometer (km)" error={odoErr}><input type="number" inputMode="decimal" className={`input ${odoErr ? 'input-err' : ''}`} value={f.odo} onChange={set('odo')} required /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={f.type === 'fuel' ? 'Litres' : 'kWh'}><input type="number" inputMode="decimal" step="any" className="input" value={f.amount} onChange={set('amount')} required /></Field>
          <Field label="Total cost ($)"><input type="number" inputMode="decimal" step="any" className="input" value={f.cost} onChange={set('cost')} /></Field>
        </div>
        <Field label="Location"><input className="input" value={f.location} onChange={set('location')} /></Field>
        <button className="btn w-full" disabled={!valid}>Save</button>
      </form>
    </Sheet>
  )
}
