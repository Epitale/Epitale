export const BOTH = 'both' as const
/** Tâche « à prendre » : personne ne s'en occupe encore. */
export const NONE = 'none' as const
/** id d'un membre, 'both' pour « à deux », ou 'none' pour « à prendre » */
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
  /** Événement à l'origine de cette tâche (liste « À préparer », cadeau d'anniversaire) */
  eventId: string | null
  /** 'before' : à finir AVANT la date (échéance) ; 'on' : à faire CE jour-là */
  dateMode: 'before' | 'on'
  /** Prévenir N jours avant l'échéance (null = pas de rappel) */
  remindDays: number | null
  /** « Je m'y mets le… » : jour où l'on compte la faire (échéance inchangée) */
  plannedOn: string | null
  /** Tâche répétée : le responsable alterne à chaque fois */
  rotate: boolean
  /** Membres qui ont dit « merci » pour cette tâche faite */
  thankedBy: string[]
  /** Créée automatiquement (répétition, cadeau) : ne compte pas comme « pensé à » */
  auto: boolean
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
  /** 'birthday' : anniversaire (récurrent chaque année, affiché avec un gâteau) */
  kind: 'event' | 'birthday'
  recurrence: Recurrence
  /** Anniversaire : année de naissance (pour afficher l'âge) */
  birthYear: number | null
  /** Anniversaire : créer une tâche cadeau N jours avant (null = aucune) */
  giftDays: number | null
  giftWho: Assignee | null
}

export interface ShopItem {
  id: string
  text: string
  /** Rayon (voir lib/aisles) */
  aisle: string
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

/** Repas prévu (midi ou soir) ; les ingrédients alimentent les courses. */
export interface Meal {
  id: string
  date: string
  slot: 'midi' | 'soir'
  title: string
  ingredients: string[]
}

/** Info pratique : numéro, code, n° de contrat… */
export interface Info {
  id: string
  title: string
  name: string
  value: string
  note: string
  kind: 'phone' | 'text' | 'secret'
  domain: string
}

export interface PushSettings {
  assigned: boolean
  due: boolean
  birthdays: boolean
  morning: boolean
  done: boolean
}

export interface PushApi {
  supported: boolean
  /** Pourquoi pas disponible : 'browser' (iPhone non installé, navigateur) ou 'config' (clé VAPID absente) */
  reason?: 'browser' | 'config'
  permission: NotificationPermission | 'unsupported'
  enabled: boolean
  settings: PushSettings
  enable(): Promise<void>
  disable(): Promise<void>
  update(p: Partial<PushSettings>): void
}

type TaskExtra = 'dateMode' | 'remindDays' | 'plannedOn' | 'rotate' | 'thankedBy' | 'auto'
type EventExtra = 'kind' | 'recurrence' | 'birthYear' | 'giftDays' | 'giftWho' | 'endDate' | 'endTime'
export type NewTask = Omit<Task, 'id' | 'createdAt' | 'createdBy' | 'done' | 'doneAt' | 'doneBy' | TaskExtra> & Partial<Pick<Task, TaskExtra>>
export type NewEvent = Omit<CalEvent, 'id' | 'createdAt' | 'createdBy' | EventExtra> & Partial<Pick<CalEvent, EventExtra>>

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
  meals: Meal[]
  infos: Info[]
  /** « Habituels » des courses */
  habits: string[]
  domains: DomainDef[]
  templates: Template[]
  /** Notifications (mode Firebase uniquement) */
  push: PushApi | null
  /** Toutes les données ont été chargées au moins une fois (évite d'écraser avant de savoir) */
  synced: boolean
  /** Dernier problème de synchro (affiché à l'écran, utile sans console sur téléphone) */
  syncError: string | null
  auth: AuthApi | null
  /** `id` : identifiant imposé (tâches automatiques, pour éviter les doublons) */
  addTask(t: NewTask, id?: string): string
  updateTask(id: string, patch: Partial<Task>): void
  removeTask(id: string): void
  addEvent(e: NewEvent): string
  updateEvent(id: string, patch: Partial<CalEvent>): void
  removeEvent(id: string): void
  addItem(text: string, aisle?: string): void
  updateItem(id: string, patch: Partial<ShopItem>): void
  removeItem(id: string): void
  clearDoneItems(): void
  addMeal(m: Omit<Meal, 'id'>): string
  updateMeal(id: string, patch: Partial<Meal>): void
  removeMeal(id: string): void
  addInfo(i: Omit<Info, 'id'>): string
  updateInfo(id: string, patch: Partial<Info>): void
  removeInfo(id: string): void
  setHabits(list: string[]): void
  addDomain(label: string, color: string): string
  removeDomain(id: string): void
  saveTemplates(list: Template[]): void
  /** mode local uniquement : « jouer » l'autre personne pour tester */
  switchUser?(): void
}
