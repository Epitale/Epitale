import { addDays, fromISO, toISO, todayISO } from './dates'
import type { Recurrence } from './types'

export type QuickKind = 'event' | 'task' | 'birthday' | 'shop'

export interface QuickResult {
  kind: QuickKind
  title: string
  date: string | null
  time: string | null
  /** id de membre, 'both', ou null (= valeur par défaut selon le type) */
  who: string | null
  recurrence: Recurrence
  dateMode: 'before' | 'on'
  items: string[]
  birthday: { day: number; month: number } | null
}

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const MONTHS_ALT: Record<string, number> = { janv: 1, fevrier: 2, févr: 2, fevr: 2, mars: 3, avr: 4, juil: 7, aout: 8, sept: 9, oct: 10, nov: 11, dec: 12, decembre: 12, 'déc': 12, 'fév': 2 }
const EVENT_WORDS = /\b(rdv|rendez-vous|rendez vous|dîner|diner|déjeuner|dejeuner|réunion|reunion|spectacle|soirée|soiree|cinéma|cinema|resto|restaurant|visite|consultation|vaccin|mariage|apéro|apero)\b/i

const monthOf = (w: string): number | null => {
  const k = w.toLowerCase().replace(/\.$/, '')
  const i = MONTHS.indexOf(k)
  if (i >= 0) return i + 1
  return MONTHS_ALT[k] ?? null
}

/** Prochaine date (≥ `from`) pour ce jour/mois. */
function nextDayMonth(day: number, month: number, from: string): string {
  const y = fromISO(from).getFullYear()
  for (const yy of [y, y + 1]) {
    const d = new Date(yy, month - 1, day)
    if (d.getMonth() === month - 1 && toISO(d) >= from) return toISO(d)
  }
  return toISO(new Date(y + 1, month - 1, day))
}

