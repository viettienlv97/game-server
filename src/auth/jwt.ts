import { SignJWT, jwtVerify } from 'jose'

const encoder = new TextEncoder()
const access_secret = encoder.encode(Bun.env.ACCESS_SECRET)
const refresh_secret = encoder.encode(Bun.env.REFRESH_SECRET)

const iss = 'my-app'
const aud = 'my-api'

export const signAccess = async (sub: string, role?: string) => {
  return await new SignJWT({ role, sub })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(iss)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(access_secret)
}

export const signRefresh = async (sub: string, jti: string) => {
  return await new SignJWT({ sub, jti })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(iss)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(refresh_secret)
}

export const verifyAccess = async (token: string) => {
  const { payload } = await jwtVerify(token, access_secret, {
    issuer: iss,
    audience: aud
  })
  return payload
}

export const verifyRefresh = async (token: string) => {
  const { payload } = await jwtVerify(token, refresh_secret, {
    issuer: iss,
    audience: aud
  })
  return payload as { sub: string; jti: string; iat: number; exp: number }
}
