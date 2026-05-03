/**
 * SM-2 Spaced Repetition Algorithm
 * Based on SuperMemo 2 algorithm for optimal review scheduling
 */

/**
 * Quality ratings:
 * 0 - Complete blackout
 * 1 - Incorrect, but upon seeing answer remembered
 * 2 - Incorrect, but answer seemed easy to recall
 * 3 - Correct with serious difficulty
 * 4 - Correct with some hesitation  
 * 5 - Perfect response
 */

/**
 * Calculate next review date and update card parameters
 * @param {number} quality - Response quality (0-5)
 * @param {object} card - Card with repetitions, easeFactor, interval
 * @returns {object} Updated card parameters
 */
export function calculateNextReview(quality: number, card: any) {
  let { repetitions = 0, easeFactor = 2.5, interval = 1 } = card
  
  // Quality < 3 means incorrect answer - reset
  if (quality < 3) {
    repetitions = 0
    interval = 1
  } else {
    // Correct answer - increase interval
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
    repetitions++
  }
  
  // Update ease factor (minimum 1.3)
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  )
  
  // Calculate next review date
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)
  
  return {
    repetitions,
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    nextReview: nextReview.toISOString(),
    lastReviewed: new Date().toISOString()
  }
}

/**
 * Get cards due for review
 * @param {array} cards - All flashcards
 * @returns {array} Cards due today or overdue
 */
export function getDueCards(cards: any[]) {
  const now = new Date()
  return cards.filter(card => {
    if (!card.nextReview) return true // New card
    return new Date(card.nextReview) <= now
  })
}

/**
 * Sort cards by priority (overdue first, then by ease factor)
 * @param {array} cards - Cards to sort
 * @returns {array} Sorted cards
 */
export function sortByPriority(cards: any[]) {
  const now = new Date()
  return [...cards].sort((a, b) => {
    const aOverdue = a.nextReview ? (now.getTime() - new Date(a.nextReview).getTime()) : Infinity
    const bOverdue = b.nextReview ? (now.getTime() - new Date(b.nextReview).getTime()) : Infinity
    
    // Most overdue first
    if (aOverdue !== bOverdue) return bOverdue - aOverdue
    
    // Then by ease factor (harder cards first)
    return (a.easeFactor || 2.5) - (b.easeFactor || 2.5)
  })
}

/**
 * Calculate study statistics
 * @param {array} cards - All flashcards
 * @returns {object} Statistics
 */
export function getStudyStats(cards: any[]) {
  const now = new Date()
  const dueCards = getDueCards(cards)
  
  const stats = {
    total: cards.length,
    due: dueCards.length,
    new: cards.filter(c => !c.repetitions || c.repetitions === 0).length,
    learning: cards.filter(c => c.repetitions > 0 && c.repetitions < 3).length,
    mature: cards.filter(c => c.repetitions >= 3).length,
    averageEase: 0,
    retention: 0
  }
  
  if (cards.length > 0) {
    const totalEase = cards.reduce((sum, c) => sum + (c.easeFactor || 2.5), 0)
    stats.averageEase = Math.round((totalEase / cards.length) * 100) / 100
    stats.retention = Math.round((stats.mature / cards.length) * 100)
  }
  
  return stats
}
