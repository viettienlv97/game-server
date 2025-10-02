import { Router } from './router'
import * as userCtrl from '../controllers/user'
import { mongoHealth } from '../libs/db'
import { cors } from '../middlewares/cors'

export const router = new Router()

router.on('GET', '/api', () => Response.json({ message: 'API root' }))

// Health check
router.on('GET', '/api/health', async () => {
  try {
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
// router.on('POST', '/api/signin', userCtrl.signIn)
// router.on('POST', '/api/refresh', userCtrl.refreshToken)
// router.on('POST', '/api/logout', userCtrl.signOut)
