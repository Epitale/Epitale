export const BOTH = 'both' as const
/** id d'un membre, ou 'both' pour « à deux » */
export type Assignee = string

export interface Member {
  id: string
  name: string
  color: string
}

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export type Domain = 'bebe' | 'sante' | 'maison' | 'courses' | 'admin' | 'famille' | 'autre'

export const DOMAINS: Record<Domain, { label: string; emoji: string }> = {
  bebe: { label: 'Bébé', emoji: '🍼' },
  sante: { label: 'Santé', emoji: '🩺' },
  maison: { label: 'Maison', emoji: '🏠' },
  courses: { label: 'Courses', emoji: '🛒' },
  admin: { label: 'Admin', emoji: '📄' },
  famille: { label: 'Famille', emoji: '👨‍👩‍👧' },
  autre: { label: 'Autre', emoji: '📌' },
}

export interface Task {
  id: string
  title: string
  notes: string
  assignee: Assignee
  createdBy: string
  createdAt: number
  deadline: string | null // YYYY-MM-DD
  domain: Domain
  recurrence: Recurrence
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
  date: string // YYYY-MM-DD
  time: string | null // HH:MM, null = toute la journée
}

export interface ShopItem {
  id: string
  text: string
  done: boolean
  addedBy: string
  createdAt: number
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
  auth: AuthApi | null
  addTask(t: NewTask): Promise<void>
  updateTask(id: string, patch: Partial<Task>): Promise<void>
  removeTask(id: string): Promise<void>
  addEvent(e: NewEvent): Promise<void>
  updateEvent(id: string, patch: Partial<CalEvent>): Promise<void>
  removeEvent(id: string): Promise<void>
  addItem(text: string): Promise<void>
  updateItem(id: string, patch: Partial<ShopItem>): Promise<void>
  removeItem(id: string): Promise<void>
  clearDoneItems(): Promise<void>
  /** mode local uniquement : « jouer » l'autre personne pour tester */
  switchUser?(): void
}
