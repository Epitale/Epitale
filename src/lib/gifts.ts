import { diffDays, todayISO } from './dates'
import { upcomingBirthdays } from './events'
import type { CalEvent, NewTask, Task } from './types'

/** Tâches « cadeau + carte » à créer maintenant (N jours avant chaque anniversaire), sans doublon. */
export function giftTasksToCreate(events: CalEvent[], tasks: Task[], meId: string, today = todayISO()): { id: string; task: NewTask }[] {
  const out: { id: string; task: NewTask }[] = []
  for (const occ of upcomingBirthdays(events.filter((e) => e.giftDays !== null), today)) {
    if (diffDays(occ.date, today) > (occ.giftDays ?? 0)) continue
    const id = `gift-${occ.id}-${occ.date.slice(0, 4)}`
    if (tasks.some((t) => t.id === id)) continue
    out.push({
      id,
      task: {
        title: `Cadeau + carte pour ${occ.title}`, notes: '', assignee: occ.giftWho ?? meId, deadline: occ.date,
        domain: 'famille', recurrence: 'none', steps: [], eventId: occ.id, dateMode: 'before', remindDays: 2, auto: true,
      },
    })
  }
  return out
}
