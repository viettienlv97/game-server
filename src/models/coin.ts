import { Schema, model, type InferSchemaType } from 'mongoose'

const coinSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    amount: { type: Number, required: true, default: 0 }
  },
  { timestamps: true }
)

coinSchema.index({ userId: 1 }, { unique: true })

export type Coin = InferSchemaType<typeof coinSchema>
export const CoinModel = model<Coin>('Coin', coinSchema)
