export const BOTH = 'both' as const
/** id d'un membre, ou 'both' pour « à deux » */
export type Assignee = string

export interface Member {
  id: string
  name: string
  color: string
}

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

/** Domaine (catégorie) : intégré ou créé par vous. */
export interface DomainDef {
  id: string
  label: string
  color: string
  builtin?: boolean
}

/** Étape d'une tâche (sous-tâche). `assignee: null` = hérite de la tâche. */
export interface Step {
  id: string
  title: string
  done: boolean
  assignee: Assignee | null
}

export interface Task {
  id: string
  title: string
  notes: string
  assignee: Assignee
  createdBy: string
  createdAt: number
  deadline: string | null // YYYY-MM-DD
  domain: string // id de DomainDef
  recurrence: Recurrence
  steps: Step[]
  /** Événement à l'origine de cette tâche (liste « À préparer ») */
  eventId: string | null
  done: boolean
  doneAt: number | null
  doneBy: string | null
}

export interface CalEvent {
  id: string
  title: string
  notes: string
  who: Assignee
  createdBy: string
  createdAt: number
  date: string // début, YYYY-MM-DD
  endDate: string | null // fin (inclus) si l'événement dure plusieurs jours
  time: string | null // HH:MM ; null = toute la journée
  endTime: string | null
}

export interface ShopItem {
  id: string
  text: string
  done: boolean
  addedBy: string
  createdAt: number
}

/** Liste type : modèle de checklist pour « À préparer ». */
export interface Template {
  id: string
  name: string
  domain: string
  steps: string[]
}

export type NewTask = Omit<Task, 'id' | 'createdAt' | 'createdBy' | 'done' | 'doneAt' | 'doneBy'>
export type NewEvent = Omit<CalEvent, 'id' | 'createdAt' | 'createdBy'>

export type Status = 'loading' | 'signedOut' | 'needsHousehold' | 'ready'

export interface AuthApi {
  signUp(email: string, password: string, name: string): Promise<void>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  createHousehold(): Promise<void>
  joinHousehold(code: string): Promise<void>
}

export interface Store {
  mode: 'local' | 'firebase'
  status: Status
  me: Member | null
  members: Member[]
  householdCode: string | null
  tasks: Task[]
  events: CalEvent[]
  items: ShopItem[]
  domains: DomainDef[]
  templates: Template[]
  /** Dernier problème de synchro (affiché à l'écran, utile sans console sur téléphone) */
  syncError: string | null
  auth: AuthApi | null
  addTask(t: NewTask): string
  updateTask(id: string, patch: Partial<Task>): void
  removeTask(id: string): void
  addEvent(e: NewEvent): string
  updateEvent(id: string, patch: Partial<CalEvent>): void
  removeEvent(id: string): void
  addItem(text: string): void
  updateItem(id: string, patch: Partial<ShopItem>): void
  removeItem(id: string): void
  clearDoneItems(): void
  addDomain(label: string, color: string): string
  removeDomain(id: string): void
  saveTemplates(list: Template[]): void
  /** mode local uniquement : « jouer » l'autre personne pour tester */
  switchUser?(): void
}
