import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { StoreContext, MEMBER_COLORS, uid } from './context'
import type { CalEvent, DomainDef, Member, ShopItem, Store, Task, Template } from '../lib/types'
import { addDays, todayISO } from '../lib/dates'
import { BUILTIN_DOMAINS, DEFAULT_TEMPLATES } from '../lib/defaults'
import { normTask } from '../lib/tasks'

/**
 * Mode démo : tout est stocké dans le navigateur (localStorage).
 * Sert à essayer l'app sans Firebase. Rien n'est partagé entre deux téléphones.
 */
interface Data {
  members: Member[]
  meId: string
  tasks: Task[]
  events: CalEvent[]
  items: ShopItem[]
  domains: DomainDef[] // domaines créés (hors intégrés)
  templates: Template[]
}
const KEY = 'epitale-demo-v2'

const load = (): Data | null => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as Data
    return { ...d, tasks: d.tasks.map(normTask) }
  } catch { return null }
}

function seed(me: string, partner: string): Data {
  const a: Member = { id: 'm1', name: me, color: MEMBER_COLORS[0] }
  const b: Member = { id: 'm2', name: partner, color: MEMBER_COLORS[1] }
  const now = Date.now()
  const t = (title: string, assignee: string, days: number | null, extra: Partial<Task> = {}): Task => ({
    id: uid(), title, notes: '', assignee, createdBy: b.id, createdAt: now - Math.random() * 1e6,
    deadline: days === null ? null : addDays(todayISO(), days), domain: 'autre', recurrence: 'none',
    steps: [], eventId: null, done: false, doneAt: null, doneBy: null, ...extra,
  })
  const evId = uid()
  const menage = DEFAULT_TEMPLATES[0].steps.map((title, i) => ({ id: uid(), title, done: i < 2, assignee: i % 2 ? b.id : a.id }))
  return {
    members: [a, b], meId: a.id, domains: [], templates: DEFAULT_TEMPLATES,
    tasks: [
      t('Prendre RDV pédiatre (vaccin 18 mois)', a.id, 2, { domain: 'sante' }),
      t('Sortir les poubelles', 'both', 0, { domain: 'maison', recurrence: 'weekly' }),
      t('Réserver la nounou samedi', a.id, 1, { domain: 'bebe', createdAt: now }),
      t('Dossier crèche à rendre', a.id, -1, { domain: 'admin' }),
      t('Ménage maison — Chez les parents', 'both', 2, { domain: 'maison', steps: menage, eventId: evId }),
    ],
    events: [
      { id: uid(), title: 'Pédiatre', notes: '', who: 'both', createdBy: b.id, createdAt: now, date: todayISO(), endDate: null, time: '10:30', endTime: null },
      { id: evId, title: 'Chez les parents', notes: '', who: 'both', createdBy: b.id, createdAt: now, date: addDays(todayISO(), 3), endDate: addDays(todayISO(), 4), time: null, endTime: null },
    ],
    items: ['Lait', 'Pâtes', 'Compotes'].map((text) => ({ id: uid(), text, done: false, addedBy: b.id, createdAt: now })),
  }
}

export function LocalProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(load)
  const [names, setNames] = useState({ me: '', partner: '' })

  useEffect(() => {
    if (data) localStorage.setItem(KEY, JSON.stringify(data))
  }, [data])

  const update = useCallback((fn: (d: Data) => Data) => setData((d) => (d ? fn(d) : d)), [])

  const store: Store = useMemo(() => {
    const me = data?.members.find((m) => m.id === data.meId) ?? null
    const meId = me?.id ?? ''
    return {
      mode: 'local',
      status: data ? 'ready' : 'signedOut',
      me,
      members: data?.members ?? [],
      householdCode: null,
      tasks: data?.tasks ?? [],
      events: data?.events ?? [],
      items: data?.items ?? [],
      domains: [...BUILTIN_DOMAINS, ...(data?.domains ?? [])],
      templates: data?.templates ?? DEFAULT_TEMPLATES,
      syncError: null,
      auth: {
        signUp: async (_e, _p, name) => setData(seed(name, names.partner || 'Elle')),
        signIn: async () => {}, signOut: async () => { localStorage.removeItem(KEY); setData(null) },
        createHousehold: async () => {}, joinHousehold: async () => {},
      },
      addTask: (t) => {
        const id = uid()
        update((d) => ({ ...d, tasks: [...d.tasks, { ...t, id, createdAt: Date.now(), createdBy: meId, done: false, doneAt: null, doneBy: null }] }))
        return id
      },
      updateTask: (id, p) => update((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      removeTask: (id) => update((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== id) })),
      addEvent: (e) => {
        const id = uid()
        update((d) => ({ ...d, events: [...d.events, { ...e, id, createdAt: Date.now(), createdBy: meId }] }))
        return id
      },
      updateEvent: (id, p) => update((d) => ({ ...d, events: d.events.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      removeEvent: (id) => update((d) => ({ ...d, events: d.events.filter((x) => x.id !== id) })),
      addItem: (text) => update((d) => ({ ...d, items: [...d.items, { id: uid(), text, done: false, addedBy: meId, createdAt: Date.now() }] })),
      updateItem: (id, p) => update((d) => ({ ...d, items: d.items.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      removeItem: (id) => update((d) => ({ ...d, items: d.items.filter((x) => x.id !== id) })),
      clearDoneItems: () => update((d) => ({ ...d, items: d.items.filter((x) => !x.done) })),
      addDomain: (label, color) => {
        const id = 'd-' + uid()
        update((d) => ({ ...d, domains: [...d.domains, { id, label, color }] }))
        return id
      },
      removeDomain: (id) => update((d) => ({ ...d, domains: d.domains.filter((x) => x.id !== id) })),
      saveTemplates: (list) => update((d) => ({ ...d, templates: list })),
      switchUser: () => update((d) => ({ ...d, meId: d.members.find((m) => m.id !== d.meId)!.id })),
    }
  }, [data, names.partner, update])

  if (!data) {
    return (
      <div className="auth">
        <div className="auth-card">
          <div className="logo">✓✓</div>
          <h1>Epitale</h1>
          <p className="muted">Mode démo : les données restent sur cet appareil. Configure Firebase pour synchroniser vos deux téléphones (voir README).</p>
          <label>Ton prénom<input value={names.me} onChange={(e) => setNames({ ...names, me: e.target.value })} placeholder="Thibault" /></label>
          <label>Prénom de ta copine<input value={names.partner} onChange={(e) => setNames({ ...names, partner: e.target.value })} placeholder="Elle" /></label>
          <button className="btn primary" disabled={!names.me.trim()} onClick={() => setData(seed(names.me.trim(), names.partner.trim() || 'Elle'))}>
            Essayer avec des exemples
          </button>
        </div>
      </div>
    )
  }
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
