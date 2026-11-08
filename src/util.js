export const nowLocal = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}
export const fmtDate = (s) => s ? new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
export const fmtDateTime = (s) => s ? new Date(s).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
export const num = (v) => (v === '' || v == null ? NaN : Number(v))
export const nf = (n, d = 0) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: d })

export const legDistance = (l) => Math.max(0, l.odoEnd - l.odoStart)

// The caravan has no odometer: its reading is the running total of all leg distances
export function currentOdo(data) {
  return data.legs.reduce((s, l) => s + legDistance(l), 0)
}

export function maintStatus(item, odo) {
  const last = item.history[0]
  const base = last ?? null
  let kmLeft = null, daysLeft = null
  if (item.intervalKm) kmLeft = (base ? base.odo + item.intervalKm : item.intervalKm) - odo
  if (item.intervalMonths && base) {
    const due = new Date(base.date)
    due.setMonth(due.getMonth() + item.intervalMonths)
    daysLeft = Math.round((due - new Date()) / 864e5)
  }
  const overdue = (kmLeft != null && kmLeft < 0) || (daysLeft != null && daysLeft < 0)
  const soon = (kmLeft != null && kmLeft < item.intervalKm * 0.1) || (daysLeft != null && daysLeft < 14)
  return { kmLeft, daysLeft, level: overdue ? 'overdue' : soon ? 'soon' : 'ok' }
}

// Caravan has no odometer: running total is the sum of leg distances in date order
export function renumber(legs) {
  legs.sort((a, b) => a.date.localeCompare(b.date))
  let t = 0
  legs.forEach(l => { const km = legDistance(l); l.odoStart = t; l.odoEnd = t + km; t += km })
}

// Keeps litres, total cost and price-per-litre in step as the user types
export function linkFuel(f, key, value, litresKey = 'litres') {
  const n = { ...f, [key]: value }
  const L = num(n[litresKey]), C = num(n.cost), P = num(n.ppl)
  if (key === 'ppl') { if (L > 0 && P >= 0) n.cost = String(+(L * P).toFixed(2)) }
  else if (key === 'cost') { if (L > 0 && C >= 0) n.ppl = String(+(C / L).toFixed(3)) }
  else if (key === litresKey && L > 0) {
    if (n.cost !== '' && C >= 0) n.ppl = String(+(C / L).toFixed(3))
    else if (n.ppl !== '' && P >= 0) n.cost = String(+(L * P).toFixed(2))
  }
  return n
}

export const tankL = (data) => Number(data.settings?.tankL) > 0 ? Number(data.settings.tankL) : 0

// Fuel economy (L/100km) at each fill-to-full: litres added since the previous full fill-up / km travelled between them
export function fuelEconomy(data) {
  const fills = data.fuel.filter(x => x.litres > 0).sort((a, b) => a.date.localeCompare(b.date))
  const out = {}
  let prev = null, acc = 0
  for (const x of fills) {
    if (prev) acc += x.litres
    if (x.full !== false) {
      if (prev && x.odo > prev.odo) out[x.id] = acc / (x.odo - prev.odo) * 100
      prev = x; acc = 0
    }
  }
  return out
}
