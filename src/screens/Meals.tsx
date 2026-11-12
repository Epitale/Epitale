import { useMemo, useState } from 'react'
import { useStore } from '../store/context'
import { Sheet } from '../components/ui'
import { Icon } from '../components/Icon'
import { addDays, fromISO, todayISO } from '../lib/dates'
import { coversDay, expandEvents, isBirthday } from '../lib/events'
import type { Meal } from '../lib/types'

const fDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })

export function Meals() {
  const s = useStore()
  const [offset, setOffset] = useState(0)
  const [edit, setEdit] = useState<{ date: string; slot: 'midi' | 'soir'; meal?: Meal } | null>(null)
  const start = addDays(todayISO(), offset * 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const occ = useMemo(() => expandEvents(s.events, days[0], days[6]).filter((e) => !isBirthday(e)), [s.events, start])
  const weekMeals = s.meals.filter((m) => m.date >= days[0] && m.date <= days[6])

  const lower = (x: string) => x.trim().toLowerCase()
  const wanted = useMemo(() => {
    const inList = new Set(s.items.filter((i) => !i.done).map((i) => lower(i.text)))
    const seen = new Set<string>()
    const out: string[] = []
    for (const m of weekMeals) for (const ing of m.ingredients) {
      const k = lower(ing)
      if (!k || inList.has(k) || seen.has(k)) continue
      seen.add(k); out.push(ing.trim())
    }
    return out
  }, [s.meals, s.items, start])

  const slot = (date: string, sl: 'midi' | 'soir') => {
    const meal = s.meals.find((m) => m.date === date && m.slot === sl)
    return (
      <button key={sl} className={`slot ${meal ? '' : 'empty'}`} onClick={() => setEdit({ date, slot: sl, meal })}>
        {meal ? <>{meal.title}{meal.ingredients.length > 0 && <small>{meal.ingredients.join(' · ')}</small>}</> : `${sl === 'midi' ? 'Midi' : 'Soir'} : à choisir`}
      </button>
    )
  }

  return (
    <>
      <div className="cal-head" style={{ marginTop: 12 }}>
        <button className="nav" aria-label="Semaine précédente" onClick={() => setOffset(offset - 1)}><Icon name="left" size={20} sw={2} /></button>
        <h2 style={{ fontSize: 16 }}>{offset === 0 ? 'Les 7 prochains jours' : `Semaine du ${fromISO(days[0]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}</h2>
        <button className="nav" aria-label="Semaine suivante" onClick={() => setOffset(offset + 1)}><Icon name="right" size={20} sw={2} /></button>
      </div>
      <div className="card" style={{ padding: '2px 0' }}>
        {days.map((d) => {
          const evs = occ.filter((e) => coversDay(e, d))
          return (
            <div key={d} className="meal">
              <div className="dayname">{fDay.format(fromISO(d))}<small>{fromISO(d).getDate()}</small></div>
              <div className="slots">
                {evs.map((e) => <div key={e.id} className="slot ev">{e.title}<small style={{ color: 'inherit' }}>événement prévu ce jour-là</small></div>)}
                {slot(d, 'midi')}{slot(d, 'soir')}
              </div>
            </div>
          )
        })}
      </div>
      <p className="hint" style={{ margin: '10px 4px' }}>Touche un repas pour le choisir ou le noter. Les ingrédients sont facultatifs.</p>
      <div style={{ position: 'sticky', bottom: 8 }}>
        <button className="btn primary" style={{ width: '100%' }} disabled={wanted.length === 0}
          onClick={() => wanted.forEach((w) => s.addItem(w))}>
          {wanted.length ? `Ajouter les ingrédients aux courses · ${wanted.length} article${wanted.length > 1 ? 's' : ''}` : 'Rien de plus à ajouter aux courses'}
        </button>
      </div>
      {edit && <MealForm {...edit} onClose={() => setEdit(null)} />}
    </>
  )
}

function MealForm({ date, slot, meal, onClose }: { date: string; slot: 'midi' | 'soir'; meal?: Meal; onClose: () => void }) {
  const s = useStore()
  const [title, setTitle] = useState(meal?.title ?? '')
  const [ings, setIngs] = useState<string[]>(meal?.ingredients ?? [])
  const [text, setText] = useState('')
  const past = useMemo(() => {
    const m = new Map<string, Meal>()
    for (const x of s.meals) if (x.id !== meal?.id && !m.has(x.title.toLowerCase())) m.set(x.title.toLowerCase(), x)
    return [...m.values()].slice(-8).reverse()
  }, [s.meals])

  const addIng = () => { const v = text.trim(); if (v && !ings.includes(v)) setIngs([...ings, v]); setText('') }
  const pick = (m: Meal) => { setTitle(m.title); setIngs(m.ingredients) }
  const save = () => {
    if (!title.trim()) return
    const data = { date, slot, title: title.trim(), ingredients: ings }
    if (meal) s.updateMeal(meal.id, data); else s.addMeal(data)
    onClose()
  }

  return (
    <Sheet title={`${slot === 'midi' ? 'Midi' : 'Soir'} · ${fromISO(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`} onClose={onClose}>
      <label>Quel repas ?
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Pâtes carbonara" onKeyDown={(e) => e.key === 'Enter' && save()} />
      </label>
      {past.length > 0 && (
        <>
          <div className="lbl">Vos idées</div>
          <div className="chips">{past.map((m) => <button key={m.id} className="chip" onClick={() => pick(m)}>{m.title}</button>)}</div>
        </>
      )}
      <div className="lbl">Ingrédients à acheter (facultatif)</div>
      <div className="chips">
        {ings.map((g) => <span key={g} className="chip on">{g}<button className="x" aria-label={`Retirer ${g}`} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', display: 'grid', color: 'inherit' }} onClick={() => setIngs(ings.filter((x) => x !== g))}><Icon name="close" size={14} sw={2.4} /></button></span>)}
      </div>
      <div className="add-row" style={{ marginTop: 8 }}>
        <input value={text} placeholder="Ajouter un ingrédient" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIng() } }} onBlur={addIng} enterKeyHint="done" />
      </div>
      <div className="actions">
        {meal && <button className="btn danger" onClick={() => { s.removeMeal(meal.id); onClose() }}>Supprimer</button>}
        <button className="btn primary" disabled={!title.trim()} onClick={save}>Enregistrer</button>
      </div>
    </Sheet>
  )
}
