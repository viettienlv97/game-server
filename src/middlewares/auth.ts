import { verifyAccess } from '../libs/jwt'

export const requireAuth = async (req: Request) => {
  const auth = req.headers.get('authorization') || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)

  if (!m) return { ok: false, status: 401, message: 'Missing token' }
  try {
    return { ok: true as const, claims: await verifyAccess(m[1]!) }
  } catch (err) {
    return { ok: false, status: 401, message: 'Invalid/expired token' }
  }
}
