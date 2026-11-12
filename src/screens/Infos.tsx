import { useState } from 'react'
import { useStore } from '../store/context'
import { Icon } from '../components/Icon'
import { Sheet, DomainPicker, useDomain } from '../components/ui'
import type { Info } from '../lib/types'

export function Infos({ onBack }: { onBack: () => void }) {
  const s = useStore()
  const [q, setQ] = useState('')
  const [domain, setDomain] = useState<string | null>(null)
  const [edit, setEdit] = useState<Info | 'new' | null>(null)
  const [shown, setShown] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  const match = (i: Info) => (domain === null || i.domain === domain) &&
    `${i.title} ${i.name} ${i.value} ${i.note}`.toLowerCase().includes(q.trim().toLowerCase())
  const list = s.infos.filter(match).sort((a, b) => a.title.localeCompare(b.title))
  const used = s.domains.filter((d) => s.infos.some((i) => i.domain === d.id))

  const copy = async (i: Info) => {
    try { await navigator.clipboard.writeText(i.value); setCopied(i.id); setTimeout(() => setCopied(null), 1500) } catch { /* ignoré */ }
  }

  return (
    <>
      <div className="cal-head" style={{ marginBottom: 0 }}>
        <button className="nav" aria-label="Retour" onClick={onBack}><Icon name="left" size={20} sw={2} /></button>
        <h2>Infos pratiques</h2>
        <span style={{ width: 36 }} />
      </div>
      <p className="sub" style={{ margin: '4px 4px 0' }}>Tout ce qu'on cherche toujours</p>
      <input className="field" style={{ marginTop: 12 }} type="search" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
      {used.length > 0 && (
        <div className="chips row">
          <button className={`chip ${domain === null ? 'on' : ''}`} onClick={() => setDomain(null)}>Tout</button>
          {used.map((d) => <button key={d.id} className={`chip ${domain === d.id ? 'on' : ''}`} style={{ ['--dc' as string]: d.color }} onClick={() => setDomain(domain === d.id ? null : d.id)}><i />{d.label}</button>)}
        </div>
      )}

      <div className="list" style={{ marginTop: 14 }}>
        {list.map((i) => (
          <div key={i.id} className="card info" onClick={() => setEdit(i)} style={{ cursor: 'pointer' }}>
            <div className="row">
              <div style={{ minWidth: 0 }}>
                <div className="k"><DomainName id={i.domain} /> · {i.title}</div>
                <h3>{i.name || (i.kind === 'secret' && !shown.includes(i.id) ? '••••••' : i.value)}</h3>
                {(i.name || i.note) && (
                  <div className="small muted" style={{ marginTop: 2 }}>
                    {i.name && (i.kind === 'secret' && !shown.includes(i.id) ? '••••••' : i.value)}{i.name && i.note ? ' · ' : ''}{i.note}
                  </div>
                )}
              </div>
              {i.kind === 'phone' && <a className="round" aria-label="Appeler" href={`tel:${i.value.replace(/\s/g, '')}`} onClick={(e) => e.stopPropagation()}><Icon name="phone" size={20} sw={2} /></a>}
              {i.kind === 'secret' && <button className="round" aria-label="Afficher" onClick={(e) => { e.stopPropagation(); setShown(shown.includes(i.id) ? shown.filter((x) => x !== i.id) : [...shown, i.id]) }}><Icon name="eye" size={20} sw={2} /></button>}
              {i.kind === 'text' && <button className="round" aria-label="Copier" onClick={(e) => { e.stopPropagation(); copy(i) }}>{copied === i.id ? <Icon name="check" size={20} sw={2.4} /> : <Icon name="copy" size={20} sw={2} />}</button>}
            </div>
          </div>
        ))}
        {!list.length && <div className="empty">{s.infos.length ? 'Aucun résultat.' : "Rien pour l'instant : pédiatre, crèche, contrats, codes… Appuie sur +."}</div>}
      </div>

      <button className="fab" aria-label="Ajouter une info" onClick={() => setEdit('new')}><Icon name="plus" size={26} sw={2.2} /></button>
      {edit && <InfoForm info={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
    </>
  )
}

function DomainName({ id }: { id: string }) { return <>{useDomain(id).label}</> }

function InfoForm({ info, onClose }: { info?: Info; onClose: () => void }) {
  const s = useStore()
  const [title, setTitle] = useState(info?.title ?? '')
  const [name, setName] = useState(info?.name ?? '')
  const [value, setValue] = useState(info?.value ?? '')
  const [note, setNote] = useState(info?.note ?? '')
  const [kind, setKind] = useState<Info['kind']>(info?.kind ?? 'phone')
  const [domain, setDomain] = useState(info?.domain ?? 'sante')

  const save = () => {
    if (!title.trim() || !value.trim()) return
    const data = { title: title.trim(), name: name.trim(), value: value.trim(), note: note.trim(), kind, domain }
    if (info) s.updateInfo(info.id, data); else s.addInfo(data)
    onClose()
  }
  return (
    <Sheet title={info ? 'Modifier l’info' : 'Nouvelle info'} onClose={onClose}>
      <label>De quoi s'agit-il ?
        <input autoFocus={!info} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Pédiatre, Code du portail…" />
      </label>
      <div className="lbl">Type</div>
      <div className="chips">
        {([['phone', 'Téléphone'], ['text', 'Texte / n° à copier'], ['secret', 'Secret (masqué)']] as const).map(([k, l]) => (
          <button key={k} type="button" className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{l}</button>
        ))}
      </div>
      <label>{kind === 'phone' ? 'Numéro' : kind === 'secret' ? 'Code' : 'Valeur'}
        <input value={value} inputMode={kind === 'phone' ? 'tel' : undefined} onChange={(e) => setValue(e.target.value)} />
      </label>
      <label>Nom (facultatif)<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Dr Martin" /></label>
      <label>Précision (facultatif)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : mardi et jeudi" /></label>
      <div className="lbl">Domaine</div>
      <DomainPicker value={domain} onChange={setDomain} />
      <div className="actions">
        {info && <button className="btn danger" onClick={() => { if (confirm('Supprimer cette info ?')) { s.removeInfo(info.id); onClose() } }}>Supprimer</button>}
        <button className="btn primary" disabled={!title.trim() || !value.trim()} onClick={save}>{info ? 'Enregistrer' : 'Ajouter'}</button>
      </div>
    </Sheet>
  )
}
