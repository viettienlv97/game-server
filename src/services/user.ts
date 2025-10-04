import * as repo from '../repositories/userRepo'
import { signAccess, signRefresh } from '../libs/jwt'
import { verifyPassword, hashPassword } from '../libs/password'

interface UserCreateData {
  email: string
  passwordHash: string
  role: 'admin' | 'player'
  isBanned: boolean
  profile: any
}

interface ProfileUpdateData {
  username?: string
  avatarUrl?: string
  firstName?: string
  lastName?: string
  dateOfBirth?: string
}

export enum AuthError {
  InvalidCredentials = 'Invalid credentials',
  UserBanned = 'User is banned',
  UserNotFound = 'User not found',
  UserAlreadyExists = 'User already exists',
  UserCreationFailed = 'User creation failed',
  UserUpdateFailed = 'User update failed',
  InternalError = 'Internal server error'
}

export const authenticateUser = async (
  email: string, 
  password: string,
  sessionInfo?: {
    userAgent?: string
    ipAddress?: string
  }
) => {
  try {
    const user = await repo.getUserByEmail(email)
    if (!user) {
      return { success: false, error: AuthError.InvalidCredentials }
    }
    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      return { success: false, error: AuthError.InvalidCredentials }
    }
    if (user.isBanned) {
      return { success: false, error: AuthError.UserBanned }
    }

    // Generate new session identifiers
    const sessionId = Bun.randomUUIDv7()
    const refreshTokenId = Bun.randomUUIDv7()
    
    // Create tokens
    const accessToken = await signAccess(user._id.toString(), user.role, sessionId)
    const refreshToken = await signRefresh(user._id.toString(), refreshTokenId)

    // Update user with new active session (this terminates any existing session)
    await repo.updateUser(user._id.toString(), {
      activeSession: {
        sessionId,
        refreshTokenId,
        loginAt: new Date(),
        userAgent: sessionInfo?.userAgent || 'Unknown',
        ipAddress: sessionInfo?.ipAddress || 'Unknown'
      }
    })

    return {
      success: true,
      accessToken,
      refreshToken,
      sessionInfo: {
        sessionId,
        loginAt: new Date(),
        userAgent: sessionInfo?.userAgent || 'Unknown',
        ipAddress: sessionInfo?.ipAddress || 'Unknown'
      }
    }
  } catch (error) {
    console.error('Error during authentication:', error)
    return { success: false, error: AuthError.InternalError }
  }
}

export const registerUser = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: 'admin' | 'player'
) => {
  try {
    // Check if user already exists
    const existingUser = await repo.getUserByEmail(email)
    if (existingUser) {
      return { success: false, error: AuthError.UserAlreadyExists }
    }

    const passwordHash = await hashPassword(password)
    const userData = {
      email,
      passwordHash,
      role,
      isBanned: false,
      profile: {
        firstName,
        lastName
      }
    }
    const newUser = await repo.createUser(userData)
    if (!newUser) {
      return { success: false, error: AuthError.UserCreationFailed }
    }

    return {
      success: true,
      userId: newUser._id
    }
  } catch (error: any) {
    console.error('Error during user registration:', error)
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000 || error.message?.includes('duplicate key')) {
      return { success: false, error: AuthError.UserAlreadyExists }
    }
    
    return { success: false, error: AuthError.InternalError }
  }
}

export const updateUserProfile = async (
  userId: string,
  data: ProfileUpdateData
) => {
  const profile = {
    username: data.username,
    avatarUrl: data.avatarUrl,
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined
  }

  const updatedUser = await repo.updateUser(userId, { profile })
  return updatedUser
}

// Single session support functions
export const validateUserSession = async (userId: string, sessionId: string): Promise<boolean> => {
  try {
    const user = await repo.getUserById(userId)
    if (!user || !user.activeSession) {
      return false
    }

    // Check if the session ID matches the active session
    return user.activeSession.sessionId === sessionId
  } catch (error) {
    console.error('Error validating user session:', error)
    return false
  }
}

export const terminateUserSession = async (userId: string): Promise<boolean> => {
  try {
    await repo.updateUser(userId, {
      activeSession: {
        sessionId: null,
        refreshTokenId: null,
        loginAt: null,
        userAgent: null,
        ipAddress: null
      }
    })
    return true
  } catch (error) {
    console.error('Error terminating user session:', error)
    return false
  }
}

export const getUserActiveSession = async (userId: string) => {
  try {
    const user = await repo.getUserById(userId)
    return user?.activeSession || null
  } catch (error) {
    console.error('Error getting user active session:', error)
    return null
  }
}
