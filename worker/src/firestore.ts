// Accès minimal à Firestore par l'API REST (lecture des foyers, écriture de l'état d'envoi).
type FsValue = Record<string, unknown>

export function decode(v: FsValue): unknown {
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue
  if ('nullValue' in v) return null
  if ('arrayValue' in v) return (((v.arrayValue as { values?: FsValue[] }).values) ?? []).map(decode)
  if ('mapValue' in v) return decodeFields(((v.mapValue as { fields?: Record<string, FsValue> }).fields) ?? {})
  return null
}
export const decodeFields = (f: Record<string, FsValue>) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, decode(v)]))

export function encode(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } }
  return { mapValue: { fields: Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, encode(x)])) } }
}

export class Firestore {
  constructor(private base: string, private token: string) {}
  private async req(path: string, init?: RequestInit) {
    const res = await fetch(`${this.base}/${path}`, { ...init, headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' } })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Firestore ${res.status} sur ${path} : ${await res.text()}`)
    return res.json() as Promise<{ documents?: { name: string; fields?: Record<string, FsValue> }[]; fields?: Record<string, FsValue>; nextPageToken?: string }>
  }
  async list(path: string) {
    const out: Record<string, unknown>[] = []
    let page = ''
    do {
      const r = await this.req(`${path}?pageSize=300${page}`)
      for (const d of r?.documents ?? []) out.push({ id: d.name.split('/').pop(), ...decodeFields(d.fields ?? {}) })
      page = r?.nextPageToken ? `&pageToken=${encodeURIComponent(r.nextPageToken)}` : ''
    } while (page)
    return out
  }
  async get(path: string) {
    const r = await this.req(path)
    return r?.fields ? decodeFields(r.fields) : null
  }
  async patch(path: string, data: Record<string, unknown>) {
    const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&')
    await this.req(`${path}?${mask}`, { method: 'PATCH', body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encode(v)])) }) })
  }
}
