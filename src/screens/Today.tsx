import { useMemo, useState } from 'react'
import { useStore } from '../store/context'
import { bucketOf, concerns, sortTasks } from '../lib/tasks'
import { addDays, todayISO } from '../lib/dates'
import { TaskItem } from '../components/TaskItem'
import { TaskForm } from '../components/TaskForm'
import { EventForm } from '../components/EventForm'
import { colorOf } from '../components/ui'
import { useToggleTask } from '../store/actions'
import { useSeen } from '../lib/seen'
import { BOTH, type CalEvent, type Task } from '../lib/types'

export function Today() {
  const s = useStore()
  const toggle = useToggleTask()
  const meId = s.me!.id
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null)
  const { isNew, markSeen } = useSeen(meId)

  const today = todayISO()
  const mine = useMemo(() => s.tasks.filter((t) => !t.done && concerns(t.assignee, meId)).sort(sortTasks), [s.tasks, meId])
  const fresh = mine.filter((t) => isNew(t))
  const overdue = mine.filter((t) => bucketOf(t) === 'overdue')
  const todays = mine.filter((t) => bucketOf(t) === 'today')
  const soon = mine.filter((t) => t.deadline && t.deadline > today && t.deadline <= addDays(today, 7))
  const evToday = s.events.filter((e) => e.date === today && concerns(e.who, meId)).sort((a, b) => (a.time ?? '') < (b.time ?? '') ? -1 : 1)
  const evSoon = s.events.filter((e) => e.date > today && e.date <= addDays(today, 7) && concerns(e.who, meId)).sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')))

  const open = s.tasks.filter((t) => !t.done)
  const other = s.members.find((m) => m.id !== meId)
  const count = (id: string) => open.filter((t) => t.assignee === id).length
  const nBoth = open.filter((t) => t.assignee === BOTH).length
  const total = open.length || 1

  const empty = !overdue.length && !todays.length && !evToday.length
  const taskList = (list: Task[]) => (
    <div className="list">{list.map((t) => (
      <TaskItem key={t.id} task={t} isNew={isNew(t)} onToggle={() => toggle(t)} onOpen={() => { markSeen(); setEditTask(t) }} />
    ))}</div>
  )

  return (
    <>
      {s.members.length < 2 && s.householdCode && (
        <div className="banner">
          <strong>Invite ta copine 💌</strong>
          <p className="small muted" style={{ margin: '4px 0' }}>Elle crée son compte, choisit « J'ai un code » et saisit :</p>
          <div className="code">{s.householdCode}</div>
        </div>
      )}

      {fresh.length > 0 && (
        <section className="section">
          <div className="section-title"><span>🆕 Nouveau pour toi</span><button className="link" style={{ margin: 0 }} onClick={markSeen}>C'est vu</button></div>
          {taskList(fresh)}
        </section>
      )}

      {overdue.length > 0 && (
        <section className="section"><div className="section-title danger">En retard</div>{taskList(overdue)}</section>
      )}

      <section className="section">
        <div className="section-title">Aujourd'hui</div>
        <div className="list">
          {evToday.map((e) => (
            <div key={e.id} className="card ev" style={{ borderLeftColor: colorOf(e.who, s.members) }} onClick={() => setEditEvent(e)}>
              <span className="time">{e.time ?? 'Jour'}</span><strong>{e.title}</strong>
            </div>
          ))}
          {todays.map((t) => (
            <TaskItem key={t.id} task={t} isNew={isNew(t)} onToggle={() => toggle(t)} onOpen={() => setEditTask(t)} />
          ))}
        </div>
        {empty && <div className="empty"><span className="big">🎉</span>Rien d'urgent aujourd'hui.</div>}
      </section>

      {(soon.length > 0 || evSoon.length > 0) && (
        <section className="section">
          <div className="section-title">Les 7 prochains jours</div>
          <div className="list">
            {evSoon.map((e) => (
              <div key={e.id} className="card ev" style={{ borderLeftColor: colorOf(e.who, s.members) }} onClick={() => setEditEvent(e)}>
                <span className="time">{e.date.slice(8)}/{e.date.slice(5, 7)}</span>
                <span><strong>{e.title}</strong> <span className="muted small">{e.time ?? ''}</span></span>
              </div>
            ))}
            {soon.map((t) => <TaskItem key={t.id} task={t} onToggle={() => toggle(t)} onOpen={() => setEditTask(t)} />)}
          </div>
        </section>
      )}

      {other && open.length > 0 && (
        <section className="section">
          <div className="section-title">Répartition des tâches en cours</div>
          <div className="card balance">
            <div className="bar">
              <span style={{ width: `${(count(meId) / total) * 100}%`, background: s.me!.color }} />
              <span style={{ width: `${(nBoth / total) * 100}%`, background: colorOf(BOTH, s.members) }} />
              <span style={{ width: `${(count(other.id) / total) * 100}%`, background: other.color }} />
            </div>
            <div className="legend">
              <span><span className="dot" style={{ background: s.me!.color }} /> {s.me!.name} · {count(meId)}</span>
              <span><span className="dot" style={{ background: colorOf(BOTH, s.members) }} /> À deux · {nBoth}</span>
              <span><span className="dot" style={{ background: other.color }} /> {other.name} · {count(other.id)}</span>
            </div>
          </div>
        </section>
      )}

      {editTask && <TaskForm task={editTask} onClose={() => setEditTask(null)} />}
      {editEvent && <EventForm event={editEvent} onClose={() => setEditEvent(null)} />}
    </>
  )
}
