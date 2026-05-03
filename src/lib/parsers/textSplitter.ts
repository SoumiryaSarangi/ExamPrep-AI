/**
 * textSplitter.ts
 * Splits extracted document text into logical sections for section-by-section
 * AI note generation. Uses the --- Page N --- / --- Slide N --- markers
 * that documentParser.ts already inserts.
 */

export interface Section {
  /** 0-based section index */
  index: number
  /** Human-readable title, e.g. "Pages 1–5" or "Slides 3–8" */
  title: string
  /** The raw extracted text for this section (sent to LLM) */
  content: string
  /** Display-friendly range string, e.g. "1–5" */
  pageRange: string
  /** Array of individual page/slide numbers included */
  pageNumbers: number[]
}

// Matches both "--- Page N ---" and "--- Slide N ---"
const MARKER_REGEX = /---\s*(Page|Slide)\s+(\d+)\s*---/gi

interface PageChunk {
  type: 'Page' | 'Slide'
  number: number
  content: string
}

/**
 * Splits a document's extracted text into sections of approximately
 * `targetSectionSize` characters, never splitting mid-page or mid-slide.
 *
 * @param extractedText   Full text returned by documentParser (with markers)
 * @param targetSectionSize  Soft maximum chars per section (default 3000)
 * @returns Array of Section objects, always at least 1 element
 */
export function splitIntoSections(
  extractedText: string,
  targetSectionSize = 3000
): Section[] {
  if (!extractedText || extractedText.trim().length === 0) {
    return [
      {
        index: 0,
        title: 'Section 1',
        content: extractedText || '',
        pageRange: '1',
        pageNumbers: [1],
      },
    ]
  }

  // ── Step 1: Split text into individual page/slide chunks ──────────────
  const chunks: PageChunk[] = []

  // Collect all marker positions
  const markerMatches: Array<{ index: number; type: 'Page' | 'Slide'; number: number }> = []
  let match: RegExpExecArray | null

  const re = /---\s*(Page|Slide)\s+(\d+)\s*---/gi
  while ((match = re.exec(extractedText)) !== null) {
    markerMatches.push({
      index: match.index,
      type: (match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()) as 'Page' | 'Slide',
      number: parseInt(match[2], 10),
    })
  }

  if (markerMatches.length === 0) {
    // No markers found — treat the entire text as one section
    return [
      {
        index: 0,
        title: 'Full Document',
        content: extractedText.trim(),
        pageRange: '1',
        pageNumbers: [1],
      },
    ]
  }

  // Extract content between markers
  for (let i = 0; i < markerMatches.length; i++) {
    const start = markerMatches[i].index
    const end = i + 1 < markerMatches.length ? markerMatches[i + 1].index : extractedText.length
    const rawContent = extractedText.slice(start, end)

    // Strip the marker itself from the beginning, keep the rest
    const contentWithoutMarker = rawContent
      .replace(/---\s*(Page|Slide)\s+\d+\s*---/i, '')
      .replace(/^\s+/, '')
      .trim()

    if (contentWithoutMarker.length > 0) {
      chunks.push({
        type: markerMatches[i].type,
        number: markerMatches[i].number,
        content: contentWithoutMarker,
      })
    }
  }

  if (chunks.length === 0) {
    return [
      {
        index: 0,
        title: 'Full Document',
        content: extractedText.trim(),
        pageRange: '1',
        pageNumbers: [1],
      },
    ]
  }

  // ── Step 2: Group chunks into sections ────────────────────────────────
  const sections: Section[] = []
  let currentChunks: PageChunk[] = []
  let currentSize = 0
  const unitType = chunks[0].type // 'Page' or 'Slide'

  const finalizeSection = () => {
    if (currentChunks.length === 0) return

    const numbers = currentChunks.map((c) => c.number)
    const first = numbers[0]
    const last = numbers[numbers.length - 1]
    const range = first === last ? `${first}` : `${first}–${last}`
    const sectionLabel =
      first === last
        ? `${unitType} ${first}`
        : `${unitType}s ${first}–${last}`

    const combinedContent = currentChunks
      .map((c) => `--- ${c.type} ${c.number} ---\n\n${c.content}`)
      .join('\n\n')

    sections.push({
      index: sections.length,
      title: sectionLabel,
      content: combinedContent,
      pageRange: range,
      pageNumbers: numbers,
    })

    currentChunks = []
    currentSize = 0
  }

  for (const chunk of chunks) {
    const chunkSize = chunk.content.length

    // If this single chunk is already larger than the target, put it alone
    if (chunkSize >= targetSectionSize && currentChunks.length === 0) {
      currentChunks.push(chunk)
      finalizeSection()
      continue
    }

    // If adding this chunk would exceed the target, finalize what we have first
    if (currentSize + chunkSize > targetSectionSize && currentChunks.length > 0) {
      finalizeSection()
    }

    currentChunks.push(chunk)
    currentSize += chunkSize
  }

  // Flush remaining chunks
  finalizeSection()

  // Re-index sections after grouping
  sections.forEach((s, i) => {
    s.index = i
  })

  return sections
}

/**
 * Convenience: given a Section[], return the total character count
 * across all sections.
 */
export function totalChars(sections: Section[]): number {
  return sections.reduce((sum, s) => sum + s.content.length, 0)
}
