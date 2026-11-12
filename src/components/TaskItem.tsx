import { useState } from 'react'
import type { Task } from '../lib/types'
import { useStore } from '../store/context'
import { assigneeLabel, hasSteps, stepOwner, stepsDone } from '../lib/tasks'
import { DomainTag, OwnerAvatar } from './ui'
import { CountdownChip } from './CountdownChip'
import { Icon } from './Icon'
import { useTaskActions } from '../store/actions'

export function TaskItem({ task, onOpen, isNew }: { task: Task; onOpen: () => void; isNew?: boolean }) {
  const { members, me } = useStore()
  const { toggleTask, toggleStep, cycleOwner } = useTaskActions()
  const [open, setOpen] = useState(false)
  const creator = members.find((m) => m.id === task.createdBy)
  const n = task.steps.length, d = stepsDone(task)
  const part = !task.done && d > 0

  return (
    <div className={`card task ${task.done ? 'done' : ''}`} onClick={onOpen}>
      <button className={`chk ${task.done ? 'on' : part ? 'part' : ''}`}
        aria-label={task.done ? 'Rouvrir' : hasSteps(task) ? 'Tout valider' : 'Terminer'}
        onClick={(e) => { e.stopPropagation(); toggleTask(task) }}>
        {task.done && <Icon name="check" size={14} sw={3.2} />}
      </button>
      <div className="body">
        <div className="t-title">{task.title}</div>
        <div className="meta">
          <span className="who"><OwnerAvatar who={task.assignee} />{assigneeLabel(task.assignee, members, me?.id)}</span>
          <CountdownChip task={task} />
          <DomainTag id={task.domain} />
          {task.recurrence !== 'none' && <span title="Récurrente">{task.rotate ? '↻ à tour de rôle' : '↻'}</span>}
          {hasSteps(task) && <span className="count">{d} sur {n}</span>}
          {isNew && creator && <span className="new-badge">de {creator.name}</span>}
        </div>
        {hasSteps(task) && (
          <>
            <div className="prog"><b style={{ width: `${(d / n) * 100}%` }} /></div>
            <button className="expander" onClick={(e) => { e.stopPropagation(); setOpen(!open) }}>
              {open ? 'Masquer les étapes' : 'Voir les étapes'} <Icon name={open ? 'up' : 'down'} size={14} sw={2.4} />
            </button>
            {open && (
              <div className="steps" onClick={(e) => e.stopPropagation()}>
                {task.steps.map((s) => (
                  <div key={s.id} className={`step ${s.done ? 'done' : ''}`}>
                    <button className={`chk ${s.done ? 'on' : ''}`} aria-label={s.done ? 'Rouvrir' : 'Terminer'} onClick={() => toggleStep(task, s.id)}>
                      {s.done && <Icon name="check" size={14} sw={3.2} />}
                    </button>
                    <span className="lab">{s.title}</span>
                    <OwnerAvatar who={stepOwner(task, s)} onClick={() => cycleOwner(task, s.id)} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
