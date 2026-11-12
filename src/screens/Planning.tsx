import { useState } from 'react'
import { useStore } from '../store/context'
import { addMonths, longDate, monthGrid, monthLabel, todayISO, fromISO } from '../lib/dates'
import { colorOf } from '../components/ui'
import { TaskItem } from '../components/TaskItem'
import { TaskForm } from '../components/TaskForm'
import { EventForm } from '../components/EventForm'
import { EventEditor } from '../components/EventEditor'
import { BirthdayForm } from '../components/BirthdayForm'
import { BirthdayCard } from '../components/BirthdayCard'
import { Icon } from '../components/Icon'
import { byStart, coversDay, expandEvents, isBirthday, isMultiDay, rangeLabel, timeLabel, weekBars } from '../lib/events'
import { monthGrid as mg, addDays } from '../lib/dates'
import { useMemo } from 'react'
import { OwnerAvatar } from '../components/ui'
import type { CalEvent, Task } from '../lib/types'

export function Planning({ adding, onCloseAdd }: { adding: boolean; onCloseAdd: () => void }) {
  const s = useStore()
  const today = todayISO()
  const [sel, setSel] = useState(today)
  const [cursor, setCursor] = useState(today)
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [addingBd, setAddingBd] = useState(false)

  const month = fromISO(cursor).getMonth()
  const grid = monthGrid(cursor)
  // occurrences (récurrences dépliées) visibles sur le mois affiché
  const occ = useMemo(() => expandEvents(s.events, addDays(grid[0][0], -1), addDays(grid[grid.length - 1][6], 1)), [s.events, cursor])
  const original = (id: string) => s.events.find((e) => e.id === id)!
  const dots = (iso: string) => [
    ...occ.filter((e) => !isMultiDay(e) && !isBirthday(e) && e.date === iso).map((e) => colorOf(e.who, s.members)),
    ...s.tasks.filter((t) => !t.done && t.deadline === iso && t.dateMode === 'on').map((t) => colorOf(t.assignee, s.members)),
  ].slice(0, 4)
  const hasBirthday = (iso: string) => occ.some((e) => isBirthday(e) && e.date === iso)
  const hasDeadline = (iso: string) => s.tasks.some((t) => !t.done && t.deadline === iso && t.dateMode === 'before')
  const dayEvents = occ.filter((e) => coversDay(e, sel)).sort(byStart)
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
        {grid.map((week) => (
          <div className="wk" key={week[0]}>
            <div className="days">
              {week.map((iso) => (
                <button key={iso} className={`day ${fromISO(iso).getMonth() !== month ? 'out' : ''} ${iso === today ? 'today' : ''} ${iso === sel ? 'sel' : ''}`} onClick={() => setSel(iso)}>
                  <b>{fromISO(iso).getDate()}</b>
                  <span className="marks">
                    {hasBirthday(iso) && <Icon name="cake" size={11} sw={2.4} />}
                    {hasDeadline(iso) && <span className="fl"><Icon name="flag" size={10} sw={2.6} /></span>}
                  </span>
                  <span className="dot-row">{dots(iso).map((c, i) => <i key={i} style={{ background: c }} />)}</span>
                </button>
              ))}
            </div>
            <div className="bars">
              {weekBars(week, occ.filter((e) => !isBirthday(e))).map((b) => (
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

      <div style={{ marginTop: 12 }}><button className="btn ghost" style={{ width: '100%', padding: 10, fontSize: 14 }} onClick={() => setAddingBd(true)}>+ Ajouter un anniversaire</button></div>
      <section>
        <div className="sec" style={{ textTransform: 'capitalize' }}>{longDate(sel)}</div>
        <div className="list">
          {dayEvents.filter(isBirthday).map((e) => <BirthdayCard key={e.id + e.date} event={e} onOpen={() => setEditEvent(original(e.id))} />)}
          {dayEvents.filter((e) => !isBirthday(e)).map((e) => (
            <div key={e.id + e.date} className="card ev" style={{ borderLeftColor: colorOf(e.who, s.members) }} onClick={() => setEditEvent(original(e.id))}>
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
      {addingBd && <BirthdayForm onClose={() => setAddingBd(false)} />}
      {editEvent && <EventEditor event={editEvent} onClose={() => setEditEvent(null)} />}
      {editTask && <TaskForm task={editTask} onClose={() => setEditTask(null)} />}
    </>
  )
}
