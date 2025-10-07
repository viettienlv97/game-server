import { Schema, model, type InferSchemaType, Document } from 'mongoose'

const pokerHandHistorySchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'PokerGame', required: true },
    playerId: { type: Schema.Types.ObjectId, ref: 'PokerPlayer', required: true },
    handRank: { type: String, required: true }, // e.g., "Royal Flush", "Full House", etc.
    finalAmount: { type: Number, required: true }, // Final chip amount after hand
    profitLoss: { type: Number, required: true }, // Profit/loss for this hand
    holeCards: [{ suit: String, rank: String }],
    bestHand: [{ suit: String, rank: String }], // Best 5-card hand
    position: { type: Number, min: 0 },
    wonPot: { type: Boolean, default: false }
  },
  { timestamps: true }
)

// Indexes
pokerHandHistorySchema.index({ gameId: 1, createdAt: -1 })
pokerHandHistorySchema.index({ playerId: 1, createdAt: -1 })
pokerHandHistorySchema.index({ playerId: 1, profitLoss: -1 })

export type PokerHandHistory = InferSchemaType<typeof pokerHandHistorySchema> & Document
export const PokerHandHistoryModel = model<PokerHandHistory>('PokerHandHistory', pokerHandHistorySchema)
