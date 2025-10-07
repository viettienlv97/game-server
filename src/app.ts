import type { ServerWebSocket } from 'bun'
import { router } from './routes'
import { connectMongo } from './libs/db'
import { cors } from './middlewares/cors'
import { WebSocketManager } from './websocket'

const port = Number(Bun.env.PORT ?? 9000)

// Initialize WebSocket manager
const wsManager = new WebSocketManager()

// Create HTTP server with WebSocket support
const httpServer = Bun.serve({
  port,
  hostname: '0.0.0.0', // Bind to all network interfaces
  async fetch(req, server) {
    // Handle WebSocket upgrade
    if (req.headers.get('upgrade') === 'websocket') {
      const success = server.upgrade(req)
      if (success) return
      return new Response('WebSocket upgrade failed', { status: 400 })
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      const corsResponse = cors(req)
      return corsResponse instanceof Response
        ? corsResponse
        : new Response(null, { status: 204, headers: corsResponse })
    }

    const url = new URL(req.url)
    const method = req.method.toUpperCase()
    const matched = router.match(method, url.pathname)

    // Get CORS headers
    const corsHeaders = cors(req)
    const headers = corsHeaders instanceof Response ? {} : corsHeaders

    if (matched) {
      const response = await matched.handler(
        req,
        matched.params,
        url.searchParams
      )
      // Apply CORS headers to response
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, String(value))
      })
      return response
    }

    return Response.json(
      { message: 'Not Found' },
      {
        status: 404,
        headers
      }
    )
  },
  websocket: {
    message(ws: ServerWebSocket, message) {
      wsManager.handleMessage(ws, message)
    },
    open(ws: ServerWebSocket) {
      wsManager.handleConnection(ws)
    },
    close(ws: ServerWebSocket) {
      wsManager.handleDisconnect(ws)
    },
    ping(ws: ServerWebSocket) {
      // Handle ping - mark client as alive
      const client = wsManager['clients'].get(ws)
      if (client) client.isAlive = true
    },
    pong(ws: ServerWebSocket) {
      // Handle pong - mark client as alive
      const client = wsManager['clients'].get(ws)
      if (client) client.isAlive = true
    }
  }
})

console.log(`Server is running on http://0.0.0.0:${port}`)

// Connect to database asynchronously
connectMongo().then(() => {
  console.log('Database connected successfully')
}).catch((error) => {
  console.error('Database connection failed:', error)
})

// to do
