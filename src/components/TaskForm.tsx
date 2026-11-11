import { useState } from 'react'
import { Sheet, WhoPicker, DomainPicker } from './ui'
import { StepEditor } from './StepEditor'
import { useStore, uid } from '../store/context'
import type { Recurrence, Step, Task } from '../lib/types'
import { RECURRENCE_LABEL } from '../lib/tasks'
import { addDays, startOfWeek, todayISO } from '../lib/dates'
import { useTaskActions } from '../store/actions'

export function TaskForm({ task, defaultAssignee, defaultDomain, onClose }: {
  task?: Task; defaultAssignee?: string; defaultDomain?: string; onClose: () => void
}) {
  const s = useStore()
  const { toggleTask } = useTaskActions()
  const meId = s.me!.id
  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [assignee, setAssignee] = useState(task?.assignee ?? defaultAssignee ?? meId)
  const [deadline, setDeadline] = useState<string | null>(task ? task.deadline : null)
  const [domain, setDomain] = useState(task?.domain ?? defaultDomain ?? 'autre')
  const [recurrence, setRecurrence] = useState<Recurrence>(task?.recurrence ?? 'none')
  const [steps, setSteps] = useState<Step[]>(task?.steps ?? [])
  const [showTpl, setShowTpl] = useState(false)

  const today = todayISO()
  const weekend = addDays(startOfWeek(today), 5)
  const quick: [string, string][] = [
    ["Aujourd'hui", today], ['Demain', addDays(today, 1)],
    ['Ce week-end', weekend < today ? addDays(weekend, 7) : weekend], ['Semaine pro.', addDays(startOfWeek(today), 7)],
  ]
  const linked = task?.eventId ? s.events.find((e) => e.id === task.eventId) : undefined

  const save = () => {
    if (!title.trim()) return
    const all = steps.length > 0 && steps.every((x) => x.done)
    const data = { title: title.trim(), notes: notes.trim(), assignee, deadline, domain, recurrence, steps }
    if (task) {
      // si toutes les étapes viennent d'être cochées, la tâche se termine ; si on rouvre une étape, elle se rouvre
      s.updateTask(task.id, steps.length ? { ...data, done: all, doneAt: all ? task.doneAt ?? Date.now() : null, doneBy: all ? task.doneBy ?? meId : null } : data)
    } else s.addTask({ ...data, eventId: null })
    onClose()
  }

  const addFromTemplate = (id: string) => {
    const t = s.templates.find((x) => x.id === id)
    if (!t) return
    setSteps([...steps, ...t.steps.map((title) => ({ id: uid(), title, done: false, assignee: null }))])
    setShowTpl(false)
  }

  return (
    <Sheet title={task ? 'Modifier la tâche' : 'Nouvelle tâche'} onClose={onClose}>
      {linked && <div className="meta" style={{ marginTop: 4 }}><span className="pill">Liée à « {linked.title} »</span></div>}
      <label>Quoi ?
        <input autoFocus={!task} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Appeler la crèche"
          onKeyDown={(e) => e.key === 'Enter' && save()} />
      </label>
      <div className="lbl">Pour qui ?</div>
      <WhoPicker value={assignee} onChange={setAssignee} />
      <div className="lbl">Pour quand ?</div>
      <div className="chips">
        {quick.map(([l, d]) => (
          <button type="button" key={l} className={`chip ${deadline === d ? 'on' : ''}`} onClick={() => setDeadline(d)}>{l}</button>
        ))}
        <button type="button" className={`chip ${deadline === null ? 'on' : ''}`} onClick={() => setDeadline(null)}>Sans date</button>
      </div>
      <label>Date précise
        <input type="date" value={deadline ?? ''} onChange={(e) => setDeadline(e.target.value || null)} />
      </label>

      <div className="lbl">Domaine</div>
      <DomainPicker value={domain} onChange={setDomain} />

      <div className="lbl">Étapes {steps.length > 0 && `· ${steps.filter((x) => x.done).length} sur ${steps.length}`}</div>
      <div className="card" style={{ padding: '2px 14px' }}>
        <StepEditor steps={steps} onChange={setSteps} assignee={assignee} />
      </div>
      <div className="chips" style={{ marginTop: 10 }}>
        <button type="button" className="chip dash" onClick={() => setShowTpl(!showTpl)}>+ Depuis une liste type</button>
        {showTpl && s.templates.map((t) => (
          <button type="button" key={t.id} className="chip" onClick={() => addFromTemplate(t.id)}>{t.name}</button>
        ))}
      </div>
      {steps.length > 0 && <p className="hint">Touche l'avatar d'une étape pour changer qui s'en occupe.</p>}

      <label>Répéter
        <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>
          {Object.entries(RECURRENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label>Détails (optionnel)
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {task && steps.length > 0 && !task.done && (
        <button type="button" className="btn ghost" style={{ width: '100%', marginTop: 16 }} onClick={() => { toggleTask(task); onClose() }}>
          Tout valider d'un coup
        </button>
      )}
      <div className="actions">
        {task && <button className="btn danger" onClick={() => { if (confirm('Supprimer cette tâche ?')) { s.removeTask(task.id); onClose() } }}>Supprimer</button>}
        <button className="btn primary" disabled={!title.trim()} onClick={save}>{task ? 'Enregistrer' : 'Ajouter'}</button>
      </div>
    </Sheet>
  )
}
