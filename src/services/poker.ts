import { PokerTableModel, type PokerTable } from '../models/pokerTable'
import { PokerGameModel, type PokerGame } from '../models/pokerGame'
import { PokerPlayerModel, type PokerPlayer } from '../models/pokerPlayer'
import { PokerActionModel, type PokerAction } from '../models/pokerAction'
import { PokerHandHistoryModel, type PokerHandHistory } from '../models/pokerHandHistory'
import { WalletModel } from '../models/wallet'
import { PokerUtils, type Card, type PokerHand } from '../utils/poker'

export interface CreateTableData {
  name: string
  smallBlind: number
  bigBlind: number
  minBuyin: number
  maxBuyin: number
  maxPlayers?: number
}

export interface JoinTableData {
  tableId: string
  buyinAmount: number
}

export interface GameActionData {
  gameId: string
  actionType: 'fold' | 'check' | 'call' | 'raise' | 'allin'
  amount?: number
}

export class PokerService {
  /**
   * Create a new poker table
   */
  static async createTable(data: CreateTableData, createdBy: string): Promise<PokerTable> {
    const table = new PokerTableModel({
      ...data,
      createdBy
    })
    return await table.save()
  }

  /**
   * Get all available tables
   */
  static async getTables(filters?: { status?: string }): Promise<PokerTable[]> {
    const query: any = {}
    if (filters?.status) {
      query.status = filters.status
    }
    return await PokerTableModel.find(query).sort({ createdAt: -1 })
  }

  /**
   * Get table by ID
   */
  static async getTableById(tableId: string): Promise<PokerTable | null> {
    return await PokerTableModel.findById(tableId)
  }

  /**
   * Join a poker table
   */
  static async joinTable(userId: string, data: JoinTableData): Promise<PokerPlayer> {
    const { tableId, buyinAmount } = data

    // Validate table exists and is active
    const table = await PokerTableModel.findById(tableId)
    if (!table || table.status === 'closed') {
      throw new Error('Table not found or not available')
    }

    // Validate buy-in amount
    if (buyinAmount < table.minBuyin || buyinAmount > table.maxBuyin) {
      throw new Error(`Buy-in amount must be between ${table.minBuyin} and ${table.maxBuyin}`)
    }

    // Check if user has sufficient balance
    const wallet = await WalletModel.findOne({ userId })
    if (!wallet || wallet.availableBalance < buyinAmount) {
      throw new Error('Insufficient balance')
    }

    // Check if table is full
    const activePlayers = await PokerPlayerModel.countDocuments({
      gameId: { $exists: true },
      isActive: true
    })

    if (activePlayers >= table.maxPlayers) {
      throw new Error('Table is full')
    }

    // Check if user is already at this table
    const existingPlayer = await PokerPlayerModel.findOne({
      userId,
      gameId: { $exists: true },
      isActive: true
    })

    if (existingPlayer) {
      throw new Error('Already playing at this table')
    }

    // Deduct from wallet
    wallet.balance -= buyinAmount
    wallet.availableBalance -= buyinAmount
    await wallet.save()

    // Find active game or create new one
    let game = await PokerGameModel.findOne({
      tableId,
      status: { $in: ['waiting', 'preflop', 'flop', 'turn', 'river'] }
    })

    if (!game) {
      game = new PokerGameModel({
        tableId,
        gameNumber: table.gameNumber + 1,
        status: 'waiting'
      })
      await game.save()

      // Update table game number
      table.gameNumber = game.gameNumber
      await table.save()
    }

    // Find next available position
    const existingPositions = await PokerPlayerModel.find({ gameId: game._id }).distinct('position')
    let position = 0
    while (existingPositions.includes(position)) {
      position++
    }

    // Create player
    const player = new PokerPlayerModel({
      gameId: game._id,
      userId,
      position,
      stackAmount: buyinAmount
    })

    await player.save()

    // Check if we can start the game
    const playerCount = await PokerPlayerModel.countDocuments({
      gameId: game._id,
      isActive: true
    })

    if (playerCount >= 2) {
      await this.startGame(game._id.toString())
    }

    return player
  }

  /**
   * Leave a poker table
   */
  static async leaveTable(userId: string, tableId: string): Promise<void> {
    const player = await PokerPlayerModel.findOne({
      userId,
      gameId: { $exists: true },
      isActive: true
    }).populate('gameId')

    if (!player) {
      throw new Error('Player not found at table')
    }

    const game = player.gameId as any
    if (game.tableId.toString() !== tableId) {
      throw new Error('Player not at this table')
    }

    // Mark player as inactive
    player.isActive = false
    player.leftAt = new Date()
    await player.save()

    // Refund remaining stack to wallet
    const wallet = await WalletModel.findOne({ userId })
    if (wallet) {
      wallet.balance += player.stackAmount
      wallet.availableBalance += player.stackAmount
      await wallet.save()
    }

    // Check if game should end
    const activePlayers = await PokerPlayerModel.countDocuments({
      gameId: game._id,
      isActive: true,
      isFolded: false
    })

    if (activePlayers < 2) {
      await this.endGame(game._id.toString())
    }
  }

