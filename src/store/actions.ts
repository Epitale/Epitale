import { useStore } from './context'
import { nextOccurrenceDate } from '../lib/tasks'
import type { Task } from '../lib/types'

/** Coche / décoche une tâche. Une tâche récurrente génère sa prochaine occurrence. */
export function useToggleTask() {
  const s = useStore()
  return async (t: Task) => {
    if (t.done) return s.updateTask(t.id, { done: false, doneAt: null, doneBy: null })
    await s.updateTask(t.id, { done: true, doneAt: Date.now(), doneBy: s.me!.id })
    if (t.recurrence !== 'none') {
      await s.addTask({
        title: t.title, notes: t.notes, assignee: t.assignee, deadline: nextOccurrenceDate(t),
        domain: t.domain, recurrence: t.recurrence,
      })
    }
  }
}
