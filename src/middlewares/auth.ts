import { verifyAccess } from '../libs/jwt'
import { validateUserSession } from '../services/user'

export const requireAuth = async (req: Request) => {
  const auth = req.headers.get('authorization') || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)

  if (!m) return { ok: false, status: 401, message: 'Missing token' }
  
  try {
    const claims = await verifyAccess(m[1]!)
    
    // If token has sessionId, validate it against user's active session
    if (claims.sessionId) {
      const isValidSession = await validateUserSession(claims.sub, claims.sessionId)
      if (!isValidSession) {
        return { ok: false, status: 401, message: 'Session terminated' }
      }
    }
    
    return { ok: true as const, claims }
  } catch (err) {
    return { ok: false, status: 401, message: 'Invalid/expired token' }
  }
}

// New auth middleware that enforces single session (use for sensitive operations)
export const requireAuthWithSession = async (req: Request) => {
  const auth = req.headers.get('authorization') || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)

  if (!m) return { ok: false, status: 401, message: 'Missing token' }
  
  try {
    const claims = await verifyAccess(m[1]!)
    
    // Always require session validation for this middleware
    if (!claims.sessionId) {
      return { ok: false, status: 401, message: 'Session required' }
    }
    
    const isValidSession = await validateUserSession(claims.sub, claims.sessionId)
    if (!isValidSession) {
      return { ok: false, status: 401, message: 'Session terminated' }
    }
    
    return { ok: true as const, claims }
  } catch (err) {
    return { ok: false, status: 401, message: 'Invalid/expired token' }
  }
}
