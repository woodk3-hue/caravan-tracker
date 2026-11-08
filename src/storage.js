import { get, set } from 'idb-keyval'

const KEY = 'caravan-logbook-v1'

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

const defaultMaintenance = () => [
  ['Wheel bearing service', 10000, 12],
  ['DO35 / hitch coupling check', 5000, 6],
  ['Brake adjustment & inspection', 10000, 12],
  ['Tyre pressure & condition check', 2000, 1],
  ['Suspension helper airbag pressures', 2000, 1],
  ['Structural bolt torque check', 5000, 6]
].map(([name, intervalKm, intervalMonths]) => ({
  id: uid(), name, intervalKm, intervalMonths, history: []
}))

export const emptyData = () => ({
  version: 1,
  trip: { name: 'Current trip', startedAt: new Date().toISOString() },
  legs: [], fuel: [], sites: [],
  maintenance: defaultMaintenance()
})

export async function loadData() {
  try {
    const v = await get(KEY)
    if (v) return v
  } catch {}
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return emptyData()
}

export async function saveData(data) {
  try {
    await set(KEY, data)
    return
  } catch {}
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}

export function validateImport(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Not a valid backup file')
  const d = obj.data ?? obj
  for (const k of ['legs', 'fuel', 'sites', 'maintenance']) {
    if (!Array.isArray(d[k])) throw new Error(`Backup is missing "${k}"`)
  }
  return { ...emptyData(), ...d, trip: d.trip || emptyData().trip }
}

export function exportJson(data) {
  const blob = new Blob(
    [JSON.stringify({ app: 'caravan-logbook', exportedAt: new Date().toISOString(), data }, null, 2)],
    { type: 'application/json' }
  )
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `caravan-logbook-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
