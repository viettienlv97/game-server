import * as userService from '../services/user'

export const login = async (req: Request) => {
  const body = (await req.json()) as { email?: string; password?: string }
  if (!body?.email || !body.password)
    return Response.json(
      { error: 'Missing email or password' },
      { status: 400 }
    )

  const result = await userService.authenticateUser(body.email, body.password)

  if (!result.success) {
    switch (result.error) {
      case userService.AuthError.InvalidCredentials:
        return Response.json({ error: result.error }, { status: 401 })
      case userService.AuthError.UserBanned:
        return Response.json({ error: result.error }, { status: 403 })
      case userService.AuthError.UserNotFound:
        return Response.json({ error: result.error }, { status: 404 })
      default:
        return Response.json({ error: result.error }, { status: 500 })
    }
  }

  return Response.json(
    {
      message: 'Login successful',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    },
    { status: 200 }
  )
}

export const register = async (req: Request) => {
  const body = (await req.json()) as {
    email?: string
    password?: string
    firstName?: string
    lastName?: string
    role?: 'admin' | 'player'
  }

  if (
    !body?.email ||
    !body.password ||
    !body.firstName ||
    !body.lastName ||
    !body.role
  )
    return Response.json({ error: 'Missing required fields' }, { status: 400 })

  const result = await userService.registerUser(
    body.email,
    body.password,
    body.firstName,
    body.lastName,
    body.role
  )

  if (!result.success) {
    switch (result.error) {
      case userService.AuthError.UserCreationFailed:
        return Response.json({ error: result.error }, { status: 400 })
      case userService.AuthError.UserAlreadyExists:
        return Response.json({ error: result.error }, { status: 409 })
      default:
        return Response.json({ error: result.error }, { status: 500 })
    }
  }

  return Response.json(
    {
      message: 'Registration successful'
    },
    { status: 201 }
  )
}
