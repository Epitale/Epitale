import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet } from './ui'
import { Icon } from './Icon'
import { useStore } from '../store/context'
import { parseQuick, type QuickKind } from '../lib/quick'
import { BOTH } from '../lib/types'
import { addDays, longDate, todayISO } from '../lib/dates'
import { RECURRENCE_LABEL } from '../lib/tasks'

const KINDS: [QuickKind, string][] = [['event', 'Événement'], ['task', 'Tâche'], ['birthday', 'Anniversaire'], ['shop', 'Courses']]
const EXAMPLES = ['Appeler la crèche avant jeudi', 'Courses lait couches demain', 'Anniv Papa 3 mars', 'Poubelles chaque lundi']

// Dictée vocale (API du navigateur, quand elle existe)
type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null
  start(): void; stop(): void
}
const SpeechCtor = (): (new () => Recognition) | null => {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function QuickAdd({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const meId = s.me!.id
  const [text, setText] = useState('')
  const [override, setOverride] = useState<QuickKind | null>(null)
  const [listening, setListening] = useState(false)
  const [voiceErr, setVoiceErr] = useState('')
  const rec = useRef<Recognition | null>(null)
  const canSpeak = !!SpeechCtor()
  useEffect(() => () => rec.current?.stop(), [])

  const toggleVoice = () => {
    if (listening) { rec.current?.stop(); return }
    const C = SpeechCtor()
    if (!C) return
    setVoiceErr('')
    const r = new C()
    r.lang = 'fr-FR'; r.interimResults = true; r.continuous = false
    r.onresult = (e) => {
      const out = Array.from(e.results).map((x) => x[0].transcript).join(' ')
      setText(out); setOverride(null)
    }
    r.onerror = (e) => setVoiceErr(e.error === 'not-allowed' ? "Micro refusé : autorise-le dans les réglages du navigateur." : "La dictée n'a pas marché. Utilise le micro du clavier.")
    r.onend = () => setListening(false)
    rec.current = r
    try { r.start(); setListening(true) } catch { setListening(false) }
  }
  const p = useMemo(() => parseQuick(text, s.members, meId), [text, s.members, meId])
  const kind = override ?? p.kind
  const today = todayISO()
  const title = p.kind === 'shop' && kind !== 'shop' ? p.items.join(' ') : p.title
  const items = kind === 'shop' ? (p.kind === 'shop' ? p.items : [p.title].filter(Boolean)) : []
  const who = p.who ?? (kind === 'event' ? BOTH : meId)
  const whoLabel = who === BOTH ? 'À deux' : who === meId ? 'Moi' : s.members.find((m) => m.id === who)?.name ?? '?'
  const date = p.date ?? (kind === 'event' ? today : null)
  const bd = p.birthday ?? (p.date ? { day: Number(p.date.slice(8)), month: Number(p.date.slice(5, 7)) } : null)
  const ok = text.trim() && (kind === 'shop' ? items.length > 0 : kind === 'birthday' ? !!title && !!bd : !!title)

  const add = () => {
    if (!ok) return
    if (kind === 'shop') items.forEach((i) => s.addItem(i))
    else if (kind === 'birthday' && bd) {
      s.addEvent({
        title, who: BOTH, notes: '', date: `1904-${String(bd.month).padStart(2, '0')}-${String(bd.day).padStart(2, '0')}`, time: null,
        kind: 'birthday', recurrence: 'yearly', birthYear: null, giftDays: 10, giftWho: meId,
      })
    } else if (kind === 'event') {
      s.addEvent({ title, who, notes: '', date: date ?? today, time: p.time, recurrence: p.recurrence })
    } else {
      s.addTask({
        title, notes: '', assignee: who, deadline: date, domain: 'autre', recurrence: p.recurrence, steps: [], eventId: null,
        dateMode: p.dateMode, remindDays: null,
      })
    }
    onClose()
  }

  const row = (k: string, v: string) => <div className="step"><span className="lab muted">{k}</span><strong>{v}</strong></div>

  return (
    <Sheet title="Ajout rapide" onClose={onClose}>
      <p className="hint" style={{ marginTop: 0 }}>Écris une phrase, l'appli devine le reste. Tu peux corriger avant d'ajouter.</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input className="field" style={{ margin: 0, fontWeight: 600, flex: 1 }} autoFocus value={text} placeholder={listening ? 'Je t\'écoute…' : 'Ex : RDV pédiatre vendredi 10h'}
          onChange={(e) => { setText(e.target.value); setOverride(null) }} onKeyDown={(e) => e.key === 'Enter' && add()} enterKeyHint="done" />
        {canSpeak && (
          <button type="button" className={`round ${listening ? 'rec' : ''}`} style={{ width: 46, height: 46 }} aria-label={listening ? 'Arrêter la dictée' : 'Dicter la phrase'} aria-pressed={listening} onClick={toggleVoice}>
            <Icon name="mic" size={22} sw={2} />
          </button>
        )}
      </div>
      {voiceErr && <div className="error">{voiceErr}</div>}
      <p className="hint">{canSpeak ? 'Touche le micro et parle : « RDV pédiatre vendredi à 10h ». ' : ''}Tu peux aussi utiliser le micro de ton clavier pour dicter.</p>

      {text.trim() ? (
        <>
          <div className="lbl">J'ai compris</div>
          <div className="card" style={{ padding: '12px 14px' }}>
            <div className="chips" style={{ marginBottom: 8 }}>
              {KINDS.map(([k, l]) => <button key={k} type="button" className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setOverride(k)}>{l}</button>)}
            </div>
            {kind === 'shop' ? row('Articles', items.join(', ') || '—') : (
              <>
                {row('Quoi', title || '—')}
                {kind === 'birthday'
                  ? row('Quand', bd ? `${bd.day}/${String(bd.month).padStart(2, '0')} · chaque année` : 'Ajoute une date (ex : 3 mars)')
                  : row(kind === 'task' && p.dateMode === 'before' ? 'Avant le' : 'Quand', date ? `${longDate(date)}${kind === 'event' && p.time ? ` · ${p.time}` : ''}` : kind === 'task' ? 'Sans date' : '—')}
                {kind !== 'birthday' && row('Qui', whoLabel)}
                {p.recurrence !== 'none' && row('Répéter', RECURRENCE_LABEL[p.recurrence])}
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="lbl">Exemples</div>
          <div className="chips">{EXAMPLES.map((e) => <button key={e} type="button" className="chip" onClick={() => setText(e)}>{e}</button>)}</div>
        </>
      )}
      <button className="btn primary" style={{ width: '100%', marginTop: 18 }} disabled={!ok} onClick={add}>Ajouter</button>
    </Sheet>
  )
}
export { addDays }
