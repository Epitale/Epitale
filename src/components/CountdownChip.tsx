import { countdown } from '../lib/tasks'
import type { Task } from '../lib/types'
import { Icon } from './Icon'

/** Pastille d'échéance : compte à rebours (« avant le ») ou jour précis (« le jour J »). */
export function CountdownChip({ task }: { task: Pick<Task, 'deadline' | 'dateMode' | 'done'> }) {
  if (task.done) return null
  const c = countdown(task)
  if (!c) return null
  return (
    <span className={`cd ${c.urgency}`}>
      <Icon name={c.flag ? 'flag' : 'cal'} size={12} sw={2.4} />{c.label}
    </span>
  )
}
