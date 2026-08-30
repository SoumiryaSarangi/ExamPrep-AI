import Groq from 'groq-sdk'

// ─────────────────────────────────────────────────────────────────────────────
// API Key pools — Groq only, isolated per task
// ─────────────────────────────────────────────────────────────────────────────

/** 3 Groq keys dedicated to NOTES generation */
const GROQ_NOTES_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_NOTES_KEY_1,
  process.env.NEXT_PUBLIC_GROQ_NOTES_KEY_2,
  process.env.NEXT_PUBLIC_GROQ_NOTES_KEY_3,
].filter(Boolean) as string[]

/** 2 Groq keys dedicated to FLASHCARD generation */
const GROQ_FLASHCARD_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_FLASHCARD_KEY_1,
  process.env.NEXT_PUBLIC_GROQ_FLASHCARD_KEY_2,
].filter(Boolean) as string[]

/** 2 Groq keys dedicated to QUIZ generation */
const GROQ_QUIZ_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_QUIZ_KEY_1,
  process.env.NEXT_PUBLIC_GROQ_QUIZ_KEY_2,
].filter(Boolean) as string[]

/** 2 Groq keys dedicated to TUTOR generation */
const GROQ_TUTOR_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_TUTOR_KEY_1,
  process.env.NEXT_PUBLIC_GROQ_TUTOR_KEY_2,
].filter(Boolean) as string[]

// ─────────────────────────────────────────────────────────────────────────────
// Boot-time diagnostics
// ─────────────────────────────────────────────────────────────────────────────

console.log(`[AI] Notes Groq keys     : ${GROQ_NOTES_KEYS.length}`)
console.log(`[AI] Flashcard Groq keys : ${GROQ_FLASHCARD_KEYS.length}`)
console.log(`[AI] Quiz Groq keys      : ${GROQ_QUIZ_KEYS.length}`)
console.log(`[AI] Tutor Groq keys     : ${GROQ_TUTOR_KEYS.length}`)

// ─────────────────────────────────────────────────────────────────────────────
// tryWithFallback — rotates through keys on 429 rate-limit errors
// ─────────────────────────────────────────────────────────────────────────────

async function tryWithFallback(
  keys: string[],
  label: string,
  fn: (key: string) => Promise<string>
): Promise<string> {
  if (keys.length === 0) {
    throw new Error(`[AI] No API keys configured for pool: ${label}`)
  }

  let lastError: unknown = null

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    try {
      console.log(`[AI][${label}] Trying key ${i + 1}/${keys.length}`)
      const result = await fn(key)
      console.log(`[AI][${label}] Key ${i + 1} succeeded`)
      return result
    } catch (err: any) {
      const status: number | undefined =
        err?.status ?? err?.response?.status ?? err?.statusCode

      const isRateLimit =
        status === 429 ||
        err?.message?.toLowerCase().includes('rate limit') ||
        err?.message?.toLowerCase().includes('quota') ||
        err?.message?.toLowerCase().includes('resource_exhausted') ||
        err?.message?.toLowerCase().includes('too many requests')

      if (isRateLimit) {
        console.warn(`[AI][${label}] Key ${i + 1} hit rate limit — trying next key`)
        lastError = err
        continue
      }

      console.error(`[AI][${label}] Key ${i + 1} failed:`, err?.message)
      throw err
    }
  }

  throw new Error(
    `[AI][${label}] All ${keys.length} key(s) exhausted (rate limited). Try again later.\n` +
    `Last error: ${(lastError as any)?.message ?? String(lastError)}`
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Groq wrapper — takes a specific key pool
// ─────────────────────────────────────────────────────────────────────────────

async function groqGenerate(prompt: string, keys: string[], label: string): Promise<string> {
  return tryWithFallback(keys, label, async (apiKey) => {
    const client = new Groq({ apiKey, dangerouslyAllowBrowser: true })
    const completion = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-20b',
      temperature: 0.7,
      max_tokens: 4096,
    })
    return completion.choices[0]?.message?.content ?? ''
  })
}

