import { db } from '@/lib/db'

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function retrieveRelevantSections(
  courseId: number,
  queryVector: number[],
  topK = 4
): Promise<Array<{ documentId: number; sectionIndex: number; chunkIndex: number; sectionTitle: string; sectionText: string; filename: string; score: number }>> {
  // Fetch all embeddings for this course
  const embeddings = await db.embeddings.where('courseId').equals(courseId).toArray()

  // Score each embedding
  const scored = embeddings.map(emb => {
    const score = cosineSimilarity(queryVector, emb.vector)
    return { ...emb, score }
  })

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score)

  // Take top K
  const topHits = scored.slice(0, topK)

  // Join back to db.documents to get filename
  const results = await Promise.all(topHits.map(async hit => {
    const doc = await db.documents.get(hit.documentId)
    return {
      documentId: hit.documentId,
      sectionIndex: hit.sectionIndex,
      chunkIndex: hit.chunkIndex,
      sectionTitle: hit.sectionTitle,
      sectionText: hit.sectionText,
      filename: doc?.filename || 'Unknown Document',
      score: hit.score
    }
  }))

  return results
}
