import { useEffect, type ReactNode } from 'react'
import type { Assignee, Member } from '../lib/types'
import { BOTH } from '../lib/types'
import { BOTH_COLOR } from '../store/context'

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Avatar({ member, size }: { member: Member; size?: 'lg' }) {
  return (
    <span className={`avatar ${size ?? ''}`} style={{ background: member.color }} title={member.name}>
      {member.name.slice(0, 1).toUpperCase()}
    </span>
  )
}

export const colorOf = (a: Assignee, members: Member[]) =>
  a === BOTH ? BOTH_COLOR : members.find((m) => m.id === a)?.color ?? '#999'

/** Choix « qui ? » : membres + À deux. */
export function WhoPicker({ value, onChange, members, meId }: {
  value: Assignee; onChange: (a: Assignee) => void; members: Member[]; meId: string
}) {
  const ordered = [...members].sort((a) => (a.id === meId ? -1 : 1))
  return (
    <div className="chips">
      {ordered.map((m) => (
        <button type="button" key={m.id} className={`chip ${value === m.id ? 'on' : ''}`} onClick={() => onChange(m.id)}>
          {m.id === meId ? `Moi (${m.name})` : m.name}
        </button>
      ))}
      <button type="button" className={`chip ${value === BOTH ? 'on' : ''}`} onClick={() => onChange(BOTH)}>À deux</button>
    </div>
  )
}
