import { useState } from 'react'
import { useStore } from '../store/context'
import { addMonths, longDate, monthGrid, monthLabel, todayISO, fromISO } from '../lib/dates'
import { colorOf } from '../components/ui'
import { TaskItem } from '../components/TaskItem'
import { TaskForm } from '../components/TaskForm'
import { EventForm } from '../components/EventForm'
import { useToggleTask } from '../store/actions'
import type { CalEvent, Task } from '../lib/types'

export function Planning({ adding, onCloseAdd }: { adding: boolean; onCloseAdd: () => void }) {
  const s = useStore()
  const toggle = useToggleTask()
  const today = todayISO()
  const [sel, setSel] = useState(today)
  const [cursor, setCursor] = useState(today)
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)

  const month = fromISO(cursor).getMonth()
  const marks = (iso: string) => {
    const cols = [
      ...s.events.filter((e) => e.date === iso).map((e) => colorOf(e.who, s.members)),
      ...s.tasks.filter((t) => !t.done && t.deadline === iso).map((t) => colorOf(t.assignee, s.members)),
    ]
    return cols.slice(0, 4)
  }
  const dayEvents = s.events.filter((e) => e.date === sel).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
  const dayTasks = s.tasks.filter((t) => t.deadline === sel).sort((a, b) => Number(a.done) - Number(b.done))

  return (
    <>
      <div className="cal-head">
        <button className="icon-btn" aria-label="Mois précédent" onClick={() => setCursor(addMonths(cursor, -1))}>‹</button>
        <h2>{monthLabel(cursor)}</h2>
        <button className="icon-btn" aria-label="Mois suivant" onClick={() => setCursor(addMonths(cursor, 1))}>›</button>
      </div>
      <div className="card cal">
        <div className="cal-grid">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
          {monthGrid(cursor).flat().map((iso) => (
            <button key={iso} className={`cal-day ${fromISO(iso).getMonth() !== month ? 'out' : ''} ${iso === today ? 'today' : ''} ${iso === sel ? 'sel' : ''}`} onClick={() => setSel(iso)}>
              <span className="n">{fromISO(iso).getDate()}</span>
              <span className="dots">{marks(iso).map((c, i) => <i key={i} style={{ background: c }} />)}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="section-title" style={{ textTransform: 'capitalize' }}>{longDate(sel)}</div>
        <div className="list">
          {dayEvents.map((e) => (
            <div key={e.id} className="card ev" style={{ borderLeftColor: colorOf(e.who, s.members) }} onClick={() => setEditEvent(e)}>
              <span className="time">{e.time ?? 'Jour'}</span>
              <div><strong>{e.title}</strong>{e.notes && <div className="muted small">{e.notes}</div>}</div>
            </div>
          ))}
          {dayTasks.map((t) => <TaskItem key={t.id} task={t} onToggle={() => toggle(t)} onOpen={() => setEditTask(t)} />)}
        </div>
        {!dayEvents.length && !dayTasks.length && <div className="empty">Rien de prévu ce jour-là.</div>}
      </section>

      {adding && <EventForm date={sel} onClose={onCloseAdd} />}
      {editEvent && <EventForm event={editEvent} onClose={() => setEditEvent(null)} />}
      {editTask && <TaskForm task={editTask} onClose={() => setEditTask(null)} />}
    </>
  )
}
