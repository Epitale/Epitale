import { useState } from 'react'
import type { Step, Task } from '../lib/types'
import { OwnerAvatar } from './ui'
import { Icon } from './Icon'
import { stepOwner } from '../lib/tasks'
import { uid, useStore } from '../store/context'

/**
 * Éditeur d'étapes (brouillon) : cocher, renommer, changer le responsable, supprimer, ajouter.
 * `task` sert uniquement à savoir qui est responsable par défaut.
 */
export function StepEditor({ steps, onChange, assignee }: { steps: Step[]; onChange: (s: Step[]) => void; assignee: string }) {
  const { me, members } = useStore()
  const [text, setText] = useState('')
  const meId = me!.id
  const otherId = members.find((m) => m.id !== meId)?.id ?? meId
  const next = (cur: string | null) => (cur === null ? meId : cur === meId ? otherId : null)
  const fake = { assignee } as Task

  const add = () => {
    const t = text.trim()
    if (!t) return
    onChange([...steps, { id: uid(), title: t, done: false, assignee: null }])
    setText('')
  }
  const set = (id: string, p: Partial<Step>) => onChange(steps.map((s) => (s.id === id ? { ...s, ...p } : s)))

  return (
    <div className="steps">
      {steps.map((s) => (
        <div key={s.id} className={`step ${s.done ? 'done' : ''}`}>
          <button type="button" className={`chk ${s.done ? 'on' : ''}`} aria-label={s.done ? 'Rouvrir' : 'Terminer'} onClick={() => set(s.id, { done: !s.done })}>
            {s.done && <Icon name="check" size={14} sw={3.2} />}
          </button>
          <input className="lab" value={s.title} aria-label="Étape" onChange={(e) => set(s.id, { title: e.target.value })} />
          <OwnerAvatar who={stepOwner(fake, s)} onClick={() => set(s.id, { assignee: next(s.assignee) })} />
          <button type="button" className="x" aria-label="Supprimer l'étape" onClick={() => onChange(steps.filter((x) => x.id !== s.id))}><Icon name="close" size={18} /></button>
        </div>
      ))}
      <div className="step-add">
        <span className="plus-ic"><Icon name="plus" size={12} sw={3} /></span>
        <input value={text} placeholder="Ajouter une étape" enterKeyHint="done" onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} onBlur={add} />
      </div>
    </div>
  )
}
