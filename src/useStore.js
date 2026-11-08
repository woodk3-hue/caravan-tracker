import { useCallback, useEffect, useRef, useState } from 'react'
import { loadData, saveData } from './storage.js'

export function useStore() {
  const [data, setData] = useState(null)
  const ready = useRef(false)

  useEffect(() => {
    loadData().then(d => { setData(d); ready.current = true })
  }, [])

  useEffect(() => {
    if (data && ready.current) saveData(data)
  }, [data])

  const update = useCallback((fn) => setData(d => { const c = structuredClone(d); fn(c); return c }), [])
  return { data, update, replace: setData }
}
