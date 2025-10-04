import { SignJWT, jwtVerify } from 'jose'
import { getEnvVar } from '../utils'

type AccessTokenPayload = {
  role: string // 'player' | 'admin'
  sub: string // user id
  sessionId?: string // session id for single session support
}

type RefreshTokenPayload = {
  sub: string // user id
  jti: string // token id
}

const enc = new TextEncoder()
const ACCESS_SECRET = enc.encode(getEnvVar('ACCESS_SECRET'))
const REFRESH_SECRET = enc.encode(getEnvVar('REFRESH_SECRET'))
const TOKEN_TTL = getEnvVar('TOKEN_TTL')
const REFRESH_TTL = getEnvVar('REFRESH_TTL')

/**
 * Sign an access token for a user
 * @param sub - User ID
 * @param role - User role
 * @param sessionId - Optional session ID for single session support
 * @returns Signed JWT access token
 */
export const signAccess = async (sub: string, role: string, sessionId?: string) => {
  const payload: AccessTokenPayload = { role, sub }
  if (sessionId) {
    payload.sessionId = sessionId
  }
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(ACCESS_SECRET)
}

/**
 * Sign a refresh token for a user
 * @param sub - User ID
 * @param jti - Unique token ID
 * @returns Signed JWT refresh token
 */
export const signRefresh = async (sub: string, jti: string) => {
  return await new SignJWT({ sub, jti })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TTL)
    .sign(REFRESH_SECRET)
}

/**
 * Verify an access token
 * @param token - Access token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid
 */
export const verifyAccess = async (
  token: string
): Promise<AccessTokenPayload> => {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET)
    return payload as unknown as AccessTokenPayload
  } catch (error) {
    throw new Error(`Invalid access token: ${error}`)
  }
}

/** Verify a refresh token
 * @param token - Refresh token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid
 */
export const verifyRefresh = async (
  token: string
): Promise<RefreshTokenPayload> => {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET)
    return payload as unknown as RefreshTokenPayload
  } catch (error) {
    throw new Error(`Invalid refresh token: ${error}`)
  }
}
