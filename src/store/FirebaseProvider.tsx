import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut,
  updateProfile, type User,
} from 'firebase/auth'
import {
  arrayUnion, collection, deleteDoc, doc, getDoc, onSnapshot, query, setDoc, updateDoc, writeBatch, getDocs,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { StoreContext, MEMBER_COLORS, uid } from './context'
import type { CalEvent, DomainDef, Info, Meal, Member, ShopItem, Store, Task, Template } from '../lib/types'
import { BUILTIN_DOMAINS, DEFAULT_TEMPLATES } from '../lib/defaults'
import { fillTask, normTask } from '../lib/tasks'
import { makePushApi, type PushDoc } from './push'
import { fillEvent, normEvent } from '../lib/events'
import { DEFAULT_HABITS, guessAisle } from '../lib/aisles'

interface Household {
  code: string
  memberIds: string[]
  names: Record<string, string>
  domains?: DomainDef[]
  templates?: Template[]
  habits?: string[]
}

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const clean = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T

const errText = (e: unknown) => {
  const x = e as { code?: string; message?: string }
  return x?.code ? `${x.code}` : x?.message ?? 'erreur inconnue'
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [hid, setHid] = useState<string | null | undefined>(undefined)
  const [household, setHousehold] = useState<Household | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalEvent[]>([])
  const [items, setItems] = useState<ShopItem[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [infos, setInfos] = useState<Info[]>([])
  const [syncError, setSyncError] = useState<string | null>(null)
  const [userDoc, setUserDoc] = useState<PushDoc | null>(null)
  const [loaded, setLoaded] = useState<string[]>([])
  const mark = useCallback((k: string) => setLoaded((l) => (l.includes(k) ? l : [...l, k])), [])
  const [retry, setRetry] = useState(0)

  /** Les écritures ne bloquent jamais l'écran : une erreur s'affiche dans la bannière. */
  const report = useCallback((what: string) => (e: unknown) => setSyncError(`${what} : ${errText(e)}`), [])

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); if (!u) setHid(undefined) }), [])

  // Quel foyer ? On ignore l'écho local d'une écriture pas encore confirmée par le serveur :
  // démarrer les écouteurs avant que le foyer existe côté serveur les ferait échouer (permission-denied).
  useEffect(() => {
    if (!user) return
    return onSnapshot(
      doc(db, 'users', user.uid),
      { includeMetadataChanges: true },
      (s) => { setUserDoc((s.data() as PushDoc | undefined) ?? null); if (!s.metadata.hasPendingWrites) setHid((s.data()?.householdId as string) ?? null) },
      (e) => { setSyncError(`profil : ${errText(e)}`); setHid(null) },
    )
  }, [user])

  // Données du foyer en temps réel, avec reprise automatique en cas d'erreur
  useEffect(() => {
    if (!hid) { setHousehold(null); setLoaded([]); return }
    setLoaded([])
    const base = doc(db, 'households', hid)
    let timer: ReturnType<typeof setTimeout> | undefined
    const fail = (what: string) => (e: unknown) => {
      setSyncError(`${what} : ${errText(e)}`)
      clearTimeout(timer)
      timer = setTimeout(() => setRetry((r) => r + 1), 2500)
    }
    const ok = () => setSyncError(null)
    const unsubs = [
      onSnapshot(base, (s) => { ok(); mark('household'); setHousehold(s.exists() ? (s.data() as Household) : null) }, fail('foyer')),
      onSnapshot(query(collection(base, 'tasks')), (s) => { ok(); mark('tasks'); setTasks(s.docs.map((d) => normTask({ ...(d.data() as Task), id: d.id }))) }, fail('tâches')),
      onSnapshot(query(collection(base, 'events')), (s) => { ok(); mark('events'); setEvents(s.docs.map((d) => normEvent({ ...(d.data() as CalEvent), id: d.id }))) }, fail('événements')),
      onSnapshot(query(collection(base, 'items')), (s) => { ok(); mark('items'); setItems(s.docs.map((d) => { const i = d.data() as ShopItem; return { ...i, id: d.id, aisle: i.aisle ?? guessAisle(i.text) } })) }, fail('courses')),
      onSnapshot(query(collection(base, 'meals')), (s) => { ok(); mark('meals'); setMeals(s.docs.map((d) => ({ ...(d.data() as Meal), id: d.id, ingredients: (d.data() as Meal).ingredients ?? [] }))) }, fail('repas')),
      onSnapshot(query(collection(base, 'infos')), (s) => { ok(); mark('infos'); setInfos(s.docs.map((d) => ({ ...(d.data() as Info), id: d.id }))) }, fail('infos')),
    ]
    return () => { clearTimeout(timer); unsubs.forEach((u) => u()) }
  }, [hid, retry])

  const store: Store = useMemo(() => {
    const col = (name: string) => collection(db, 'households', hid!, name)
    const hRef = () => doc(db, 'households', hid!)
    const members: Member[] = household
      ? household.memberIds.map((id, i) => ({ id, name: household.names[id] ?? '?', color: MEMBER_COLORS[i % 2] }))
      : []
    const me = members.find((m) => m.id === user?.uid) ?? null
    const meId = user?.uid ?? ''
    const customDomains = household?.domains ?? []

    const status: Store['status'] =
      user === undefined ? 'loading'
      : user === null ? 'signedOut'
      : hid === undefined ? 'loading'
      : !hid ? 'needsHousehold'
      : !household ? 'loading' : 'ready'

    const create = (name: string, data: object, id?: string) => {
      const ref = id ? doc(col(name), id) : doc(col(name))
      setDoc(ref, clean({ ...data, createdAt: Date.now() })).catch(report('enregistrement'))
      return ref.id
    }
    const patch = (name: string, id: string, p: object) => { updateDoc(doc(col(name), id), clean(p)).catch(report('modification')) }
    const remove = (name: string, id: string) => { deleteDoc(doc(col(name), id)).catch(report('suppression')) }

    return {
      mode: 'firebase',
      status,
      me,
      members,
      householdCode: household?.code ?? null,
      tasks, events, items, meals, infos,
      habits: household?.habits ?? DEFAULT_HABITS,
      push: user ? makePushApi(user.uid, userDoc, report('notifications')) : null,
      synced: ['household', 'tasks', 'events', 'items', 'meals', 'infos'].every((k) => loaded.includes(k)),
      domains: [...BUILTIN_DOMAINS, ...customDomains],
      templates: household?.templates ?? DEFAULT_TEMPLATES,
      syncError,
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
      addTask: (t, id) => {
        if (id && tasks.some((x) => x.id === id)) return id // déjà créée (tâche automatique)
        return create('tasks', { ...fillTask(t), createdBy: meId, done: false, doneAt: null, doneBy: null }, id)
      },
      updateTask: (id, p) => patch('tasks', id, p),
      removeTask: (id) => remove('tasks', id),
      addEvent: (e) => create('events', { ...fillEvent(e), createdBy: meId }),
      updateEvent: (id, p) => patch('events', id, p),
      removeEvent: (id) => remove('events', id),
      addItem: (text, aisle) => { create('items', { text, aisle: aisle ?? guessAisle(text), done: false, addedBy: meId }) },
      updateItem: (id, p) => patch('items', id, p),
      removeItem: (id) => remove('items', id),
      clearDoneItems: () => {
        getDocs(col('items')).then((snap) => {
          const batch = writeBatch(db)
          snap.docs.filter((d) => d.data().done).forEach((d) => batch.delete(d.ref))
          return batch.commit()
        }).catch(report('suppression'))
      },
      addMeal: (m) => create('meals', m),
      updateMeal: (id, p) => patch('meals', id, p),
      removeMeal: (id) => remove('meals', id),
      addInfo: (i) => create('infos', i),
      updateInfo: (id, p) => patch('infos', id, p),
      removeInfo: (id) => remove('infos', id),
      setHabits: (list) => { updateDoc(hRef(), { habits: list }).catch(report('habituels')) },
      addDomain: (label, color) => {
        const id = 'd-' + uid()
        updateDoc(hRef(), { domains: [...customDomains, { id, label, color }] }).catch(report('domaine'))
        return id
      },
      removeDomain: (id) => { updateDoc(hRef(), { domains: customDomains.filter((d) => d.id !== id) }).catch(report('domaine')) },
      saveTemplates: (list) => { updateDoc(hRef(), { templates: list }).catch(report('listes types')) },
    }
  }, [user, hid, household, tasks, events, items, meals, infos, syncError, loaded, userDoc, report])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
