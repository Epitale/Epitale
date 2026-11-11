import { addDays, addMonths, todayISO, diffDays } from './dates'
import type { Task, Recurrence, Member, Assignee } from './types'
import { BOTH } from './types'

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
  a === BOTH ? 'À deux' : a === meId ? 'Moi' : members.find((m) => m.id === a)?.name ?? '?'

export const sortTasks = (a: Task, b: Task) => {
  if (a.deadline && b.deadline && a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1
  if (a.deadline && !b.deadline) return -1
  if (!a.deadline && b.deadline) return 1
  return a.createdAt - b.createdAt
}
