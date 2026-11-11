import { useState } from 'react'
import { useStore } from '../store/context'

const frError = (e: unknown) => {
  const code = (e as { code?: string; message?: string })?.code ?? ''
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Email ou mot de passe incorrect.'
  if (code.includes('email-already-in-use')) return 'Cet email a déjà un compte : connecte-toi.'
  if (code.includes('weak-password')) return 'Mot de passe trop court (6 caractères minimum).'
  if (code.includes('invalid-email')) return 'Email invalide.'
  if (code.includes('network')) return 'Pas de connexion internet.'
  if (code.includes('permission-denied')) return "Code refusé (déjà utilisé par 2 personnes ou invalide)."
  return (e as Error)?.message || 'Une erreur est survenue.'
}

export function SignIn() {
  const { auth } = useStore()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setErr(''); setBusy(true)
    try {
      if (mode === 'up') await auth!.signUp(email.trim(), pass, name.trim())
      else await auth!.signIn(email.trim(), pass)
    } catch (e) { setErr(frError(e)) } finally { setBusy(false) }
  }
  const ok = email.includes('@') && pass.length >= 6 && (mode === 'in' || name.trim())

  return (
    <div className="auth"><form className="auth-card" onSubmit={(e) => { e.preventDefault(); if (ok) submit() }}>
      <div className="logo">✓✓</div>
      <h1>Epitale</h1>
      <p className="muted">{mode === 'in' ? 'Content de te revoir.' : 'Crée ton compte pour partager vos tâches.'}</p>
      {mode === 'up' && <label>Ton prénom<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" /></label>}
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
      <label>Mot de passe<input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></label>
      {err && <div className="error">{err}</div>}
      <button className="btn primary" disabled={!ok || busy}>{mode === 'in' ? 'Se connecter' : 'Créer mon compte'}</button>
      <div style={{ textAlign: 'center' }}>
        <button type="button" className="link" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr('') }}>
          {mode === 'in' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </form></div>
  )
}

export function Household() {
  const { auth } = useStore()
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setErr(''); setBusy(true)
    try { await fn() } catch (e) { setErr(frError(e)) } finally { setBusy(false) }
  }

  return (
    <div className="auth"><div className="auth-card">
      <div className="logo">🏠</div>
      <h1>Votre foyer</h1>
      <p className="muted">Un seul d'entre vous crée le foyer et reçoit un code. L'autre le saisit pour le rejoindre.</p>
      {!joining ? (
        <>
          <button className="btn primary" disabled={busy} onClick={() => run(() => auth!.createHousehold())}>Créer notre foyer</button>
          <button className="btn" disabled={busy} onClick={() => setJoining(true)}>J'ai un code</button>
        </>
      ) : (
        <>
          <label>Code d'invitation<input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD2345" autoCapitalize="characters" /></label>
          <button className="btn primary" disabled={busy || code.trim().length < 6} onClick={() => run(() => auth!.joinHousehold(code))}>Rejoindre</button>
          <button className="link" onClick={() => setJoining(false)}>Retour</button>
        </>
      )}
      {err && <div className="error">{err}</div>}
      <div style={{ textAlign: 'center' }}><button className="link" onClick={() => auth!.signOut()}>Se déconnecter</button></div>
    </div></div>
  )
}
