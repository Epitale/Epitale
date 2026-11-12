import { addDays, addMonths, diffDays, fromISO, toISO } from './dates'
import type { CalEvent, NewEvent } from './types'

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

/** Valeurs par défaut pour les anciens documents. */
export function normEvent(e: CalEvent): CalEvent {
  return {
    ...e, endDate: e.endDate ?? null, endTime: e.endTime ?? null, kind: e.kind ?? 'event',
    recurrence: e.recurrence ?? 'none', birthYear: e.birthYear ?? null, giftDays: e.giftDays ?? null, giftWho: e.giftWho ?? null,
  }
}

export function fillEvent(e: NewEvent) {
  return {
    ...e, endDate: e.endDate ?? null, endTime: e.endTime ?? null, kind: e.kind ?? 'event',
    recurrence: e.recurrence ?? 'none', birthYear: e.birthYear ?? null, giftDays: e.giftDays ?? null, giftWho: e.giftWho ?? null,
  }
}

const pad = (n: number) => String(n).padStart(2, '0')
/** Date (année y) correspondant au même jour/mois que `iso`, ramenée au 28 fév. les années non bissextes. */
function sameDayInYear(iso: string, y: number): string {
  const d = fromISO(iso)
  const last = new Date(y, d.getMonth() + 1, 0).getDate()
  return `${y}-${pad(d.getMonth() + 1)}-${pad(Math.min(d.getDate(), last))}`
}

/**
 * Déplie les événements récurrents (chaque année / mois / semaine) en occurrences sur [from, to].
 * Une occurrence garde l'id de la série : la modifier modifie toute la série.
 */
export function expandEvents(events: CalEvent[], from: string, to: string): CalEvent[] {
  const out: CalEvent[] = []
  for (const e of events) {
    const span = diffDays(eventEnd(e), e.date)
    const push = (date: string) => {
      const end = span > 0 ? addDays(date, span) : null
      if (date <= to && (end ?? date) >= from) out.push({ ...e, date, endDate: end })
    }
    if (e.recurrence === 'none') { push(e.date); continue }
    if (e.recurrence === 'yearly') {
      const y0 = Math.min(fromISO(from).getFullYear(), fromISO(to).getFullYear()) - 1
      const y1 = fromISO(to).getFullYear()
      const startYear = e.kind === 'birthday' ? (e.birthYear ?? 0) : fromISO(e.date).getFullYear()
      for (let y = Math.max(y0, startYear); y <= y1; y++) push(sameDayInYear(e.date, y))
    } else if (e.recurrence === 'weekly') {
      let d = e.date
      if (d < from) d = addDays(d, Math.max(0, Math.floor(diffDays(from, d) / 7) - 1) * 7)
      for (; d <= to; d = addDays(d, 7)) push(d)
    } else if (e.recurrence === 'monthly') {
      for (let k = 0; ; k++) { const d = addMonths(e.date, k); if (d > to) break; push(d) }
    } else if (e.recurrence === 'daily') {
      let d = e.date < from ? from : e.date
      for (; d <= to; d = addDays(d, 1)) push(d)
    }
  }
  return out
}

export const isBirthday = (e: CalEvent) => e.kind === 'birthday'
/** Âge fêté à cette occurrence (null si l'année de naissance est inconnue). */
export const ageOf = (e: CalEvent) => (e.birthYear ? fromISO(e.date).getFullYear() - e.birthYear : null)

/** Prochaine occurrence (≥ aujourd'hui) de chaque anniversaire, triée. */
export function upcomingBirthdays(events: CalEvent[], today: string): CalEvent[] {
  const list = events.filter(isBirthday)
  const occ = expandEvents(list, today, addDays(today, 400))
  const first = new Map<string, CalEvent>()
  for (const o of occ.sort((a, b) => a.date.localeCompare(b.date))) if (!first.has(o.id)) first.set(o.id, o)
  return [...first.values()].sort((a, b) => a.date.localeCompare(b.date))
}
export { toISO }
