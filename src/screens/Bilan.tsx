import { useMemo } from 'react'
import { useStore } from '../store/context'
import { Icon } from '../components/Icon'
import { OwnerAvatar } from '../components/ui'
import { computeBilan } from '../lib/bilan'
import { addDays, fromISO, todayISO } from '../lib/dates'
import { BOTH } from '../lib/types'
import { useTaskActions } from '../store/actions'

export function Bilan({ onBack }: { onBack: () => void }) {
  const s = useStore()
  const { thank } = useTaskActions()
  const meId = s.me!.id
  const other = s.members.find((m) => m.id !== meId)
  const b = useMemo(() => computeBilan(s.tasks, s.events, meId), [s.tasks, s.events, meId])
  const fd = (d: string) => fromISO(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const maxDone = Math.max(1, ...Object.values(b.doneBy), b.doneBoth)
  const maxThought = Math.max(1, ...Object.values(b.thoughtBy))
  const mine = b.thoughtBy[meId] ?? 0
  const theirs = other ? b.thoughtBy[other.id] ?? 0 : 0
  const openCount = (id: string) => s.tasks.filter((t) => !t.done && t.assignee === id).length

  const rebalance = (id: string) => {
    const t = s.tasks.find((x) => x.id === id)!
    if (!other) return
    const target = openCount(meId) <= openCount(other.id) ? meId : other.id
    s.updateTask(id, { assignee: t.assignee === target ? (target === meId ? other.id : meId) : target })
  }
  const postpone = (id: string) => {
    const t = s.tasks.find((x) => x.id === id)!
    s.updateTask(id, { deadline: addDays(todayISO(), 7), plannedOn: t.plannedOn ? null : t.plannedOn })
  }

  return (
    <>
      <div className="cal-head" style={{ marginBottom: 0 }}>
        <button className="nav" aria-label="Retour" onClick={onBack}><Icon name="left" size={20} sw={2} /></button>
        <h2>Bilan de la semaine</h2>
        <span style={{ width: 36 }} />
      </div>
      <p className="sub" style={{ margin: '4px 4px 0' }}>du {fd(b.from)} au {fd(b.to)} · 10 minutes</p>

      <div className="sec">Qui a fait quoi</div>
      <div className="card" style={{ padding: '6px 14px' }}>
        {s.members.map((m) => (
          <div className="stat" key={m.id}><span className="who"><OwnerAvatar who={m.id} />{m.id === meId ? 'Moi' : m.name}</span>
            <div className="bar"><span style={{ width: `${((b.doneBy[m.id] ?? 0) / maxDone) * 100}%`, background: m.color }} /></div><b>{b.doneBy[m.id] ?? 0}</b></div>
        ))}
        <div className="stat"><span className="who"><OwnerAvatar who={BOTH} />À deux</span>
          <div className="bar"><span style={{ width: `${(b.doneBoth / maxDone) * 100}%`, background: 'var(--both)' }} /></div><b>{b.doneBoth}</b></div>
      </div>

      <div className="sec"><span>Qui a pensé à quoi</span><span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>la charge invisible</span></div>
      <div className="card" style={{ padding: '12px 14px' }}>
        {s.members.map((m) => (
          <div className="stat" key={m.id} style={{ margin: '4px 0' }}><span className="who"><OwnerAvatar who={m.id} />{m.id === meId ? 'Moi' : m.name}</span>
            <div className="bar"><span style={{ width: `${((b.thoughtBy[m.id] ?? 0) / maxThought) * 100}%`, background: m.color }} /></div><b>{b.thoughtBy[m.id] ?? 0}</b></div>
        ))}
        {other && Math.max(mine, theirs) >= 4 && Math.max(mine, theirs) >= 2 * Math.min(mine, theirs) && (
          <p className="hint" style={{ marginTop: 8 }}>
            {theirs > mine
              ? `${other.name} a lancé ${theirs} sujets cette semaine, toi ${mine}. Essayez de prendre l'initiative sur quelques-uns.`
              : `Tu as lancé ${mine} sujets cette semaine, ${other.name} ${theirs}. Pense à partager cette charge.`}
          </p>
        )}
      </div>

      <div className="sec">Dis merci</div>
      <div className="card" style={{ padding: '4px 14px' }}>
        {b.toThank.length === 0 && <p className="hint" style={{ margin: '10px 0' }}>Rien à remercier pour l'instant.</p>}
        {b.toThank.map((t) => {
          const said = t.thankedBy.includes(meId)
          const who = s.members.find((m) => m.id === t.doneBy)
          return (
            <div className="step" key={t.id}>
              <OwnerAvatar who={t.doneBy!} />
              <span className="lab">{who?.name} a fini : {t.title}</span>
              <button className={`thx ${said ? 'done' : ''}`} disabled={said} onClick={() => thank(t)}>
                <Icon name="heart" size={14} sw={2.2} />{said ? 'Envoyé' : 'Merci'}
              </button>
            </div>
          )
        })}
      </div>
      {b.thankedMe > 0 && other && <p className="hint" style={{ margin: '8px 4px' }}>{other.name} t'a dit merci pour {b.thankedMe} tâche{b.thankedMe > 1 ? 's' : ''} cette semaine 💛</p>}

      <div className="sec">Pas fait · {b.undone.length}</div>
      <div className="card" style={{ padding: '4px 14px' }}>
        {b.undone.length === 0 && <p className="hint" style={{ margin: '10px 0' }}>Rien en retard, bravo !</p>}
        {b.undone.map((t) => (
          <div className="step" key={t.id}>
            <span className="lab">{t.title}</span>
            <button className="btn-s soft" onClick={() => rebalance(t.id)}>Rééquilibrer</button>
            <button className="btn-s soft" onClick={() => postpone(t.id)}>Reporter</button>
          </div>
        ))}
      </div>
    </>
  )
}
