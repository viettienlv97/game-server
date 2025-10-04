import { Schema, model, type InferSchemaType } from 'mongoose'

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['player', 'admin'], default: 'player' },
    isBanned: { type: Boolean, default: false },
    profile: {
      username: { type: String, required: false },
      avatarUrl: { type: String, required: false },
      firstName: { type: String, required: false },
      lastName: { type: String, required: false },
      dateOfBirth: { type: Date, required: false }
    },
    // Single session support
    activeSession: {
      sessionId: { type: String, required: false },
      refreshTokenId: { type: String, required: false },
      loginAt: { type: Date, required: false },
      userAgent: { type: String, required: false },
      ipAddress: { type: String, required: false }
    }
  },
  { timestamps: true }
)

// userSchema.index({ email: 1 }, { unique: true })

export type User = InferSchemaType<typeof userSchema>
export const UserModel = model<User>('User', userSchema)
