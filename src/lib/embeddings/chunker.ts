export interface EmbeddingChunk {
  sectionIndex: number
  chunkIndex: number
  text: string
}

export function chunkSectionForEmbedding(sectionIndex: number, sectionContent: string): EmbeddingChunk[] {
  // Split on blank lines / bullet boundaries first
  const fragments = sectionContent
    .split(/\n\s*\n|(?=\n\s*[-*•] )|(?=\n\s*\d+\.\s)/)
    .map(f => f.trim())
    .filter(f => f.length > 0)

  const chunks: EmbeddingChunk[] = []
  let currentChunkText = ''
  let chunkIndex = 0

  const TARGET_MIN = 300
  const TARGET_MAX = 500

  for (const fragment of fragments) {
    if (!currentChunkText) {
      currentChunkText = fragment
    } else if (currentChunkText.length + fragment.length + 1 <= TARGET_MAX) {
      // Merge small fragments
      currentChunkText += '\n\n' + fragment
    } else {
      // Current chunk is big enough, push it
      chunks.push({
        sectionIndex,
        chunkIndex: chunkIndex++,
        text: currentChunkText
      })
      currentChunkText = fragment
    }
  }

  if (currentChunkText) {
    chunks.push({
      sectionIndex,
      chunkIndex: chunkIndex++,
      text: currentChunkText
    })
  }

  return chunks
}
