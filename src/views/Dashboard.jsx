import { useState } from 'react'
import { Route, Fuel, Wrench, Flag, Pencil, Moon, Play } from 'lucide-react'
import { Header, Field, Sheet } from '../ui.jsx'
import { legDistance, nf, currentOdo, maintStatus, fmtDate, num, renumber, linkFuel, tankL, fuelEconomy } from '../util.js'
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
  const econ = fuelEconomy(data)
  const lastEcon = [...data.fuel].sort((a, b) => b.date.localeCompare(a.date)).map(x => econ[x.id]).find(Boolean)
  const tank = tankL(data)
  const stayCost = stops.reduce((s, x) => s + (Number(x.cost) || 0), 0)
  const odo = currentOdo(data)
  const due = data.maintenance.filter(i => maintStatus(i, odo).level !== 'ok')

  const endTrip = () => {
    const needReturn = trip.returnTrip && trip.legKm > 0 && !trip.returnLegAdded
    const addReturn = needReturn && confirm(`End trip and add the ${nf(trip.legKm)} km return leg ${trip.to || ''} → ${trip.from || ''}?\n\nOK = add return leg, Cancel = choose again`)
    if (needReturn && !addReturn && !confirm('End trip WITHOUT adding the return leg?')) return
    if (!needReturn && !confirm('End this trip? Your data is kept.')) return
    update(d => {
      d.trip.active = false
      if (!d.trip.endDate) d.trip.endDate = toDay(new Date().toISOString())
      if (addReturn) {
        const rid = uid()
        d.legs.push({ id: rid, date: d.trip.endDate + 'T08:00', from: d.trip.to || '', to: d.trip.from || '', towing: true, notes: 'Return leg', odoStart: 0, odoEnd: d.trip.legKm })
        d.trip.returnLegAdded = true
        d.trip.returnLegId = rid
        renumber(d.legs)
      }
    })
  }

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
        {lastEcon && <p className="text-sm text-slate-500 text-center">Last full fill-up: {nf(lastEcon, 1)} L/100km{tank > 0 ? ` · ~${nf(tank / lastEcon * 100)} km per tank` : ''}</p>}
        {stayCost > 0 && <p className="text-sm text-slate-500 text-center">${nf(stayCost, 2)} paid for stays</p>}
        {litres > 0 && kwh > 0 && <p className="text-sm text-slate-500 text-center">+ {nf(kwh, 1)} kWh</p>}
        {stops.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 mb-1">Overnight stops ({stops.length})</p>
            {stops.map(s => <p key={s.id} className="text-sm flex items-center gap-1"><Moon size={13} />{s.name} <span className="text-slate-500 text-xs">· {fmtDate(s.date)}{s.cost ? ` · $${nf(s.cost, 2)}` : ''}</span></p>)}
          </div>
        )}
      </div>

      {form === 'start' && <StartTrip odo={odo} onClose={() => setForm(null)} onSave={({ trip: t, fill, legs }) => {
        update(d => { d.trip = t; if (fill) d.fuel.push(fill); legs.forEach(l => d.legs.push(l)); if (legs.length) renumber(d.legs) }); setForm(null)
      }} />}
      {form === 'edit' && <EditTrip trip={trip} data={data} odo={odo} onClose={() => setForm(null)} onSave={f => { update(d => applyTripEdit(d, f)); setForm(null) }} />}

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
  const [f, setF] = useState({ name: '', date: today, endDate: '', km: '', returnTrip: true, odo: odo || '', from: '', to: '', litres: '', cost: '', ppl: '', station: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setLinked = (k) => (e) => setF(linkFuel(f, k, e.target.value))
  const o = num(f.odo), l = num(f.litres), c = num(f.cost)
  const odoErr = f.odo !== '' && o < 0 ? 'Must be positive' : ''
  const dateErr = f.endDate && f.endDate < f.date ? 'End date cannot be before start date' : ''
  const valid = f.date && !odoErr && !dateErr && (f.litres === '' || l > 0)
  const submit = (e) => {
    e.preventDefault(); if (!valid) return
    const km = num(f.km), legs = []
    const outId = uid(), retId = uid(), fillId = uid()
    const from = f.from.trim(), to = f.to.trim()
    if (km > 0) {
      legs.push({ id: outId, date: f.date + 'T08:00', from, to, towing: true, notes: '', odoStart: 0, odoEnd: km })
      if (f.returnTrip && f.endDate) legs.push({ id: retId, date: f.endDate + 'T08:00', from: to, to: from, towing: true, notes: 'Return leg', odoStart: 0, odoEnd: km })
    }
    onSave({
      legs,
      trip: { name: f.name.trim() || (f.to ? `Trip to ${f.to.trim()}` : 'Trip from ' + fmtDate(f.date)), startedAt: new Date(f.date + 'T00:00:00').toISOString(), active: true, endDate: f.endDate, returnTrip: f.returnTrip, legKm: km > 0 ? km : 0, returnLegAdded: km > 0 && !!f.returnTrip && !!f.endDate, outLegId: km > 0 ? outId : '', returnLegId: km > 0 && f.returnTrip && f.endDate ? retId : '', fillId: l > 0 ? fillId : '', from, to },
      fill: l > 0 ? { id: fillId, date: f.date + 'T08:00', odo: isNaN(o) ? 0 : o, litres: l, cost: isNaN(c) ? 0 : c, ...(num(f.ppl) >= 0 ? { ppl: num(f.ppl) } : {}), location: f.station } : null
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
        <Field label="Distance one way (km)"><input type="number" inputMode="decimal" step="any" className="input" value={f.km} onChange={set('km')} /></Field>
        {num(f.km) > 0 && <p className="text-sm text-center text-teal-600 dark:text-teal-400 font-medium">
          {f.returnTrip ? (f.endDate ? `Adds 2 legs: ${nf(num(f.km))} km out + ${nf(num(f.km))} km back = ${nf(num(f.km) * 2)} km` : `Adds ${nf(num(f.km))} km now; the ${nf(num(f.km))} km return is added when you tap End trip`) : `Adds one leg of ${nf(num(f.km))} km`}
        </p>}
        <p className="label !mb-0 pt-1">Tank fill-up at start (optional)</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Litres"><input type="number" inputMode="decimal" step="any" className="input" value={f.litres} onChange={setLinked('litres')} /></Field>
          <Field label="Cost ($)"><input type="number" inputMode="decimal" step="any" className="input" value={f.cost} onChange={setLinked('cost')} /></Field>
        </div>
        <Field label="Price per litre ($/L, optional)"><input type="number" inputMode="decimal" step="any" className="input" placeholder="e.g. 2.149" value={f.ppl} onChange={setLinked('ppl')} /></Field>
        <Field label="Fuel station"><input className="input" value={f.station} onChange={set('station')} /></Field>
        <button className="btn w-full" disabled={!valid}>Start trip</button>
      </form>
    </Sheet>
  )
}

// Saves edits to the trip and keeps its linked legs / first fill-up in sync (creating them if missing)
function applyTripEdit(d, f) {
  const t = d.trip, km = num(f.km), l = num(f.litres), c = num(f.cost)
  const from = f.from.trim(), to = f.to.trim()
  // Adopt legs created before trips were linked to them, so edits update rather than duplicate
  const oldDay = toDay(t.startedAt), pf = t.from || '', pt = t.to || ''
  if (!d.legs.some(x => x.id === t.outLegId)) {
    const m = d.legs.find(x => (x.from || '') === pf && (x.to || '') === pt && x.date.slice(0, 10) >= oldDay)
    if (m) t.outLegId = m.id
  }
  if (!d.legs.some(x => x.id === t.returnLegId)) {
    const m = d.legs.find(x => x.id !== t.outLegId && (x.from || '') === pt && (x.to || '') === pf && x.date.slice(0, 10) >= oldDay)
    if (m) t.returnLegId = m.id
  }
  if (!d.fuel.some(x => x.id === t.fillId)) {
    const m = d.fuel.find(x => x.date.slice(0, 10) === oldDay && x.litres)
    if (m) t.fillId = m.id
  }
  Object.assign(t, { name: f.name.trim() || 'Current trip', startedAt: new Date(f.date + 'T00:00:00').toISOString(), endDate: f.endDate, returnTrip: f.returnTrip, from, to })
  if (km > 0) {
    t.legKm = km
    let out = d.legs.find(x => x.id === t.outLegId)
    if (!out) { out = { id: uid(), towing: true, notes: '' }; d.legs.push(out); t.outLegId = out.id }
    Object.assign(out, { date: f.date + 'T08:00', from, to, odoStart: 0, odoEnd: km })
    let ret = d.legs.find(x => x.id === t.returnLegId)
    if (f.returnTrip && (f.endDate || ret)) {
      if (!ret) { ret = { id: uid(), towing: true, notes: 'Return leg' }; d.legs.push(ret); t.returnLegId = ret.id }
      Object.assign(ret, { date: (f.endDate || ret.date.slice(0, 10)) + 'T08:00', from: to, to: from, odoStart: 0, odoEnd: km })
    } else if (!f.returnTrip && ret) {
      d.legs = d.legs.filter(x => x !== ret); t.returnLegId = ''
    }
  }
  t.returnLegAdded = d.legs.some(x => x.id === t.returnLegId)
  // Remove exact copies of the trip's legs left by earlier edits
  const same = (a, b) => (a.from || '') === (b.from || '') && (a.to || '') === (b.to || '') && a.date.slice(0, 10) === b.date.slice(0, 10) && legDistance(a) === legDistance(b)
  const linked = [d.legs.find(x => x.id === t.outLegId), d.legs.find(x => x.id === t.returnLegId)].filter(Boolean)
  d.legs = d.legs.filter(x => linked.includes(x) || !linked.some(k => same(x, k)))
  if (l > 0) {
    let fill = d.fuel.find(x => x.id === t.fillId)
    if (!fill) { fill = { id: uid(), odo: f.odo === '' ? 0 : num(f.odo) }; d.fuel.push(fill); t.fillId = fill.id }
    Object.assign(fill, { date: f.date + 'T08:00', litres: l, cost: isNaN(c) ? 0 : c, location: f.station })
    if (num(f.ppl) >= 0) fill.ppl = num(f.ppl)
    d.fuel = d.fuel.filter(x => x === fill || !(x.date === fill.date && x.litres === fill.litres && x.cost === fill.cost && (x.location || '') === (fill.location || '')))
  }
  renumber(d.legs)
}

function EditTrip({ trip, data, odo, onClose, onSave }) {
  const out = data.legs.find(x => x.id === trip.outLegId)
  const fill = data.fuel.find(x => x.id === trip.fillId)
  const [f, setF] = useState({
    name: trip.name, date: toDay(trip.startedAt), endDate: trip.endDate || '', returnTrip: trip.returnTrip ?? true,
    from: trip.from || '', to: trip.to || '',
    km: out ? legDistance(out) : (trip.legKm || ''),
    odo: fill?.odo ?? (odo || ''), litres: fill?.litres ?? '', cost: fill?.cost || '',
    ppl: fill?.ppl ?? (fill?.litres && fill?.cost ? +(fill.cost / fill.litres).toFixed(3) : ''), station: fill?.location || ''
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setLinked = (k) => (e) => setF(linkFuel(f, k, e.target.value))
  const dateErr = f.endDate && f.endDate < f.date ? 'End date cannot be before start date' : ''
  const kmErr = f.km !== '' && !(num(f.km) > 0) ? 'Must be greater than 0' : ''
  const valid = f.date && !dateErr && !kmErr && (f.litres === '' || num(f.litres) > 0)
  return (
    <Sheet title="Edit trip" onClose={onClose}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); valid && onSave(f) }}>
        <Field label="Trip name"><input className="input" value={f.name} onChange={set('name')} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Start date"><input type="date" className="input" value={f.date} onChange={set('date')} required /></Field>
          <Field label="End date (optional)" error={dateErr}><input type="date" className={`input ${dateErr ? 'input-err' : ''}`} min={f.date} value={f.endDate} onChange={set('endDate')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="From"><input className="input" value={f.from} onChange={set('from')} /></Field>
          <Field label="To"><input className="input" value={f.to} onChange={set('to')} /></Field>
        </div>
        <Toggle value={f.returnTrip} onChange={v => setF({ ...f, returnTrip: v })} />
        <Field label="Distance one way (km)" error={kmErr}><input type="number" inputMode="decimal" step="any" className={`input ${kmErr ? 'input-err' : ''}`} value={f.km} onChange={set('km')} /></Field>
        <p className="label !mb-0 pt-1">Tank fill-up at start</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Litres"><input type="number" inputMode="decimal" step="any" className="input" value={f.litres} onChange={setLinked('litres')} /></Field>
          <Field label="Cost ($)"><input type="number" inputMode="decimal" step="any" className="input" value={f.cost} onChange={setLinked('cost')} /></Field>
        </div>
        <Field label="Price per litre ($/L, optional)"><input type="number" inputMode="decimal" step="any" className="input" placeholder="e.g. 2.149" value={f.ppl} onChange={setLinked('ppl')} /></Field>
        <Field label="Fuel station"><input className="input" value={f.station} onChange={set('station')} /></Field>
        <p className="text-xs text-slate-500">Saving updates this trip's legs and first fill-up (in the Legs and Fuel tabs). Extra fill-ups are edited in the Fuel tab.</p>
        <button className="btn w-full" disabled={!valid}>Save trip</button>
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
