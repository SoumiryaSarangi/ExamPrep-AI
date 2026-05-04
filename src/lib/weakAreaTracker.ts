'use client'

import { db } from '@/lib/db'

// ─────────────────────────────────────────────
// Topic extraction — pulls key phrases from question text
// ─────────────────────────────────────────────

// Common filler words to strip
const STOP_WORDS = new Set([
  'what', 'which', 'how', 'does', 'the', 'a', 'an', 'is', 'are', 'was', 'were',
  'of', 'in', 'for', 'to', 'and', 'or', 'not', 'with', 'from', 'by', 'on', 'at',
  'that', 'this', 'it', 'its', 'be', 'has', 'have', 'had', 'do', 'did', 'can',
  'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'must',
  'following', 'correct', 'true', 'false', 'statement', 'about', 'between',
  'used', 'using', 'use', 'called', 'known', 'type', 'types', 'one',
  'most', 'best', 'main', 'primary', 'given', 'when', 'where', 'why',
])

/**
 * Extract a topic phrase from a quiz question.
 * Tries to find the conceptual subject (2–4 words) rather than the full question.
 */
export function extractTopic(questionText: string): string {
  if (!questionText) return 'General'

  // Remove question mark and common prefixes
  let text = questionText
    .replace(/\?$/g, '')
    .replace(/^(what|which|how|explain|define|describe|name|list|state)\s+(is|are|does|do|the|a|an)\s+/i, '')
    .replace(/^(in\s+\w+,?\s*)/i, '')
    .trim()

  // Split into words, remove stop words, pick first 2–4 meaningful words
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9-]/g, ''))
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()))

  if (words.length === 0) return 'General'

  // Take up to 3 meaningful words as the topic
  const topic = words.slice(0, 3).join(' ')

  // Capitalize first letter of each word
  return topic
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ─────────────────────────────────────────────
// Update weak areas after a quiz/exam attempt
// ─────────────────────────────────────────────

/**
 * Analyze wrong answers, extract topics, and upsert into weakAreas table.
 *
 * @param courseId   - The course this quiz belongs to
 * @param questions  - Array of question objects { question, options, correct, ... }
 * @param answers    - Parallel array: user's selected option index (null = unanswered)
 */
export async function updateWeakAreas(
  courseId: number,
  questions: any[],
  answers: (number | null | { selected?: number | null; isCorrect?: boolean })[]
) {
  if (!courseId || !questions.length) return

  const topicResults: Record<string, { wrong: number; total: number }> = {}

  questions.forEach((q, i) => {
    const topic = extractTopic(q.question)
    if (!topicResults[topic]) topicResults[topic] = { wrong: 0, total: 0 }
    topicResults[topic].total++

    // Determine if wrong
    const ans = answers[i]
    let isWrong = false
    if (ans === null || ans === undefined) {
      isWrong = true // unanswered counts as wrong
    } else if (typeof ans === 'object') {
      isWrong = !ans.isCorrect
    } else {
      isWrong = ans !== q.correct
    }

    if (isWrong) topicResults[topic].wrong++
  })

  // Upsert each topic
  const now = new Date().toISOString()
  for (const [topic, { wrong, total }] of Object.entries(topicResults)) {
    const existing = await db.weakAreas
      .where('[courseId+topic]')
      .equals([courseId, topic])
      .first()
      .catch(() => null)

    // Fallback: search manually if compound index doesn't work
    const record = existing || await db.weakAreas
      .filter((r) => r.courseId === courseId && r.topic === topic)
      .first()

    if (record?.id) {
      await db.weakAreas.update(record.id, {
        wrongCount: record.wrongCount + wrong,
        totalAttempts: record.totalAttempts + total,
        lastUpdated: now,
      })
    } else {
      await db.weakAreas.add({
        courseId,
        topic,
        wrongCount: wrong,
        totalAttempts: total,
        lastUpdated: now,
      })
    }
  }

  console.log(`[WeakAreas] Updated ${Object.keys(topicResults).length} topics for course ${courseId}`)
}