// Flashcards need a larger output budget (30 cards ≈ 6-8k tokens)
async function groqGenerateFlashcards(prompt: string, keys: string[], label: string): Promise<string> {
  return tryWithFallback(keys, label, async (apiKey) => {
    const client = new Groq({ apiKey, dangerouslyAllowBrowser: true })
    const completion = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-20b',
      temperature: 0.7,
      max_tokens: 4000,
    })
    return completion.choices[0]?.message?.content ?? ''
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Task-specific generators — each uses its own isolated key pool
// ─────────────────────────────────────────────────────────────────────────────

async function generateNotesContent(prompt: string): Promise<string> {
  if (GROQ_NOTES_KEYS.length > 0) {
    return groqGenerate(prompt, GROQ_NOTES_KEYS, 'notes')
  }
  console.warn('[AI] No Groq keys for notes. Using demo mode.')
  return generateDemoContent(prompt)
}

async function generateFlashcardContent(prompt: string): Promise<string> {
  if (GROQ_FLASHCARD_KEYS.length > 0) {
    return groqGenerateFlashcards(prompt, GROQ_FLASHCARD_KEYS, 'flashcards')
  }
  console.warn('[AI] No Groq keys for flashcards. Using demo mode.')
  return generateDemoContent(prompt)
}

async function generateQuizContent(prompt: string): Promise<string> {
  if (GROQ_QUIZ_KEYS.length > 0) {
    return groqGenerate(prompt, GROQ_QUIZ_KEYS, 'quiz')
  }
  console.warn('[AI] No Groq keys for quiz. Using demo mode.')
  return generateDemoContent(prompt)
}

async function generateDiagramContent(prompt: string): Promise<string> {
  // Diagrams borrow from the flashcard pool to keep notes pool isolated
  if (GROQ_FLASHCARD_KEYS.length > 0) {
    return groqGenerate(prompt, GROQ_FLASHCARD_KEYS, 'diagrams')
  }
  console.warn('[AI] No Groq keys for diagrams. Using demo mode.')
  return generateDemoContent(prompt)
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Groq free-tier TPM is tight — keep input text short
const MAX_INPUT_CHARS = 4000

// ─────────────────────────────────────────────────────────────────────────────
// generateSectionNotes  (section-by-section — called from Notes.tsx)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate detailed notes for a SINGLE section of a document.
 * Uses the dedicated NOTES Groq key pool with automatic rotation on 429s.
 * Returns plain markdown (not JSON-wrapped) to avoid display issues.
 */
export async function generateSectionNotes(
  sectionContent: string,
  sectionTitle: string,
  filename: string,
  sectionIndex: number,
  totalSections: number
): Promise<{ title: string; markdown: string }> {
  const truncatedContent = sectionContent.slice(0, MAX_INPUT_CHARS)

  const prompt = `You are an expert academic textbook writer. Write DETAILED study notes for Section ${sectionIndex + 1} of ${totalSections}: "${sectionTitle}" from "${filename}".

Content to study:
${truncatedContent}

FORMATTING RULES (follow exactly):
1. Start with ## for the main section heading, ### for subtopics
2. Use SHORT PARAGRAPHS (max 3 sentences) for explanations, concepts, and "why something works"
3. Use BULLET POINTS (- ) for lists, features, comparisons, and quick facts
4. Use NUMBERED LISTS (1. 2. 3.) ONLY for sequential steps or processes
5. **Bold** all key terms and definitions when they first appear
6. Never write walls of text — break everything up naturally
7. Include real examples where helpful
8. End with a "### 📌 Key Takeaways" section containing 4-5 concise bullet points summarizing the most important facts

CRITICAL: Respond with ONLY the raw markdown text. Do NOT wrap it in JSON. Do NOT use code blocks. Just write the markdown directly.`

  const raw = await generateNotesContent(prompt)

  // Throttle: 1 s cooldown to respect rate limits
  await sleep(1000)

  // The response should be plain markdown now, but defensively handle
  // cases where the model still returns JSON
  let markdown = raw || ''

  const trimmed = markdown.trim()
  if (trimmed.startsWith('{') && trimmed.includes('"markdown"')) {
    try {
      const parsed = extractJSON(trimmed)
      if (parsed?.markdown) {
        markdown = parsed.markdown
      }
    } catch {
      // Not valid JSON — use as-is
    }
  }

  // Strip any wrapping ```markdown ... ``` code fences the model might add
  markdown = markdown
    .replace(/^```(?:markdown)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()

  if (!markdown || markdown.length < 20) {
    return {
      title: `${sectionTitle} — Notes`,
      markdown: `*Notes generation failed for ${sectionTitle}. Please try again.*`,
    }
  }

  return { title: sectionTitle, markdown }
}


// ─────────────────────────────────────────────────────────────────────────────
// generateStudyMaterials  (quiz only — called on upload)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateStudyMaterials(text: string, filename: string) {
  const materials: any[] = []

  const anyKey = GROQ_NOTES_KEYS.length > 0 || GROQ_FLASHCARD_KEYS.length > 0 || GROQ_QUIZ_KEYS.length > 0
  if (!anyKey) {
    console.log('[AI] No API keys — running in demo mode')
    return buildDemoMaterials(filename)
  }

  const truncatedText = text.slice(0, MAX_INPUT_CHARS)
  const cleanFilename = filename.replace(/\.[^/.]+$/, '')

  console.log('=== Starting AI Generation (quiz only) ===')

  try {
    console.log('[AI] Generating quiz...')
    const prompt =
      `Create a quiz from this content.\n\n` +
      `Content from "${filename}":\n${truncatedText}\n\n` +
      `Respond with ONLY a valid JSON object (no markdown, no code blocks):\n` +
      `{"title": "Quiz: ${cleanFilename}", "questions": [{"question": "What is X?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "Because A is correct"}]}\n\n` +
      `Generate EXACTLY 15 questions with 4 options each. correct is the 0-based index.`

    const raw = await generateQuizContent(prompt)
    const json = extractJSON(raw)

    if (json?.questions) {
      materials.push({ type: 'quiz', content: json })
    } else if (json?.quiz) {
      materials.push({ type: 'quiz', content: { ...json, questions: json.quiz } })
    } else if (json && Array.isArray(json)) {
      materials.push({ type: 'quiz', content: { title: `Quiz: ${cleanFilename}`, questions: json } })
    } else if (json) {
      materials.push({ type: 'quiz', content: { title: `Quiz: ${cleanFilename}`, questions: [], ...json } })
    } else {
      console.error('[AI] Quiz JSON invalid or missing questions array:', json)
    }
  } catch (err: any) {
    console.error('Quiz generation error:', err)
  }

  console.log('=== Generation Complete ===')
  console.log('Total materials generated:', materials.length)

  return materials
}

// ─────────────────────────────────────────────────────────────────────────────
// generateFlashcardsOnly  (on-demand — user clicks "Generate Flashcards")
// ─────────────────────────────────────────────────────────────────────────────

export async function generateFlashcardsOnly(text: string, filename: string) {
  const cleanFilename = filename.replace(/\.[^/.]+$/, '')
  // Give flashcards more input so the model has full context for 30 cards
  const truncatedText = text.slice(0, 6000)

  console.log('[AI] Generating flashcards (on-demand, 30 cards)...')

  const prompt =
    `Create flashcards from this educational content.\n\n` +
    `Content from "${filename}":\n${truncatedText}\n\n` +
    `Generate EXACTLY 30 high-quality flashcards covering all key concepts.\n` +
    `Each card should have a clear question on the front and a concise answer on the back.\n` +
    `Assign difficulty: "easy", "medium", or "hard" based on concept complexity.\n\n` +
    `Respond with ONLY a valid JSON object (no markdown, no code blocks):\n` +
    `{"title": "Flashcards: ${cleanFilename}", "cards": [{"front": "Question", "back": "Answer", "difficulty": "easy"}]}`

  const raw = await generateFlashcardContent(prompt)
  const json = extractJSON(raw)

  if (json?.cards) return json
  if (json?.flashcards) return { ...json, cards: json.flashcards }
  if (json && Array.isArray(json)) return { title: `Flashcards: ${cleanFilename}`, cards: json }
  throw new Error('Failed to generate flashcards')
}

// ─────────────────────────────────────────────────────────────────────────────
// generateMoreFlashcards  (on-demand — "Generate More Cards" after cycle)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMoreFlashcards(text: string, filename: string, previousCardsFronts: string) {
  const cleanFilename = filename.replace(/\.[^/.]+$/, '')
  const truncatedText = text.slice(0, 6000)

  console.log('[AI] Generating MORE flashcards (30 new, non-overlapping)...')

  const prompt =
    `Create NEW flashcards from this educational content.\n\n` +
    `Content from "${filename}":\n${truncatedText}\n\n` +
    `CRITICAL: Generate EXACTLY 30 NEW flashcards that are COMPLETELY DIFFERENT from these previous cards:\n` +
    `${previousCardsFronts}\n\n` +
    `Do NOT repeat any of the above questions. Cover different concepts, details, and angles.\n` +
    `Assign difficulty: "easy", "medium", or "hard" based on concept complexity.\n\n` +
    `Respond with ONLY a valid JSON object (no markdown, no code blocks):\n` +
    `{"title": "Flashcards: ${cleanFilename}", "cards": [{"front": "Question", "back": "Answer", "difficulty": "easy"}]}`

  const raw = await generateFlashcardContent(prompt)
  const json = extractJSON(raw)

  if (json?.cards) return json
  if (json?.flashcards) return { ...json, cards: json.flashcards }
  if (json && Array.isArray(json)) return { title: `Flashcards: ${cleanFilename}`, cards: json }
  throw new Error('Failed to generate more flashcards')
}

// ─────────────────────────────────────────────────────────────────────────────
// generateDiagramMaterial  (on-demand — user clicks "Generate Diagrams")
// ─────────────────────────────────────────────────────────────────────────────

export async function generateDiagramMaterial(text: string, filename: string) {
  const cleanFilename = filename.replace(/\.[^/.]+$/, '')
  const truncatedText = text.slice(0, MAX_INPUT_CHARS)

  const prompt =
    `Create Mermaid.js diagrams for this content.\n\n` +
    `Content from "${filename}":\n${truncatedText}\n\n` +
    `Respond with ONLY a valid JSON object (no markdown, no code blocks):\n` +
    `{"title": "Diagrams: ${cleanFilename}", "mindmap": "mindmap\\n  root((Topic))\\n    Concept1\\n    Concept2", "flowchart": "flowchart TD\\n    A[Start] --> B[End]"}`

  const raw = await generateDiagramContent(prompt)
  const json = extractJSON(raw)

  if (json?.mindmap || json?.flowchart) return json
  if (json) return { title: `Diagrams: ${cleanFilename}`, mindmap: '', flowchart: '', ...json }
  throw new Error('Failed to generate diagrams')
}

// ─────────────────────────────────────────────────────────────────────────────
// generateMoreQuizQuestions  (on-demand — "Generate More" after quiz)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMoreQuizQuestions(text: string, filename: string, previousQuestionsText: string) {
  const cleanFilename = filename.replace(/\.[^/.]+$/, '')
  const truncatedText = text.slice(0, MAX_INPUT_CHARS)

  const prompt =
    `Create a new quiz from this content.\n\n` +
    `Content from "${filename}":\n${truncatedText}\n\n` +
    `CRITICAL REQUIREMENT: Generate EXACTLY 15 NEW questions that are DIFFERENT from these previous questions:\n` +
    `${previousQuestionsText}\n\n` +
    `Respond with ONLY a valid JSON object (no markdown, no code blocks):\n` +
    `{"title": "Quiz: ${cleanFilename}", "questions": [{"question": "What is X?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "Because A is correct"}]}\n\n` +
    `Generate EXACTLY 15 questions with 4 options each. correct is the 0-based index.`

  const raw = await generateQuizContent(prompt)
  const json = extractJSON(raw)

  if (json?.questions) return json
  if (json?.quiz) return { ...json, questions: json.quiz }
  if (json && Array.isArray(json)) return { title: `Quiz: ${cleanFilename}`, questions: json }
  if (json) return { title: `Quiz: ${cleanFilename}`, questions: [], ...json }
  throw new Error('Failed to parse quiz JSON or generate valid questions')
}

// ─────────────────────────────────────────────────────────────────────────────
// generateWeakAreaQuiz  (generates quiz focused on weak topics)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateWeakAreaQuiz(text: string, filename: string, weakTopics: string[]) {
  const cleanFilename = filename.replace(/\.[^/.]+$/, '')
  const truncatedText = text.slice(0, MAX_INPUT_CHARS)
  const topicList = weakTopics.join(', ')

  const prompt =
    `Create a targeted practice quiz focused SPECIFICALLY on these weak topics: ${topicList}\n\n` +
    `Content from "${filename}":\n${truncatedText}\n\n` +
    `CRITICAL REQUIREMENT: Generate EXACTLY 15 questions that SPECIFICALLY test the weak topics listed above.\n` +
    `Each question MUST be about one of these topics: ${topicList}\n` +
    `Make the questions test deeper understanding, not just recall.\n\n` +
    `Respond with ONLY a valid JSON object (no markdown, no code blocks):\n` +
    `{"title": "Practice: Weak Areas — ${cleanFilename}", "questions": [{"question": "What is X?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "Because A is correct"}]}\n\n` +
    `Generate EXACTLY 15 questions with 4 options each. correct is the 0-based index.`

  const raw = await generateQuizContent(prompt)
  const json = extractJSON(raw)

  if (json?.questions) return json
  if (json?.quiz) return { ...json, questions: json.quiz }
  if (json && Array.isArray(json)) return { title: `Practice: Weak Areas — ${cleanFilename}`, questions: json }
  if (json) return { title: `Practice: Weak Areas — ${cleanFilename}`, questions: [], ...json }
  throw new Error('Failed to parse weak area quiz JSON')
}

// ─────────────────────────────────────────────────────────────────────────────
// generateTutorAnswer (Course Tutor RAG)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateTutorAnswer(
  question: string,
  chunks: Array<{ sectionTitle: string; sectionText: string; filename: string }>,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  // Budget ~12,000 characters total (~3000 tokens) to stay within 8k TPM limits.
  // Distribute this budget evenly across all retrieved chunks so none are dropped.
  const charsPerChunk = Math.floor(12000 / Math.max(chunks.length, 1))
  const contextText = chunks.map((c, i) => {
    const text = c.sectionText.length > charsPerChunk ? c.sectionText.slice(0, charsPerChunk) + '... (truncated)' : c.sectionText
    return `--- Excerpt ${i + 1} (From ${c.filename}, ${c.sectionTitle}) ---\n${text}`
  }).join('\n\n')

  let historyText = ''
  if (history.length > 0) {
    historyText = "Recent Conversation History:\n" + history.map(m => {
      const roleName = m.role === 'user' ? 'Student' : 'Tutor'
      // Truncate to ~300 chars
      const truncated = m.content.length > 300 ? m.content.slice(0, 300) + '...' : m.content
      return `${roleName}: ${truncated}`
    }).join('\n') + '\n\n'
  }

  const prompt = `You are an expert, helpful tutor for a course. Answer the student's question based ONLY on the provided excerpts from their uploaded course materials.

${historyText}Excerpts:
${contextText}

Question: ${question}

Instructions:
1. Answer the question using ONLY the facts found in the excerpts.
2. If the excerpts contain the answer, provide a clear and helpful explanation. Use formatting (bullet points, bold text) if it makes the answer easier to read.
3. If the answer cannot be found in the provided excerpts, YOU MUST plainy state that the information is not covered in the student's uploaded materials for this course, rather than guessing or hallucinating an answer. Do NOT provide an answer from your general knowledge.
4. Use the conversation history ONLY to understand what the student's current question is referring to (pronouns, 'what about X', 'more detail', follow-ups on your own previous answer). Every factual claim in your answer must still come only from the excerpts provided below for THIS turn — if those excerpts don't cover the specific thing being asked about, say so honestly, even if it was mentioned earlier in the conversation.

Answer:`

  const keysToUse = GROQ_TUTOR_KEYS.length > 0 ? GROQ_TUTOR_KEYS : GROQ_NOTES_KEYS

  if (keysToUse.length > 0) {
    return groqGenerate(prompt, keysToUse, 'tutor')
  }

  console.warn('[AI] No Groq keys for tutor or notes. Using demo mode.')
  return "This is a demo answer. The real answer is not available because no Groq API keys are configured."
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo content helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildDemoMaterials(filename: string) {
  return [
    {
      type: 'notes',
      content: {
        title: `Notes: ${filename}`,
        sections: [],
        generatedSections: {},
        totalSections: 0,
        markdown: `# Demo Study Notes\n\n## Overview\nNo API keys configured. Add your keys to \`.env.local\` to generate real notes.\n\n## Key Concepts\n- **Concept 1**: Important definition here\n- **Concept 2**: Another key point\n\n## Summary\nConfigure an API key to generate real content.`,
      },
    },
    {
      type: 'flashcards',
      content: {
        title: `Flashcards: ${filename}`,
        cards: [
          { front: 'What is the main concept?', back: 'Configure your API key for real content.', difficulty: 'easy' },
          { front: 'Define key term', back: 'A key term is an important word or phrase.', difficulty: 'medium' },
          { front: 'What are the benefits?', back: 'Better understanding and retention.', difficulty: 'medium' },
        ],
      },
    },
    {
      type: 'quiz',
      content: {
        title: `Quiz: ${filename}`,
        questions: [
          { question: 'What file types can you upload?', options: ['Only PDF', 'Only PPTX', 'Both PDF and PPTX', 'None'], correct: 2, explanation: 'Both PDF and PPTX are supported.' },
          { question: 'Which AI model is used?', options: ['GPT-4', 'Gemini', 'GPT-OSS 20B', 'Claude'], correct: 2, explanation: 'GPT-OSS 20B via Groq is used for all generation.' },
        ],
      },
    },
    {
      type: 'diagram',
      content: {
        title: `Diagrams: ${filename}`,
        mindmap: `mindmap\n  root((Study Topic))\n    Concept 1\n      Detail A\n    Concept 2\n      Detail B`,
        flowchart: `flowchart TD\n    A[Upload Document] --> B[Extract Text]\n    B --> C[AI Processing]\n    C --> D[Study Materials]`,
      },
    },
  ]
}

function generateDemoContent(prompt: string): string {
  if (prompt.includes('notes')) return JSON.stringify({ title: 'Demo Notes', markdown: '# Demo\n\nNo API key configured.' })
  if (prompt.includes('flashcard')) return JSON.stringify({ title: 'Demo Flashcards', cards: [{ front: 'Q', back: 'A', difficulty: 'easy' }] })
  if (prompt.includes('quiz')) return JSON.stringify({ title: 'Demo Quiz', questions: [] })
  if (prompt.includes('diagram')) return JSON.stringify({ title: 'Demo Diagrams', mindmap: 'mindmap\n  root((Topic))', flowchart: 'flowchart TD\n    A --> B' })
  return '{}'
}

// ─────────────────────────────────────────────────────────────────────────────
// extractJSON
// ─────────────────────────────────────────────────────────────────────────────

export function extractJSONExported(text: string) {
  return extractJSON(text)
}

function extractJSON(text: string) {
  if (!text) {
    console.error('extractJSON received empty text')
    return null
  }

  console.log('Attempting to extract JSON, length:', text.length)

  let cleanText = text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\r\n/g, '\n')
    .trim()

  try {
    const result = JSON.parse(cleanText)
    console.log('Direct JSON parse successful')
    return result
  } catch (e: any) {
    console.log('Direct parse failed:', e.message)
  }

  const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try {
      const result = JSON.parse(jsonMatch[1].trim())
      console.log('Extracted JSON from code block')
      return result
    } catch (e: any) {
      console.error('Failed to parse JSON from code block:', e.message)
    }
  }

  const objectMatch = cleanText.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    let jsonStr = objectMatch[0]
    try {
      const result = JSON.parse(jsonStr)
      console.log('Extracted JSON object from text')
      return result
    } catch {
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')
      try {
        const result = JSON.parse(jsonStr)
        console.log('Fixed JSON parsed successfully')
        return result
      } catch (e2: any) {
        console.error('Could not fix JSON:', e2.message)
      }
    }
  }

  console.error('Could not extract JSON from response')
  console.log('Raw text preview:', cleanText.substring(0, 500))
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isAIConfigured(): boolean {
  return GROQ_NOTES_KEYS.length > 0 || GROQ_FLASHCARD_KEYS.length > 0 || GROQ_QUIZ_KEYS.length > 0
}

export function getAIStatus() {
  return {
    notesKeys: GROQ_NOTES_KEYS.length,
    flashcardKeys: GROQ_FLASHCARD_KEYS.length,
    quizKeys: GROQ_QUIZ_KEYS.length,
    tutorKeys: GROQ_TUTOR_KEYS.length,
    configured: isAIConfigured(),
  }
}
