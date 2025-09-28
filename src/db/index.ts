import mongoose from 'mongoose'

export const connectDB = async (mongoURI: string) => {
  await mongoose.connect(mongoURI).then(() => {
    console.log('MongoDB connected')
  })
}
