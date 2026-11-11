import { useMemo, useState } from 'react'
import { useStore } from '../store/context'
import { bucketOf, concerns, sortTasks } from '../lib/tasks'
import { addDays, relativeDate, todayISO } from '../lib/dates'
import { TaskItem } from '../components/TaskItem'
import { TaskForm } from '../components/TaskForm'
import { EventForm } from '../components/EventForm'
import { OwnerAvatar, colorOf } from '../components/ui'
import { useSeen } from '../lib/seen'
import { byStart, coversDay, rangeLabel, timeLabel, isMultiDay } from '../lib/events'
import { BOTH, type CalEvent, type Task } from '../lib/types'

export function Today() {
  const s = useStore()
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
  const mineEv = s.events.filter((e) => concerns(e.who, meId))
  const evToday = mineEv.filter((e) => coversDay(e, today)).sort(byStart)
  const evSoon = mineEv.filter((e) => e.date > today && e.date <= addDays(today, 7)).sort(byStart)

  const open = s.tasks.filter((t) => !t.done)
  const other = s.members.find((m) => m.id !== meId)
  const count = (id: string) => open.filter((t) => t.assignee === id).length
  const nBoth = open.filter((t) => t.assignee === BOTH).length
  const total = open.length || 1
  const empty = !overdue.length && !todays.length && !evToday.length

  const taskList = (list: Task[]) => (
    <div className="list">{list.map((t) => <TaskItem key={t.id} task={t} isNew={isNew(t)} onOpen={() => setEditTask(t)} />)}</div>
  )
  const evRow = (e: CalEvent, withDay?: boolean) => (
    <div key={e.id} className="card ev" style={{ borderLeftColor: colorOf(e.who, s.members) }} onClick={() => setEditEvent(e)}>
      <span className={`time ${!e.time || isMultiDay(e) ? 'long' : ''}`}>{withDay ? relativeDate(e.date) : e.time ?? 'Journée'}</span>
      <div>
        <div className="t-title">{e.title}</div>
        <div className="meta" style={{ marginTop: 2 }}>
          <span className="who"><OwnerAvatar who={e.who} /></span>
          <span>{isMultiDay(e) ? rangeLabel(e) : timeLabel(e)}</span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {s.members.length < 2 && s.householdCode && (
        <div className="banner">
          <strong>Invite ta copine 💌</strong>
          <p className="small" style={{ margin: '4px 0' }}>Elle crée son compte, choisit « J'ai un code » et saisit :</p>
          <div className="code">{s.householdCode}</div>
        </div>
      )}

      {fresh.length > 0 && (
        <section className="callout">
          <div className="sec"><span>Elle t'a laissé ça</span><button className="link" style={{ margin: 0 }} onClick={markSeen}>Vu !</button></div>
          {taskList(fresh)}
        </section>
      )}

      {overdue.length > 0 && <section><div className="sec danger">À rattraper</div>{taskList(overdue)}</section>}

      <section>
        <div className="sec">Aujourd'hui</div>
        <div className="list">
          {evToday.map((e) => evRow(e))}
          {todays.map((t) => <TaskItem key={t.id} task={t} isNew={isNew(t)} onOpen={() => setEditTask(t)} />)}
        </div>
        {empty && <div className="empty">Rien de prévu aujourd'hui. Profitez 😌</div>}
      </section>

      {(soon.length > 0 || evSoon.length > 0) && (
        <section>
          <div className="sec">Les 7 prochains jours</div>
          <div className="list">
            {evSoon.map((e) => evRow(e, true))}
            {soon.map((t) => <TaskItem key={t.id} task={t} onOpen={() => setEditTask(t)} />)}
          </div>
        </section>
      )}

      {other && open.length > 0 && (
        <section>
          <div className="sec">Qui porte quoi ?</div>
          <div className="card balance">
            <div className="bar">
              <span style={{ width: `${(count(meId) / total) * 100}%`, background: s.me!.color }} />
              <span style={{ width: `${(nBoth / total) * 100}%`, background: colorOf(BOTH, s.members) }} />
              <span style={{ width: `${(count(other.id) / total) * 100}%`, background: other.color }} />
            </div>
            <div className="legend">
              <span><i className="dot" style={{ background: s.me!.color, marginRight: 5 }} />{s.me!.name} · {count(meId)}</span>
              <span><i className="dot" style={{ background: colorOf(BOTH, s.members), marginRight: 5 }} />À deux · {nBoth}</span>
              <span><i className="dot" style={{ background: other.color, marginRight: 5 }} />{other.name} · {count(other.id)}</span>
            </div>
          </div>
        </section>
      )}

      {editTask && <TaskForm task={editTask} onClose={() => setEditTask(null)} />}
      {editEvent && <EventForm event={editEvent} onClose={() => setEditEvent(null)} />}
    </>
  )
}
