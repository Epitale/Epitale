import { useState } from 'react'
import { useStore } from '../store/context'

export function Shopping() {
  const s = useStore()
  const [text, setText] = useState('')
  const todo = s.items.filter((i) => !i.done).sort((a, b) => a.createdAt - b.createdAt)
  const done = s.items.filter((i) => i.done).sort((a, b) => b.createdAt - a.createdAt)

  const add = () => {
    const t = text.trim()
    if (!t) return
    setText('')
    s.addItem(t)
  }

  return (
    <>
      <div className="add-row">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ajouter un article…" onKeyDown={(e) => e.key === 'Enter' && add()} enterKeyHint="done" />
        <button className="btn primary" onClick={add} disabled={!text.trim()} style={{ padding: "0 18px" }}>＋</button>
      </div>
      <div className="list">
        {todo.map((i) => (
          <div key={i.id} className="card item">
            <button className="check" aria-label="Acheté" onClick={() => s.updateItem(i.id, { done: true })} />
            <span className="t">{i.text}</span>
            <button className="x" aria-label="Supprimer" onClick={() => s.removeItem(i.id)}>✕</button>
          </div>
        ))}
      </div>
      {!todo.length && <div className="empty">La liste est vide. Ajoute ce qu'il manque 🛒</div>}
      {done.length > 0 && (
        <section className="section">
          <div className="section-title"><span>Dans le panier · {done.length}</span><button className="link" style={{ margin: 0 }} onClick={() => s.clearDoneItems()}>Vider</button></div>
          <div className="list">
            {done.map((i) => (
              <div key={i.id} className="card item done">
                <button className="check on" aria-label="Remettre" onClick={() => s.updateItem(i.id, { done: false })}>✓</button>
                <span className="t">{i.text}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
