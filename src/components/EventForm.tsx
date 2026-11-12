import { useState } from 'react'
import { Sheet, WhoPicker } from './ui'
import { Icon } from './Icon'
import { uid, useStore } from '../store/context'
import { BOTH, type CalEvent, type Recurrence } from '../lib/types'
import { addDays, diffDays, todayISO } from '../lib/dates'
import { eventDays } from '../lib/events'
import { useTaskActions } from '../store/actions'

interface PrepStep { id: string; title: string; on: boolean }

export function EventForm({ event, date, onClose }: { event?: CalEvent; date?: string; onClose: () => void }) {
  const s = useStore()
  const { deleteEvent, meId, otherId } = useTaskActions()
  const [title, setTitle] = useState(event?.title ?? '')
  const [who, setWho] = useState(event?.who ?? BOTH)
  const [allDay, setAllDay] = useState(event ? !event.time : false)
  const [d, setD] = useState(event?.date ?? date ?? todayISO())
  const [endD, setEndD] = useState(event?.endDate ?? event?.date ?? date ?? todayISO())
  const [time, setTime] = useState(event?.time ?? '')
  const [endTime, setEndTime] = useState(event?.endTime ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [recurrence, setRecurrence] = useState<Recurrence>(event?.recurrence ?? 'none')

  // « À préparer » (création uniquement)
  const [prep, setPrep] = useState<string>('none') // 'none' | id de liste type | 'custom'
  const [prepName, setPrepName] = useState('')
  const [prepSteps, setPrepSteps] = useState<PrepStep[]>([])
  const [newStep, setNewStep] = useState('')
  const [offset, setOffset] = useState(1)
  const [prepWho, setPrepWho] = useState<string>('split')

  const linked = event ? s.tasks.filter((t) => t.eventId === event.id) : []
  const days = diffDays(endD, d) + 1

  const pickPrep = (id: string) => {
    setPrep(id)
    const t = s.templates.find((x) => x.id === id)
    setPrepSteps(t ? t.steps.map((title) => ({ id: uid(), title, on: true })) : [])
  }
  const addPrepStep = () => {
    const t = newStep.trim()
    if (t) setPrepSteps([...prepSteps, { id: uid(), title: t, on: true }])
    setNewStep('')
  }

  const setStart = (v: string) => { setD(v); if (!endD || endD < v) setEndD(v) }

  const save = () => {
    if (!title.trim() || !d) return
    const e = {
      title: title.trim(), who, date: d,
      endDate: endD > d ? endD : null,
      time: allDay || !time ? null : time,
      endTime: allDay || !time || !endTime ? null : endTime,
      notes: notes.trim(), recurrence,
    }
    if (event) { s.updateEvent(event.id, e); onClose(); return }
    const id = s.addEvent(e)
    const chosen = prepSteps.filter((x) => x.on)
    if (prep !== 'none' && chosen.length) {
      const tpl = s.templates.find((x) => x.id === prep)
      const base = prep === 'custom' ? prepName.trim() || 'À préparer' : tpl!.name
      const split = prepWho === 'split'
      const due = addDays(d, -offset)
      s.addTask({
        title: `${base} — ${e.title}`, notes: '', assignee: split ? BOTH : prepWho,
        deadline: due < todayISO() ? todayISO() : due,
        domain: tpl?.domain ?? 'autre', recurrence: 'none', eventId: id,
        steps: chosen.map((x, i) => ({ id: uid(), title: x.title, done: false, assignee: split ? (i % 2 === 0 ? meId : otherId) : null })),
      })
    }
    onClose()
  }

  return (
    <Sheet title={event ? 'Modifier l’événement' : 'Nouvel événement'} onClose={onClose}>
      <label>Quoi ?
        <input autoFocus={!event} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Pédiatre, week-end chez les parents…" />
      </label>
      <div className="lbl">Qui est concerné ?</div>
      <WhoPicker value={who} onChange={setWho} />

      <div className="lbl">Quand ?</div>
      <button type="button" className="toggle" onClick={() => setAllDay(!allDay)} aria-pressed={allDay}>
        <span>Toute la journée</span><span className={`sw ${allDay ? 'on' : ''}`} />
      </button>
      <div className="row2">
        <label>Du<input type="date" value={d} onChange={(e) => setStart(e.target.value)} /></label>
        <label>Au<input type="date" value={endD} min={d} onChange={(e) => setEndD(e.target.value || d)} /></label>
      </div>
      {days > 1 && <p className="hint">Événement sur {days} jours : il apparaîtra en barre continue dans le planning.</p>}
      {!allDay && (
        <div className="row2">
          <label>Début<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <label>Fin<input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></label>
        </div>
      )}
      <label>Répéter
        <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>
          <option value="none">Jamais</option><option value="weekly">Chaque semaine</option>
          <option value="monthly">Chaque mois</option><option value="yearly">Chaque année</option>
        </select>
      </label>
      <label>Détails (optionnel)<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>

      {!event && (
        <>
          <div className="lbl">À préparer avant ?</div>
          <div className="chips">
            <button type="button" className={`chip ${prep === 'none' ? 'on' : ''}`} onClick={() => pickPrep('none')}>Rien</button>
            {s.templates.map((t) => (
              <button type="button" key={t.id} className={`chip ${prep === t.id ? 'on' : ''}`} onClick={() => pickPrep(t.id)}>{t.name}</button>
            ))}
            <button type="button" className={`chip dash ${prep === 'custom' ? 'on' : ''}`} onClick={() => pickPrep('custom')}>+ Autre</button>
          </div>
          {prep !== 'none' && (
            <>
              <p className="hint">Une tâche avec ces étapes sera créée pour toi. Décoche ce que tu ne veux pas cette fois.</p>
              <div className="preview">
                {prep === 'custom' && (
                  <input className="field" style={{ marginTop: 8 }} value={prepName} placeholder="Nom de la liste (ex : Valise)" onChange={(e) => setPrepName(e.target.value)} />
                )}
                <div className="steps">
                  {prepSteps.map((x) => (
                    <div key={x.id} className={`step ${x.on ? '' : 'done'}`}>
                      <button type="button" className={`chk ${x.on ? 'on' : ''}`} aria-label={x.on ? 'Retirer' : 'Garder'}
                        onClick={() => setPrepSteps(prepSteps.map((y) => (y.id === x.id ? { ...y, on: !y.on } : y)))}>
                        {x.on && <Icon name="check" size={14} sw={3.2} />}
                      </button>
                      <span className="lab">{x.title}</span>
                    </div>
                  ))}
                  <div className="step-add">
                    <span className="plus-ic"><Icon name="plus" size={12} sw={3} /></span>
                    <input value={newStep} placeholder="Ajouter une étape rien que pour cette fois" enterKeyHint="done"
                      onChange={(e) => setNewStep(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPrepStep() } }} onBlur={addPrepStep} />
                  </div>
                </div>
              </div>
              <div className="lbl">À finir pour…</div>
              <div className="chips">
                {([[1, 'La veille'], [2, '2 jours avant'], [0, 'Le jour J']] as const).map(([n, l]) => (
                  <button type="button" key={n} className={`chip ${offset === n ? 'on' : ''}`} onClick={() => setOffset(n)}>{l}</button>
                ))}
              </div>
              <div className="lbl">Qui s'en occupe ?</div>
              <WhoPicker value={prepWho} onChange={setPrepWho} extra={
                <button type="button" className={`chip ${prepWho === 'split' ? 'on' : ''}`} onClick={() => setPrepWho('split')}>Répartir les étapes</button>
              } />
            </>
          )}
        </>
      )}

      {event && linked.length > 0 && (
        <p className="hint" style={{ marginTop: 14 }}>{linked.length} tâche{linked.length > 1 ? 's' : ''} liée{linked.length > 1 ? 's' : ''} à cet événement (« À préparer »).</p>
      )}
      {event && eventDays(event) > 0 && null}
      <div className="actions">
        {event && (
          <button className="btn danger" onClick={() => {
            const extra = linked.length ? `\n\n${linked.length} tâche${linked.length > 1 ? 's' : ''} liée${linked.length > 1 ? 's' : ''} sera${linked.length > 1 ? 'ont' : ''} aussi supprimée${linked.length > 1 ? 's' : ''}.` : ''
            if (confirm(`Supprimer cet événement ?${extra}`)) { deleteEvent(event); onClose() }
          }}>Supprimer</button>
        )}
        <button className="btn primary" disabled={!title.trim() || !d} onClick={save}>{event ? 'Enregistrer' : 'Ajouter'}</button>
      </div>
    </Sheet>
  )
}
