import { useMemo, useState } from 'react'
import { useStore } from '../store/context'
import { bucketOf, sortTasks, type Bucket } from '../lib/tasks'
import { TaskItem } from '../components/TaskItem'
import { TaskForm } from '../components/TaskForm'
import { useToggleTask } from '../store/actions'
import { BOTH, type Task } from '../lib/types'

type Filter = 'me' | 'other' | 'both' | 'all'

export function Tasks({ adding, onCloseAdd }: { adding: boolean; onCloseAdd: () => void }) {
  const s = useStore()
  const toggle = useToggleTask()
  const meId = s.me!.id
  const other = s.members.find((m) => m.id !== meId)
  const [filter, setFilter] = useState<Filter>('me')
  const [edit, setEdit] = useState<Task | null>(null)
  const [showDone, setShowDone] = useState(false)

  const match = (t: Task) =>
    filter === 'all' || (filter === 'me' && t.assignee === meId) || (filter === 'other' && t.assignee === other?.id) || (filter === 'both' && t.assignee === BOTH)

  const open = useMemo(() => s.tasks.filter((t) => !t.done && match(t)).sort(sortTasks), [s.tasks, filter])
  const done = useMemo(() => s.tasks.filter((t) => t.done && match(t)).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)).slice(0, 30), [s.tasks, filter])
  const n = (f: (t: Task) => boolean) => s.tasks.filter((t) => !t.done && f(t)).length

  const groups: [Bucket, string][] = [['overdue', 'En retard'], ['today', "Aujourd'hui"], ['upcoming', 'À venir'], ['nodate', 'Sans date']]
  const defaultAssignee = filter === 'other' && other ? other.id : filter === 'both' ? BOTH : meId

  return (
    <>
      <div className="seg">
        <button className={filter === 'me' ? 'on' : ''} onClick={() => setFilter('me')}>Moi · {n((t) => t.assignee === meId)}</button>
        {other && <button className={filter === 'other' ? 'on' : ''} onClick={() => setFilter('other')}>{other.name} · {n((t) => t.assignee === other.id)}</button>}
        <button className={filter === 'both' ? 'on' : ''} onClick={() => setFilter('both')}>À deux · {n((t) => t.assignee === BOTH)}</button>
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Tout</button>
      </div>

      {groups.map(([b, label]) => {
        const list = open.filter((t) => bucketOf(t) === b)
        if (!list.length) return null
        return (
          <section className="section" key={b}>
            <div className={`section-title ${b === 'overdue' ? 'danger' : ''}`}>{label} · {list.length}</div>
            <div className="list">{list.map((t) => <TaskItem key={t.id} task={t} onToggle={() => toggle(t)} onOpen={() => setEdit(t)} />)}</div>
          </section>
        )
      })}
      {!open.length && <div className="empty"><span className="big">✨</span>Rien à faire ici. Appuie sur + pour ajouter.</div>}

      {done.length > 0 && (
        <section className="section">
          <button className="link" style={{ margin: 0 }} onClick={() => setShowDone(!showDone)}>{showDone ? 'Masquer' : 'Voir'} les tâches faites ({done.length})</button>
          {showDone && <div className="list" style={{ marginTop: 8 }}>{done.map((t) => <TaskItem key={t.id} task={t} onToggle={() => toggle(t)} onOpen={() => setEdit(t)} />)}</div>}
        </section>
      )}

      {adding && <TaskForm defaultAssignee={defaultAssignee} onClose={onCloseAdd} />}
      {edit && <TaskForm task={edit} onClose={() => setEdit(null)} />}
    </>
  )
}
