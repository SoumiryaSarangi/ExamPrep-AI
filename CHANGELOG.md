# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.1.0] — 2026-08-31

### Added

- **Course Tutor** — conversational AI tutor accessible from each course page (`/app/courses/[id]/tutor`). Answers student questions using only the documents uploaded for that course; refuses to guess when the answer is not in the materials.
- **Client-side RAG pipeline** — full retrieval-augmented generation stack running entirely in the browser: `@huggingface/transformers` for embedding generation (no server, no additional API calls), Dexie `embeddings` table for vector storage, chunker/indexer/retrieval modules in `src/lib/embeddings/`.
- **Source citations** — every grounded tutor answer displays "Sourced from:" chips naming the exact document and section the answer was drawn from.
- **Conversational follow-up** — the tutor passes the last several turns of chat history as context when retrieving and generating, so follow-up questions work naturally.
- **KaTeX math rendering** — LaTeX equations (`\(...\)` and `\[...\]`) in AI-generated content are typeset as proper math via KaTeX (remark-math + rehype-katex) in both Notes and the Course Tutor.
- **Accent color picker** — in-app UI control (next to the theme toggle in the sidebar) for switching the primary accent color between several curated options; preference is persisted in `localStorage`.

### Infrastructure

- `.npmrc`: `onnxruntime-node-install=skip` to prevent native binary download on install
- `next.config.mjs`: webpack aliases `onnxruntime-node$` and `sharp$` to `false` for browser compatibility with `@huggingface/transformers`
- Dexie schema v5/v6: `embeddings` table with `documentId`, `courseId`, `sectionIndex` indexes
- `src/lib/embeddings/`: `embedder.ts`, `chunker.ts`, `indexer.ts`, `retrieval.ts`

---

## [1.0.0] — 2026-05-04

### Added

- **Next.js App Router migration** — Replaced Vite + React Router with Next.js 15 App Router and TypeScript
- **Section-by-section note generation** — Documents are split into logical sections; notes are generated independently per section for full content coverage
- **Flashcard system** — On-demand generation of 30 flashcards with SM-2 spaced repetition scheduling
- **Quiz system** — 15-question multiple-choice quizzes generated on upload, with "generate more" support
- **Exam mode** — Timed, full-length practice exams with scoring and answer review
- **Diagram generation** — Mermaid.js mind maps and flowcharts generated from lecture content
- **Weak area tracker** — Per-topic performance tracking from quiz results with targeted practice quizzes
- **Task-isolated API key pools** — Separate Groq key pools for notes, flashcards, and quizzes with automatic rotation on rate limits
- **Demo mode** — Full app functionality with sample data when no API keys are configured
- **Supabase authentication** — Optional email/password auth with demo-user fallback
- **PDF and PPTX parsing** — Client-side text extraction using PDF.js and JSZip
- **Python PPTX preprocessor** — Standalone CLI script for offline extraction of large PowerPoint files
- **Dark theme UI** — Linear-style dark design with amber primary and purple accent colors
- **Course organization** — Group documents and materials under named courses
- **Progress dashboard** — Study statistics with charts (Recharts)

### Infrastructure

- TypeScript across all source files
- Zustand for state management
- Dexie (IndexedDB) for local-first data persistence
- shadcn/ui component library (Radix + Tailwind)
- ESLint + TypeScript compiler checks
