import { db } from '@/lib/db'
import { embedTexts } from './embedder'
import type { Section } from '@/lib/parsers/textSplitter'

import { chunkSectionForEmbedding } from './chunker'

export async function indexDocument(documentId: number, courseId: number, sections: Section[]): Promise<void> {
  const batchSize = 5
  
  for (let i = 0; i < sections.length; i += batchSize) {
    const batch = sections.slice(i, i + batchSize)
    
    // Flatten batch into chunks
    const chunks = batch.flatMap(section => 
      chunkSectionForEmbedding(section.index, section.content).map(chunk => ({
        sectionTitle: section.title,
        chunk
      }))
    )
    
    if (chunks.length === 0) continue

    const texts = chunks.map(c => c.chunk.text)
    const vectors = await embedTexts(texts)
    
    const records = chunks.map((c, idx) => ({
      documentId,
      courseId,
      sectionIndex: c.chunk.sectionIndex,
      chunkIndex: c.chunk.chunkIndex,
      sectionTitle: c.sectionTitle,
      sectionText: c.chunk.text,
      vector: vectors[idx],
      createdAt: new Date().toISOString()
    }))
    
    await db.embeddings.bulkAdd(records)
    
    await new Promise(r => setTimeout(r, 0))
  }
}

let isIndexing = false

export async function ensureCourseIndexed(courseId: number): Promise<void> {
  if (isIndexing) return
  isIndexing = true
  
  try {
    const docs = await db.documents.where('courseId').equals(courseId).toArray()
    
    for (const doc of docs) {
      if (!doc.sections) continue
      
      // Check if document is already indexed
      const existing = await db.embeddings.where({ documentId: doc.id }).first()
      if (existing) continue
      
      try {
        const parsedSections: Section[] = JSON.parse(doc.sections)
        if (parsedSections.length > 0) {
          await indexDocument(doc.id!, courseId, parsedSections)
        }
      } catch (e) {
        console.error(`[Indexer] Failed to index document ${doc.id}:`, e)
      }
    }
  } finally {
    isIndexing = false
  }
}
