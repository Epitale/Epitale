import { useState } from 'react'
import { Sheet, WhoPicker } from './ui'
import { Icon } from './Icon'
import { useStore } from '../store/context'
import { BOTH, type CalEvent } from '../lib/types'
import { fromISO, todayISO } from '../lib/dates'
import { useTaskActions } from '../store/actions'
import { ageOf, upcomingBirthdays } from '../lib/events'
import { diffDays } from '../lib/dates'

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const pad = (n: number) => String(n).padStart(2, '0')

export function BirthdayForm({ event, defaults, onClose }: { event?: CalEvent; defaults?: { title?: string; day?: number; month?: number; year?: number | null }; onClose: () => void }) {
  const s = useStore()
  const { deleteEvent, meId } = useTaskActions()
  const d0 = event ? fromISO(event.date) : null
  const [name, setName] = useState(event?.title ?? defaults?.title ?? '')
  const [day, setDay] = useState(d0?.getDate() ?? defaults?.day ?? new Date().getDate())
  const [month, setMonth] = useState((d0?.getMonth() ?? (defaults?.month ?? new Date().getMonth() + 1) - 1))
  const [year, setYear] = useState<string>(event?.birthYear ? String(event.birthYear) : defaults?.year ? String(defaults.year) : '')
  const [gift, setGift] = useState(event ? event.giftDays !== null : true)
  const [giftDays, setGiftDays] = useState(event?.giftDays ?? 10)
  const [giftWho, setGiftWho] = useState(event?.giftWho ?? meId)

  const maxDay = new Date(year ? Number(year) : 1904, month + 1, 0).getDate()
  const safeDay = Math.min(day, maxDay)
  const birthYear = /^\d{4}$/.test(year) ? Number(year) : null
  const date = `${birthYear ?? 1904}-${pad(month + 1)}-${pad(safeDay)}`

  const next = upcomingBirthdays([{ ...(event ?? ({} as CalEvent)), id: 'x', kind: 'birthday', recurrence: 'yearly', date, birthYear, title: name } as CalEvent], todayISO())[0]
  const nextAge = next ? ageOf(next) : null

  const save = () => {
    if (!name.trim()) return
    const e = {
      title: name.trim(), who: BOTH, date, endDate: null, time: null, endTime: null, notes: '', kind: 'birthday' as const,
      recurrence: 'yearly' as const, birthYear, giftDays: gift ? giftDays : null, giftWho: gift ? giftWho : null,
    }
    if (event) s.updateEvent(event.id, e)
    else s.addEvent(e)
    onClose()
  }

  return (
    <Sheet title={event ? 'Modifier l’anniversaire' : 'Nouvel anniversaire'} onClose={onClose}>
      <label>Qui ?
        <input autoFocus={!event} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Mamie" onKeyDown={(e) => e.key === 'Enter' && save()} />
      </label>
      <div className="row2">
        <label>Jour
          <select value={safeDay} onChange={(e) => setDay(Number(e.target.value))}>
            {Array.from({ length: maxDay }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </label>
        <label>Mois
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        </label>
      </div>
      <label>Année de naissance (facultatif)
        <input inputMode="numeric" maxLength={4} placeholder="Ex : 1954" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} />
      </label>
      <p className="hint">Avec l'année, l'appli affiche l'âge : « fête ses {nextAge ?? 72} ans ».</p>

      {name.trim() && next && (
        <div className="bday" style={{ marginTop: 14 }}>
          <span className="ic"><Icon name="cake" size={26} sw={2} /></span>
          <div><div className="t-title">{name.trim()}</div>
            <small>Revient chaque année · prochain : {fromISO(next.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}, {diffDays(next.date, todayISO()) === 0 ? "c'est aujourd'hui" : `dans ${diffDays(next.date, todayISO())} jours`}</small></div>
        </div>
      )}

      <div className="lbl">Un cadeau à prévoir ?</div>
      <button type="button" className="toggle" onClick={() => setGift(!gift)} aria-pressed={gift}>
        <span>Créer une tâche « Cadeau + carte »</span><span className={`sw ${gift ? 'on' : ''}`} />
      </button>
      {gift && (
        <>
          <div className="row2" style={{ marginTop: 4 }}>
            <label>Rappel
              <select value={giftDays} onChange={(e) => setGiftDays(Number(e.target.value))}>
                {[3, 5, 7, 10, 14, 21, 30].map((n) => <option key={n} value={n}>{n} jours avant</option>)}
              </select>
            </label>
          </div>
          <div className="lbl">Qui s'en charge ?</div>
          <WhoPicker value={giftWho} onChange={setGiftWho} />
          <p className="hint">La tâche est recréée automatiquement chaque année, {giftDays} jours avant (modifiable).</p>
        </>
      )}

      <div className="actions">
        {event && <button className="btn danger" onClick={() => { if (confirm('Supprimer cet anniversaire ?')) { deleteEvent(event); onClose() } }}>Supprimer</button>}
        <button className="btn primary" disabled={!name.trim()} onClick={save}>{event ? 'Enregistrer' : 'Ajouter l\'anniversaire'}</button>
      </div>
    </Sheet>
  )
}