function nextWeekday(wd: number, from: string, inclusive = false): string {
  const dow = fromISO(from).getDay()
  let delta = (wd - dow + 7) % 7
  if (delta === 0 && !inclusive) delta = 7
  return addDays(from, delta)
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export function parseQuick(input: string, members: { id: string; name: string }[], meId: string, today = todayISO()): QuickResult {
  let t = ` ${input.trim().replace(/\s+/g, ' ')} `
  const eat = (re: RegExp): RegExpMatchArray | null => {
    const m = t.match(re)
    if (m) t = t.replace(m[0], ' ')
    return m
  }

  // type
  const isBirthday = /\banniv(ersaire)?\b/i.test(t)
  const shopM = t.match(/^\s*(courses?|ajoute(?:r)?(?: à la liste)?)(?=\s|$)/i)
  const isShop = !!shopM && !isBirthday
  if (isBirthday) eat(/\banniv(ersaire)?\b/i)
  if (isShop) t = t.replace(/^\s*(courses?|ajoute(?:r)?(?: à la liste)?)(?=\s|$)/i, ' ')

  // récurrence
  let recurrence: Recurrence = 'none'
  let date: string | null = null
  let m: RegExpMatchArray | null
  if ((m = eat(/\b(chaque|tous les|toutes les)\s+(jours?|semaines?|mois|années?|ans?)\b/i))) {
    const w = m[2].toLowerCase()
    recurrence = w.startsWith('jour') ? 'daily' : w.startsWith('sem') ? 'weekly' : w === 'mois' ? 'monthly' : 'yearly'
  } else if ((m = eat(/\bchaque\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i))) {
    recurrence = 'weekly'
    date = nextWeekday(WEEKDAYS.indexOf(m[1].toLowerCase()), today, true)
  } else if ((m = eat(/\btous les\s+(lundis|mardis|mercredis|jeudis|vendredis|samedis|dimanches)\b/i))) {
    recurrence = 'weekly'
    date = nextWeekday(WEEKDAYS.indexOf(m[1].toLowerCase().replace(/s$/, '')), today, true)
  }

  // heure
  let time: string | null = null
  if ((m = eat(/\b(?:à|a)?\s*(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b/i)) && Number(m[1]) < 24) {
    time = `${String(Number(m[1])).padStart(2, '0')}:${m[2] ?? '00'}`
  } else if (m) t = ` ${m[0]} ${t}` // pas une heure : on remet

  // « avant » / « pour le » : échéance
  const before = /\b(avant|pour le|pour)\b/i.test(t) && !/pour (elle|lui|moi|nous)\b/i.test(t)
  t = t.replace(/\bavant( le)?\b/i, ' ')

  // date
  let birthday: { day: number; month: number } | null = null
  if (!date) {
    if ((m = eat(/\bapr[èe]s-?demain\b/i))) date = addDays(today, 2)
    else if ((m = eat(/\bdemain\b/i))) date = addDays(today, 1)
    else if ((m = eat(/\b(aujourd'hui|aujourd’hui|ce soir|ce matin|cet apr[èe]s-midi)\b/i))) date = today
    else if ((m = eat(/\bdans\s+(\d+)\s+(jours?|semaines?|mois)\b/i))) {
      const n = Number(m[1])
      date = addDays(today, m[2].startsWith('sem') ? n * 7 : m[2] === 'mois' ? n * 30 : n)
    } else if ((m = eat(/\b(?:le\s+)?(\d{1,2})(?:er)?\s+(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|d[ée]cembre|janv\.?|f[ée]vr?\.?|avr\.?|juil\.?|sept\.?|oct\.?|nov\.?|d[ée]c\.?)\b/i))) {
      const mo = monthOf(m[2])
      if (mo) { birthday = { day: Number(m[1]), month: mo }; date = nextDayMonth(Number(m[1]), mo, today) }
    } else if ((m = eat(/\b(\d{1,2})\/(\d{1,2})\b/))) {
      birthday = { day: Number(m[1]), month: Number(m[2]) }
      date = nextDayMonth(Number(m[1]), Number(m[2]), today)
    } else if ((m = eat(/\bce week-?end\b/i))) date = nextWeekday(6, today, true)
    else if ((m = eat(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?:\s+prochain)?\b/i))) date = nextWeekday(WEEKDAYS.indexOf(m[1].toLowerCase()), today)
    else if ((m = eat(/\ble\s+(\d{1,2})\b/i))) {
      const d = Number(m[1])
      const cand = new Date(fromISO(today).getFullYear(), fromISO(today).getMonth(), d)
      if (toISO(cand) < today) cand.setMonth(cand.getMonth() + 1)
      date = toISO(cand)
    }
  }

  // qui
  let who: string | null = null
  if (eat(/(?:^|\s)(à deux|a deux|ensemble|nous deux)(?=\s|$|[,.;!?])/i)) who = 'both'
  else if (eat(/\bpour moi\b/i)) who = meId
  else {
    for (const mem of members) {
      const re = new RegExp(`(?:^|\\s)(?:pour|à|a)\\s+${mem.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|[,.;!?])`, 'i')
      if (eat(re)) { who = mem.id; break }
    }
    if (!who && members.length > 1 && eat(/\bpour (elle|lui)\b/i)) who = members.find((x) => x.id !== meId)!.id
  }

  const rest = t.replace(/\s+/g, ' ').replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '').replace(/\s+(à|a|le|la|au|pour|de|du)$/i, '')

  if (isBirthday) {
    return {
      kind: 'birthday', title: cap(rest.replace(/^(de|d'|du|des)\s+/i, '').replace(/^d['’]/i, '')), date, time: null, who, recurrence: 'yearly',
      dateMode: 'on', items: [], birthday,
    }
  }
  if (isShop) {
    const raw = rest.replace(/^(de|des|du|d['’])\s*/i, '')
    const parts = /,| et /i.test(raw) ? raw.split(/,| et /i) : raw.split(' ').length <= 4 ? raw.split(' ') : [raw]
    return {
      kind: 'shop', title: '', date: null, time: null, who: null, recurrence: 'none', dateMode: 'on',
      items: parts.map((x) => cap(x.trim())).filter(Boolean), birthday: null,
    }
  }

  const isEvent = time !== null || EVENT_WORDS.test(rest)
  return {
    kind: isEvent && !before ? 'event' : 'task', title: cap(rest), date, time, who, recurrence,
    dateMode: before ? 'before' : recurrence !== 'none' ? 'on' : isEvent ? 'on' : 'before', items: [], birthday: null,
  }
}
