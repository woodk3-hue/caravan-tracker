import { useState } from 'react'
import { Route, Fuel, Wrench, Flag, Pencil, Moon, Play } from 'lucide-react'
import { Header, Field, Sheet } from '../ui.jsx'
import { legDistance, nf, currentOdo, maintStatus, fmtDate, num } from '../util.js'
import { uid } from '../storage.js'

const toDay = (iso) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10) }

export default function Dashboard({ data, update, go }) {
  const [form, setForm] = useState(null) // 'start' | 'edit'
  const trip = data.trip
  const active = trip.active === true
  const start = new Date(trip.startedAt)
  const startDay = toDay(trip.startedAt)
  const towing = data.legs.filter(l => l.towing)
  const lifetime = towing.reduce((s, l) => s + legDistance(l), 0)
  const tl = data.legs.filter(l => new Date(l.date) >= start)
  const tf = data.fuel.filter(f => new Date(f.date) >= start)
  const stops = data.sites.filter(s => s.date >= startDay).sort((a, b) => a.date.localeCompare(b.date))
  const dist = tl.reduce((s, l) => s + legDistance(l), 0)
  const dayset = new Set()
  tl.forEach(l => {
    const a = new Date(l.date.slice(0, 10)), b = new Date((l.endDate || l.date).slice(0, 10))
    for (let t = a; t <= b && dayset.size < 5000; t = new Date(t.getTime() + 864e5)) dayset.add(t.toISOString().slice(0, 10))
  })
  const days = dayset.size
  const litres = tf.reduce((s, f) => s + (f.litres || 0), 0)
  const kwh = tf.reduce((s, f) => s + (f.kwh || 0), 0)
  const cost = tf.reduce((s, f) => s + (f.cost || 0), 0)
  const odo = currentOdo(data)
  const due = data.maintenance.filter(i => maintStatus(i, odo).level !== 'ok')

  const endTrip = () => confirm('End this trip? Your data is kept.') && update(d => { d.trip.active = false; if (!d.trip.endDate) d.trip.endDate = toDay(new Date().toISOString()) })

  return (
    <>
      <Header title="Caravan Logbook" />
      <div className="card mb-3 bg-teal-600 dark:bg-teal-700 !border-0 text-white">
        <p className="text-sm opacity-80">Lifetime km towed</p>
        <p className="text-4xl font-bold">{nf(lifetime)} <span className="text-lg font-medium">km</span></p>
        <p className="text-sm opacity-80 mt-1">Odometer: {nf(odo)} km</p>
      </div>

      <div className="card mb-3">
        <div className="flex justify-between items-center mb-1">
          <h2 className="font-semibold flex items-center gap-1">{trip.name}
            <button aria-label="Edit trip" className="p-1 text-slate-400" onClick={() => setForm('edit')}><Pencil size={14} /></button>
          </h2>
          {active
            ? <button className="text-sm text-teal-600 dark:text-teal-400 flex items-center gap-1" onClick={endTrip}><Flag size={14} />End trip</button>
            : <button className="text-sm text-teal-600 dark:text-teal-400 flex items-center gap-1" onClick={() => setForm('start')}><Play size={14} />New trip</button>}
        </div>
        <p className="text-sm text-slate-500 mb-2">
          {trip.from || trip.to ? `${trip.from || '?'} ${trip.returnTrip ? '⇄' : '→'} ${trip.to || '?'} · ` : ''}{trip.returnTrip ? 'Return' : trip.from || trip.to ? 'One way' : ''}{trip.from || trip.to ? ' · ' : ''}
          {fmtDate(trip.startedAt)}{trip.endDate && trip.endDate !== startDay ? ` – ${fmtDate(trip.endDate)}` : ''}{!active && trip.active === false ? ' · ended' : ''}
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat v={nf(dist)} l="km" /><Stat v={days} l="active days" />
          <Stat v={litres ? `${nf(litres, 1)} L` : kwh ? `${nf(kwh, 1)} kWh` : '–'} l="fuel/energy" />
        </div>
        {litres > 0 && dist > 0 && <p className="text-sm text-slate-500 mt-2 text-center">{nf(litres / dist * 100, 1)} L/100km · ${nf(cost, 2)} spent</p>}
        {litres > 0 && kwh > 0 && <p className="text-sm text-slate-500 text-center">+ {nf(kwh, 1)} kWh</p>}
        {stops.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 mb-1">Overnight stops ({stops.length})</p>
            {stops.map(s => <p key={s.id} className="text-sm flex items-center gap-1"><Moon size={13} />{s.name} <span className="text-slate-500 text-xs">· {fmtDate(s.date)}</span></p>)}
          </div>
        )}
      </div>

      {form === 'start' && <StartTrip odo={odo} onClose={() => setForm(null)} onSave={({ trip: t, fill }) => {
        update(d => { d.trip = t; if (fill) d.fuel.push(fill) }); setForm(null)
      }} />}
      {form === 'edit' && <EditTrip trip={trip} onClose={() => setForm(null)} onSave={t => { update(d => { d.trip = { ...d.trip, ...t } }); setForm(null) }} />}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Quick icon={Route} label="Start trip leg" onClick={() => go('legs', 'new')} />
        <Quick icon={Fuel} label={active ? 'Add tank fill-up' : 'Log fuel / power'} hi={active} onClick={() => go('fuel', 'new')} />
        <Quick icon={Moon} label="Add overnight stop" onClick={() => go('sites', 'new')} />
        <Quick icon={Wrench} label="Record service" onClick={() => go('maint', 'record')} />
      </div>

      {due.length > 0 && (
        <div className="card border-amber-400 dark:border-amber-600">
          <h2 className="font-semibold mb-1">Maintenance due</h2>
          {due.map(i => <p key={i.id} className={`text-sm ${maintStatus(i, odo).level === 'overdue' ? 'text-red-500' : 'text-amber-600'}`}>• {i.name}</p>)}
        </div>
      )}
    </>
  )
}

