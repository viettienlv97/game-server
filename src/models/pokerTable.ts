import { Schema, model, type InferSchemaType, Document } from 'mongoose'

const pokerTableSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    smallBlind: { type: Number, required: true, min: 0.01 },
    bigBlind: { type: Number, required: true, min: 0.01 },
    minBuyin: { type: Number, required: true, min: 0 },
    maxBuyin: { type: Number, required: true, min: 0 },
    maxPlayers: { type: Number, default: 9, min: 2, max: 9 },
    status: {
      type: String,
      enum: ['waiting', 'playing', 'paused', 'closed'],
      default: 'waiting'
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    currentPlayers: { type: Number, default: 0, min: 0 },
    gameNumber: { type: Number, default: 0 }
  },
  { timestamps: true }
)

// Indexes
pokerTableSchema.index({ status: 1 })
pokerTableSchema.index({ createdBy: 1 })

export type PokerTable = InferSchemaType<typeof pokerTableSchema> & Document
export const PokerTableModel = model<PokerTable>('PokerTable', pokerTableSchema)
