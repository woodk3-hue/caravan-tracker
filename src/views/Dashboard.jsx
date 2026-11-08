import { Route, Fuel, Wrench, Flag } from 'lucide-react'
import { Header } from '../ui.jsx'
import { legDistance, nf, currentOdo, maintStatus, fmtDate } from '../util.js'

export default function Dashboard({ data, update, go }) {
  const towing = data.legs.filter(l => l.towing)
  const lifetime = towing.reduce((s, l) => s + legDistance(l), 0)
  const start = new Date(data.trip.startedAt)
  const tl = data.legs.filter(l => new Date(l.date) >= start)
  const tf = data.fuel.filter(f => new Date(f.date) >= start)
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

  const newTrip = () => {
    if (confirm('Start a new trip? Current trip stats reset (data is kept).'))
      update(d => { d.trip = { name: 'Trip from ' + fmtDate(new Date()), startedAt: new Date().toISOString() } })
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
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">{data.trip.name}</h2>
          <button className="text-sm text-teal-600 dark:text-teal-400 flex items-center gap-1" onClick={newTrip}><Flag size={14} />New trip</button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat v={nf(dist)} l="km" /><Stat v={days} l="active days" />
          <Stat v={litres ? `${nf(litres, 1)} L` : kwh ? `${nf(kwh, 1)} kWh` : '–'} l="fuel/energy" />
        </div>
        {litres > 0 && dist > 0 && <p className="text-sm text-slate-500 mt-2 text-center">{nf(litres / dist * 100, 1)} L/100km · ${nf(cost, 2)} spent</p>}
        {litres > 0 && kwh > 0 && <p className="text-sm text-slate-500 text-center">+ {nf(kwh, 1)} kWh</p>}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Quick icon={Route} label="Start trip leg" onClick={() => go('legs', 'new')} />
        <Quick icon={Fuel} label="Log fuel / power" onClick={() => go('fuel', 'new')} />
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
const Quick = ({ icon: Icon, label, onClick }) => (
  <button onClick={onClick} className="card flex flex-col items-center gap-1 py-4 text-sm font-medium active:bg-slate-100 dark:active:bg-slate-800">
    <Icon className="text-teal-600 dark:text-teal-400" />{label}
  </button>
)
