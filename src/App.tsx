import { useEffect, useRef, useState } from 'react'
import { useStore } from './store/context'
import { Today } from './screens/Today'
import { Tasks } from './screens/Tasks'
import { Planning } from './screens/Planning'
import { Shopping } from './screens/Shopping'
import { Plus, type PlusScreen } from './screens/Plus'
import { Birthdays } from './screens/Birthdays'
import { Bilan } from './screens/Bilan'
import { Infos } from './screens/Infos'
import { QuickAdd } from './components/QuickAdd'
import { giftTasksToCreate } from './lib/gifts'
import { SignIn, Household } from './screens/Auth'
import { TaskForm } from './components/TaskForm'
import { EventForm } from './components/EventForm'
import { TemplatesSheet } from './components/TemplatesSheet'
import { Icon } from './components/Icon'
import { Avatar, Sheet } from './components/ui'
import { longDate, todayISO } from './lib/dates'

type Tab = 'today' | 'tasks' | 'planning' | 'shop' | 'more'
const TABS: [Tab, 'home' | 'tasks' | 'cal' | 'cart' | 'more', string][] = [
  ['today', 'home', "Aujourd'hui"], ['tasks', 'tasks', 'Tâches'], ['planning', 'cal', 'Planning'], ['shop', 'cart', 'Courses'], ['more', 'more', 'Plus'],
]

export default function App() {
  const s = useStore()
  const [tab, setTab] = useState<Tab>('today')
  const [menu, setMenu] = useState(false)
  const [addTask, setAddTask] = useState(false)
  const [addEvent, setAddEvent] = useState(false)
  const [settings, setSettings] = useState(false)
  const [quick, setQuick] = useState(false)
  const [plusScreen, setPlusScreen] = useState<PlusScreen | null>(null)
  const [templates, setTemplates] = useState(false)

  // Anniversaires : crée la tâche « cadeau + carte » N jours avant (une seule fois par an, sans doublon)
  const tried = useRef(new Set<string>())
  useEffect(() => {
    if (s.status !== 'ready' || !s.synced || !s.me) return
    for (const g of giftTasksToCreate(s.events, s.tasks, s.me.id)) {
      if (tried.current.has(g.id)) continue
      tried.current.add(g.id)
      s.addTask(g.task, g.id)
    }
  }, [s.status, s.synced, s.events, s.tasks, s.me])

  if (s.status === 'loading') return <div className="auth"><p className="muted">Chargement…</p></div>
  if (s.status === 'signedOut') return <SignIn />
  if (s.status === 'needsHousehold') return <Household />
  const me = s.me!

  const onFab = () => {
    if (tab === 'today') setMenu(!menu)
    else if (tab === 'tasks') setAddTask(true)
    else if (tab === 'planning') setAddEvent(true)
  }

  return (
    <div className="app">
      {s.syncError && <div className="sync-err" role="alert">⚠ Souci de synchro ({s.syncError}). Nouvelle tentative…</div>}
      <header className="top">
        <div>
          <h1>Salut {me.name} 👋</h1>
          <div className="sub">{longDate(todayISO())}</div>
        </div>
        <button className="avbtn" aria-label="Réglages" onClick={() => setSettings(true)}><Avatar member={me} size="lg" /></button>
      </header>

      <main className="content">
        {tab === 'today' && <Today onQuickAdd={() => setQuick(true)} onOpenBilan={() => { setTab('more'); setPlusScreen('bilan') }} />}
        {tab === 'tasks' && <Tasks adding={addTask} onCloseAdd={() => setAddTask(false)} />}
        {tab === 'planning' && <Planning adding={addEvent} onCloseAdd={() => setAddEvent(false)} />}
        {tab === 'shop' && <Shopping />}
        {tab === 'more' && (plusScreen === 'birthdays' ? <Birthdays onBack={() => setPlusScreen(null)} />
          : plusScreen === 'bilan' ? <Bilan onBack={() => setPlusScreen(null)} />
          : plusScreen === 'infos' ? <Infos onBack={() => setPlusScreen(null)} />
          : <Plus onOpen={setPlusScreen} onTemplates={() => setTemplates(true)} />)}
      </main>

      {(tab === 'today' || tab === 'tasks' || tab === 'planning') && <button className="fab" aria-label="Ajouter" onClick={onFab}><Icon name={menu ? 'close' : 'plus'} size={26} sw={2.2} /></button>}
      {menu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setMenu(false)} />
          <div className="fab-menu">
            <button onClick={() => { setMenu(false); setAddEvent(true) }}>Événement</button>
            <button onClick={() => { setMenu(false); setAddTask(true) }}>Tâche</button>
          </div>
        </>
      )}
      {tab === 'today' && addTask && <TaskForm onClose={() => setAddTask(false)} />}
      {tab === 'today' && addEvent && <EventForm onClose={() => setAddEvent(false)} />}

      <nav className="tabbar"><div className="tabbar-inner">
        {TABS.map(([id, icon, label]) => (
          <button key={id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => { setTab(id); setMenu(false); if (id === 'more') setPlusScreen(null) }}>
            <Icon name={icon} />{label}
          </button>
        ))}
      </div></nav>

      {settings && <Settings onClose={() => setSettings(false)} />}
      {quick && <QuickAdd onClose={() => setQuick(false)} />}
      {templates && <TemplatesSheet onClose={() => setTemplates(false)} />}
    </div>
  )
}

