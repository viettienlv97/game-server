import type { PokerPlayer } from '../models/pokerPlayer'

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  rank: string // 'A', 'K', 'Q', 'J', '10', '9', ..., '2'
}

export interface PokerHand {
  rank: number
  name: string
  cards: Card[]
  value: number[] // For comparison
}

export class PokerUtils {
  private static readonly SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const
  private static readonly RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const

  /**
   * Create a new shuffled deck of 52 cards
   */
  static createDeck(): Card[] {
    const deck: Card[] = []
    for (const suit of this.SUITS) {
      for (const rank of this.RANKS) {
        deck.push({ suit, rank })
      }
    }
    return this.shuffleDeck(deck)
  }

  /**
   * Shuffle a deck of cards using Fisher-Yates algorithm
   */
  static shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = shuffled[i]
      shuffled[i] = shuffled[j]
      shuffled[j] = temp
    }
    return shuffled
  }

  /**
   * Get numeric value of a card rank for comparison
   */
  static getRankValue(rank: string): number {
    const rankMap: { [key: string]: number } = {
      'A': 14, 'K': 13, 'Q': 12, 'J': 11,
      '10': 10, '9': 9, '8': 8, '7': 7, '6': 6,
      '5': 5, '4': 4, '3': 3, '2': 2
    }
    return rankMap[rank] || 0
  }

  /**
   * Evaluate poker hand from 7 cards (2 hole + 5 community)
   */
  static evaluateHand(cards: Card[]): PokerHand {
    if (cards.length !== 7) {
      throw new Error('Hand evaluation requires exactly 7 cards')
    }

    // Sort cards by rank (highest first)
    const sortedCards = [...cards].sort((a, b) => this.getRankValue(b.rank) - this.getRankValue(a.rank))

    // Check for Royal Flush
    const royalFlush = this.checkRoyalFlush(sortedCards)
    if (royalFlush) return royalFlush

    // Check for Straight Flush
    const straightFlush = this.checkStraightFlush(sortedCards)
    if (straightFlush) return straightFlush

    // Check for Four of a Kind
    const fourOfAKind = this.checkFourOfAKind(sortedCards)
    if (fourOfAKind) return fourOfAKind

    // Check for Full House
    const fullHouse = this.checkFullHouse(sortedCards)
    if (fullHouse) return fullHouse

    // Check for Flush
    const flush = this.checkFlush(sortedCards)
    if (flush) return flush

    // Check for Straight
    const straight = this.checkStraight(sortedCards)
    if (straight) return straight

    // Check for Three of a Kind
    const threeOfAKind = this.checkThreeOfAKind(sortedCards)
    if (threeOfAKind) return threeOfAKind

    // Check for Two Pair
    const twoPair = this.checkTwoPair(sortedCards)
    if (twoPair) return twoPair

    // Check for One Pair
    const onePair = this.checkOnePair(sortedCards)
    if (onePair) return onePair

    // High Card
    return this.checkHighCard(sortedCards)
  }

  private static checkRoyalFlush(cards: Card[]): PokerHand | null {
    const flushes = this.getFlushes(cards)
    for (const flush of flushes) {
      const ranks = flush.map(c => c.rank).sort((a, b) => this.getRankValue(b) - this.getRankValue(a))
      if (ranks.join(',') === 'A,K,Q,J,10') {
        return {
          rank: 10,
          name: 'Royal Flush',
          cards: flush,
          value: [10, this.getRankValue('A')]
        }
      }
    }
    return null
  }

  private static checkStraightFlush(cards: Card[]): PokerHand | null {
    const flushes = this.getFlushes(cards)
    for (const flush of flushes) {
      const straight = this.checkStraight(flush)
      if (straight) {
        return {
          rank: 9,
          name: 'Straight Flush',
          cards: straight.cards,
          value: [9, ...straight.value.slice(1)]
        }
      }
    }
    return null
  }

  private static checkFourOfAKind(cards: Card[]): PokerHand | null {
    const rankCounts = this.getRankCounts(cards)
    for (const [rank, count] of rankCounts) {
      if (count === 4) {
        const fourCards = cards.filter(c => c.rank === rank)
        const kicker = cards.find(c => c.rank !== rank)
        if (!kicker) continue
        return {
          rank: 8,
          name: 'Four of a Kind',
          cards: [...fourCards, kicker],
          value: [8, this.getRankValue(rank), this.getRankValue(kicker.rank)]
        }
      }
    }
    return null
  }

  private static checkFullHouse(cards: Card[]): PokerHand | null {
    const rankCounts = this.getRankCounts(cards)
    const threeRanks = Array.from(rankCounts).filter(([, count]) => count >= 3).map(([rank]) => rank)
    const pairRanks = Array.from(rankCounts).filter(([, count]) => count >= 2).map(([rank]) => rank)

    if (threeRanks.length > 0 && pairRanks.length > 1) {
      const threeRank = threeRanks[0]
      const pairRank = pairRanks.find(r => r !== threeRank) || pairRanks[0]

      if (!pairRank) return null

      const threeCards = cards.filter(c => c.rank === threeRank).slice(0, 3)
      const pairCards = cards.filter(c => c.rank === pairRank).slice(0, 2)

      return {
        rank: 7,
        name: 'Full House',
        cards: [...threeCards, ...pairCards],
        value: [7, this.getRankValue(threeRank), this.getRankValue(pairRank)]
      }
    }
    return null
  }

  private static checkFlush(cards: Card[]): PokerHand | null {
    const flushes = this.getFlushes(cards)
    if (flushes.length > 0) {
      const flush = flushes[0].slice(0, 5)
      return {
        rank: 6,
        name: 'Flush',
        cards: flush,
        value: [6, ...flush.map(c => this.getRankValue(c.rank))]
      }
    }
    return null
  }

  private static checkStraight(cards: Card[]): PokerHand | null {
    const uniqueRanks = [...new Set(cards.map(c => c.rank))]
    const rankValues = uniqueRanks.map(r => this.getRankValue(r)).sort((a, b) => b - a)

    // Check for Ace-low straight (A,2,3,4,5)
    if (rankValues.includes(14) && rankValues.includes(2) && rankValues.includes(3) &&
        rankValues.includes(4) && rankValues.includes(5)) {
      const straightCards = cards.filter(c => [14, 2, 3, 4, 5].includes(this.getRankValue(c.rank)))
      return {
        rank: 5,
        name: 'Straight',
        cards: straightCards.slice(0, 5),
        value: [5, 5] // Ace-low straight ranks as 5
      }
    }

    // Check for regular straights
    for (let i = 0; i <= rankValues.length - 5; i++) {
      const potentialStraight = rankValues.slice(i, i + 5)
      if (potentialStraight[0] - potentialStraight[4] === 4) {
        const straightCards = cards.filter(c => potentialStraight.includes(this.getRankValue(c.rank)))
        return {
          rank: 5,
          name: 'Straight',
          cards: straightCards.slice(0, 5),
          value: [5, potentialStraight[0]]
        }
      }
    }
    return null
  }

  private static checkThreeOfAKind(cards: Card[]): PokerHand | null {
    const rankCounts = this.getRankCounts(cards)
    for (const [rank, count] of rankCounts) {
      if (count >= 3) {
        const threeCards = cards.filter(c => c.rank === rank).slice(0, 3)
        const kickers = cards.filter(c => c.rank !== rank).slice(0, 2)
        return {
          rank: 4,
          name: 'Three of a Kind',
          cards: [...threeCards, ...kickers],
          value: [4, this.getRankValue(rank), ...kickers.map(c => this.getRankValue(c.rank))]
        }
      }
    }
    return null
  }

  private static checkTwoPair(cards: Card[]): PokerHand | null {
    const rankCounts = this.getRankCounts(cards)
    const pairRanks = Array.from(rankCounts).filter(([, count]) => count >= 2).map(([rank]) => rank)

    if (pairRanks.length >= 2) {
      const highPair = pairRanks[0]
      const lowPair = pairRanks[1]
      const pairs = [
        ...cards.filter(c => c.rank === highPair).slice(0, 2),
        ...cards.filter(c => c.rank === lowPair).slice(0, 2)
      ]
      const kicker = cards.find(c => c.rank !== highPair && c.rank !== lowPair)

      if (!kicker) return null

      return {
        rank: 3,
        name: 'Two Pair',
        cards: [...pairs, kicker],
        value: [3, this.getRankValue(highPair), this.getRankValue(lowPair), this.getRankValue(kicker.rank)]
      }
    }
    return null
  }

  private static checkOnePair(cards: Card[]): PokerHand | null {
    const rankCounts = this.getRankCounts(cards)
    for (const [rank, count] of rankCounts) {
      if (count >= 2) {
        const pair = cards.filter(c => c.rank === rank).slice(0, 2)
        const kickers = cards.filter(c => c.rank !== rank).slice(0, 3)
        return {
          rank: 2,
          name: 'One Pair',
          cards: [...pair, ...kickers],
          value: [2, this.getRankValue(rank), ...kickers.map(c => this.getRankValue(c.rank || ''))]
        }
      }
    }
    return null
  }

  private static checkHighCard(cards: Card[]): PokerHand {
    const sortedCards = [...cards].sort((a, b) => this.getRankValue(b.rank) - this.getRankValue(a.rank))
    return {
      rank: 1,
      name: 'High Card',
      cards: sortedCards.slice(0, 5),
      value: [1, ...sortedCards.slice(0, 5).map(c => this.getRankValue(c.rank))]
    }
  }

  private static getFlushes(cards: Card[]): Card[][] {
    const flushes: Card[][] = []
    for (const suit of this.SUITS) {
      const suitCards = cards.filter(c => c.suit === suit)
      if (suitCards.length >= 5) {
        flushes.push(suitCards)
      }
    }
    return flushes
  }

  private static getRankCounts(cards: Card[]): Map<string, number> {
    const counts = new Map<string, number>()
    for (const card of cards) {
      counts.set(card.rank, (counts.get(card.rank) || 0) + 1)
    }
    return counts
  }

  /**
   * Compare two poker hands
   * Returns: 1 if hand1 wins, -1 if hand2 wins, 0 if tie
   */
  static compareHands(hand1: PokerHand, hand2: PokerHand): number {
    for (let i = 0; i < Math.max(hand1.value.length, hand2.value.length); i++) {
      const val1 = hand1.value[i] || 0
      const val2 = hand2.value[i] || 0
      if (val1 > val2) return 1
      if (val1 < val2) return -1
    }
    return 0
  }

  /**
   * Calculate pot distribution for multiple winners
   */
  static distributePot(potAmount: number, winners: PokerPlayer[], rakePercent: number = 0.05): Array<{ playerId: string, amount: number }> {
    const rake = Math.floor(potAmount * rakePercent)
    const distributablePot = potAmount - rake

    if (winners.length === 1) {
      return [{ playerId: winners[0].userId?.toString() || '', amount: distributablePot }]
    }

    const share = Math.floor(distributablePot / winners.length)
    const remainder = distributablePot % winners.length

    const distribution = winners.map((winner, index) => ({
      playerId: winner.userId?.toString() || '',
      amount: share + (index < remainder ? 1 : 0)
    }))

    return distribution
  }
}
