import { useCallback, useEffect, useState } from 'react'

const KEY = 'cc-car-favourites'
const EVENT = 'cc-car-favourites-changed'

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)))
  } catch {
    /* storage unavailable: favourites simply do not persist */
  }
  window.dispatchEvent(new Event(EVENT))
}

/** Saved cars, kept on this device. */
export function useCarFavourites() {
  const [ids, setIds] = useState(read)

  useEffect(() => {
    const sync = () => setIds(read())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggle = useCallback((id) => {
    const cur = read()
    write(cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur])
  }, [])

  return { ids, has: (id) => ids.includes(id), toggle }
}
