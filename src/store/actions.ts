import { useStore } from './context'
import { nextOccurrenceDate } from '../lib/tasks'
import { BOTH, type CalEvent, type Task } from '../lib/types'

/** Actions sur les tâches : validation globale, validation d'une étape, récurrence, suppression d'un événement. */
export function useTaskActions() {
  const s = useStore()
  const meId = s.me!.id
  const otherId = s.members.find((m) => m.id !== meId)?.id ?? meId

  const respawn = (t: Task) => {
    if (t.recurrence === 'none') return
    s.addTask({
      title: t.title, notes: t.notes, assignee: t.assignee, deadline: nextOccurrenceDate(t), domain: t.domain,
      recurrence: t.recurrence, steps: t.steps.map((x) => ({ ...x, done: false })), eventId: null,
    })
  }

  /** Coche la tâche principale : valide aussi toutes ses étapes. Décocher rouvre tout. */
  const toggleTask = (t: Task) => {
    if (t.done) {
      s.updateTask(t.id, { done: false, doneAt: null, doneBy: null, steps: t.steps.map((x) => ({ ...x, done: false })) })
      return
    }
    s.updateTask(t.id, { done: true, doneAt: Date.now(), doneBy: meId, steps: t.steps.map((x) => ({ ...x, done: true })) })
    respawn(t)
  }

  /** Coche une seule étape ; la tâche se termine toute seule quand la dernière est cochée. */
  const toggleStep = (t: Task, stepId: string) => {
    const steps = t.steps.map((x) => (x.id === stepId ? { ...x, done: !x.done } : x))
    const all = steps.length > 0 && steps.every((x) => x.done)
    s.updateTask(t.id, { steps, done: all, doneAt: all ? Date.now() : null, doneBy: all ? meId : null })
    if (all && !t.done) respawn(t)
  }

  /** Change le responsable d'une étape : (hérité) → moi → l'autre → (hérité) */
  const nextOwner = (current: string | null): string | null =>
    current === null ? meId : current === meId ? otherId : null

  const cycleOwner = (t: Task, stepId: string) =>
    s.updateTask(t.id, { steps: t.steps.map((x) => (x.id === stepId ? { ...x, assignee: nextOwner(x.assignee) } : x)) })

  /** Supprimer un événement supprime aussi les tâches qu'il a générées (« À préparer »). */
  const deleteEvent = (e: CalEvent) => {
    s.tasks.filter((t) => t.eventId === e.id).forEach((t) => s.removeTask(t.id))
    s.removeEvent(e.id)
  }

  return { toggleTask, toggleStep, cycleOwner, nextOwner, deleteEvent, meId, otherId, BOTH }
}
