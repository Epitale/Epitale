import { addDays, startOfWeek, todayISO } from './dates'
import { NONE, BOTH, type CalEvent, type Task } from './types'

export interface Bilan {
  from: string
  to: string
  doneBy: Record<string, number>
  doneBoth: number
  thoughtBy: Record<string, number>
  toThank: Task[]
  thankedMe: number
  undone: Task[]
}

const ms = (iso: string) => new Date(iso + 'T00:00:00').getTime()

/** Bilan de la semaine en cours (lundi → dimanche). */
export function computeBilan(tasks: Task[], events: CalEvent[], meId: string, today = todayISO()): Bilan {
  const from = startOfWeek(today)
  const to = addDays(from, 6)
  const a = ms(from), b = ms(addDays(to, 1))
  const inWeek = (t: number | null | undefined) => !!t && t >= a && t < b

  const doneBy: Record<string, number> = {}
  let doneBoth = 0
  const doneTasks = tasks.filter((t) => t.done && inWeek(t.doneAt))
  for (const t of doneTasks) {
    if (t.doneBy) doneBy[t.doneBy] = (doneBy[t.doneBy] ?? 0) + 1
    if (t.assignee === BOTH) doneBoth++
  }

  const thoughtBy: Record<string, number> = {}
  for (const x of [...tasks.filter((t) => !t.auto), ...events]) {
    if (inWeek(x.createdAt)) thoughtBy[x.createdBy] = (thoughtBy[x.createdBy] ?? 0) + 1
  }

  const toThank = doneTasks.filter((t) => t.doneBy && t.doneBy !== meId).sort((x, y) => (y.doneAt ?? 0) - (x.doneAt ?? 0)).slice(0, 6)
  const thankedMe = doneTasks.filter((t) => t.doneBy === meId && t.thankedBy.some((id) => id !== meId)).length
  const undone = tasks.filter((t) => !t.done && t.deadline && t.deadline < today && t.assignee !== NONE).slice(0, 6)
  return { from, to, doneBy, doneBoth, thoughtBy, toThank, thankedMe, undone }
}
