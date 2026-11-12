import { getAccessToken, type ServiceAccount } from './google'
import { Firestore } from './firestore'
import { runPush, type Sender } from './run'

export interface Env {
  FIREBASE_PROJECT_ID: string
  GOOGLE_SERVICE_ACCOUNT: string
  TIMEZONE?: string
  /** Facultatif : clé pour lancer un passage à la main (…workers.dev/?key=…) */
  RUN_KEY?: string
}

async function job(env: Env) {
  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT) as ServiceAccount
  const project = env.FIREBASE_PROJECT_ID || sa.project_id
  if (!project) throw new Error('FIREBASE_PROJECT_ID manquant')
  const token = await getAccessToken(sa, ['https://www.googleapis.com/auth/datastore', 'https://www.googleapis.com/auth/firebase.messaging'])
  const db = new Firestore(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`, token)

  const send: Sender = async (deviceToken, msg) => {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token: deviceToken, data: { title: msg.title, body: msg.body, tag: msg.tag, url: '/' }, webpush: { headers: { Urgency: 'high', TTL: '86400' } } } }),
    })
    if (res.ok) return 'ok'
    const text = await res.text()
    console.log('FCM', res.status, text.slice(0, 300))
    return res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(text) ? 'invalid' : 'error'
  }
  const stats = await runPush(db, send, env.TIMEZONE || 'Europe/Paris')
  console.log('push', JSON.stringify(stats))
  return stats
}

export default {
  async scheduled(_event: unknown, env: Env) { await job(env) },
  // Test manuel protégé par RUN_KEY : ouvre l'adresse du Worker avec ?key=… pour lancer un passage tout de suite.
  async fetch(req: Request, env: Env) {
    if (!env.RUN_KEY || new URL(req.url).searchParams.get('key') !== env.RUN_KEY) return new Response('Epitale push : rien à voir ici.', { status: 404 })
    try { return Response.json(await job(env)) } catch (e) { return new Response(String(e), { status: 500 }) }
  },
}
