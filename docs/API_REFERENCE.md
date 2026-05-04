# API Reference

> Exported functions, store interfaces, and database schema for ExamHelper AI.

## Table of Contents

- [AI Service](#ai-service)
- [Document Parsing](#document-parsing)
- [Text Splitting](#text-splitting)
- [Spaced Repetition](#spaced-repetition)
- [Weak Area Tracker](#weak-area-tracker)
- [Zustand Stores](#zustand-stores)
- [Database Schema](#database-schema)
- [Utilities](#utilities)

---

## AI Service

**Module:** `src/lib/ai/aiService.ts`

### `generateStudyMaterials(text, filename)`

Generates a quiz from uploaded document text. Called automatically after upload.

| Parameter | Type | Description |
|---|---|---|
| `text` | `string` | Full extracted text from the document |
| `filename` | `string` | Original filename (used in prompt context) |
| **Returns** | `Promise<MaterialPayload[]>` | Array with one quiz material object |

### `generateSectionNotes(sectionContent, sectionTitle, filename, sectionIndex, totalSections)`

Generates markdown notes for a single document section.

| Parameter | Type | Description |
|---|---|---|
| `sectionContent` | `string` | Raw text of one section |
| `sectionTitle` | `string` | Human-readable section title (e.g., "Pages 1–5") |
| `filename` | `string` | Original filename |
| `sectionIndex` | `number` | 0-based section index |
| `totalSections` | `number` | Total number of sections |
| **Returns** | `Promise<{ title: string; markdown: string }>` | Generated notes |

### `generateFlashcardsOnly(text, filename)`

Generates 30 flashcards from document text.

| Parameter | Type | Description |
|---|---|---|
| `text` | `string` | Full extracted text |
| `filename` | `string` | Original filename |
| **Returns** | `Promise<{ title: string; cards: FlashcardData[] }>` | Flashcard set |

### `generateMoreFlashcards(text, filename, previousCardsFronts)`

Generates 30 new flashcards that don't overlap with previous ones.

### `generateDiagramMaterial(text, filename)`

Generates Mermaid.js diagrams (mind map + flowchart).

| **Returns** | `Promise<{ title: string; mindmap: string; flowchart: string }>` |

### `generateMoreQuizQuestions(text, filename, previousQuestionsText)`

Generates 15 new quiz questions that don't repeat previous ones.

### `generateWeakAreaQuiz(text, filename, weakTopics)`

Generates 15 questions targeted at the user's weak topics.

| Parameter | Type | Description |
|---|---|---|
| `weakTopics` | `string[]` | Array of topic strings to focus on |

### `isAIConfigured()`

Returns `true` if at least one Groq API key is configured.

### `getAIStatus()`

Returns key pool counts: `{ notesKeys, flashcardKeys, quizKeys, configured }`.

---

## Document Parsing

**Module:** `src/lib/parsers/documentParser.ts`

### `extractText(file)`

Detects file type and delegates to the appropriate parser.

| Parameter | Type | Description |
|---|---|---|
| `file` | `File` | Browser File object |
| **Returns** | `Promise<string>` | Extracted text with `--- Page/Slide N ---` markers |

### `extractPdfText(file)`

Extracts text from a PDF using PDF.js.

### `extractPptxText(file)`

Extracts text from a PPTX using JSZip + XML regex matching. Also extracts speaker notes.

---

## Text Splitting

**Module:** `src/lib/parsers/textSplitter.ts`

### `splitIntoSections(extractedText, targetSectionSize?)`

Splits extracted text into sections using page/slide markers.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `extractedText` | `string` | — | Text with `--- Page/Slide N ---` markers |
| `targetSectionSize` | `number` | `3000` | Soft max characters per section |
| **Returns** | `Section[]` | Array of section objects |

#### `Section` Interface

```typescript
interface Section {
  index: number        // 0-based section index
  title: string        // e.g., "Pages 1–5"
  content: string      // Raw text for this section
  pageRange: string    // e.g., "1–5"
  pageNumbers: number[] // Individual page numbers
}
```

---

## Spaced Repetition

**Module:** `src/lib/generators/spacedRepetition.ts`

Implements the **SM-2 (SuperMemo 2)** algorithm.

### `calculateNextReview(quality, card)`

| Parameter | Type | Description |
|---|---|---|
| `quality` | `number` | Response quality 0–5 (0 = blackout, 5 = perfect) |
| `card` | `object` | Card with `repetitions`, `easeFactor`, `interval` |
| **Returns** | `object` | Updated `{ repetitions, easeFactor, interval, nextReview, lastReviewed }` |

### `getDueCards(cards)`

Returns cards where `nextReview <= now` or `nextReview` is unset.

### `sortByPriority(cards)`

Sorts cards by overdue time (most overdue first), then by ease factor (hardest first).

### `getStudyStats(cards)`

Returns `{ total, due, new, learning, mature, averageEase, retention }`.

---

## Weak Area Tracker

**Module:** `src/lib/weakAreaTracker.ts`

### `extractTopic(questionText)`

Extracts a 2–3 word topic phrase from a quiz question by removing stop words.

### `updateWeakAreas(courseId, questions, answers)`

Analyzes quiz results and upserts per-topic performance into the `weakAreas` table.

---

## Zustand Stores

All stores follow the same pattern: `state` + `async action methods` returning `{ success, error? }`.

### `useAuthStore` — `src/stores/authStore.ts`

| Method | Signature | Description |
|---|---|---|
| `initialize()` | `() => Promise<void>` | Check session or activate demo mode |
| `login()` | `(email, password) => Promise<AuthResult>` | Sign in |
| `register()` | `(email, password, name) => Promise<AuthResult>` | Create account |
| `logout()` | `() => Promise<void>` | Sign out |

### `useCourseStore` — `src/stores/courseStore.ts`

| Method | Signature | Description |
|---|---|---|
| `fetchCourses()` | `() => Promise<void>` | Load all courses from IndexedDB |
| `getCourse(id)` | `(number) => Promise<any>` | Get single course |
| `addCourse(data)` | `(data) => Promise<Result>` | Create course |
| `updateCourse(id, data)` | `(number, data) => Promise<Result>` | Update course |
| `deleteCourse(id)` | `(number) => Promise<Result>` | Delete course + cascade |

### `useDocumentStore` — `src/stores/documentStore.ts`

Same CRUD pattern as `useCourseStore`, scoped to documents. Supports filtering by `courseId`.

### `useMaterialStore` — `src/stores/materialStore.ts`

Same CRUD pattern, scoped to materials. Supports filtering by `documentId`. Cascade-deletes related flashcards.

---

## Database Schema

See [ARCHITECTURE.md](ARCHITECTURE.md#database-schema) for the full schema and version history.

---

## Utilities

### `cn(...inputs)` — `src/utils/cn.ts`

Merges Tailwind CSS class names using `clsx` + `tailwind-merge`.

### `useToast()` — `src/hooks/useToast.ts`

Toast notification hook. Returns `{ toasts, toast(options), removeToast(id) }`.

```typescript
toast({ title: 'Success', description: 'File uploaded', type: 'success' })
```
