import { Schema, model, type InferSchemaType, Document } from 'mongoose'

const pokerActionSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'PokerGame', required: true },
    playerId: { type: Schema.Types.ObjectId, ref: 'PokerPlayer', required: true },
    actionType: {
      type: String,
      enum: ['fold', 'check', 'call', 'raise', 'allin'],
      required: true
    },
    amount: { type: Number, default: 0, min: 0 },
    actionData: { type: Schema.Types.Mixed }, // Additional action data
    round: {
      type: String,
      enum: ['preflop', 'flop', 'turn', 'river'],
      required: true
    }
  },
  { timestamps: true }
)

// Indexes
pokerActionSchema.index({ gameId: 1, createdAt: -1 })
pokerActionSchema.index({ playerId: 1, createdAt: -1 })

export type PokerAction = InferSchemaType<typeof pokerActionSchema> & Document
export const PokerActionModel = model<PokerAction>('PokerAction', pokerActionSchema)
