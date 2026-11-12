// Logique pure : quelles notifications envoyer, à qui, maintenant ? (aucun accès réseau ici, donc testable)
import { addDays, diffDays } from '../../src/lib/dates'
import { ageOf, coversDay, expandEvents, isBirthday, normEvent } from '../../src/lib/events'
import { normTask } from '../../src/lib/tasks'
import type { CalEvent, PushSettings, Task } from '../../src/lib/types'

export interface PushMember { uid: string; name: string; prefs: PushSettings; tokens: string[] }
export interface Notif { uid: string; title: string; body: string; tag: string; key?: string }
export interface Input {
  nowMs: number
  tz: string
  members: PushMember[]
  tasks: Task[]
  events: CalEvent[]
  /** dernier passage du programme (ms) ; null au tout premier passage */
  lastRun: number | null
  /** clés des notifications déjà envoyées (anti-doublon) */
  sent: string[]
}
export interface Output { notifs: Notif[]; sent: string[] }

export function localParts(ms: number, tz: string) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23' })
  const p = Object.fromEntries(f.formatToParts(ms).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`, hour: Number(p.hour) }
}

const list = (xs: string[]) => (xs.length <= 3 ? xs.join(', ') : `${xs.slice(0, 3).join(', ')} et ${xs.length - 3} autre${xs.length - 3 > 1 ? 's' : ''}`)
const nameOf = (members: PushMember[], uid: string | null) => members.find((m) => m.uid === uid)?.name ?? 'Quelqu\'un'

export function computeNotifications(inp: Input): Output {
  const tasks = inp.tasks.map(normTask)
  const events = inp.events.map(normEvent)
  const { date: today, hour } = localParts(inp.nowMs, inp.tz)
  const morning = hour >= 8
  const sent = new Set(inp.sent)
  const notifs: Notif[] = []
  const once = (n: Notif, key: string) => { if (!sent.has(key)) { sent.add(key); notifs.push({ ...n, key }) } }
  const since = inp.lastRun ?? inp.nowMs // premier passage : rien d'« ancien » à signaler
  const concerns = (a: string, uid: string) => a === uid || a === 'both'

  const upcoming = expandEvents(events, today, addDays(today, 1))

  for (const m of inp.members) {
    const p = m.prefs

    if (p.assigned) {
      const fresh = tasks.filter((t) => !t.done && !t.auto && t.createdAt > since && t.createdAt <= inp.nowMs && t.createdBy !== m.uid && concerns(t.assignee, m.uid))
      if (fresh.length) {
        once({ uid: m.uid, tag: 'assigned', title: fresh.length === 1 ? `${nameOf(inp.members, fresh[0].createdBy)} t'a confié une tâche` : `${fresh.length} nouvelles tâches pour toi`, body: list(fresh.map((t) => t.title)) },
          `assigned:${m.uid}:${fresh.map((t) => t.id).sort().join(',')}`)
      }
    }

    if (p.done) {
      const done = tasks.filter((t) => t.done && t.doneAt && t.doneAt > since && t.doneAt <= inp.nowMs && t.createdBy === m.uid && t.doneBy && t.doneBy !== m.uid)
      if (done.length) {
        once({ uid: m.uid, tag: 'done', title: `${nameOf(inp.members, done[0].doneBy)} a terminé ${done.length === 1 ? 'une tâche' : `${done.length} tâches`}`, body: list(done.map((t) => t.title)) },
          `done:${m.uid}:${done.map((t) => t.id).sort().join(',')}`)
      }
    }

    if (!morning) continue

    if (p.due) {
      for (const t of tasks) {
        if (t.done || t.dateMode !== 'before' || !t.deadline || t.remindDays === null || !concerns(t.assignee, m.uid)) continue
        const d = diffDays(t.deadline, today)
        if (d !== t.remindDays && d !== 0) continue
        once({ uid: m.uid, tag: `due-${t.id}`, title: d === 0 ? 'Dernier jour pour…' : `Échéance dans ${d} jour${d > 1 ? 's' : ''}`, body: t.title }, `due:${m.uid}:${t.id}:${today}`)
      }
    }

    if (p.birthdays) {
      for (const e of upcoming.filter(isBirthday)) {
        const age = ageOf(e)
        if (e.date === today) once({ uid: m.uid, tag: `bd-${e.id}`, title: "Anniversaire aujourd'hui", body: `${e.title}${age ? ` fête ses ${age} ans` : ''}` }, `bd:${m.uid}:${e.id}:${e.date}:0`)
        else if (e.date === addDays(today, 1)) once({ uid: m.uid, tag: `bd-${e.id}`, title: 'Demain : un anniversaire', body: `${e.title}${age ? ` fête ses ${age} ans` : ''}` }, `bd:${m.uid}:${e.id}:${e.date}:1`)
      }
    }

    if (p.morning) {
      const mine = tasks.filter((t) => !t.done && concerns(t.assignee, m.uid) && t.deadline && t.deadline <= today)
      const evs = upcoming.filter((e) => !isBirthday(e) && coversDay(e, today) && concerns(e.who, m.uid))
      if (mine.length || evs.length) {
        const parts = [mine.length ? `${mine.length} tâche${mine.length > 1 ? 's' : ''} à finir` : '', evs.length ? `${evs.length} rendez-vous` : ''].filter(Boolean)
        once({ uid: m.uid, tag: 'morning', title: 'Ta journée', body: `${parts.join(' · ')} — ${list([...evs.map((e) => e.title), ...mine.map((t) => t.title)])}` }, `morning:${m.uid}:${today}`)
      }
    }
  }
  // on ne garde que les clés récentes (anti-gonflement)
  const keep = [...sent].slice(-400)
  return { notifs, sent: keep }
}
