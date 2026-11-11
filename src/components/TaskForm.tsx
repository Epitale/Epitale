import { useState } from 'react'
import { Sheet, WhoPicker } from './ui'
import { useStore } from '../store/context'
import { DOMAINS, BOTH, type Domain, type Recurrence, type Task } from '../lib/types'
import { RECURRENCE_LABEL } from '../lib/tasks'
import { addDays, startOfWeek, todayISO } from '../lib/dates'

export function TaskForm({ task, defaultAssignee, onClose }: { task?: Task; defaultAssignee?: string; onClose: () => void }) {
  const s = useStore()
  const meId = s.me!.id
  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [assignee, setAssignee] = useState(task?.assignee ?? defaultAssignee ?? meId)
  const [deadline, setDeadline] = useState<string | null>(task ? task.deadline : null)
  const [domain, setDomain] = useState<Domain>(task?.domain ?? 'autre')
  const [recurrence, setRecurrence] = useState<Recurrence>(task?.recurrence ?? 'none')
  const [busy, setBusy] = useState(false)

  const today = todayISO()
  const weekend = addDays(startOfWeek(today), 5)
  const quick: [string, string][] = [
    ["Aujourd'hui", today], ['Demain', addDays(today, 1)],
    ['Ce week-end', weekend < today ? addDays(weekend, 7) : weekend], ['Semaine pro.', addDays(startOfWeek(today), 7)],
  ]

  const save = async () => {
    if (!title.trim() || busy) return
    setBusy(true)
    const data = { title: title.trim(), notes: notes.trim(), assignee, deadline, domain, recurrence }
    if (task) await s.updateTask(task.id, data)
    else await s.addTask(data)
    onClose()
  }

  return (
    <Sheet title={task ? 'Modifier la tâche' : 'Nouvelle tâche'} onClose={onClose}>
      <label>Quoi ?
        <input autoFocus={!task} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Appeler la crèche"
          onKeyDown={(e) => e.key === 'Enter' && save()} />
      </label>
      <label>Pour qui ?</label>
      <div style={{ marginTop: 6 }}><WhoPicker value={assignee} onChange={setAssignee} members={s.members} meId={meId} /></div>
      <label>Pour quand ?</label>
      <div className="chips" style={{ marginTop: 6 }}>
        {quick.map(([l, d]) => (
          <button type="button" key={l} className={`chip ${deadline === d ? 'on' : ''}`} onClick={() => setDeadline(d)}>{l}</button>
        ))}
        <button type="button" className={`chip ${deadline === null ? 'on' : ''}`} onClick={() => setDeadline(null)}>Sans date</button>
      </div>
      <label>Date précise
        <input type="date" value={deadline ?? ''} onChange={(e) => setDeadline(e.target.value || null)} />
      </label>
      <div className="row">
        <label>Domaine
          <select value={domain} onChange={(e) => setDomain(e.target.value as Domain)}>
            {Object.entries(DOMAINS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
          </select>
        </label>
        <label>Répéter
          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>
            {Object.entries(RECURRENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      <label>Détails (optionnel)
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="actions">
        {task && <button className="btn danger" onClick={async () => { if (confirm('Supprimer cette tâche ?')) { await s.removeTask(task.id); onClose() } }}>Supprimer</button>}
        <button className="btn primary" disabled={!title.trim() || busy} onClick={save}>{task ? 'Enregistrer' : 'Ajouter'}</button>
      </div>
      {!task && assignee !== meId && assignee !== BOTH && (
        <p className="muted small" style={{ marginTop: 10 }}>Elle la verra apparaître tout de suite dans « Aujourd'hui ».</p>
      )}
    </Sheet>
  )
}
