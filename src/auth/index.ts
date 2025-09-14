import { signAccess, signRefresh, verifyAccess, verifyRefresh } from './jwt'

export const requireAuth = async (req: Bun.BunRequest) => {
  const auth = req.headers.get('authorization') || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)

  if (!m) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    const claims = await verifyAccess(m[1] as string)
    return Response.json(
      {
        message: 'Authorized',
        claims,
        ok: true,
        sub: claims.sub,
        role: claims.role
      },
      { status: 200 }
    )
  } catch (err) {
    return Response.json(
      { message: 'Invalid/expired token', err },
      { status: 401 }
    )
  }
}

export const login = async (req: Bun.BunRequest) => {
  const { email, password } = (await req.json()) as {
    email: string
    password: string
  }

  if (!email || !password)
    return Response.json({ message: 'Bad creds' }, { status: 400 })

  const userId = 'user-id-123' // get from db
  const role = 'player'

  const access = await signAccess(userId, role)
  const jti = Bun.randomUUIDv7()
  const refresh = await signRefresh(userId, jti)
  const headers = new Headers({
    'content-type': 'application/json',
    'set-cookie': `refresh_token=${refresh}; HttpOnly; Secure; SameSite=Strict; Path=/auth; Max-Age=${
      14 * 24 * 3600
    }`
  })
  return new Response(JSON.stringify({ access }), { headers })
}

export const refresh = async (req: Request) => {
  const cookies = req.headers.get('cookie') || ''
  const match = cookies.match(/(?:^|;\s*)refresh_token=([^;]+)/)
  if (!match) return Response.json({ error: 'No refresh' }, { status: 401 })

  const token = decodeURIComponent(match[1] as string)
  try {
    const payload = await verifyRefresh(token)
    // TODO: kiểm tra jti có trong whitelist không; nếu không → 401

    // Rotate:
    // TODO: xóa jti cũ, tạo jti mới & lưu lại
    const newAccess = await signAccess(payload.sub)
    return Response.json({ access: newAccess })
  } catch {
    return Response.json({ error: 'Invalid refresh' }, { status: 401 })
  }
}
