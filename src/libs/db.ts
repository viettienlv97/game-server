import mongoose from 'mongoose'

const uri = Bun.env.MONGODB_URI
const minPool = Number(Bun.env.MONGO_MIN_POOL ?? 5)
const maxPool = Number(Bun.env.MONGO_MAX_POOL ?? 20)

export const connectMongo = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, {
    minPoolSize: minPool,
    maxPoolSize: maxPool,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000
  })
  return mongoose.connection
}

export const disconnectMongo = async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
}

export const mongoHealth = async () => {
  try {
    await mongoose.connection.db?.admin().ping()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// export const connectDB = async (mongoURI: string) => {
//   await mongoose.connect(mongoURI).then(() => {
//     console.log('MongoDB connected')
//   })
// }
