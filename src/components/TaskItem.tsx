import type { Task } from '../lib/types'
import { DOMAINS } from '../lib/types'
import { useStore } from '../store/context'
import { assigneeLabel } from '../lib/tasks'
import { diffDays, relativeDate, todayISO } from '../lib/dates'
import { colorOf } from './ui'

export function TaskItem({ task, onOpen, onToggle, isNew }: {
  task: Task; onOpen: () => void; onToggle: () => void; isNew?: boolean
}) {
  const { members, me } = useStore()
  const late = !task.done && task.deadline && diffDays(task.deadline, todayISO()) < 0
  const creator = members.find((m) => m.id === task.createdBy)
  return (
    <div className={`card task ${task.done ? 'done' : ''}`} style={{ borderLeftColor: colorOf(task.assignee, members) }} onClick={onOpen}>
      <button className={`check ${task.done ? 'on' : ''}`} aria-label={task.done ? 'Rouvrir' : 'Terminer'}
        onClick={(e) => { e.stopPropagation(); onToggle() }}>{task.done ? '✓' : ''}</button>
      <div className="body">
        <div className="title">{task.title}</div>
        <div className="meta">
          <span><span className="dot" style={{ background: colorOf(task.assignee, members) }} /> {assigneeLabel(task.assignee, members, me?.id)}</span>
          {task.deadline && <span className={late ? 'late' : ''}>📅 {relativeDate(task.deadline)}</span>}
          <span>{DOMAINS[task.domain].emoji}</span>
          {task.recurrence !== 'none' && <span title="Récurrente">🔁</span>}
          {isNew && creator && <span className="badge">de {creator.name}</span>}
        </div>
      </div>
    </div>
  )
}
