import { useState } from 'react'
import { useStore } from '../store/context'
import { AISLES } from '../lib/aisles'
import { Icon } from '../components/Icon'
import { OwnerAvatar } from '../components/ui'
import { Meals } from './Meals'
import type { ShopItem } from '../lib/types'

export function Shopping() {
  const s = useStore()
  const [view, setView] = useState<'list' | 'meals'>('list')
  const [text, setText] = useState('')
  const todo = s.items.filter((i) => !i.done).sort((a, b) => a.createdAt - b.createdAt)
  const done = s.items.filter((i) => i.done).sort((a, b) => b.createdAt - a.createdAt)
  const lower = (x: string) => x.trim().toLowerCase()
  const inList = (t: string) => todo.some((i) => lower(i.text) === lower(t))
  const habits = s.habits.filter((h) => !inList(h))

  const add = (t = text) => {
    const v = t.trim()
    if (!v) return
    if (!inList(v)) s.addItem(v)
    setText('')
  }
  const toggleHabit = (i: ShopItem) => {
    const has = s.habits.some((h) => lower(h) === lower(i.text))
    s.setHabits(has ? s.habits.filter((h) => lower(h) !== lower(i.text)) : [...s.habits, i.text.trim()])
  }

  const row = (i: ShopItem) => (
    <div key={i.id} className="step">
      <button className="chk" aria-label="Pris" onClick={() => s.updateItem(i.id, { done: true })} />
      <span className="lab">{i.text}</span>
      <button className="x" aria-label="Ajouter aux habituels" title="Habituel" onClick={() => toggleHabit(i)}
        style={{ color: s.habits.some((h) => lower(h) === lower(i.text)) ? '#C98F00' : undefined }}>
        <Icon name="star" size={18} sw={2} />
      </button>
      <label className="aisle-pick" aria-label="Changer de rayon">
        <Icon name="down" size={16} sw={2.4} />
        <select value={i.aisle} onChange={(e) => s.updateItem(i.id, { aisle: e.target.value })}>
          {AISLES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </label>
      <OwnerAvatar who={i.addedBy} />
      <button className="x" aria-label="Supprimer" onClick={() => s.removeItem(i.id)}><Icon name="close" size={18} /></button>
    </div>
  )

  return (
    <>
      <div className="seg">
        <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>Liste</button>
        <button className={view === 'meals' ? 'on' : ''} onClick={() => setView('meals')}>Repas de la semaine</button>
      </div>

      {view === 'meals' ? <Meals /> : (
        <>
          <div className="add-row" style={{ marginTop: 12 }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ajouter un article…" onKeyDown={(e) => e.key === 'Enter' && add()} enterKeyHint="done" />
            <button className="btn primary" onClick={() => add()} disabled={!text.trim()} style={{ padding: '0 18px' }}>＋</button>
          </div>
          {habits.length > 0 && (
            <>
              <div className="lbl" style={{ margin: '0 0 7px' }}>Habituels · un geste pour les rajouter</div>
              <div className="chips">
                {habits.map((h) => <button key={h} className="chip dash" onClick={() => add(h)}>+ {h}</button>)}
              </div>
            </>
          )}

          {AISLES.map((a) => {
            const list = todo.filter((i) => (AISLES.some((x) => x.id === i.aisle) ? i.aisle : 'autre') === a.id)
            if (!list.length) return null
            return (
              <section key={a.id}>
                <div className="aisle"><i style={{ ['--dc' as string]: a.color }} />{a.label}</div>
                <div className="card" style={{ padding: '0 14px' }}>{list.map(row)}</div>
              </section>
            )
          })}
          {!todo.length && <div className="empty">La liste est vide. Ajoute ce qu'il manque 🛒</div>}

          {done.length > 0 && (
            <section>
              <div className="aisle" style={{ justifyContent: 'space-between' }}>
                <span>Dans le panier · {done.length}</span>
                <button className="link" style={{ margin: 0 }} onClick={() => s.clearDoneItems()}>Vider</button>
              </div>
              <div className="card" style={{ padding: '0 14px' }}>
                {done.map((i) => (
                  <div key={i.id} className="step done">
                    <button className="chk on" aria-label="Remettre" onClick={() => s.updateItem(i.id, { done: false })}><Icon name="check" size={14} sw={3.2} /></button>
                    <span className="lab">{i.text}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  )
}
