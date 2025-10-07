import type { WSClient } from './index'
import { WebSocketManager } from './index'
import { PokerService } from '../services/poker'

export interface PokerWSMessage {
  type: string
  gameId?: string
  tableId?: string
  actionType?: 'fold' | 'check' | 'call' | 'raise' | 'allin'
  amount?: number
  data?: any
}

export class PokerWebSocketHandler {
  constructor(private wsManager: WebSocketManager) {}

  async handleMessage(client: WSClient, message: PokerWSMessage) {
    try {
      switch (message.type) {
        case 'poker/join-table':
          await this.handleJoinTable(client, message)
          break
        case 'poker/leave-table':
          await this.handleLeaveTable(client, message)
          break
        case 'poker/action':
          await this.handleAction(client, message)
          break
        case 'poker/get-state':
          await this.handleGetState(client, message)
          break
        default:
          this.wsManager.sendToClient(client.ws, {
            type: 'error',
            message: 'Unknown poker message type'
          })
      }
    } catch (error: any) {
      console.error('Poker WebSocket handler error:', error)
      this.wsManager.sendToClient(client.ws, {
        type: 'error',
        message: error.message || 'Internal server error'
      })
    }
  }

  async handleJoinTable(client: WSClient, message: PokerWSMessage) {
    if (!message.tableId || !message.data?.buyinAmount) {
      this.wsManager.sendToClient(client.ws, {
        type: 'error',
        message: 'Missing tableId or buyinAmount'
      })
      return
    }

    try {
      const player = await PokerService.joinTable(client.userId, {
        tableId: message.tableId,
        buyinAmount: message.data.buyinAmount
      })

      // Update client context
      this.wsManager.updateClientContext(client.ws, player.gameId?.toString(), message.tableId)

      // Send success to client
      this.wsManager.sendToClient(client.ws, {
        type: 'poker/join-table-success',
        player,
        tableId: message.tableId
      })

      // Notify other players at the table
      this.wsManager.sendToTable(message.tableId, {
        type: 'poker/player-joined',
        player: {
          userId: player.userId,
          position: player.position,
          stackAmount: player.stackAmount
        }
      }, client.userId)

    } catch (error: any) {
      this.wsManager.sendToClient(client.ws, {
        type: 'poker/join-table-error',
        message: error.message
      })
    }
  }

  async handleLeaveTable(client: WSClient, message: PokerWSMessage) {
    if (!message.tableId) {
      this.wsManager.sendToClient(client.ws, {
        type: 'error',
        message: 'Missing tableId'
      })
      return
    }

    try {
      await PokerService.leaveTable(client.userId, message.tableId)

      // Update client context
      this.wsManager.updateClientContext(client.ws, undefined, undefined)

      // Send success to client
      this.wsManager.sendToClient(client.ws, {
        type: 'poker/leave-table-success',
        tableId: message.tableId
      })

      // Notify other players at the table
      this.wsManager.sendToTable(message.tableId, {
        type: 'poker/player-left',
        userId: client.userId
      })

    } catch (error: any) {
      this.wsManager.sendToClient(client.ws, {
        type: 'poker/leave-table-error',
        message: error.message
      })
    }
  }

  async handleAction(client: WSClient, message: PokerWSMessage) {
    if (!message.gameId || !message.actionType) {
      this.wsManager.sendToClient(client.ws, {
        type: 'error',
        message: 'Missing gameId or actionType'
      })
      return
    }

    try {
      await PokerService.performAction(client.userId, {
        gameId: message.gameId,
        actionType: message.actionType,
        amount: message.amount
      })

      // Send success to client
      this.wsManager.sendToClient(client.ws, {
        type: 'poker/action-success',
        gameId: message.gameId,
        actionType: message.actionType,
        amount: message.amount
      })

      // Notify other players in the game
      this.wsManager.sendToGame(message.gameId, {
        type: 'poker/player-action',
        userId: client.userId,
        actionType: message.actionType,
        amount: message.amount
      }, client.userId)

      // Send updated game state to all players
      await this.broadcastGameState(message.gameId)

    } catch (error: any) {
      this.wsManager.sendToClient(client.ws, {
        type: 'poker/action-error',
        message: error.message
      })
    }
  }

  async handleGetState(client: WSClient, message: PokerWSMessage) {
    if (!message.gameId) {
      this.wsManager.sendToClient(client.ws, {
        type: 'error',
        message: 'Missing gameId'
      })
      return
    }

    try {
      const gameState = await PokerService.getGameState(message.gameId, client.userId)

      this.wsManager.sendToClient(client.ws, {
        type: 'poker/game-state',
        gameState
      })
    } catch (error: any) {
      this.wsManager.sendToClient(client.ws, {
        type: 'poker/get-state-error',
        message: error.message
      })
    }
  }

  async handleDisconnect(client: WSClient) {
    // Auto-leave any active games
    if (client.tableId) {
      try {
        await PokerService.leaveTable(client.userId, client.tableId)
        this.wsManager.sendToTable(client.tableId, {
          type: 'poker/player-disconnected',
          userId: client.userId
        })
      } catch (error) {
        console.error('Error leaving table on disconnect:', error)
      }
    }
  }

  private async broadcastGameState(gameId: string) {
    try {
      // Get all clients in this game
      const gameClients = Array.from(this.wsManager['clients'].values())
        .filter(client => client.gameId === gameId)

      // Send updated state to each player (with their hole cards visible)
      for (const client of gameClients) {
        const gameState = await PokerService.getGameState(gameId, client.userId)
        this.wsManager.sendToClient(client.ws, {
          type: 'poker/game-state-update',
          gameState
        })
      }
    } catch (error) {
      console.error('Error broadcasting game state:', error)
    }
  }
}
