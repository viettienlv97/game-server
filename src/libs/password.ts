import { hash, compare } from 'bcrypt'

// Number of loops to use when hashing a password
// higher is more secure but slower
const SALT_ROUNDS = 10

/**
 * Hash a plain text password
 * @param password - The plain text password to hash
 * @returns The hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await hash(password, SALT_ROUNDS)
}

/**
 * Compare a plain text password with a hashed password
 * @param password - The plain text password to compare
 * @param hashedPassword - The hashed password to compare against
 * @returns True if the passwords match, false otherwise
 */
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await compare(password, hashedPassword)
}
