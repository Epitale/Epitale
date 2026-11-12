import { Icon } from './Icon'
import type { CalEvent } from '../lib/types'
import { ageOf } from '../lib/events'
import { diffDays, todayISO } from '../lib/dates'

/** Carte festive d'un anniversaire (aujourd'hui, demain…). */
export function BirthdayCard({ event, onOpen }: { event: CalEvent; onOpen: () => void }) {
  const age = ageOf(event)
  const d = diffDays(event.date, todayISO())
  const when = d === 0 ? "aujourd'hui" : d === 1 ? 'demain' : `dans ${d} jours`
  return (
    <div className="bday" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
      <span className="ic"><Icon name="cake" size={26} sw={2} /></span>
      <div>
        <div className="t-title">Anniversaire de {event.title}</div>
        <small>{age ? `${age} ans ${when}` : `C'est ${when}`}</small>
      </div>
    </div>
  )
}
