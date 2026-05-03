import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'

// ─────────────────────────────────────────────────────────────────────────────
// API Key pools — read from environment variables
// Each pool is dedicated to one task type so they never compete for quota.
// ─────────────────────────────────────────────────────────────────────────────

/** 3 Gemini keys dedicated to section-by-section note generation */
const NOTES_GEMINI_KEYS = [
  process.env.NEXT_PUBLIC_GEMINI_NOTES_KEY_1,
  process.env.NEXT_PUBLIC_GEMINI_NOTES_KEY_2,
  process.env.NEXT_PUBLIC_GEMINI_NOTES_KEY_3,
].filter(Boolean) as string[]

/** 2 Gemini keys dedicated to flashcard generation */
const FLASHCARD_GEMINI_KEYS = [
  process.env.NEXT_PUBLIC_GEMINI_FLASHCARD_KEY_1,
  process.env.NEXT_PUBLIC_GEMINI_FLASHCARD_KEY_2,
].filter(Boolean) as string[]

/** 2 Groq keys dedicated to quiz generation */
const QUIZ_GROQ_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_QUIZ_KEY_1,
  process.env.NEXT_PUBLIC_GROQ_QUIZ_KEY_2,
].filter(Boolean) as string[]

/**
 * General-purpose Gemini key pool (diagrams + legacy bulk generation).
 * Falls back to the notes pool if no dedicated key is configured.
 */
const GENERAL_GEMINI_KEYS = (() => {
  const dedicated = [
    process.env.NEXT_PUBLIC_GEMINI_NOTES_KEY_1,
    process.env.NEXT_PUBLIC_GEMINI_NOTES_KEY_2,
    process.env.NEXT_PUBLIC_GEMINI_NOTES_KEY_3,
  ].filter(Boolean) as string[]
  return dedicated.length ? dedicated : []
})()

/** Legacy single-key fallback (kept for backward compatibility with old .env) */
const LEGACY_GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY
const LEGACY_GROQ_KEY   = process.env.NEXT_PUBLIC_GROQ_API_KEY

