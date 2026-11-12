import { useMemo, useState } from 'react'
import { useStore } from '../store/context'
import { concerns, isDueSoon, isFree, isOverdue, isPlannedToday, sortTasks } from '../lib/tasks'
import { addDays, relativeDate, todayISO, fromISO } from '../lib/dates'
import { TaskItem } from '../components/TaskItem'
import { TaskForm } from '../components/TaskForm'
import { EventEditor } from '../components/EventEditor'
import { BirthdayCard } from '../components/BirthdayCard'
import { Icon } from '../components/Icon'
import { OwnerAvatar, colorOf, DomainTag } from '../components/ui'
import { CountdownChip } from '../components/CountdownChip'
import { useSeen } from '../lib/seen'
import { useTaskActions } from '../store/actions'
import { byStart, coversDay, expandEvents, isBirthday, isMultiDay, rangeLabel, timeLabel } from '../lib/events'
import { BOTH, type CalEvent, type Task } from '../lib/types'

export function Today({ onQuickAdd, onOpenBilan }: { onQuickAdd: () => void; onOpenBilan: () => void }) {
  const s = useStore()
  const { claim } = useTaskActions()
  const meId = s.me!.id
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null)
  const { isNew, markSeen } = useSeen(meId)

  const today = todayISO()
  const open = s.tasks.filter((t) => !t.done)
  const mine = useMemo(() => open.filter((t) => concerns(t.assignee, meId)).sort(sortTasks), [s.tasks, meId])
  const fresh = mine.filter((t) => isNew(t))
  const overdue = mine.filter((t) => isOverdue(t, today))
  const planned = mine.filter((t) => !isOverdue(t, today) && isPlannedToday(t, today))
  const dueSoon = mine.filter((t) => isDueSoon(t, today) && !isPlannedToday(t, today))
  const free = open.filter(isFree).sort(sortTasks)
  const later = mine.filter((t) => t.dateMode === 'on' && t.deadline && t.deadline > today && t.deadline <= addDays(today, 7))

  const occ = useMemo(() => expandEvents(s.events, today, addDays(today, 7)).filter((e) => concerns(e.who, meId) || isBirthday(e)), [s.events, meId, today])
  const bdToday = occ.filter((e) => isBirthday(e) && e.date === today)
  const bdSoon = occ.filter((e) => isBirthday(e) && e.date === addDays(today, 1))
  const evToday = occ.filter((e) => !isBirthday(e) && coversDay(e, today)).sort(byStart)
  const evSoon = occ.filter((e) => !isBirthday(e) && e.date > today).sort(byStart)
  const original = (id: string) => s.events.find((e) => e.id === id)!

  const other = s.members.find((m) => m.id !== meId)
  const count = (id: string) => open.filter((t) => t.assignee === id).length
  const nBoth = open.filter((t) => t.assignee === BOTH).length
  const total = open.length || 1
  const dow = new Date().getDay()
  const empty = !overdue.length && !planned.length && !evToday.length && !bdToday.length

  const taskList = (list: Task[]) => (
    <div className="list">{list.map((t) => <TaskItem key={t.id} task={t} isNew={isNew(t)} onOpen={() => setEditTask(t)} />)}</div>
  )
  const evRow = (e: CalEvent, withDay?: boolean) => (
    <div key={e.id + e.date} className="card ev" style={{ borderLeftColor: colorOf(e.who, s.members) }} onClick={() => setEditEvent(original(e.id))}>
      <span className={`time ${!e.time || isMultiDay(e) || withDay ? 'long' : ''}`}>{withDay ? relativeDate(e.date) : e.time ?? 'Journée'}</span>
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

      <button className="quick" onClick={onQuickAdd}>
        <Icon name="plus" size={20} sw={2} />Ajouter vite : « RDV pédiatre vendredi 10h »
      </button>

      {fresh.length > 0 && (
        <section className="callout">
          <div className="sec"><span>{other ? `${other.name} t'a laissé ça` : 'Du nouveau pour toi'}</span><button className="link" style={{ margin: 0 }} onClick={markSeen}>Vu !</button></div>
          {taskList(fresh)}
        </section>
      )}

      {overdue.length > 0 && <section><div className="sec danger">À rattraper</div>{taskList(overdue)}</section>}

      <section>
        <div className="sec">Aujourd'hui</div>
        <div className="list">
          {bdToday.map((e) => <BirthdayCard key={e.id} event={e} onOpen={() => setEditEvent(original(e.id))} />)}
          {evToday.map((e) => evRow(e))}
          {planned.map((t) => <TaskItem key={t.id} task={t} isNew={isNew(t)} onOpen={() => setEditTask(t)} />)}
        </div>
        {empty && <div className="empty">Rien de prévu aujourd'hui. Profitez 😌</div>}
      </section>

      {bdSoon.length > 0 && <section><div className="sec">Demain</div><div className="list">{bdSoon.map((e) => <BirthdayCard key={e.id} event={e} onOpen={() => setEditEvent(original(e.id))} />)}</div></section>}

      {dueSoon.length > 0 && (
        <section>
          <div className="sec"><span>À finir bientôt</span><span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>par urgence</span></div>
          {taskList(dueSoon)}
        </section>
      )}

      {free.length > 0 && (
        <section>
          <div className="sec">À prendre · personne ne l'a encore</div>
          <div className="list">
            {free.slice(0, 3).map((t) => (
              <div key={t.id} className="free" onClick={() => setEditTask(t)}>
                <div className="body">
                  <div className="t-title">{t.title}</div>
                  <div className="meta"><CountdownChip task={t} /><DomainTag id={t.domain} /></div>
                </div>
                <button className="btn-s" onClick={(e) => { e.stopPropagation(); claim(t) }}>Je m'en occupe</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {(later.length > 0 || evSoon.length > 0) && (
        <section>
          <div className="sec">Les 7 prochains jours</div>
          <div className="list">
            {evSoon.map((e) => evRow(e, true))}
            {later.map((t) => <TaskItem key={t.id} task={t} onOpen={() => setEditTask(t)} />)}
          </div>
        </section>
      )}

      {(dow === 0 || dow === 6) && (
        <button className="card free" style={{ borderStyle: 'solid', borderColor: 'transparent', background: 'var(--accent-soft)', boxShadow: 'none', width: '100%', marginTop: 14, textAlign: 'left' }} onClick={onOpenBilan}>
          <span className="menu-ic" style={{ background: 'var(--card)' }}><Icon name="chart" size={22} sw={2} /></span>
          <div className="body"><div className="t-title">Le bilan de la semaine est prêt</div><div className="small" style={{ color: 'var(--accent-ink)' }}>10 minutes, ce week-end</div></div>
        </button>
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
      {editEvent && <EventEditor event={editEvent} onClose={() => setEditEvent(null)} />}
    </>
  )
}
export { fromISO }
