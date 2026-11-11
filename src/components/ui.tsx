import { useEffect, useState, type ReactNode } from 'react'
import type { Assignee, DomainDef, Member } from '../lib/types'
import { BOTH } from '../lib/types'
import { BOTH_COLOR, useStore } from '../store/context'
import { DOMAIN_COLORS } from '../lib/defaults'
import { Icon } from './Icon'

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-label={title}>
        <div className="grab" />
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Avatar({ member, size }: { member: Member; size?: 'lg' }) {
  return (
    <span className={`av ${size ?? ''}`} style={{ background: member.color }} title={member.name}>
      {member.name.slice(0, 1).toUpperCase()}
    </span>
  )
}

export const colorOf = (a: Assignee, members: Member[]) =>
  a === BOTH ? BOTH_COLOR : members.find((m) => m.id === a)?.color ?? '#999'

/** Pastille ronde du responsable (initiale, ou « 2 » pour À deux). */
export function OwnerAvatar({ who, onClick, label }: { who: Assignee; onClick?: () => void; label?: string }) {
  const { members } = useStore()
  const m = members.find((x) => x.id === who)
  const props = { className: `av ${onClick ? 'btn-av' : ''}`, style: { background: colorOf(who, members) } }
  const text = who === BOTH ? '2' : (m?.name ?? '?').slice(0, 1).toUpperCase()
  return onClick
    ? <button type="button" {...props} aria-label={label ?? 'Changer le responsable'} onClick={(e) => { e.stopPropagation(); onClick() }}>{text}</button>
    : <span {...props}>{text}</span>
}

/** Choix « qui ? » : membres + À deux. */
export function WhoPicker({ value, onChange, extra }: { value: Assignee; onChange: (a: Assignee) => void; extra?: ReactNode }) {
  const { members, me } = useStore()
  const meId = me!.id
  const ordered = [...members].sort((a) => (a.id === meId ? -1 : 1))
  return (
    <div className="chips">
      {ordered.map((m) => (
        <button type="button" key={m.id} className={`chip ${value === m.id ? 'on' : ''}`} onClick={() => onChange(m.id)}>
          {m.id === meId ? 'Moi' : m.name}
        </button>
      ))}
      <button type="button" className={`chip ${value === BOTH ? 'on' : ''}`} onClick={() => onChange(BOTH)}>À deux</button>
      {extra}
    </div>
  )
}

export const useDomain = (id: string): DomainDef => {
  const { domains } = useStore()
  return domains.find((d) => d.id === id) ?? domains.find((d) => d.id === 'autre')!
}

export function DomainTag({ id }: { id: string }) {
  const d = useDomain(id)
  return <span className="tag" style={{ ['--dc' as string]: d.color }}><i />{d.label}</span>
}

/** Choix du domaine, avec création d'un nouveau domaine sans quitter l'écran. */
export function DomainPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { domains, addDomain } = useStore()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(DOMAIN_COLORS[0])

  const create = () => {
    const label = name.trim()
    if (!label) return
    const id = addDomain(label, color)
    onChange(id)
    setName(''); setCreating(false)
  }

  return (
    <>
      <div className="chips">
        {domains.map((d) => (
          <button type="button" key={d.id} className={`chip ${value === d.id ? 'on' : ''}`} style={{ ['--dc' as string]: d.color }} onClick={() => onChange(d.id)}>
            <i />{d.label}
          </button>
        ))}
        {!creating && <button type="button" className="chip dash" onClick={() => setCreating(true)}>+ Nouveau domaine</button>}
      </div>
      {creating && (
        <div className="dom-new">
          <strong>Nouveau domaine</strong>
          <input className="field" style={{ marginTop: 8 }} autoFocus value={name} maxLength={24} placeholder="Ex : Crèche"
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          <div className="lbl" style={{ margin: '12px 0 8px' }}>Couleur</div>
          <div className="swatches">
            {DOMAIN_COLORS.map((c) => (
              <button type="button" key={c} style={{ ['--sc' as string]: c }} className={color === c ? 'on' : ''} aria-label={`Couleur ${c}`} onClick={() => setColor(c)}>
                {color === c && <Icon name="check" size={16} sw={3} />}
              </button>
            ))}
          </div>
          <div className="row2" style={{ marginTop: 14 }}>
            <button type="button" className="btn ghost" style={{ padding: 11 }} onClick={() => setCreating(false)}>Annuler</button>
            <button type="button" className="btn primary" style={{ padding: 11 }} disabled={!name.trim()} onClick={create}>Créer</button>
          </div>
        </div>
      )}
    </>
  )
}
