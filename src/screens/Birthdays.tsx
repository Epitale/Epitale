import { useState } from 'react'
import { useStore } from '../store/context'
import { Icon } from '../components/Icon'
import { BirthdayForm } from '../components/BirthdayForm'
import { BirthdayCard } from '../components/BirthdayCard'
import { ageOf, upcomingBirthdays } from '../lib/events'
import { diffDays, fromISO, todayISO } from '../lib/dates'
import { assigneeLabel } from '../lib/tasks'
import type { CalEvent } from '../lib/types'

const fMon = new Intl.DateTimeFormat('fr-FR', { month: 'short' })

export function Birthdays({ onBack }: { onBack: () => void }) {
  const s = useStore()
  const today = todayISO()
  const [edit, setEdit] = useState<CalEvent | null>(null)
  const [adding, setAdding] = useState(false)
  const list = upcomingBirthdays(s.events, today)
  const original = (id: string) => s.events.find((e) => e.id === id)!
  const todays = list.filter((e) => e.date === today)
  const month = list.filter((e) => e.date > today && diffDays(e.date, today) <= 30)
  const later = list.filter((e) => diffDays(e.date, today) > 30)

  const row = (e: CalEvent) => {
    const d = diffDays(e.date, today)
    const age = ageOf(e)
    return (
      <div key={e.id} className="card bd-row" onClick={() => setEdit(original(e.id))}>
        <div className="dbadge"><b>{fromISO(e.date).getDate()}</b><span>{fMon.format(fromISO(e.date))}</span></div>
        <div>
          <div className="t-title">{e.title}</div>
          <div className="age">{age ? `${age} ans` : 'année inconnue'}{e.giftDays !== null && e.giftWho ? ` · cadeau : ${assigneeLabel(e.giftWho, s.members, s.me?.id)}` : ''}</div>
        </div>
        <span className={`cd ${d <= 7 ? 'soon' : ''}`}>dans {d} jour{d > 1 ? 's' : ''}</span>
      </div>
    )
  }

  return (
    <>
      <div className="cal-head" style={{ marginBottom: 0 }}>
        <button className="nav" aria-label="Retour" onClick={onBack}><Icon name="left" size={20} sw={2} /></button>
        <h2>Anniversaires</h2>
        <span style={{ width: 36 }} />
      </div>
      <p className="sub" style={{ margin: '4px 4px 0' }}>{list.length} enregistré{list.length > 1 ? 's' : ''} · reviennent chaque année</p>

      {todays.length > 0 && <><div className="sec">Aujourd'hui</div><div className="list">{todays.map((e) => <BirthdayCard key={e.id} event={e} onOpen={() => setEdit(original(e.id))} />)}</div></>}
      {month.length > 0 && <><div className="sec">Ce mois-ci</div><div className="list">{month.map(row)}</div></>}
      {later.length > 0 && <><div className="sec">Plus tard</div><div className="list">{later.map(row)}</div></>}
      {!list.length && <div className="empty">Aucun anniversaire pour l'instant. Appuie sur + pour en ajouter 🎂</div>}

      <button className="fab" aria-label="Ajouter un anniversaire" onClick={() => setAdding(true)}><Icon name="plus" size={26} sw={2.2} /></button>
      {adding && <BirthdayForm onClose={() => setAdding(false)} />}
      {edit && <BirthdayForm event={edit} onClose={() => setEdit(null)} />}
    </>
  )
}
