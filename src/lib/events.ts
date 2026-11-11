import { addDays, diffDays, fromISO } from './dates'
import type { CalEvent } from './types'

export const eventEnd = (e: CalEvent) => (e.endDate && e.endDate > e.date ? e.endDate : e.date)
export const isMultiDay = (e: CalEvent) => eventEnd(e) > e.date
export const coversDay = (e: CalEvent, iso: string) => e.date <= iso && iso <= eventEnd(e)
export const eventDays = (e: CalEvent) => diffDays(eventEnd(e), e.date) + 1

export const byStart = (a: CalEvent, b: CalEvent) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? ''))

const fShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
export const rangeLabel = (e: CalEvent) =>
  isMultiDay(e) ? `${fShort.format(fromISO(e.date))} – ${fShort.format(fromISO(eventEnd(e)))}` : fShort.format(fromISO(e.date))

export const timeLabel = (e: CalEvent) =>
  !e.time ? 'Toute la journée' : e.endTime ? `${e.time} – ${e.endTime}` : e.time

/** Barres de la semaine (multi-jours) : colonne de début, durée, voie (ligne) */
export interface Bar { ev: CalEvent; col: number; span: number; lane: number; contLeft: boolean; contRight: boolean }
export function weekBars(week: string[], events: CalEvent[]): Bar[] {
  const first = week[0], last = week[6]
  const list = events.filter((e) => isMultiDay(e) && e.date <= last && eventEnd(e) >= first).sort(byStart)
  const lanes: number[] = [] // dernière colonne occupée par voie
  const bars: Bar[] = []
  for (const ev of list) {
    const start = ev.date < first ? 0 : diffDays(ev.date, first)
    const end = eventEnd(ev) > last ? 6 : diffDays(eventEnd(ev), first)
    let lane = lanes.findIndex((l) => l < start)
    if (lane === -1) { lane = lanes.length; lanes.push(end) } else lanes[lane] = end
    bars.push({ ev, col: start + 1, span: end - start + 1, lane: lane + 1, contLeft: ev.date < first, contRight: eventEnd(ev) > last })
  }
  return bars
}
export { addDays }
