<p align="center">
  <h1 align="center">ExamHelper AI</h1>
  <p align="center">
    An AI-powered study platform that transforms lecture materials into exam-ready resources.
    <br />
    <a href="docs/ARCHITECTURE.md"><strong>Architecture »</strong></a> ·
    <a href="docs/ENVIRONMENT.md"><strong>Environment Setup »</strong></a> ·
    <a href="docs/API_REFERENCE.md"><strong>API Reference »</strong></a>
  </p>
</p>

---

## Overview

ExamHelper AI is a local-first web application that lets students upload PDF or PowerPoint files and automatically generate structured study materials using large language models. All data is stored in the browser via IndexedDB — no backend server required.

### What It Does

| Upload a file | Get study materials |
|---|---|
| PDF or PPTX lecture slides | **Notes** — section-by-section markdown summaries |
| | **Flashcards** — 30 cards with spaced repetition scheduling |
| | **Quizzes** — 15 multiple-choice questions with explanations |
| | **Diagrams** — Mermaid mind maps and flowcharts |

### Key Capabilities

- **Section-by-section note generation** — documents are split into logical sections; notes are generated independently per section for higher quality and full coverage
- **Spaced repetition** — flashcards use the SM-2 algorithm to schedule reviews at optimal intervals
- **Weak area tracking** — quiz results are analyzed per-topic; a dedicated practice mode targets your weakest subjects
- **Exam mode** — timed, full-length practice exams with scoring and review
- **Dual runtime modes** — works fully offline in demo mode; add API keys for real AI generation
- **Optional authentication** — Supabase auth with automatic demo-user fallback

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| UI Components | [Radix UI](https://www.radix-ui.com/) + [Tailwind CSS](https://tailwindcss.com/) (shadcn/ui pattern) |
| State Management | [Zustand](https://zustand-demo.pmnd.rs/) |
| Local Storage | [Dexie](https://dexie.org/) (IndexedDB) |
| AI Providers | [Groq](https://console.groq.com/) (LLaMA 3.3 70B) |
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
