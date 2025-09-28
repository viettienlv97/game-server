export const getEnvVar = (name: string): string => {
  const value = Bun.env[name]
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`)
  }
  return value
}
