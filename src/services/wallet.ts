import { WalletModel, type Wallet } from '../models/wallet'
import { TransactionModel, type Transaction } from '../models/transaction'
import { UserModel } from '../models/user'
import mongoose from 'mongoose'

export class WalletService {
  // Get or create wallet for user
  static async getOrCreateWallet(userId: string): Promise<Wallet> {
    let wallet = await WalletModel.findOne({ userId })
    
    if (!wallet) {
      wallet = await WalletModel.create({
        userId,
        balance: 0,
        availableBalance: 0
      })
    }
    
    return wallet
  }

  // Get user wallet with transaction summary
  static async getUserWallet(userId: string) {
    const wallet = await this.getOrCreateWallet(userId)
    
    // Get transaction summary
    const [totalDeposited, totalWithdrawn, pendingTransactions] = await Promise.all([
      TransactionModel.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'DEPOSIT', status: 'APPROVED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(result => result[0]?.total || 0),
      
      TransactionModel.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'WITHDRAWAL', status: 'APPROVED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(result => result[0]?.total || 0),
      
      TransactionModel.countDocuments({ userId, status: 'PENDING' })
    ])

    return {
      wallet,
      summary: {
        totalDeposited,
        totalWithdrawn,
        pendingTransactions
      }
    }
  }

  // Create deposit request
  static async createDepositRequest(userId: string, data: {
    amount: number
    referenceNumber?: string
    userNotes?: string
  }): Promise<Transaction> {
    const wallet = await this.getOrCreateWallet(userId)
    
    // Validate amount
    if (data.amount < 50 || data.amount > 10000) {
      throw new Error('Deposit amount must be between 50 and 10,000 coins')
    }

    // Check daily limit
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dailyTotal = await TransactionModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'DEPOSIT',
          createdAt: { $gte: today }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0)

    if (dailyTotal + data.amount > 50000) {
      throw new Error('Daily deposit limit of 50,000 coins exceeded')
    }

    const transaction = await TransactionModel.create({
      userId,
      walletId: wallet._id,
      type: 'DEPOSIT',
      amount: data.amount,
      referenceNumber: data.referenceNumber,
      userNotes: data.userNotes,
      status: 'PENDING'
    })

    return transaction
  }

  // Create withdrawal request
  static async createWithdrawalRequest(userId: string, data: {
    amount: number
    referenceNumber?: string
    userNotes?: string
  }): Promise<Transaction> {
    const wallet = await this.getOrCreateWallet(userId)
    
    // Validate amount
    if (data.amount < 100 || data.amount > 5000) {
      throw new Error('Withdrawal amount must be between 100 and 5,000 coins')
    }

    // Check available balance
    if (data.amount > wallet.availableBalance) {
      throw new Error('Insufficient available balance')
    }

    // Check daily limit
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dailyTotal = await TransactionModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'WITHDRAWAL',
          createdAt: { $gte: today }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0)

    if (dailyTotal + data.amount > 10000) {
      throw new Error('Daily withdrawal limit of 10,000 coins exceeded')
    }

    // Update available balance (reserve the amount)
    await WalletModel.updateOne(
      { _id: wallet._id },
      { $inc: { availableBalance: -data.amount } }
    )

    const transaction = await TransactionModel.create({
      userId,
      walletId: wallet._id,
      type: 'WITHDRAWAL',
      amount: data.amount,
      referenceNumber: data.referenceNumber,
      userNotes: data.userNotes,
      status: 'PENDING'
    })

    return transaction
  }

  // Get user transactions
  static async getUserTransactions(userId: string, options: {
    page?: number
    limit?: number
    type?: string
    status?: string
  } = {}) {
    const { page = 1, limit = 20, type, status } = options
    const skip = (page - 1) * limit

    const filter: any = { userId: new mongoose.Types.ObjectId(userId) }
    if (type) filter.type = type
    if (status) filter.status = status

    const [transactions, total] = await Promise.all([
      TransactionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('processedBy', 'email profile.firstName profile.lastName'),
      TransactionModel.countDocuments(filter)
    ])

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  // Admin: Get all transactions
  static async getAllTransactions(options: {
    page?: number
    limit?: number
    type?: string
    status?: string
    userId?: string
  } = {}) {
    const { page = 1, limit = 20, type, status, userId } = options
    const skip = (page - 1) * limit

    const filter: any = {}
    if (type) filter.type = type
    if (status) filter.status = status
    if (userId) filter.userId = new mongoose.Types.ObjectId(userId)

    const [transactions, total] = await Promise.all([
      TransactionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email profile.firstName profile.lastName')
        .populate('processedBy', 'email profile.firstName profile.lastName'),
      TransactionModel.countDocuments(filter)
    ])

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  // Admin: Process transaction (approve/reject)
  static async processTransaction(
    transactionId: string, 
    adminId: string, 
    action: 'approve' | 'reject', 
    adminNotes?: string
  ): Promise<Transaction> {
    const session = await mongoose.startSession()
    
    try {
      await session.withTransaction(async () => {
        const transaction = await TransactionModel.findById(transactionId).session(session)
        if (!transaction) {
          throw new Error('Transaction not found')
        }

        if (transaction.status !== 'PENDING') {
          throw new Error('Transaction is not in pending status')
        }

        const wallet = await WalletModel.findById(transaction.walletId).session(session)
        if (!wallet) {
          throw new Error('Wallet not found')
        }

        if (action === 'approve') {
          if (transaction.type === 'DEPOSIT') {
            // Add to balance and available balance
            await WalletModel.updateOne(
              { _id: wallet._id },
              { 
                $inc: { 
                  balance: transaction.amount,
                  availableBalance: transaction.amount 
                } 
              },
              { session }
            )
          } else if (transaction.type === 'WITHDRAWAL') {
            // Deduct from balance (available balance already deducted when request was created)
            await WalletModel.updateOne(
              { _id: wallet._id },
              { $inc: { balance: -transaction.amount } },
              { session }
            )
          }

          transaction.status = 'APPROVED'
        } else {
          // Reject transaction
          if (transaction.type === 'WITHDRAWAL') {
            // Return the reserved amount to available balance
            await WalletModel.updateOne(
              { _id: wallet._id },
              { $inc: { availableBalance: transaction.amount } },
              { session }
            )
          }

          transaction.status = 'REJECTED'
        }

        transaction.processedBy = new mongoose.Types.ObjectId(adminId)
        transaction.processedAt = new Date()
        transaction.adminNotes = adminNotes

        await transaction.save({ session })
      })

      return await TransactionModel.findById(transactionId)
        .populate('userId', 'email profile.firstName profile.lastName')
        .populate('processedBy', 'email profile.firstName profile.lastName') as Transaction
    } finally {
      await session.endSession()
    }
  }

  // Admin: Get wallet statistics
  static async getWalletStats() {
    const [totalUsers, totalBalance, transactionStats] = await Promise.all([
      WalletModel.countDocuments(),
      WalletModel.aggregate([
        { $group: { _id: null, total: { $sum: '$balance' } } }
      ]).then(result => result[0]?.total || 0),
      TransactionModel.aggregate([
        {
          $group: {
            _id: { type: '$type', status: '$status' },
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        }
      ])
    ])

    return {
      totalUsers,
      totalBalance,
      transactionStats
    }
  }
}
