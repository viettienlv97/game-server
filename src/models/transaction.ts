import { Schema, model, type InferSchemaType, Document } from 'mongoose'

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
    type: { type: String, enum: ['DEPOSIT', 'WITHDRAWAL'], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    status: { 
      type: String, 
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED'], 
      default: 'PENDING' 
    },
    referenceNumber: { type: String, required: false },
    userNotes: { type: String, required: false },
    adminNotes: { type: String, required: false },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    processedAt: { type: Date, required: false }
  },
  { timestamps: true }
)

// Indexes for efficient queries
transactionSchema.index({ userId: 1, createdAt: -1 })
transactionSchema.index({ status: 1, createdAt: -1 })
transactionSchema.index({ type: 1, status: 1 })

export type Transaction = InferSchemaType<typeof transactionSchema> & Document
export const TransactionModel = model<Transaction>('Transaction', transactionSchema)
