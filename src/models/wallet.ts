import { Schema, model, type InferSchemaType, Document } from 'mongoose'

const walletSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    availableBalance: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
)

// Ensure one wallet per user
walletSchema.index({ userId: 1 }, { unique: true })

export type Wallet = InferSchemaType<typeof walletSchema> & Document
export const WalletModel = model<Wallet>('Wallet', walletSchema)