const Stat = ({ v, l }) => <div><p className="text-xl font-bold">{v}</p><p className="text-xs text-slate-500">{l}</p></div>
const Quick = ({ icon: Icon, label, onClick, hi }) => (
  <button onClick={onClick} className={`card flex flex-col items-center gap-1 py-4 text-sm font-medium ${hi ? '!bg-teal-600 !text-white !border-0' : 'active:bg-slate-100 dark:active:bg-slate-800'}`}>
    <Icon className={hi ? '' : 'text-teal-600 dark:text-teal-400'} />{label}
  </button>
)

function StartTrip({ odo, onClose, onSave }) {
  const today = toDay(new Date().toISOString())
  const [f, setF] = useState({ name: '', date: today, endDate: '', returnTrip: true, odo: odo || '', from: '', to: '', litres: '', cost: '', station: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const o = num(f.odo), l = num(f.litres), c = num(f.cost)
  const odoErr = f.odo !== '' && o < 0 ? 'Must be positive' : ''
  const dateErr = f.endDate && f.endDate < f.date ? 'End date cannot be before start date' : ''
  const valid = f.date && !odoErr && !dateErr && (f.litres === '' || l > 0)
  const submit = (e) => {
    e.preventDefault(); if (!valid) return
    onSave({
      trip: { name: f.name.trim() || (f.to ? `Trip to ${f.to.trim()}` : 'Trip from ' + fmtDate(f.date)), startedAt: new Date(f.date + 'T00:00:00').toISOString(), active: true, endDate: f.endDate, returnTrip: f.returnTrip, from: f.from.trim(), to: f.to.trim() },
      fill: l > 0 ? { id: uid(), date: f.date + 'T08:00', odo: isNaN(o) ? 0 : o, litres: l, cost: isNaN(c) ? 0 : c, location: f.station } : null
    })
  }
  return (
    <Sheet title="Start new trip" onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <Field label="Trip name (optional)"><input className="input" value={f.name} onChange={set('name')} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Start date"><input type="date" className="input" value={f.date} onChange={set('date')} required /></Field>
          <Field label="Odometer (km)" error={odoErr}><input type="number" inputMode="decimal" className="input" value={f.odo} onChange={set('odo')} /></Field>
        </div>
        <Field label="End date (optional)" error={dateErr}><input type="date" className={`input ${dateErr ? 'input-err' : ''}`} min={f.date} value={f.endDate} onChange={set('endDate')} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Starting from"><input className="input" value={f.from} onChange={set('from')} /></Field>
          <Field label="Going to"><input className="input" value={f.to} onChange={set('to')} /></Field>
        </div>
        <Toggle value={f.returnTrip} onChange={v => setF({ ...f, returnTrip: v })} />
        <p className="label !mb-0 pt-1">Tank fill-up at start (optional)</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Litres"><input type="number" inputMode="decimal" step="any" className="input" value={f.litres} onChange={set('litres')} /></Field>
          <Field label="Cost ($)"><input type="number" inputMode="decimal" step="any" className="input" value={f.cost} onChange={set('cost')} /></Field>
        </div>
        <Field label="Fuel station"><input className="input" value={f.station} onChange={set('station')} /></Field>
        <button className="btn w-full" disabled={!valid}>Start trip</button>
      </form>
    </Sheet>
  )
}

function EditTrip({ trip, onClose, onSave }) {
  const [name, setName] = useState(trip.name)
  const [start, setStart] = useState(toDay(trip.startedAt))
  const [from, setFrom] = useState(trip.from || '')
  const [to, setTo] = useState(trip.to || '')
  const [end, setEnd] = useState(trip.endDate || '')
  const [ret, setRet] = useState(trip.returnTrip ?? true)
  const endErr = end && end < start ? 'End date cannot be before start date' : ''
  return (
    <Sheet title="Edit trip" onClose={onClose}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); start && !endErr && onSave({ name: name.trim() || 'Current trip', startedAt: new Date(start + 'T00:00:00').toISOString(), endDate: end, returnTrip: ret, from: from.trim(), to: to.trim() }) }}>
        <Field label="Trip name"><input className="input" value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Trip start date"><input type="date" className="input" value={start} onChange={e => setStart(e.target.value)} required /></Field>
        <Field label="End date (optional)" error={endErr}><input type="date" className={`input ${endErr ? 'input-err' : ''}`} min={start} value={end} onChange={e => setEnd(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="From"><input className="input" value={from} onChange={e => setFrom(e.target.value)} /></Field>
          <Field label="To"><input className="input" value={to} onChange={e => setTo(e.target.value)} /></Field>
        </div>
        <Toggle value={ret} onChange={setRet} />
        <p className="text-xs text-slate-500">Legs, fuel entries and stops dated on or after the start date count towards this trip.</p>
        <button className="btn w-full">Save trip</button>
      </form>
    </Sheet>
  )
}

function Toggle({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[[true, 'Return trip'], [false, 'One way']].map(([v, l]) => (
        <button type="button" key={l} onClick={() => onChange(v)}
          className={`min-h-[44px] rounded-xl font-medium ${value === v ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>{l}</button>
      ))}
    </div>
  )
}
