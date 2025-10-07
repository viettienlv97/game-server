import { Schema, model, type InferSchemaType, Document } from 'mongoose'

const pokerPlayerSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'PokerGame', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    position: { type: Number, required: true, min: 0 },
    holeCards: [{ suit: String, rank: String }],
    stackAmount: { type: Number, required: true, min: 0 },
    currentBet: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    isDealer: { type: Boolean, default: false },
    isSmallBlind: { type: Boolean, default: false },
    isBigBlind: { type: Boolean, default: false },
    isFolded: { type: Boolean, default: false },
    isAllIn: { type: Boolean, default: false },
    leftAt: { type: Date }
  },
  { timestamps: true }
)

// Indexes
pokerPlayerSchema.index({ gameId: 1, userId: 1 }, { unique: true })
pokerPlayerSchema.index({ gameId: 1, position: 1 })
pokerPlayerSchema.index({ userId: 1, isActive: 1 })

export type PokerPlayer = InferSchemaType<typeof pokerPlayerSchema> & Document
export const PokerPlayerModel = model<PokerPlayer>('PokerPlayer', pokerPlayerSchema)
