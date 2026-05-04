# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

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
- **Dark theme UI** — Linear-style dark design with purple accent colors
- **Course organization** — Group documents and materials under named courses
- **Progress dashboard** — Study statistics with charts (Recharts)

### Infrastructure

- TypeScript across all source files
- Zustand for state management
- Dexie (IndexedDB) for local-first data persistence
- shadcn/ui component library (Radix + Tailwind)
- ESLint + TypeScript compiler checks
