import { addDays, addMonths, todayISO, diffDays, fromISO } from './dates'
import type { Task, Recurrence, Member, Assignee, NewTask } from './types'
import { BOTH, NONE } from './types'

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: 'Jamais',
  daily: 'Chaque jour',
  weekly: 'Chaque semaine',
  monthly: 'Chaque mois',
  yearly: 'Chaque année',
}

export function nextDeadline(from: string, rec: Recurrence): string {
  switch (rec) {
    case 'daily': return addDays(from, 1)
    case 'weekly': return addDays(from, 7)
    case 'monthly': return addMonths(from, 1)
    case 'yearly': return addMonths(from, 12)
    default: return from
  }
}

/** Prochaine échéance (jamais dans le passé) pour une tâche récurrente terminée. */
export function nextOccurrenceDate(t: Task): string {
  const today = todayISO()
  let d = nextDeadline(t.deadline ?? today, t.recurrence)
  while (diffDays(d, today) < 0) d = nextDeadline(d, t.recurrence)
  return d
}

export type Bucket = 'overdue' | 'today' | 'upcoming' | 'nodate'

export function bucketOf(t: Task): Bucket {
  if (!t.deadline) return 'nodate'
  const diff = diffDays(t.deadline, todayISO())
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  return 'upcoming'
}

/** Cette tâche me concerne-t-elle ? (à moi ou à deux) */
export const concerns = (assignee: Assignee, meId: string) => assignee === meId || assignee === BOTH

export const assigneeLabel = (a: Assignee, members: Member[], meId: string | undefined) =>
  a === BOTH ? 'À deux' : a === NONE ? 'À prendre' : a === meId ? 'Moi' : members.find((m) => m.id === a)?.name ?? '?'

export const sortTasks = (a: Task, b: Task) => {
  if (a.deadline && b.deadline && a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1
  if (a.deadline && !b.deadline) return -1
  if (!a.deadline && b.deadline) return 1
  return a.createdAt - b.createdAt
}

// ── Étapes ───────────────────────────────────────────────────────────
export const hasSteps = (t: Task) => t.steps.length > 0
export const stepsDone = (t: Task) => t.steps.filter((s) => s.done).length
export const progress = (t: Task) => (t.steps.length ? stepsDone(t) / t.steps.length : t.done ? 1 : 0)

/** Qui s'occupe d'une étape ? (hérite de la tâche si non précisé) */
export const stepOwner = (t: Task, s: { assignee: Assignee | null }) => s.assignee ?? t.assignee

/** Valeurs par défaut pour les anciens documents (avant l'arrivée des étapes). */
export function normTask(t: Task): Task {
  const rec = t.recurrence ?? 'none'
  return {
    ...t, recurrence: rec, steps: t.steps ?? [], eventId: t.eventId ?? null, domain: t.domain ?? 'autre',
    // avant l'arrivée des échéances : une tâche répétée est « le jour J », les autres « avant le »
    dateMode: t.dateMode ?? (rec !== 'none' ? 'on' : 'before'),
    remindDays: t.remindDays ?? null, plannedOn: t.plannedOn ?? null, rotate: t.rotate ?? false,
    thankedBy: t.thankedBy ?? [], auto: t.auto ?? false,
  }
}

/** Complète une nouvelle tâche avec les valeurs par défaut. */
export function fillTask(t: NewTask) {
  return {
    ...t, dateMode: t.dateMode ?? 'before', remindDays: t.remindDays ?? null, plannedOn: t.plannedOn ?? null,
    rotate: t.rotate ?? false, thankedBy: t.thankedBy ?? [], auto: t.auto ?? false,
  }
}

// ── Échéances : compte à rebours ──────────────────────────────────────
export type Urgency = 'calm' | 'soon' | 'hot' | 'last' | 'day' | 'late'
export interface Countdown { label: string; urgency: Urgency; flag: boolean }

const fWd = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const fDm = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

/**
 * « Avant le » : compte à rebours (J-5, J-2, Dernier jour) de plus en plus pressant.
 * « Le jour J » : simple date, sans urgence.
 */
export function countdown(t: Pick<Task, 'deadline' | 'dateMode' | 'done'>): Countdown | null {
  if (!t.deadline) return null
  const d = diffDays(t.deadline, todayISO())
  const dt = fromISO(t.deadline)
  if (t.dateMode === 'on') {
    if (d < 0) return { label: d === -1 ? 'Hier' : `${fDm.format(dt)}`, urgency: 'late', flag: false }
    return { label: d === 0 ? "Aujourd'hui" : d === 1 ? 'Demain' : d < 7 ? fWd.format(dt) : fDm.format(dt), urgency: 'day', flag: false }
  }
  if (d < 0) return { label: `En retard de ${-d} j`, urgency: 'late', flag: true }
  if (d === 0) return { label: 'Dernier jour', urgency: 'last', flag: true }
  const wd = fWd.format(dt)
  return { label: d <= 6 ? `J-${d} · avant ${wd}` : `J-${d}`, urgency: d <= 2 ? 'hot' : d <= 5 ? 'soon' : 'calm', flag: true }
}

/** À finir dès maintenant (échéance dans les 14 jours) ? */
export const isDueSoon = (t: Task, today = todayISO()) =>
  t.dateMode === 'before' && !!t.deadline && t.deadline >= today && diffDays(t.deadline, today) <= 14

export const isOverdue = (t: Task, today = todayISO()) => !!t.deadline && t.deadline < today

/** Prévue pour aujourd'hui (jour précis, ou « je m'y mets le… ») ? */
export const isPlannedToday = (t: Task, today = todayISO()) =>
  (t.dateMode === 'on' && t.deadline === today) || t.plannedOn === today

export const isFree = (t: Task) => t.assignee === NONE
