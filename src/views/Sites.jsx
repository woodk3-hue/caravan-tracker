import { useEffect, useState } from 'react'
import { Plus, Trash2, Star, MapPin, Crosshair } from 'lucide-react'
import { Pencil } from 'lucide-react'
import { Field, Sheet, Empty, Header } from '../ui.jsx'
import { nowLocal, fmtDate } from '../util.js'
import { uid } from '../storage.js'

const AMENITIES = ['Power', 'Water', 'Toilets', 'Showers', 'Dump point', 'Pet friendly', 'Phone signal', 'Free']

export default function Sites({ data, update, openForm, clearForm }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { if (openForm === 'new') { setOpen(true); clearForm() } }, [openForm])
  const list = [...data.sites].sort((a, b) => b.date.localeCompare(a.date))
  const del = (id) => confirm('Delete this campsite?') && update(d => { d.sites = d.sites.filter(s => s.id !== id) })
  return (
    <>
      <Header title="Campsites & stops" action={<button className="btn" onClick={() => setOpen(true)}><Plus size={18} />Add</button>} />
      {list.length === 0 && <Empty>No campsites saved yet.</Empty>}
      <div className="space-y-2">
        {list.map(s => (
          <div key={s.id} className="card">
            <div className="flex justify-between">
              <p className="font-semibold">{s.name}</p>
              <p className="flex">{[1, 2, 3, 4, 5].map(n => <Star key={n} size={14} className={n <= s.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'} />)}</p>
            </div>
            <p className="text-xs text-slate-500">{fmtDate(s.date)}</p>
            {s.location && <p className="text-sm flex items-center gap-1"><MapPin size={14} />{s.location}</p>}
            {s.amenities.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{s.amenities.map(a => <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">{a}</span>)}</div>}
            {s.notes && <p className="text-sm mt-1">{s.notes}</p>}
            <div className="flex gap-4 mt-1 text-slate-400">
              <button aria-label="Edit" className="p-1" onClick={() => setOpen(s)}><Pencil size={16} /></button>
              <button aria-label="Delete" className="p-1" onClick={() => del(s.id)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      {open && <SiteForm initial={open === true ? null : open} onClose={() => setOpen(false)} onSave={s => { update(d => { const i = d.sites.findIndex(x => x.id === s.id); if (i >= 0) d.sites[i] = s; else d.sites.push(s) }); setOpen(false) }} />}
    </>
  )
}

function SiteForm({ initial, onClose, onSave }) {
  const [f, setF] = useState(initial ?? { name: '', date: nowLocal().slice(0, 10), location: '', amenities: [], rating: 0, notes: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const toggle = (a) => setF({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a] })
  const gps = () => navigator.geolocation?.getCurrentPosition(
    p => setF(x => ({ ...x, location: `${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}` })),
    () => alert('Could not get location'))
  return (
    <Sheet title={initial ? 'Edit campsite' : 'New campsite'} onClose={onClose}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); f.name.trim() && onSave({ ...f, id: initial?.id ?? uid(), name: f.name.trim() }) }}>
        <Field label="Name"><input className="input" value={f.name} onChange={set('name')} required /></Field>
        <Field label="Date visited"><input type="date" className="input" value={f.date} onChange={set('date')} /></Field>
        <Field label="Coordinates / location notes">
          <div className="flex gap-2">
            <input className="input" value={f.location} onChange={set('location')} />
            <button type="button" aria-label="Use GPS" className="btn-ghost !px-3" onClick={gps}><Crosshair size={18} /></button>
          </div>
        </Field>
        <div>
          <span className="label">Amenities</span>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map(a => <button type="button" key={a} onClick={() => toggle(a)}
              className={`px-3 min-h-[36px] rounded-full text-sm ${f.amenities.includes(a) ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>{a}</button>)}
          </div>
        </div>
        <div>
          <span className="label">Rating</span>
          <div className="flex gap-1">{[1, 2, 3, 4, 5].map(n => (
            <button type="button" key={n} aria-label={`${n} stars`} className="p-1" onClick={() => setF({ ...f, rating: n })}>
              <Star size={30} className={n <= f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'} /></button>))}</div>
        </div>
        <Field label="Setup notes"><textarea rows={3} className="input" placeholder="Level ground, tight entry, best sites…" value={f.notes} onChange={set('notes')} /></Field>
        <button className="btn w-full">Save campsite</button>
      </form>
    </Sheet>
  )
}
