import type { ServerWebSocket } from 'bun'
import { requireAuth } from '../middlewares/auth'
import { PokerWebSocketHandler } from './pokerHandler'

export interface WSClient {
  ws: ServerWebSocket
  userId: string
  gameId?: string
  tableId?: string
  isAlive: boolean
}

export class WebSocketManager {
  private clients: Map<ServerWebSocket, WSClient> = new Map()
  private pokerHandler: PokerWebSocketHandler

  constructor() {
    this.pokerHandler = new PokerWebSocketHandler(this)

    // Heartbeat to detect broken connections
    setInterval(() => {
      this.clients.forEach((client, ws) => {
        if (!client.isAlive) {
          ws.close()
          this.clients.delete(ws)
          return
        }
        client.isAlive = false
        ws.ping()
      })
    }, 30000)
  }

  async handleConnection(ws: ServerWebSocket) {
    try {
      // Extract token from query parameters
      const url = new URL((ws as any).data?.url || '', 'http://localhost')
      const token = url.searchParams.get('token')

      if (!token) {
        ws.close(4001, 'Authentication required')
        return
      }

      // Create a mock request object for authentication
      const mockReq = {
        headers: {
          authorization: `Bearer ${token}`
        }
      } as any

      const authResult = await requireAuth(mockReq)
      if (!authResult.ok) {
        ws.close(4001, 'Authentication failed')
        return
      }

      const userId = authResult.claims!.sub
      const client: WSClient = {
        ws,
        userId,
        isAlive: true
      }

      this.clients.set(ws, client)

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connected',
        userId
      })
    } catch (error) {
      console.error('WebSocket connection error:', error)
      ws.close(4000, 'Internal server error')
    }
  }

  handleMessage(ws: ServerWebSocket, message: string | Buffer) {
    try {
      const data = typeof message === 'string' ? message : message.toString()
      const parsedMessage = JSON.parse(data)
      const client = this.clients.get(ws)
      if (!client) return

      // Route message to appropriate handler
      if (parsedMessage.type?.startsWith('poker/')) {
        this.pokerHandler.handleMessage(client, parsedMessage)
      } else {
        this.sendToClient(ws, {
          type: 'error',
          message: 'Unknown message type'
        })
      }
    } catch (error) {
      console.error('WebSocket message error:', error)
      this.sendToClient(ws, {
        type: 'error',
        message: 'Invalid message format'
      })
    }
  }

  handleDisconnect(ws: ServerWebSocket) {
    const client = this.clients.get(ws)
    if (client) {
      this.clients.delete(ws)
      // Handle cleanup (leave game, etc.)
      this.pokerHandler.handleDisconnect(client)
    }
  }

  // Send message to a specific client
  sendToClient(ws: ServerWebSocket, message: any) {
    try {
      ws.send(JSON.stringify(message))
    } catch (error) {
      console.error('Failed to send message to client:', error)
    }
  }

  // Send message to all clients in a game
  sendToGame(gameId: string, message: any, excludeUserId?: string) {
    this.clients.forEach((client) => {
      if (client.gameId === gameId && client.userId !== excludeUserId) {
        this.sendToClient(client.ws, message)
      }
    })
  }

  // Send message to all clients at a table
  sendToTable(tableId: string, message: any, excludeUserId?: string) {
    this.clients.forEach((client) => {
      if (client.tableId === tableId && client.userId !== excludeUserId) {
        this.sendToClient(client.ws, message)
      }
    })
  }

  // Update client game/table context
  updateClientContext(ws: ServerWebSocket, gameId?: string, tableId?: string) {
    const client = this.clients.get(ws)
    if (client) {
      client.gameId = gameId
      client.tableId = tableId
    }
  }

  // Get client by user ID
  getClientByUserId(userId: string): WSClient | undefined {
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        return client
      }
    }
    return undefined
  }
}
