import { WalletService } from '../services/wallet'
import { requireAuth } from '../middlewares/auth'

// GET /api/wallet - Get user wallet info
export const getUserWallet = async (req: Request) => {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) {
      return Response.json({ error: auth.message }, { status: auth.status })
    }

    const userId = auth.claims!.sub
    const walletData = await WalletService.getUserWallet(userId)
    return Response.json(walletData, { status: 200 })
  } catch (error) {
    console.error('Get wallet error:', error)
    return Response.json({ error: 'Failed to get wallet information' }, { status: 500 })
  }
}

// GET /api/wallet/transactions - Get user transactions
export const getUserTransactions = async (req: Request) => {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) {
      return Response.json({ error: auth.message }, { status: auth.status })
    }

    const userId = auth.claims!.sub
    const url = new URL(req.url)
    const page = url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : undefined
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined
    const type = url.searchParams.get('type') || undefined
    const status = url.searchParams.get('status') || undefined

    const options = { page, limit, type, status }
    const result = await WalletService.getUserTransactions(userId, options)
    return Response.json(result, { status: 200 })
  } catch (error) {
    console.error('Get transactions error:', error)
    return Response.json({ error: 'Failed to get transactions' }, { status: 500 })
  }
}

// POST /api/wallet/deposit - Create deposit request
export const createDepositRequest = async (req: Request) => {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) {
      return Response.json({ error: auth.message }, { status: auth.status })
    }

    const userId = auth.claims!.sub
    const body = await req.json() as {
      amount?: number
      referenceNumber?: string
      userNotes?: string
    }

    if (!body.amount || body.amount <= 0) {
      return Response.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    const transaction = await WalletService.createDepositRequest(userId, {
      amount: parseFloat(body.amount.toString()),
      referenceNumber: body.referenceNumber,
      userNotes: body.userNotes
    })

    return Response.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Create deposit error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create deposit request'
    return Response.json({ error: message }, { status: 400 })
  }
}

// POST /api/wallet/withdraw - Create withdrawal request
export const createWithdrawalRequest = async (req: Request) => {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) {
      return Response.json({ error: auth.message }, { status: auth.status })
    }

    const userId = auth.claims!.sub
    const body = await req.json() as {
      amount?: number
      referenceNumber?: string
      userNotes?: string
    }

    if (!body.amount || body.amount <= 0) {
      return Response.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    const transaction = await WalletService.createWithdrawalRequest(userId, {
      amount: parseFloat(body.amount.toString()),
      referenceNumber: body.referenceNumber,
      userNotes: body.userNotes
    })

    return Response.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Create withdrawal error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create withdrawal request'
    return Response.json({ error: message }, { status: 400 })
  }
}

// GET /api/wallet/requests - Get user's pending requests
export const getUserRequests = async (req: Request) => {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) {
      return Response.json({ error: auth.message }, { status: auth.status })
    }

    const userId = auth.claims!.sub
    const result = await WalletService.getUserTransactions(userId, { status: 'PENDING' })
    return Response.json(result, { status: 200 })
  } catch (error) {
    console.error('Get requests error:', error)
    return Response.json({ error: 'Failed to get pending requests' }, { status: 500 })
  }
}

// Admin wallet endpoints
// GET /api/admin/transactions - Get all transaction requests
export const getAllTransactions = async (req: Request) => {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) {
      return Response.json({ error: auth.message }, { status: auth.status })
    }

    // Check if user is admin - return 404 to hide endpoint existence
    if (auth.claims!.role !== 'admin') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    
    const url = new URL(req.url)
    const page = url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : undefined
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined
    const type = url.searchParams.get('type') || undefined
    const status = url.searchParams.get('status') || undefined
    const userId = url.searchParams.get('userId') || undefined

    const options = { page, limit, type, status, userId }
    const result = await WalletService.getAllTransactions(options)
    return Response.json(result, { status: 200 })
  } catch (error) {
    console.error('Get all transactions error:', error)
    return Response.json({ error: 'Failed to get transactions' }, { status: 500 })
  }
}

// POST /api/admin/wallet/transactions/:id/process - Approve/reject transaction
export const processTransaction = async (req: Request, params: Record<string, string>) => {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) {
      return Response.json({ error: auth.message }, { status: auth.status })
    }

    // Check if user is admin - return 404 to hide endpoint existence
    if (auth.claims!.role !== 'admin') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const adminId = auth.claims!.sub
    const id = params.id

    if (!id) {
      return Response.json({ error: 'Transaction ID is required' }, { status: 400 })
    }
    
    const body = await req.json() as {
      action?: string
      adminNotes?: string
    }

    if (!body.action || !['approve', 'reject'].includes(body.action)) {
      return Response.json({ error: 'Valid action (approve/reject) is required' }, { status: 400 })
    }

    const transaction = await WalletService.processTransaction(
      id,
      adminId,
      body.action as 'approve' | 'reject',
      body.adminNotes
    )

    return Response.json(transaction, { status: 200 })
  } catch (error) {
    console.error('Process transaction error:', error)
    const message = error instanceof Error ? error.message : 'Failed to process transaction'
    return Response.json({ error: message }, { status: 400 })
  }
}

// GET /api/admin/wallet/stats - Get wallet statistics
export const getWalletStats = async (req: Request) => {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) {
      return Response.json({ error: auth.message }, { status: auth.status })
    }

    // Check if user is admin - return 404 to hide endpoint existence
    if (auth.claims!.role !== 'admin') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    
    const stats = await WalletService.getWalletStats()
    return Response.json(stats, { status: 200 })
  } catch (error) {
    console.error('Get wallet stats error:', error)
    return Response.json({ error: 'Failed to get wallet statistics' }, { status: 500 })
  }
}