function Settings({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const [tpl, setTpl] = useState(false)
  const canShare = typeof navigator.share === 'function'
  const custom = s.domains.filter((d) => !d.builtin)
  if (tpl) return <TemplatesSheet onClose={() => setTpl(false)} />
  return (
    <Sheet title="Réglages" onClose={onClose}>
      <div className="list" style={{ marginTop: 10 }}>
        {s.members.map((m) => (
          <div key={m.id} className="card item"><Avatar member={m} size="lg" /><span className="t"><strong>{m.name}</strong>{m.id === s.me!.id && <span className="muted"> (toi)</span>}</span></div>
        ))}
      </div>
      {s.householdCode && (
        <>
          <div className="lbl">Code d'invitation du foyer</div>
          <div className="code">{s.householdCode}</div>
          {canShare && <button className="btn" style={{ width: '100%' }} onClick={() => navigator.share({ title: 'Epitale', text: `Rejoins notre foyer sur Epitale avec le code ${s.householdCode}` })}>Partager le code</button>}
        </>
      )}

      <div className="lbl">Automatismes</div>
      <button className="btn" style={{ width: '100%' }} onClick={() => setTpl(true)}>Listes types · {s.templates.length}</button>

      {custom.length > 0 && (
        <>
          <div className="lbl">Mes domaines</div>
          <div className="chips">
            {custom.map((d) => (
              <span key={d.id} className="chip" style={{ ['--dc' as string]: d.color }}>
                <i />{d.label}
                <button className="x" style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', display: 'grid', color: 'var(--muted)' }} aria-label={`Supprimer ${d.label}`}
                  onClick={() => { if (confirm(`Supprimer le domaine « ${d.label} » ? Ses tâches passeront dans « Autre ».`)) s.removeDomain(d.id) }}>
                  <Icon name="close" size={14} sw={2.4} />
                </button>
              </span>
            ))}
          </div>
        </>
      )}

      <div className="banner small" style={{ marginTop: 18 }}>
        <strong>Installer l'app</strong><br />
        iPhone : Safari → Partager → « Sur l'écran d'accueil ».<br />
        Android : Chrome → menu ⋮ → « Installer l'application ».
      </div>
      <p className="hint">Synchro : {s.mode === 'local' ? 'mode démo (cet appareil seulement)' : s.syncError ? `problème (${s.syncError})` : 'OK'}</p>
      <div className="actions">
        {s.switchUser && <button className="btn" onClick={() => { s.switchUser!(); onClose() }}>Jouer l'autre personne</button>}
        <button className="btn danger" onClick={() => { s.auth?.signOut(); onClose() }}>{s.mode === 'local' ? 'Réinitialiser' : 'Déconnexion'}</button>
      </div>
    </Sheet>
  )
}
