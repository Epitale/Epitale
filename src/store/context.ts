import { createContext, useContext } from 'react'
import type { Store } from '../lib/types'

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('StoreContext manquant')
  return s
}

export const MEMBER_COLORS = ['#6c5ce7', '#ff7a59']
export const BOTH_COLOR = '#14b8a6'
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
