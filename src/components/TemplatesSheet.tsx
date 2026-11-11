import { useState } from 'react'
import { Sheet, DomainPicker } from './ui'
import { Icon } from './Icon'
import { useStore, uid } from '../store/context'
import type { Template } from '../lib/types'

/** Édition des listes types (modèles de « À préparer »). */
export function TemplatesSheet({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const [list, setList] = useState<Template[]>(s.templates)
  const [open, setOpen] = useState<string | null>(list[0]?.id ?? null)
  const [text, setText] = useState('')

  const patch = (id: string, p: Partial<Template>) => setList(list.map((t) => (t.id === id ? { ...t, ...p } : t)))
  const addStep = (t: Template) => {
    const v = text.trim()
    if (v) patch(t.id, { steps: [...t.steps, v] })
    setText('')
  }
  const create = () => {
    const t: Template = { id: uid(), name: 'Nouvelle liste', domain: 'autre', steps: [] }
    setList([...list, t]); setOpen(t.id)
  }
  const save = () => { s.saveTemplates(list.filter((t) => t.name.trim())); onClose() }

  return (
    <Sheet title="Listes types" onClose={onClose}>
      <p className="hint" style={{ marginTop: 0 }}>Ces listes sont proposées dans « À préparer » quand tu crées un événement, et dans les étapes d'une tâche.</p>
      <div style={{ marginTop: 12 }}>
        {list.map((t) => {
          const isOpen = open === t.id
          return (
            <div key={t.id} className="card model" style={isOpen ? { border: '1.5px solid var(--accent)' } : undefined}>
              <div className="model-head" onClick={() => setOpen(isOpen ? null : t.id)}>
                {isOpen
                  ? <input value={t.name} aria-label="Nom de la liste" onClick={(e) => e.stopPropagation()} onChange={(e) => patch(t.id, { name: e.target.value })} />
                  : <h3>{t.name}</h3>}
                <span className="pill">{t.steps.length} étape{t.steps.length > 1 ? 's' : ''}</span>
              </div>
              {isOpen && (
                <>
                  <div className="steps" style={{ marginTop: 6 }}>
                    {t.steps.map((st, i) => (
                      <div key={i} className="step">
                        <input className="lab" value={st} aria-label="Étape" onChange={(e) => patch(t.id, { steps: t.steps.map((x, j) => (j === i ? e.target.value : x)) })} />
                        <button className="x" aria-label="Supprimer" onClick={() => patch(t.id, { steps: t.steps.filter((_, j) => j !== i) })}><Icon name="close" size={18} /></button>
                      </div>
                    ))}
                    <div className="step-add">
                      <span className="plus-ic"><Icon name="plus" size={12} sw={3} /></span>
                      <input value={text} placeholder="Ajouter une étape" enterKeyHint="done" onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(t) } }} onBlur={() => addStep(t)} />
                    </div>
                  </div>
                  <div className="lbl">Domaine de la tâche créée</div>
                  <DomainPicker value={t.domain} onChange={(d) => patch(t.id, { domain: d })} />
                  <button className="btn danger" style={{ width: '100%', marginTop: 14, boxShadow: 'none' }}
                    onClick={() => { if (confirm(`Supprimer la liste « ${t.name} » ?`)) setList(list.filter((x) => x.id !== t.id)) }}>Supprimer cette liste</button>
                </>
              )}
            </div>
          )
        })}
      </div>
      <button className="btn ghost" style={{ width: '100%', borderStyle: 'dashed', borderColor: 'var(--accent)' }} onClick={create}>+ Nouvelle liste type</button>
      <div className="actions">
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" onClick={save}>Enregistrer</button>
      </div>
    </Sheet>
  )
}
