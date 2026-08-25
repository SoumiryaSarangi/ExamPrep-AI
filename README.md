<p align="center">
  <h1 align="center">SenseiAI</h1>
  <p align="center">
    AI-powered study platform that transforms lecture slides into notes, flashcards, quizzes and exam practice — built for BTech students.
    <br />
    <a href="docs/ARCHITECTURE.md"><strong>Architecture »</strong></a> ·
    <a href="docs/ENVIRONMENT.md"><strong>Environment Setup »</strong></a> ·
    <a href="docs/API_REFERENCE.md"><strong>API Reference »</strong></a>
  </p>
</p>

---

## Overview

**SenseiAI** is a comprehensive, local-first web application engineered specifically to help students study smarter, not harder. By simply uploading your PDF or PowerPoint lecture slides, SenseiAI leverages state-of-the-art Large Language Models (GPT-OSS 20B via Groq) to automatically generate highly structured, exam-ready study materials in seconds. 

Designed with a premium dark-mode aesthetic and engineered for privacy and speed, SenseiAI stores your personal study data locally in your browser via IndexedDB.

### What It Does

| Upload a file | Get study materials |
|---|---|
| PDF or PPTX lecture slides | **Notes** — comprehensive, section-by-section markdown summaries |
| | **Flashcards** — exactly 30 targeted cards with SM-2 spaced repetition scheduling |
| | **Quizzes** — 15 rigorous multiple-choice questions with detailed explanations |
| | **Exam Mode** — full-length timed practice exams simulating real test conditions |

### Key Capabilities

- **Section-by-section note generation** — documents are automatically split into logical sections; notes are generated independently per section for maximum quality and granular coverage.
- **Spaced repetition** — flashcards use the proven SM-2 algorithm to schedule reviews at optimal intervals for maximum retention.
- **Weak area tracking** — AI analyzes your quiz results per-topic, actively identifying your weakest subjects and creating targeted practice sessions.
- **Exam mode** — timed, simulated practice exams designed to build testing speed and confidence.
- **Dual runtime modes** — fully offline in demo mode, or add your Groq API keys for blazing-fast live AI generation.
- **Optional authentication** — Supabase auth integration with an automatic demo-user fallback system.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| UI Components | [Radix UI](https://www.radix-ui.com/) + [Tailwind CSS](https://tailwindcss.com/) (shadcn/ui pattern) |
| State Management | [Zustand](https://zustand-demo.pmnd.rs/) |
| Local Storage | [Dexie](https://dexie.org/) (IndexedDB) |
| AI Providers | [Groq](https://console.groq.com/) (GPT-OSS 20B) |
| Document Parsing | [PDF.js](https://mozilla.github.io/pdf.js/), [JSZip](https://stuk.github.io/jszip/) |
| Visualizations | [Mermaid](https://mermaid.js.org/), [Recharts](https://recharts.org/) |
| Authentication | [Supabase](https://supabase.com/) (optional) |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm 9+
- (Optional) API keys — see [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for details

### 1. Clone and install

```bash
git clone <repository-url>
cd exam-helper-ai
npm install
```

### 2. Configure environment

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

```bash
# macOS / Linux
cp .env.example .env.local
```

Open `.env.local` and add your API keys. See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for the full list of supported variables.

> **Note:** You can skip this step entirely. The app runs in demo mode with sample data when no keys are configured.

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create an optimized production build |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint checks |
| `npm run type-check` | Run TypeScript compiler checks (no emit) |

## Project Structure

```text
exam-helper-ai/
├── src/
│   ├── app/                    # Next.js App Router (routes + layouts)
│   │   ├── layout.tsx          # Root layout (metadata, providers)
│   │   ├── page.tsx            # Landing page
│   │   ├── login/              # /login route
│   │   ├── register/           # /register route
│   │   └── app/                # /app/* (protected routes)
│   │       ├── layout.tsx      # Auth guard + sidebar layout
│   │       ├── page.tsx        # Dashboard
│   │       ├── courses/        # Course list + detail
│   │       ├── upload/         # Document upload
│   │       ├── notes/          # Note viewer
│   │       ├── flashcards/     # Flashcard study
│   │       ├── quiz/           # Quiz mode
│   │       ├── exam/           # Exam mode
│   │       └── diagrams/       # Diagram viewer
│   ├── components/
│   │   ├── layout/             # App shell (sidebar, header)
│   │   ├── providers/          # Client-side providers
│   │   └── ui/                 # Reusable UI primitives (shadcn-style)
│   ├── hooks/                  # Custom React hooks
│   ├── lib/
│   │   ├── ai/                 # AI service + prompt templates
│   │   ├── generators/         # Algorithms (spaced repetition)
│   │   ├── parsers/            # PDF + PPTX text extraction
│   │   ├── db.ts               # IndexedDB schema (Dexie)
│   │   ├── supabase.ts         # Supabase client + demo detection
│   │   └── weakAreaTracker.ts  # Per-topic performance tracking
│   ├── pages/                  # Page-level React components
│   ├── stores/                 # Zustand state stores
│   └── utils/                  # Shared utility functions
├── scripts/                    # Python preprocessing tools
├── docs/                       # Project documentation
├── public/                     # Static assets
└── .env.example                # Environment variable template
```

## Optional: PPTX Pre-Processing

For very large PowerPoint files (80+ slides), the browser-based parser may be slow. A standalone Python script is provided for offline extraction:

```bash
cd scripts
pip install -r requirements.txt
python extract_pptx.py "D:\path\to\pptx\folder"
```

See [scripts/README.md](scripts/README.md) for details.

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, module map, extension guide |
| [Environment Setup](docs/ENVIRONMENT.md) | All environment variables with descriptions and defaults |
| [API Reference](docs/API_REFERENCE.md) | Exported functions, store interfaces, and database schema |
| [Contributing](CONTRIBUTING.md) | Development workflow, PR checklist, coding standards |
| [Changelog](CHANGELOG.md) | Version history and notable changes |
| [Security](SECURITY.md) | Security practices and vulnerability reporting |

## License

This project is licensed under the [MIT License](LICENSE).
