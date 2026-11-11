import { useCallback, useState } from 'react'
import type { Task } from './types'

/**
 * « Nouveau pour toi » : une tâche créée par l'autre après ta dernière consultation.
 * Mémorisé localement (par appareil).
 */
export function useSeen(meId: string) {
  const key = `epitale-seen-${meId}`
  const [last, setLast] = useState<number>(() => {
    try {
      const v = localStorage.getItem(key)
      if (v) return Number(v)
      localStorage.setItem(key, String(Date.now()))
    } catch { /* stockage indisponible */ }
    return Date.now()
  })
  const markSeen = useCallback(() => {
    const now = Date.now()
    try { localStorage.setItem(key, String(now)) } catch { /* ignore */ }
    setLast(now)
  }, [key])
  const isNew = (t: Task) => t.createdBy !== meId && t.createdAt > last
  return { isNew, markSeen }
}
