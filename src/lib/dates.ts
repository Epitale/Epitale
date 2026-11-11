const pad = (n: number) => String(n).padStart(2, '0')

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const todayISO = () => toISO(new Date())

export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export const addMonths = (iso: string, n: number) => {
  const d = fromISO(iso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return toISO(d)
}

export const diffDays = (a: string, b: string) =>
  Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86400000)

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', o)
const fWeekday = fmt({ weekday: 'long' })
const fDay = fmt({ weekday: 'short', day: 'numeric', month: 'short' })
const fLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' })
const fMonth = fmt({ month: 'long', year: 'numeric' })

export const longDate = (iso: string) => fLong.format(fromISO(iso))
export const monthLabel = (iso: string) => fMonth.format(fromISO(iso))

/** « Aujourd'hui », « Demain », « Hier », « lun. 3 nov. » */
export function relativeDate(iso: string): string {
  const diff = diffDays(iso, todayISO())
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff === -1) return 'Hier'
  if (diff > 1 && diff < 7) return fWeekday.format(fromISO(iso))
  return fDay.format(fromISO(iso))
}

/** Lundi de la semaine contenant iso */
export function startOfWeek(iso: string): string {
  const d = fromISO(iso)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return toISO(d)
}

/** Grille du mois : semaines (lun→dim) de dates ISO */
export function monthGrid(iso: string): string[][] {
  const d = fromISO(iso)
  const first = toISO(new Date(d.getFullYear(), d.getMonth(), 1))
  let cur = startOfWeek(first)
  const weeks: string[][] = []
  const month = d.getMonth()
  do {
    const w: string[] = []
    for (let i = 0; i < 7; i++) { w.push(cur); cur = addDays(cur, 1) }
    weeks.push(w)
  } while (fromISO(cur).getMonth() === month)
  return weeks
}
