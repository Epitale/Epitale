import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut,
  updateProfile, type User,
} from 'firebase/auth'
import {
  addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, onSnapshot, query, setDoc, updateDoc, writeBatch, getDocs,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { StoreContext, MEMBER_COLORS } from './context'
import type { CalEvent, Member, ShopItem, Store, Task } from '../lib/types'

interface Household { code: string; memberIds: string[]; names: Record<string, string> }

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const clean = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [hid, setHid] = useState<string | null | undefined>(undefined)
  const [household, setHousehold] = useState<Household | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalEvent[]>([])
  const [items, setItems] = useState<ShopItem[]>([])

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); if (!u) setHid(undefined) }), [])

  // Quel foyer ?
  useEffect(() => {
    if (!user) return
    return onSnapshot(doc(db, 'users', user.uid), (s) => setHid((s.data()?.householdId as string) ?? null), () => setHid(null))
  }, [user])

  // Données du foyer en temps réel
  useEffect(() => {
    if (!hid) { setHousehold(null); return }
    const base = doc(db, 'households', hid)
    const unsubs = [
      onSnapshot(base, (s) => setHousehold(s.exists() ? (s.data() as Household) : null)),
      onSnapshot(query(collection(base, 'tasks')), (s) => setTasks(s.docs.map((d) => ({ ...(d.data() as Task), id: d.id })))),
      onSnapshot(query(collection(base, 'events')), (s) => setEvents(s.docs.map((d) => ({ ...(d.data() as CalEvent), id: d.id })))),
      onSnapshot(query(collection(base, 'items')), (s) => setItems(s.docs.map((d) => ({ ...(d.data() as ShopItem), id: d.id })))),
    ]
    return () => unsubs.forEach((u) => u())
  }, [hid])

  const store: Store = useMemo(() => {
    const col = (name: string) => collection(db, 'households', hid!, name)
    const members: Member[] = household
      ? household.memberIds.map((id, i) => ({ id, name: household.names[id] ?? '?', color: MEMBER_COLORS[i % 2] }))
      : []
    const me = members.find((m) => m.id === user?.uid) ?? null
    const meId = user?.uid ?? ''

    const status: Store['status'] =
      user === undefined ? 'loading'
      : user === null ? 'signedOut'
      : hid === undefined ? 'loading'
      : !hid ? 'needsHousehold'
      : !household ? 'loading' : 'ready'

    return {
      mode: 'firebase',
      status,
      me,
      members,
      householdCode: household?.code ?? null,
      tasks, events, items,
      auth: {
        signUp: async (email, password, name) => {
          const cred = await createUserWithEmailAndPassword(auth, email, password)
          await updateProfile(cred.user, { displayName: name })
          await setDoc(doc(db, 'users', cred.user.uid), { name })
        },
        signIn: async (email, password) => { await signInWithEmailAndPassword(auth, email, password) },
        signOut: async () => { await fbSignOut(auth) },
        createHousehold: async () => {
          const u = auth.currentUser!
          const name = u.displayName || 'Moi'
          const ref = doc(collection(db, 'households'))
          const code = genCode()
          const batch = writeBatch(db)
          batch.set(ref, { code, memberIds: [u.uid], names: { [u.uid]: name }, createdAt: Date.now() })
          batch.set(doc(db, 'invites', code), { householdId: ref.id })
          batch.set(doc(db, 'users', u.uid), { name, householdId: ref.id })
          await batch.commit()
        },
        joinHousehold: async (rawCode) => {
          const u = auth.currentUser!
          const code = rawCode.trim().toUpperCase()
          const inv = await getDoc(doc(db, 'invites', code))
          if (!inv.exists()) throw new Error('Code introuvable')
          const householdId = inv.data().householdId as string
          const name = u.displayName || 'Moi'
          await updateDoc(doc(db, 'households', householdId), {
            memberIds: arrayUnion(u.uid), [`names.${u.uid}`]: name, joinCode: code,
          })
          await setDoc(doc(db, 'users', u.uid), { name, householdId })
        },
      },
      addTask: async (t) => { await addDoc(col('tasks'), clean({ ...t, createdAt: Date.now(), createdBy: meId, done: false, doneAt: null, doneBy: null })) },
      updateTask: async (id, p) => { await updateDoc(doc(col('tasks'), id), clean(p)) },
      removeTask: async (id) => { await deleteDoc(doc(col('tasks'), id)) },
      addEvent: async (e) => { await addDoc(col('events'), clean({ ...e, createdAt: Date.now(), createdBy: meId })) },
      updateEvent: async (id, p) => { await updateDoc(doc(col('events'), id), clean(p)) },
      removeEvent: async (id) => { await deleteDoc(doc(col('events'), id)) },
      addItem: async (text) => { await addDoc(col('items'), { text, done: false, addedBy: meId, createdAt: Date.now() }) },
      updateItem: async (id, p) => { await updateDoc(doc(col('items'), id), clean(p)) },
      removeItem: async (id) => { await deleteDoc(doc(col('items'), id)) },
      clearDoneItems: async () => {
        const snap = await getDocs(col('items'))
        const batch = writeBatch(db)
        snap.docs.filter((d) => d.data().done).forEach((d) => batch.delete(d.ref))
        await batch.commit()
      },
    }
  }, [user, hid, household, tasks, events, items])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
