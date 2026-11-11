import { createContext, useContext } from 'react'
import type { Store } from '../lib/types'

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('StoreContext manquant')
  return s
}

export const MEMBER_COLORS = ['#B84A25', '#2F7A66']
export const BOTH_COLOR = '#C28A1B'
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
