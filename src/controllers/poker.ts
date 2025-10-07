import { PokerService } from '../services/poker'
import { requireAuth } from '../middlewares/auth'

export const createTable = async (req: Request) => {
  // Authenticate user first
  const authResult = await requireAuth(req)
  if (!authResult.ok) {
    return Response.json(
      { error: authResult.message },
      { status: authResult.status }
    )
  }

  try {
    const body = await req.json() as {
      name?: string
      smallBlind?: number
      bigBlind?: number
      minBuyin?: number
      maxBuyin?: number
      maxPlayers?: number
    }

    const { name, smallBlind, bigBlind, minBuyin, maxBuyin, maxPlayers } = body

    if (!name || !smallBlind || !bigBlind || !minBuyin || !maxBuyin) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const table = await PokerService.createTable({
      name,
      smallBlind: Number(smallBlind),
      bigBlind: Number(bigBlind),
      minBuyin: Number(minBuyin),
      maxBuyin: Number(maxBuyin),
      maxPlayers: maxPlayers || 9
    }, authResult.claims!.sub)

    return Response.json({ table }, { status: 201 })
  } catch (error) {
    console.error('Create table error:', error)
    return Response.json(
      { error: 'Failed to create table' },
      { status: 500 }
    )
  }
}

export const getTables = async (req: Request) => {
  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')

    const tables = await PokerService.getTables(
      status ? { status } : undefined
    )

    return Response.json({ tables }, { status: 200 })
  } catch (error) {
    console.error('Get tables error:', error)
    return Response.json(
      { error: 'Failed to get tables' },
      { status: 500 }
    )
  }
}

export const getTable = async (req: Request) => {
  try {
    const url = new URL(req.url)
    const tableId = url.pathname.split('/').pop()

    if (!tableId) {
      return Response.json(
        { error: 'Table ID required' },
        { status: 400 }
      )
    }

    const table = await PokerService.getTableById(tableId)

    if (!table) {
      return Response.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    return Response.json({ table }, { status: 200 })
  } catch (error) {
    console.error('Get table error:', error)
    return Response.json(
      { error: 'Failed to get table' },
      { status: 500 }
    )
  }
}

export const joinTable = async (req: Request) => {
  // Authenticate user first
  const authResult = await requireAuth(req)
  if (!authResult.ok) {
    return Response.json(
      { error: authResult.message },
      { status: authResult.status }
    )
  }

  try {
    const body = await req.json() as {
      tableId?: string
      buyinAmount?: number
    }

    const { tableId, buyinAmount } = body

    if (!tableId || !buyinAmount) {
      return Response.json(
        { error: 'Missing tableId or buyinAmount' },
        { status: 400 }
      )
    }

    const player = await PokerService.joinTable(authResult.claims!.sub, {
      tableId,
      buyinAmount: Number(buyinAmount)
    })

    return Response.json({ player }, { status: 200 })
  } catch (error: any) {
    console.error('Join table error:', error)
    return Response.json(
      { error: error.message || 'Failed to join table' },
      { status: 400 }
    )
  }
}

export const leaveTable = async (req: Request) => {
  // Authenticate user first
  const authResult = await requireAuth(req)
  if (!authResult.ok) {
    return Response.json(
      { error: authResult.message },
      { status: authResult.status }
    )
  }

  try {
    const body = await req.json() as {
      tableId?: string
    }

    const { tableId } = body

    if (!tableId) {
      return Response.json(
        { error: 'Table ID required' },
        { status: 400 }
      )
    }

    await PokerService.leaveTable(authResult.claims!.sub, tableId)

    return Response.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Leave table error:', error)
    return Response.json(
      { error: error.message || 'Failed to leave table' },
      { status: 400 }
    )
  }
}

export const performAction = async (req: Request) => {
  // Authenticate user first
  const authResult = await requireAuth(req)
  if (!authResult.ok) {
    return Response.json(
      { error: authResult.message },
      { status: authResult.status }
    )
  }

  try {
    const body = await req.json() as {
      gameId?: string
      actionType?: string
      amount?: number
    }

    const { gameId, actionType, amount } = body

    if (!gameId || !actionType) {
      return Response.json(
        { error: 'Missing gameId or actionType' },
        { status: 400 }
      )
    }

    await PokerService.performAction(authResult.claims!.sub, {
      gameId,
      actionType: actionType as any,
      amount: amount ? Number(amount) : undefined
    })

    return Response.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Perform action error:', error)
    return Response.json(
      { error: error.message || 'Failed to perform action' },
      { status: 400 }
    )
  }
}

export const getPlayerGames = async (req: Request) => {
  // Authenticate user first
  const authResult = await requireAuth(req)
  if (!authResult.ok) {
    return Response.json(
      { error: authResult.message },
      { status: authResult.status }
    )
  }

  try {
    const games = await PokerService.getPlayerGames(authResult.claims!.sub)

    return Response.json({ games }, { status: 200 })
  } catch (error) {
    console.error('Get player games error:', error)
    return Response.json(
      { error: 'Failed to get player games' },
      { status: 500 }
    )
  }
}

export const getGameState = async (req: Request) => {
  // Authenticate user first
  const authResult = await requireAuth(req)
  if (!authResult.ok) {
    return Response.json(
      { error: authResult.message },
      { status: authResult.status }
    )
  }

  try {
    const url = new URL(req.url)
    const gameId = url.pathname.split('/').pop()

    if (!gameId) {
      return Response.json(
        { error: 'Game ID required' },
        { status: 400 }
      )
    }

    const gameState = await PokerService.getGameState(gameId, authResult.claims!.sub)

    return Response.json(gameState, { status: 200 })
  } catch (error: any) {
    console.error('Get game state error:', error)
    return Response.json(
      { error: error.message || 'Failed to get game state' },
      { status: 400 }
    )
  }
}
