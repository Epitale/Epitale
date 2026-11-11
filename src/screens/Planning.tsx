import { useState } from 'react'
import { useStore } from '../store/context'
import { addMonths, longDate, monthGrid, monthLabel, todayISO, fromISO } from '../lib/dates'
import { colorOf } from '../components/ui'
import { TaskItem } from '../components/TaskItem'
import { TaskForm } from '../components/TaskForm'
import { EventForm } from '../components/EventForm'
import { Icon } from '../components/Icon'
import { byStart, coversDay, isMultiDay, rangeLabel, timeLabel, weekBars } from '../lib/events'
import { OwnerAvatar } from '../components/ui'
import type { CalEvent, Task } from '../lib/types'

export function Planning({ adding, onCloseAdd }: { adding: boolean; onCloseAdd: () => void }) {
  const s = useStore()
  const today = todayISO()
  const [sel, setSel] = useState(today)
  const [cursor, setCursor] = useState(today)
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)

  const month = fromISO(cursor).getMonth()
  const dots = (iso: string) => [
    ...s.events.filter((e) => !isMultiDay(e) && e.date === iso).map((e) => colorOf(e.who, s.members)),
    ...s.tasks.filter((t) => !t.done && t.deadline === iso).map((t) => colorOf(t.assignee, s.members)),
  ].slice(0, 4)
  const dayEvents = s.events.filter((e) => coversDay(e, sel)).sort(byStart)
  const dayTasks = s.tasks.filter((t) => t.deadline === sel).sort((a, b) => Number(a.done) - Number(b.done))

  return (
    <>
      <div className="cal-head">
        <button className="nav" aria-label="Mois précédent" onClick={() => setCursor(addMonths(cursor, -1))}><Icon name="left" size={20} sw={2} /></button>
        <h2>{monthLabel(cursor)}</h2>
        <button className="nav" aria-label="Mois suivant" onClick={() => setCursor(addMonths(cursor, 1))}><Icon name="right" size={20} sw={2} /></button>
      </div>
      <div className="card cal">
        <div className="dow">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}</div>
        {monthGrid(cursor).map((week) => (
          <div className="wk" key={week[0]}>
            <div className="days">
              {week.map((iso) => (
                <button key={iso} className={`day ${fromISO(iso).getMonth() !== month ? 'out' : ''} ${iso === today ? 'today' : ''} ${iso === sel ? 'sel' : ''}`} onClick={() => setSel(iso)}>
                  <b>{fromISO(iso).getDate()}</b>
                  <span className="dot-row">{dots(iso).map((c, i) => <i key={i} style={{ background: c }} />)}</span>
                </button>
              ))}
            </div>
            <div className="bars">
              {weekBars(week, s.events).map((b) => (
                <button key={b.ev.id + b.col} className={`bar-ev ${b.contLeft ? 'cl' : ''} ${b.contRight ? 'cr' : ''}`}
                  style={{ gridColumn: `${b.col} / span ${b.span}`, gridRow: b.lane, background: colorOf(b.ev.who, s.members) }}
                  onClick={() => setSel(b.ev.date < week[0] ? week[0] : b.ev.date)}>
                  {b.ev.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <section>
        <div className="sec" style={{ textTransform: 'capitalize' }}>{longDate(sel)}</div>
        <div className="list">
          {dayEvents.map((e) => (
            <div key={e.id} className="card ev" style={{ borderLeftColor: colorOf(e.who, s.members) }} onClick={() => setEditEvent(e)}>
              <span className={`time ${!e.time || isMultiDay(e) ? 'long' : ''}`}>{e.time && !isMultiDay(e) ? e.time : isMultiDay(e) ? 'Sur plusieurs jours' : 'Toute la journée'}</span>
              <div>
                <div className="t-title">{e.title}</div>
                <div className="meta" style={{ marginTop: 2 }}>
                  <span className="who"><OwnerAvatar who={e.who} /></span>
                  <span>{isMultiDay(e) ? rangeLabel(e) : timeLabel(e)}</span>
                </div>
                {e.notes && <div className="muted small">{e.notes}</div>}
              </div>
            </div>
          ))}
          {dayTasks.map((t) => <TaskItem key={t.id} task={t} onOpen={() => setEditTask(t)} />)}
        </div>
        {!dayEvents.length && !dayTasks.length && <div className="empty">Rien de prévu ce jour-là.</div>}
      </section>

      {adding && <EventForm date={sel} onClose={onCloseAdd} />}
      {editEvent && <EventForm event={editEvent} onClose={() => setEditEvent(null)} />}
      {editTask && <TaskForm task={editTask} onClose={() => setEditTask(null)} />}
    </>
  )
}
