import { useStore } from '../store/context'
import { Icon } from '../components/Icon'
import type { PushSettings } from '../lib/types'

export type PlusScreen = 'birthdays' | 'bilan' | 'infos'

const OPTIONS: [keyof PushSettings, string][] = [
  ['assigned', "On m'assigne une tâche"],
  ['due', 'Une échéance approche (selon le rappel choisi)'],
  ['birthdays', 'Anniversaires (la veille et le jour J)'],
  ['morning', 'Résumé du matin · 8h00'],
  ['done', "L'autre a terminé une tâche que je lui avais confiée"],
]

export function Plus({ onOpen, onTemplates }: { onOpen: (s: PlusScreen) => void; onTemplates: () => void }) {
  const s = useStore()
  const push = s.push
  const row = (icon: 'cake' | 'chart' | 'info' | 'book', title: string, sub: string, go: () => void) => (
    <button className="menu-row" onClick={go}>
      <span className="menu-ic"><Icon name={icon} size={22} sw={1.9} /></span>
      <span className="lab">{title}<small>{sub}</small></span><Icon name="right" size={18} />
    </button>
  )
  return (
    <>
      <div className="card" style={{ marginTop: 6 }}>
        {row('cake', 'Anniversaires', 'Cadeau prévu automatiquement', () => onOpen('birthdays'))}
        {row('chart', 'Bilan de la semaine', 'Qui a fait et pensé à quoi', () => onOpen('bilan'))}
        {row('info', 'Infos pratiques', 'Pédiatre, crèche, contrats, codes', () => onOpen('infos'))}
        {row('book', 'Listes types', 'Ménage, valise, courses…', onTemplates)}
      </div>

      <div className="sec">Notifications</div>
      {!push ? (
        <div className="card" style={{ padding: 14 }}><p className="hint" style={{ margin: 0 }}>Les notifications sont disponibles quand l'appli est synchronisée avec Firebase (pas en mode démo).</p></div>
      ) : !push.supported ? (
        <div className="card" style={{ padding: 14 }}>
          <p className="hint" style={{ margin: 0 }}>
            {push.reason === 'config'
              ? 'Les notifications ne sont pas encore configurées pour cette appli (voir le README, section Notifications).'
              : "Sur iPhone : ajoute d'abord l'appli à l'écran d'accueil (Safari → Partager → « Sur l'écran d'accueil », iOS 16.4 ou plus), puis rouvre-la depuis l'icône."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: '4px 14px 8px' }}>
          <div className="step">
            <span className="menu-ic"><Icon name="bell" size={22} sw={1.9} /></span>
            <span className="lab"><strong>Sur ce téléphone</strong><small style={{ display: 'block', color: 'var(--muted)', fontSize: 12.5 }}>{push.permission === 'denied' ? 'Bloquées dans les réglages du navigateur' : push.enabled ? 'Activées' : 'Désactivées'}</small></span>
            <button className={`sw ${push.enabled ? 'on' : ''}`} style={{ border: 0, padding: 0, cursor: 'pointer' }} aria-label="Activer les notifications" aria-pressed={push.enabled} disabled={push.permission === 'denied'}
              onClick={() => (push.enabled ? push.disable() : push.enable())} />
          </div>
          {push.enabled && OPTIONS.map(([k, label]) => (
            <div className="step" key={k}>
              <span className="lab">{label}</span>
              <button className={`sw ${push.settings[k] ? 'on' : ''}`} style={{ border: 0, padding: 0, cursor: 'pointer' }} aria-label={label} aria-pressed={push.settings[k]} onClick={() => push.update({ [k]: !push.settings[k] })} />
            </div>
          ))}
        </div>
      )}
      <p className="hint" style={{ margin: '8px 4px' }}>Chacun règle ses notifications sur son téléphone.</p>
    </>
  )
}
