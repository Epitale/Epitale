import { useStore } from './context'
import { nextOccurrenceDate } from '../lib/tasks'
import { BOTH, NONE, type CalEvent, type Task } from '../lib/types'

/** Actions sur les tâches : validation globale, validation d'une étape, récurrence, suppression d'un événement. */
export function useTaskActions() {
  const s = useStore()
  const meId = s.me!.id
  const otherId = s.members.find((m) => m.id !== meId)?.id ?? meId

  const respawn = (t: Task) => {
    if (t.recurrence === 'none') return
    // « Alterner entre nous » : à chaque fois, l'autre prend le relais
    const assignee = t.rotate && t.assignee !== BOTH && t.assignee !== NONE ? (t.assignee === meId ? otherId : meId) : t.assignee
    const next = nextOccurrenceDate(t)
    s.addTask({
      title: t.title, notes: t.notes, assignee, deadline: next, domain: t.domain, dateMode: t.dateMode,
      remindDays: t.remindDays, rotate: t.rotate, auto: true,
      plannedOn: t.plannedOn && t.deadline ? nextOccurrenceDate({ ...t, deadline: t.plannedOn }) : null,
      recurrence: t.recurrence, steps: t.steps.map((x) => ({ ...x, done: false })), eventId: null,
    })
  }

  /** « Je m'en occupe » : prend une tâche qui n'avait pas de responsable. */
  const claim = (t: Task) => s.updateTask(t.id, { assignee: meId })

  /** Supprime une tâche ; un cadeau automatique est seulement « terminé » pour ne pas être recréé. */
  const deleteTask = (t: Task) => {
    if (t.id.startsWith('gift-')) s.updateTask(t.id, { done: true, doneAt: Date.now(), doneBy: meId })
    else s.removeTask(t.id)
  }

  /** Dire merci pour une tâche faite par l'autre. */
  const thank = (t: Task) => { if (!t.thankedBy.includes(meId)) s.updateTask(t.id, { thankedBy: [...t.thankedBy, meId] }) }

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

  return { toggleTask, toggleStep, cycleOwner, nextOwner, deleteEvent, claim, thank, deleteTask, meId, otherId, BOTH }
}
