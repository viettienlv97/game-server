import { UserModel, type User } from '../models/user'

export const createUser = async (userData: Partial<User>) => {
  const user = new UserModel(userData)
  return await user.save()
}

export const updateUser = async (userId: string, updateData: Partial<User>) => {
  return await UserModel.findByIdAndUpdate(userId, updateData)
}

export const getUserById = async (userId: string) => {
  return await UserModel.findById(userId).select('-passwordHash')
}

export const getUserByEmail = async (email: string) => {
  return await UserModel.findOne({ email })
}

export const banUser = async (userId: string) => {
  await UserModel.findByIdAndUpdate(userId, { isBanned: true })
}

export const unbanUser = async (userId: string) => {
  await UserModel.findByIdAndUpdate(userId, { isBanned: false })
}