// ─────────────────────────────────────────────────────────────────────────────
// Helper: is this a rate-limit / quota error?
// ─────────────────────────────────────────────────────────────────────────────
function isRateLimitError(err: unknown): boolean {
  if (!err) return false
  const msg = (err as any)?.message?.toLowerCase() ?? ''
  const status = (err as any)?.status ?? (err as any)?.statusCode ?? 0
  return (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('too many requests')
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Small delay utility
// ─────────────────────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// ─────────────────────────────────────────────────────────────────────────────
// KeyPool — stateful API-key rotation with session-level memory
//
// Problem with a simple loop: every call restarts at key 1, so if key 1 is
// rate-limited it gets hammered on every request, burning all remaining quota
// before key 2 is even tried.
//
// Solution: KeyPool remembers which keys have 429'd this session.
// - currentIndex advances permanently when a key is rate-limited.
// - Subsequent calls skip already-failed keys and go straight to the live key.
// - If all keys are exhausted, throws a clear descriptive error.
// ─────────────────────────────────────────────────────────────────────────────
class KeyPool {
  private readonly keys: string[]
  private readonly label: string
  /** Index of the key that is currently "active" (not yet rate-limited) */
  private currentIndex = 0

  constructor(keys: string[], label: string) {
    this.keys = keys
    this.label = label
  }

  get hasKeys(): boolean {
    return this.keys.length > 0
  }

  get activeKeyCount(): number {
    return this.keys.length
  }

  /**
   * Execute `fn` using the current live key.
   * On a 429 error, permanently advances to the next key and retries.
   * On a non-429 error, re-throws immediately.
   * Throws only when every key has been exhausted.
   */
  async run<T>(fn: (key: string) => Promise<T>): Promise<T> {
    if (this.keys.length === 0) {
      throw new Error(`[${this.label}] No API keys configured.`)
    }

    while (this.currentIndex < this.keys.length) {
      const keyNumber = this.currentIndex + 1
      const key = this.keys[this.currentIndex]

      console.log(`[${this.label}] Using Key ${keyNumber}/${this.keys.length}`)

      try {
        const result = await fn(key)
        console.log(`[${this.label}] Key ${keyNumber} succeeded ✓`)
        return result
      } catch (err) {
        if (isRateLimitError(err)) {
          const nextNumber = keyNumber + 1
          if (nextNumber <= this.keys.length) {
            console.warn(
              `[${this.label}] Key ${keyNumber} rate limited — switching to Key ${nextNumber}…`
            )
          } else {
            console.error(
              `[${this.label}] Key ${keyNumber} rate limited — no more keys available.`
            )
          }
          // Permanently advance: this key will never be tried again this session
          this.currentIndex++
          continue
        }
        // Non-rate-limit error: surface it immediately
        throw err
      }
    }

    throw new Error(
      `[${this.label}] All ${this.keys.length} key(s) are rate-limited for this session. ` +
      `Please wait a minute and refresh the page.`
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini caller: calls gemini-2.0-flash with a given key
// ─────────────────────────────────────────────────────────────────────────────
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const client = new GoogleGenerativeAI(apiKey)
  const model  = client.getGenerativeModel({ model: 'gemini-2.0-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

// ─────────────────────────────────────────────────────────────────────────────
// Groq caller: calls llama-3.3-70b-versatile with a given key
// ─────────────────────────────────────────────────────────────────────────────
async function callGroq(apiKey: string, prompt: string): Promise<string> {
  const client = new Groq({ apiKey, dangerouslyAllowBrowser: true })
  const completion = await client.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 4096,
  })
  return completion.choices[0]?.message?.content ?? ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Session-level KeyPool singletons
// One pool per task type — they are created once and live for the page session.
// This means once key 1 is rate-limited in the Notes pool, ALL future note
// generation calls automatically start from key 2 without any extra logic.
// ─────────────────────────────────────────────────────────────────────────────
function resolveNotesKeys(): string[] {
  const keys = [...NOTES_GEMINI_KEYS]
  if (!keys.length && LEGACY_GEMINI_KEY) keys.push(LEGACY_GEMINI_KEY)
  return keys
}

function resolveFlashcardKeys(): string[] {
  const keys = [...FLASHCARD_GEMINI_KEYS]
  if (!keys.length) keys.push(...NOTES_GEMINI_KEYS)
  if (!keys.length && LEGACY_GEMINI_KEY) keys.push(LEGACY_GEMINI_KEY)
  return keys
}

function resolveQuizGroqKeys(): string[] {
  const keys = [...QUIZ_GROQ_KEYS]
  if (!keys.length && LEGACY_GROQ_KEY) keys.push(LEGACY_GROQ_KEY)
  return keys
}

function resolveGeneralGeminiKeys(): string[] {
  const keys = [...GENERAL_GEMINI_KEYS]
  if (!keys.length && LEGACY_GEMINI_KEY) keys.push(LEGACY_GEMINI_KEY)
  return keys
}

/** Singleton pools — instantiated once, persist across all calls this session */
const notesPool     = new KeyPool(resolveNotesKeys(),        'Notes Gemini')
const flashcardPool = new KeyPool(resolveFlashcardKeys(),    'Flashcard Gemini')
const quizPool      = new KeyPool(resolveQuizGroqKeys(),     'Quiz Groq')
const diagramPool   = new KeyPool(resolveGeneralGeminiKeys(),'Diagram Gemini')

// ─────────────────────────────────────────────────────────────────────────────
// Demo mode detection
// ─────────────────────────────────────────────────────────────────────────────
function isInDemoMode(): boolean {
  return (
    notesPool.activeKeyCount === 0 &&
    flashcardPool.activeKeyCount === 0 &&
    quizPool.activeKeyCount === 0 &&
    diagramPool.activeKeyCount === 0
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// isAIConfigured / getAIStatus (public API — keep same signatures)
// ─────────────────────────────────────────────────────────────────────────────
export function isAIConfigured(): boolean {
  return !isInDemoMode()
}

export function getAIStatus() {
  return {
    gemini: diagramPool.hasKeys,
    groq:   quizPool.hasKeys,
    configured: !isInDemoMode(),
    keyPools: {
      notesKeys:     notesPool.activeKeyCount,
      flashcardKeys: flashcardPool.activeKeyCount,
      quizGroqKeys:  quizPool.activeKeyCount,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// generateSectionNotes — Notes pool (3 Gemini keys)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Generate detailed notes for a SINGLE section of a document.
 * Uses the dedicated Notes Gemini key pool with automatic 429 fallback.
 */
export async function generateSectionNotes(
  sectionContent: string,
  sectionTitle: string,
  filename: string,
  sectionIndex: number,
  totalSections: number
): Promise<{ title: string; markdown: string }> {
  const prompt = `You are an expert academic tutor. Create DETAILED, comprehensive study notes for this section of "${filename}".

This is Section ${sectionIndex + 1} of ${totalSections}: "${sectionTitle}"

Content:
${sectionContent}

Requirements:
- Write thorough explanations, not just bullet points
- Define all technical terms clearly
- Include examples where relevant
- Use clear headings (##) and subheadings (###)
- Explain WHY things work the way they do
- Make it exam-ready with all key facts

Respond with ONLY a valid JSON object (no markdown code blocks, no extra text):
{"title": "Section title here", "markdown": "## Heading\n\nDetailed content..."}`

  if (!notesPool.hasKeys) {
    return {
      title: `${sectionTitle} — Demo Notes`,
      markdown: `## ${sectionTitle}\n\n*Demo mode: configure \`NEXT_PUBLIC_GEMINI_NOTES_KEY_1\` in .env.local to generate real notes.*`,
    }
  }

  const raw = await notesPool.run((key) => callGemini(key, prompt))

  const parsed = extractJSON(raw)
  if (parsed?.title && parsed?.markdown) {
    return { title: parsed.title, markdown: parsed.markdown }
  }

  return {
    title: `${sectionTitle} — Notes`,
    markdown: raw || `*Notes generation failed for ${sectionTitle}. Please try again.*`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// generateStudyMaterials — Flashcard + Quiz + Diagram bulk generation
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Generate flashcards, quiz, and diagrams from extracted document text.
 * Each task uses its own dedicated key pool to avoid quota competition.
 * Pass skipNotes=true (default) since notes are generated section-by-section.
 */
export async function generateStudyMaterials(
  text: string,
  filename: string,
  skipNotes = true
): Promise<any[]> {
  const materials: any[] = []

  if (isInDemoMode()) {
    console.log('[AI] Demo mode — returning sample materials')
    return buildDemoMaterials(filename)
  }

  const maxChars = 12000 // safe limit that fits within token budgets
  const truncatedText = text.slice(0, maxChars)

  console.log('=== Starting AI Generation ===')
  console.log('Text length:', truncatedText.length)

  // ── Notes (legacy bulk path, skipped by default) ──────────────────────
  if (!skipNotes) {
    const notesKeys = resolveNotesKeys()
    if (notesKeys.length) {
      try {
        console.log('[Notes] Generating (bulk mode)…')
        const prompt = buildNotesPrompt(filename, truncatedText)
        const raw = await tryWithFallback(notesKeys, 'Notes Gemini', (k) => callGemini(k, prompt))
        const json = extractJSON(raw)
        materials.push({
          type: 'notes',
          content: json ?? { title: `Notes: ${filename}`, markdown: raw || 'Generation failed.' },
        })
      } catch (err: any) {
        console.error('[Notes] Generation error:', err.message)
        materials.push({
          type: 'notes',
          content: { title: `Notes: ${filename}`, markdown: `Error: ${err.message}` },
        })
      }
    }
  }

  // ── Flashcards — dedicated Gemini key pool ────────────────────────────
  if (flashcardPool.hasKeys) {
    try {
      console.log('[Flashcards] Generating…')
      const prompt = buildFlashcardsPrompt(filename, truncatedText)
      const raw = await flashcardPool.run((k) => callGemini(k, prompt))
      const json = extractJSON(raw)
      if (json?.cards) {
        materials.push({ type: 'flashcards', content: json })
        console.log('[Flashcards] Added', json.cards.length, 'cards')
      }
    } catch (err: any) {
      console.error('[Flashcards] Generation error:', err.message)
    }
  }

  // ── Quiz — dedicated Groq key pool ────────────────────────────────────
  if (quizPool.hasKeys) {
    try {
      console.log('[Quiz] Generating…')
      const prompt = buildQuizPrompt(filename, truncatedText)
      const raw = await quizPool.run((k) => callGroq(k, prompt))
      const json = extractJSON(raw)
      if (json?.questions) {
        materials.push({ type: 'quiz', content: json })
        console.log('[Quiz] Added', json.questions.length, 'questions')
      } else if (json) {
        materials.push({ type: 'quiz', content: { title: 'Quiz', questions: [], ...json } })
      }
    } catch (err: any) {
      console.error('[Quiz] Generation error:', err.message)
    }
  }

  // ── Diagrams — general Gemini key pool ───────────────────────────────
  if (diagramPool.hasKeys) {
    try {
      console.log('[Diagrams] Generating…')
      const prompt = buildDiagramPrompt(filename, truncatedText)
      const raw = await diagramPool.run((k) => callGemini(k, prompt))
      const json = extractJSON(raw)
      if (json?.mindmap || json?.flowchart) {
        materials.push({ type: 'diagram', content: json })
      } else if (json) {
        materials.push({ type: 'diagram', content: { title: 'Diagrams', mindmap: '', flowchart: '', ...json } })
      }
    } catch (err: any) {
      console.error('[Diagrams] Generation error:', err.message)
    }
  }

  console.log('=== Generation Complete ===')
  console.log('Materials:', materials.map((m) => m.type))
  return materials
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builders
// ─────────────────────────────────────────────────────────────────────────────
function buildNotesPrompt(filename: string, text: string): string {
  return `You are a helpful study assistant. Create comprehensive study notes from this content.

Content from "${filename}":
${text}

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{"title": "Notes: Topic Name", "markdown": "# Topic\n\n## Overview\nContent here\n\n## Key Concepts\n- Concept 1\n- Concept 2\n\n## Summary\nSummary here"}`
}

function buildFlashcardsPrompt(filename: string, text: string): string {
  return `Create flashcards from this educational content.

Content from "${filename}":
${text}

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{"title": "Flashcards: Topic Name", "cards": [{"front": "Question", "back": "Answer", "difficulty": "easy"}, {"front": "Question 2", "back": "Answer 2", "difficulty": "medium"}]}`
}

function buildQuizPrompt(filename: string, text: string): string {
  return `Create a quiz from this content.

Content from "${filename}":
${text}

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{"title": "Quiz: Topic Name", "questions": [{"question": "What is X?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "Because A is correct"}]}

Generate 5-8 questions with 4 options each. correct is the 0-based index.`
}

function buildDiagramPrompt(filename: string, text: string): string {
  return `Create Mermaid.js diagrams for this content.

Content from "${filename}":
${text}

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{"title": "Diagrams: Topic Name", "mindmap": "mindmap\n  root((Topic))\n    Concept1\n    Concept2", "flowchart": "flowchart TD\n    A[Start] --> B[End]"}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo materials (no API keys configured)
// ─────────────────────────────────────────────────────────────────────────────
function buildDemoMaterials(filename: string): any[] {
  return [
    {
      type: 'notes',
      content: {
        title: `Notes: ${filename}`,
        markdown: `# Study Notes: ${filename}\n\n## Overview\nThis is demo content. Configure API keys in \`.env.local\` to generate real study materials.\n\n## Key Concepts\n- **Concept 1**: Important definition here\n- **Concept 2**: Another key point\n\n## Summary\nAdd your API keys and re-upload your document.`,
      },
    },
    {
      type: 'flashcards',
      content: {
        title: `Flashcards: ${filename}`,
        cards: [
          { front: 'What is the main concept?', back: 'Configure your API keys for real content.', difficulty: 'easy' },
          { front: 'Define key term', back: 'A key term is an important word in your study material.', difficulty: 'medium' },
          { front: 'How does it work?', back: 'The AI analyzes your documents and extracts key information.', difficulty: 'hard' },
        ],
      },
    },
    {
      type: 'quiz',
      content: {
        title: `Quiz: ${filename}`,
        questions: [
          {
            question: 'What file types can you upload?',
            options: ['Only PDF', 'Only PPTX', 'Both PDF and PPTX', 'Word documents only'],
            correct: 2,
            explanation: 'ExamHelper AI supports both PDF and PPTX files.',
          },
          {
            question: 'Which AI is used as the primary service?',
            options: ['OpenAI GPT', 'Google Gemini', 'Anthropic Claude', 'Groq Llama'],
            correct: 1,
            explanation: 'Google Gemini is the primary AI with Groq as a quiz fallback.',
          },
        ],
      },
    },
    {
      type: 'diagram',
      content: {
        title: `Diagrams: ${filename}`,
        mindmap: `mindmap\n  root((Study Topic))\n    Key Concept 1\n      Detail A\n      Detail B\n    Key Concept 2\n      Detail C`,
        flowchart: `flowchart TD\n    A[Upload Document] --> B[Extract Text]\n    B --> C[AI Processing]\n    C --> D[Study Materials]\n    D --> E[Ace Your Exam!]`,
      },
    },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// extractJSON — unchanged from original
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Robustly extract a JSON object from raw LLM output.
 * Handles markdown code fences, smart quotes, and trailing commas.
 */
function extractJSON(text: string): any | null {
  if (!text) {
    console.error('extractJSON received empty text')
    return null
  }

  console.log('Attempting to extract JSON, length:', text.length)

  let cleanText = text
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/\r\n/g, '\n')
    .trim()

  // Direct parse
  try {
    return JSON.parse(cleanText)
  } catch {
    /* continue */
  }

  // Extract from markdown code block
  const fenceMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {
      /* continue */
    }
  }

  // Find first {...} block
  const objectMatch = cleanText.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    let jsonStr = objectMatch[0]
    try {
      return JSON.parse(jsonStr)
    } catch {
      // Fix trailing commas
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')
      try {
        return JSON.parse(jsonStr)
      } catch (e2) {
        console.error('Could not fix JSON:', (e2 as Error).message)
      }
    }
  }

  console.error('Could not extract JSON from response')
  console.log('Raw text preview:', cleanText.substring(0, 500))
  return null
}
