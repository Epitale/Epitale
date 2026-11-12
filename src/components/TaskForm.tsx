import { useState } from 'react'
import { Sheet, WhoPicker, DomainPicker } from './ui'
import { StepEditor } from './StepEditor'
import { CountdownChip } from './CountdownChip'
import { useStore, uid } from '../store/context'
import { BOTH, NONE, type Recurrence, type Step, type Task } from '../lib/types'
import { RECURRENCE_LABEL, countdown } from '../lib/tasks'
import { addDays, startOfWeek, todayISO } from '../lib/dates'
import { useTaskActions } from '../store/actions'

export function TaskForm({ task, defaultAssignee, defaultDomain, defaults, onClose }: {
  task?: Task; defaultAssignee?: string; defaultDomain?: string; defaults?: Partial<Task>; onClose: () => void
}) {
  const s = useStore()
  const { toggleTask, deleteTask } = useTaskActions()
  const meId = s.me!.id
  const init = task ?? (defaults as Task | undefined)
  const [title, setTitle] = useState(init?.title ?? '')
  const [notes, setNotes] = useState(init?.notes ?? '')
  const [assignee, setAssignee] = useState(init?.assignee ?? defaultAssignee ?? meId)
  const [dateMode, setDateMode] = useState<'before' | 'on'>(init?.dateMode ?? 'before')
  const [deadline, setDeadline] = useState<string | null>(init ? init.deadline ?? null : null)
  const [remind, setRemind] = useState<number | null>(init?.remindDays ?? null)
  const [plannedOn, setPlannedOn] = useState<string | null>(init?.plannedOn ?? null)
  const [domain, setDomain] = useState(init?.domain ?? defaultDomain ?? 'autre')
  const [recurrence, setRecurrence] = useState<Recurrence>(init?.recurrence ?? 'none')
  const [rotate, setRotate] = useState(init?.rotate ?? false)
  const [steps, setSteps] = useState<Step[]>(task?.steps ?? init?.steps ?? [])
  const [showTpl, setShowTpl] = useState(false)

  const today = todayISO()
  const weekend = addDays(startOfWeek(today), 5)
  const quick: [string, string][] = [
    ["Aujourd'hui", today], ['Demain', addDays(today, 1)],
    ['Ce week-end', weekend < today ? addDays(weekend, 7) : weekend], ['Semaine pro.', addDays(startOfWeek(today), 7)],
    ['Dans 2 semaines', addDays(today, 14)],
  ]
  const linked = task?.eventId ? s.events.find((e) => e.id === task.eventId) : undefined
  const preview = deadline ? countdown({ deadline, dateMode, done: false }) : null
  const canRotate = recurrence !== 'none' && assignee !== BOTH && assignee !== NONE

  const save = () => {
    if (!title.trim()) return
    const all = steps.length > 0 && steps.every((x) => x.done)
    const data = {
      title: title.trim(), notes: notes.trim(), assignee, deadline, domain, recurrence, steps, dateMode,
      remindDays: dateMode === 'before' && deadline ? remind : null,
      plannedOn: dateMode === 'before' ? plannedOn : null,
      rotate: canRotate ? rotate : false,
    }
    if (task) {
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
      <WhoPicker value={assignee} onChange={setAssignee} allowNone />

      <div className="lbl">C'est pour…</div>
      <div className="seg">
        <button type="button" className={dateMode === 'before' ? 'on' : ''} onClick={() => setDateMode('before')}>Avant le… (échéance)</button>
        <button type="button" className={dateMode === 'on' ? 'on' : ''} onClick={() => setDateMode('on')}>Le jour J</button>
      </div>

      <div className="lbl">{dateMode === 'before' ? 'À finir avant…' : 'À faire le…'}</div>
      <div className="chips">
        {quick.map(([l, d]) => (
          <button type="button" key={l} className={`chip ${deadline === d ? 'on' : ''}`} onClick={() => setDeadline(d)}>{l}</button>
        ))}
        <button type="button" className={`chip ${deadline === null ? 'on' : ''}`} onClick={() => setDeadline(null)}>Sans date</button>
      </div>
      <label>Date précise
        <input type="date" value={deadline ?? ''} onChange={(e) => setDeadline(e.target.value || null)} />
      </label>

      {preview && (
        <div className="card" style={{ padding: '12px 14px', marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          <CountdownChip task={{ deadline, dateMode, done: false }} />
          <div className="small" style={{ flex: 1 }}>
            {dateMode === 'before'
              ? "Elle apparaîtra dans « À finir bientôt » dès maintenant, de plus en plus pressante, jusqu'à la date limite."
              : "Elle apparaîtra ce jour-là dans « Aujourd'hui »."}
          </div>
        </div>
      )}

      {dateMode === 'before' && deadline && (
        <>
          <button type="button" className="toggle" style={{ marginTop: 12 }} onClick={() => setRemind(remind === null ? 2 : null)} aria-pressed={remind !== null}>
            <span>Me prévenir <strong>{remind ?? 2} jour{(remind ?? 2) > 1 ? 's' : ''} avant</strong><small>Notification sur ton téléphone</small></span>
            <span className={`sw ${remind !== null ? 'on' : ''}`} />
          </button>
          {remind !== null && (
            <div className="chips" style={{ marginTop: 8 }}>
              {[1, 2, 3, 7].map((n) => <button type="button" key={n} className={`chip ${remind === n ? 'on' : ''}`} onClick={() => setRemind(n)}>{n} jour{n > 1 ? 's' : ''}</button>)}
            </div>
          )}
          <button type="button" className="toggle" style={{ marginTop: 10 }} onClick={() => setPlannedOn(plannedOn ? null : deadline < today ? today : deadline)} aria-pressed={!!plannedOn}>
            <span>Je m'y mets le…<small>Optionnel : le jour où tu comptes la faire</small></span>
            <span className={`sw ${plannedOn ? 'on' : ''}`} />
          </button>
          {plannedOn && <label style={{ marginTop: 0 }}><input type="date" value={plannedOn} max={deadline} onChange={(e) => setPlannedOn(e.target.value || null)} /></label>}
        </>
      )}

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
      {canRotate && (
        <button type="button" className="toggle" style={{ marginTop: 10 }} onClick={() => setRotate(!rotate)} aria-pressed={rotate}>
          <span>Alterner entre nous<small>À tour de rôle : toi, puis {s.members.find((m) => m.id !== meId)?.name ?? 'l\'autre'}, puis toi…</small></span>
          <span className={`sw ${rotate ? 'on' : ''}`} />
        </button>
      )}
      <label>Détails (optionnel)
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {task && steps.length > 0 && !task.done && (
        <button type="button" className="btn ghost" style={{ width: '100%', marginTop: 16 }} onClick={() => { toggleTask(task); onClose() }}>
          Tout valider d'un coup
        </button>
      )}
      <div className="actions">
        {task && <button className="btn danger" onClick={() => { if (confirm('Supprimer cette tâche ?')) { deleteTask(task); onClose() } }}>Supprimer</button>}
        <button className="btn primary" disabled={!title.trim()} onClick={save}>{task ? 'Enregistrer' : 'Ajouter'}</button>
      </div>
    </Sheet>
  )
}
