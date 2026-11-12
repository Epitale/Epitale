import { arrayRemove, arrayUnion, doc, setDoc, updateDoc } from 'firebase/firestore'
import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging'
import { app, db } from './firebase'
import type { PushApi, PushSettings } from '../lib/types'

export const DEFAULT_PUSH: PushSettings = { assigned: true, due: true, birthdays: true, morning: false, done: false }
const LS = 'epitale-fcm-token'
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

export interface PushDoc { pushTokens?: string[]; push?: Partial<PushSettings> }

const browserOk = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** Construit l'API de notifications à partir du document utilisateur (users/{uid}). */
export function makePushApi(uid: string, data: PushDoc | null, onError: (e: unknown) => void): PushApi {
  const settings = { ...DEFAULT_PUSH, ...(data?.push ?? {}) }
  const supported = browserOk() && !!vapidKey
  const permission = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  let mine: string | null = null
  try { mine = localStorage.getItem(LS) } catch { /* ignoré */ }
  const enabled = supported && permission === 'granted' && !!mine && (data?.pushTokens ?? []).includes(mine)
  const ref = doc(db, 'users', uid)

  return {
    supported, reason: !browserOk() ? 'browser' : !vapidKey ? 'config' : undefined, permission, enabled, settings,
    async enable() {
      try {
        if (!(await isSupported())) throw new Error('Notifications non prises en charge par ce navigateur')
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') return
        const reg = await navigator.serviceWorker.ready
        const token = await getToken(getMessaging(app!), { vapidKey, serviceWorkerRegistration: reg })
        try { localStorage.setItem(LS, token) } catch { /* ignoré */ }
        await setDoc(ref, { pushTokens: arrayUnion(token), push: settings }, { merge: true })
      } catch (e) { onError(e) }
    },
    async disable() {
      try {
        if (mine) await updateDoc(ref, { pushTokens: arrayRemove(mine) })
        try { await deleteToken(getMessaging(app!)) } catch { /* ignoré */ }
        try { localStorage.removeItem(LS) } catch { /* ignoré */ }
      } catch (e) { onError(e) }
    },
    update(p) { updateDoc(ref, { push: { ...settings, ...p } }).catch(onError) },
  }
}
