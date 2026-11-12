import type { CalEvent } from '../lib/types'
import { EventForm } from './EventForm'
import { BirthdayForm } from './BirthdayForm'

/** Ouvre le bon formulaire selon le type d'événement (anniversaire ou non). */
export function EventEditor({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  return event.kind === 'birthday' ? <BirthdayForm event={event} onClose={onClose} /> : <EventForm event={event} onClose={onClose} />
}
