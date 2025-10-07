import { Schema, model, type InferSchemaType, Document } from 'mongoose'

const pokerGameSchema = new Schema(
  {
    tableId: { type: Schema.Types.ObjectId, ref: 'PokerTable', required: true },
    gameNumber: { type: Number, required: true },
    status: {
      type: String,
      enum: ['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown', 'completed'],
      default: 'waiting'
    },
    dealerPosition: { type: Number, min: 0 },
    currentPlayerPosition: { type: Number, min: 0 },
    potAmount: { type: Number, default: 0, min: 0 },
    communityCards: [{ suit: String, rank: String }],
    currentBet: { type: Number, default: 0, min: 0 },
    rakeAmount: { type: Number, default: 0, min: 0 },
    completedAt: { type: Date }
  },
  { timestamps: true }
)

// Indexes
pokerGameSchema.index({ tableId: 1, gameNumber: 1 }, { unique: true })
pokerGameSchema.index({ status: 1 })
pokerGameSchema.index({ createdAt: -1 })

export type PokerGame = InferSchemaType<typeof pokerGameSchema> & Document
export const PokerGameModel = model<PokerGame>('PokerGame', pokerGameSchema)
