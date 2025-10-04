import mongoose from 'mongoose'
import { Router } from './router'
import * as userCtrl from '../controllers/user'
import * as walletCtrl from '../controllers/wallet'
import { mongoHealth } from '../libs/db'
import { cors } from '../middlewares/cors'

export const router = new Router()

// Root health check for deployment platforms
router.on('GET', '/', () => new Response('OK', { status: 200 }))

router.on('GET', '/api', () => Response.json({ message: 'API root' }))

// Health check
router.on('GET', '/api/health', async () => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return Response.json(
        { status: 'connecting', message: 'Database connection in progress' },
        { status: 503 }
      )
    }

    const mongo = await mongoHealth()
    const status = mongo.ok ? 200 : 500
    return Response.json({ status: 'ok', mongo }, { status })
  } catch (error) {
    return Response.json(
      { status: 'error', error: (error as Error).message },
      { status: 500 }
    )
  }
})

// Auth
router.on('POST', '/api/login', userCtrl.login)
router.on('POST', '/api/register', userCtrl.register)
router.on('GET', '/api/me', userCtrl.getMe)
// router.on('POST', '/api/signin', userCtrl.signIn)
// router.on('POST', '/api/refresh', userCtrl.refreshToken)
router.on('POST', '/api/logout', userCtrl.logout)

// Wallet - Client endpoints
router.on('GET', '/api/wallet', walletCtrl.getUserWallet)
router.on('GET', '/api/wallet/transactions', walletCtrl.getUserTransactions)
router.on('POST', '/api/wallet/deposit', walletCtrl.createDepositRequest)
router.on('POST', '/api/wallet/withdraw', walletCtrl.createWithdrawalRequest)
router.on('GET', '/api/wallet/requests', walletCtrl.getUserRequests)

// Wallet - Admin endpoints
router.on('GET', '/api/admin/wallet/transactions', walletCtrl.getAllTransactions)
router.on('POST', '/api/admin/wallet/transactions/:id/process', walletCtrl.processTransaction)
router.on('GET', '/api/admin/wallet/stats', walletCtrl.getWalletStats)