  /**
   * Start a new game (simplified version)
   */
  private static async startGame(gameId: string): Promise<void> {
    const game = await PokerGameModel.findById(gameId)
    if (!game) return

    const players = await PokerPlayerModel.find({
      gameId,
      isActive: true
    }).sort({ position: 1 })

    if (players.length < 2) return

    // Simple game start - just deal cards and set basic state
    const deck = PokerUtils.createDeck()
    let cardIndex = 0

    for (const player of players) {
      const holeCards: Card[] = [deck[cardIndex++], deck[cardIndex++]]
      player.holeCards = holeCards
      await player.save()
    }

    // Deal community cards (flop for simplicity)
    game.communityCards = [deck[cardIndex++], deck[cardIndex++], deck[cardIndex++]]
    game.status = 'flop'
    game.currentPlayerPosition = 0

    await game.save()
  }

  /**
   * Perform a game action (simplified)
   */
  static async performAction(userId: string, data: GameActionData): Promise<void> {
    const { gameId, actionType } = data

    const player = await PokerPlayerModel.findOne({
      userId,
      gameId,
      isActive: true,
      isFolded: false
    })

    if (!player) {
      throw new Error('Player not found or not active')
    }

    const game = await PokerGameModel.findById(gameId)
    if (!game) {
      throw new Error('Game not found')
    }

    // Simple action handling
    switch (actionType) {
      case 'fold':
        player.isFolded = true
        break
      case 'check':
        // Simple check - do nothing
        break
      case 'call':
        // Simple call - bet minimum amount
        const callAmount = Math.min(100, player.stackAmount) // Fixed bet for simplicity
        player.stackAmount -= callAmount
        player.currentBet = callAmount
        game.potAmount += callAmount
        break
      case 'raise':
        // Simple raise
        const raiseAmount = Math.min(200, player.stackAmount)
        player.stackAmount -= raiseAmount
        player.currentBet = raiseAmount
        game.potAmount += raiseAmount
        break
      case 'allin':
        const allinAmount = player.stackAmount
        player.stackAmount = 0
        player.currentBet = allinAmount
        game.potAmount += allinAmount
        player.isAllIn = true
        break
    }

    await player.save()

    // Record action
    const action = new PokerActionModel({
      gameId,
      playerId: player._id,
      actionType,
      amount: player.currentBet,
      round: game.status
    })
    await action.save()

    // Simple game advancement - just move to next player
    const players = await PokerPlayerModel.find({
      gameId,
      isActive: true,
      isFolded: false
    }).sort({ position: 1 })

    const activePlayers = players.filter(p => !p.isFolded)
    if (activePlayers.length <= 1) {
      await this.endGame(gameId)
      return
    }

    // Move to next player
    const currentIndex = players.findIndex(p => p._id.toString() === player._id.toString())
    game.currentPlayerPosition = (currentIndex + 1) % players.length
    await game.save()
  }

  /**
   * End the current game (simplified)
   */
  private static async endGame(gameId: string): Promise<void> {
    const game = await PokerGameModel.findById(gameId)
    if (!game) return

    const players = await PokerPlayerModel.find({
      gameId,
      isActive: true,
      isFolded: false
    })

    if (players.length > 0) {
      // Simple winner determination - give pot to first active player
      const winner = players[0]
      winner.stackAmount += game.potAmount

      // Record hand history
      const handHistory = new PokerHandHistoryModel({
        gameId,
        playerId: winner._id,
        handRank: 'Winner',
        finalAmount: winner.stackAmount,
        profitLoss: game.potAmount,
        holeCards: winner.holeCards,
        bestHand: winner.holeCards,
        wonPot: true
      })
      await handHistory.save()

      await winner.save()
    }

    game.status = 'completed'
    game.completedAt = new Date()
    await game.save()

    // Start new game if there are enough players
    const activePlayers = await PokerPlayerModel.countDocuments({
      gameId,
      isActive: true
    })

    if (activePlayers >= 2) {
      const table = await PokerTableModel.findById(game.tableId)
      if (table) {
        const newGame = new PokerGameModel({
          tableId: table._id,
          gameNumber: table.gameNumber + 1,
          status: 'waiting'
        })
        await newGame.save()

        table.gameNumber = newGame.gameNumber
        await table.save()
      }
    }
  }

  /**
   * Get player's active games
   */
  static async getPlayerGames(userId: string): Promise<PokerGame[]> {
    const playerGames = await PokerPlayerModel.find({
      userId,
      isActive: true
    }).distinct('gameId')

    return await PokerGameModel.find({
      _id: { $in: playerGames },
      status: { $ne: 'completed' }
    }).populate('tableId')
  }

  /**
   * Get game state
   */
  static async getGameState(gameId: string, userId: string): Promise<any> {
    const game = await PokerGameModel.findById(gameId).populate('tableId')
    if (!game) throw new Error('Game not found')

    const players = await PokerPlayerModel.find({ gameId }).populate('userId', 'profile')
    const actions = await PokerActionModel.find({ gameId }).sort({ createdAt: -1 }).limit(20)

    // Hide other players' hole cards
    const sanitizedPlayers = players.map(player => ({
      ...player.toObject(),
      holeCards: (player.userId as any)._id?.toString() === userId ? player.holeCards : []
    }))

    return {
      game,
      players: sanitizedPlayers,
      actions
    }
  }
}
