import { useState } from 'react'
import { Sheet, WhoPicker } from './ui'
import { useStore } from '../store/context'
import { BOTH, type CalEvent } from '../lib/types'
import { todayISO } from '../lib/dates'

export function EventForm({ event, date, onClose }: { event?: CalEvent; date?: string; onClose: () => void }) {
  const s = useStore()
  const [title, setTitle] = useState(event?.title ?? '')
  const [who, setWho] = useState(event?.who ?? BOTH)
  const [d, setD] = useState(event?.date ?? date ?? todayISO())
  const [time, setTime] = useState(event?.time ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')

  const save = async () => {
    if (!title.trim() || !d) return
    const data = { title: title.trim(), who, date: d, time: time || null, notes: notes.trim() }
    if (event) await s.updateEvent(event.id, data)
    else await s.addEvent(data)
    onClose()
  }
  return (
    <Sheet title={event ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'} onClose={onClose}>
      <label>Quoi ?
        <input autoFocus={!event} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Pédiatre" />
      </label>
      <label>Qui est concerné ?</label>
      <div style={{ marginTop: 6 }}><WhoPicker value={who} onChange={setWho} members={s.members} meId={s.me!.id} /></div>
      <div className="row">
        <label>Date<input type="date" value={d} onChange={(e) => setD(e.target.value)} /></label>
        <label>Heure<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
      </div>
      <label>Détails (optionnel)<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <div className="actions">
        {event && <button className="btn danger" onClick={async () => { if (confirm('Supprimer ce rendez-vous ?')) { await s.removeEvent(event.id); onClose() } }}>Supprimer</button>}
        <button className="btn primary" disabled={!title.trim() || !d} onClick={save}>{event ? 'Enregistrer' : 'Ajouter'}</button>
      </div>
    </Sheet>
  )
}
