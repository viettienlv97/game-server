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

export const authenticateUser = async (email: string, password: string) => {
  const user = await repo.getUserByEmail(email)
  if (!user) {
    return { success: false, error: 'Invalid credentials' }
  }
  const passwordValid = await verifyPassword(password, user.passwordHash)
  if (!passwordValid) {
    return { success: false, error: 'Invalid credentials' }
  }
  if (user.isBanned) {
    return { success: false, error: 'User is banned' }
  }

  const tokenId = Bun.randomUUIDv7()
  const accessToken = await signAccess(user._id.toString(), user.role)
  const refreshToken = await signRefresh(user._id.toString(), tokenId)

  return {
    success: true,
    accessToken,
    refreshToken
  }
}

export const registerUser = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: 'admin' | 'player'
) => {
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
    return { success: false, error: 'User creation failed' }
  }

  return {
    success: true,
    userId: newUser._id
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
