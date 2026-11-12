// Orchestration : lit les foyers, calcule les notifications, les envoie, mémorise l'état.
import { computeNotifications, type PushMember } from './logic'
import type { CalEvent, PushSettings, Task } from '../../src/lib/types'

export interface Db {
  list(path: string): Promise<Record<string, unknown>[]>
  get(path: string): Promise<Record<string, unknown> | null>
  patch(path: string, data: Record<string, unknown>): Promise<void>
}
/** 'ok' envoyé · 'invalid' jeton périmé (à supprimer) · 'error' autre problème */
export type Sender = (token: string, msg: { title: string; body: string; tag: string }) => Promise<'ok' | 'invalid' | 'error'>

const DEFAULT_PREFS: PushSettings = { assigned: true, due: true, birthdays: true, morning: false, done: false }

export async function runPush(db: Db, send: Sender, tz: string, nowMs = Date.now()) {
  const stats = { households: 0, sent: 0, failed: 0, pruned: 0 }
  for (const h of await db.list('households')) {
    const hid = String(h.id)
    const memberIds = (h.memberIds as string[] | undefined) ?? []
    const names = (h.names as Record<string, string> | undefined) ?? {}
    stats.households++

    const members: PushMember[] = []
    for (const uid of memberIds) {
      const u = await db.get(`users/${uid}`)
      const tokens = ((u?.pushTokens as string[] | undefined) ?? []).filter(Boolean)
      if (tokens.length) members.push({ uid, name: names[uid] ?? '?', tokens, prefs: { ...DEFAULT_PREFS, ...((u?.push as Partial<PushSettings> | undefined) ?? {}) } })
    }
    const state = await db.get(`households/${hid}/meta/push`)
    const lastRun = typeof state?.lastRun === 'number' ? state.lastRun : null
    const sentKeys = (state?.sent as string[] | undefined) ?? []

    if (members.length) {
      const [tasks, events] = await Promise.all([db.list(`households/${hid}/tasks`), db.list(`households/${hid}/events`)])
      const { notifs, sent } = computeNotifications({
        nowMs, tz, members, lastRun, sent: sentKeys,
        tasks: tasks.map((t) => ({ ...t, id: String(t.id) }) as unknown as Task),
        events: events.map((e) => ({ ...e, id: String(e.id) }) as unknown as CalEvent),
      })
      const dead = new Map<string, string[]>()
      for (const n of notifs) {
        const m = members.find((x) => x.uid === n.uid)!
        for (const token of m.tokens) {
          const r = await send(token, { title: n.title, body: n.body, tag: n.tag })
          if (r === 'ok') stats.sent++
          else { stats.failed++; if (r === 'invalid') dead.set(n.uid, [...(dead.get(n.uid) ?? []), token]) }
        }
      }
      for (const [uid, bad] of dead) {
        const m = members.find((x) => x.uid === uid)!
        await db.patch(`users/${uid}`, { pushTokens: m.tokens.filter((t) => !bad.includes(t)) })
        stats.pruned += bad.length
      }
      await db.patch(`households/${hid}/meta/push`, { lastRun: nowMs, sent })
    } else if (lastRun === null || nowMs - lastRun > 3600_000) {
      await db.patch(`households/${hid}/meta/push`, { lastRun: nowMs, sent: sentKeys })
    }
  }
  return stats
}
