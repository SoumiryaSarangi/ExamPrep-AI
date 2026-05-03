# ExamHelper AI

ExamHelper AI is now a Next.js + TypeScript study platform that turns lecture materials into exam-ready resources.

Upload a PDF or PowerPoint, extract text in the browser, and generate:
- structured notes
- flashcards
- quizzes
- Mermaid diagrams

The app is local-first (IndexedDB), supports optional Supabase auth, and can run in demo mode without AI keys.

## Features

- Next.js App Router architecture
- TypeScript-based codebase across app logic and UI
- shadcn-style UI components (Radix + Tailwind)
- Client-side document parsing for PDF and PPT/PPTX files
- AI generation pipeline with Gemini primary and Groq fallback
- Automatic material generation: notes, flashcards, quizzes, diagrams
- Spaced repetition support for flashcards
- Course-based organization for documents and generated materials
- Optional Supabase authentication with demo-user fallback

## Tech Stack

- Frontend: Next.js 15, React 18, TypeScript
- State: Zustand
- Styling: Tailwind CSS, Radix UI
- Local storage: Dexie (IndexedDB)
- AI providers: Google Gemini, Groq
- Parsing: PDF.js, JSZip
- Visuals: Mermaid

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:

```bash
cp .env.example .env.local
```

Set values in `.env.local`:

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Notes:
- You can leave AI keys empty and still run in demo mode.
- If Supabase variables are missing, auth automatically falls back to demo mode.

### 3. Start development server

```bash
npm run dev
```

Then open http://localhost:3000.

## Available Scripts

- `npm run dev`: Start local Next.js dev server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run lint checks
- `npm run type-check`: Run TypeScript check

## Optional PPTX Pre-Processing Script

For large PPTX files, use the standalone Python extractor in [scripts/README.md](scripts/README.md):

```bash
cd scripts
pip install -r requirements.txt
python extract_pptx.py "D:\path\to\pptx\folder"
```

This generates `master_extracted_text.txt` for higher-coverage AI input.

## Project Structure

```text
app/                  # Next.js app router routes/layouts
src/
  components/
    layout/           # App shell and navigation
    providers/        # Client providers
    ui/               # shadcn-style UI components
  hooks/              # Custom React hooks
  lib/
    ai/               # AI prompts and generation service
    generators/       # Algorithms (e.g., spaced repetition)
    parsers/          # PDF/PPT parsing
    db.ts             # IndexedDB schema and setup
    supabase.ts       # Supabase client and demo-mode detection
  pages/              # Screen components used by app routes
  stores/             # Zustand stores
  utils/              # Utility helpers
scripts/              # Python preprocessing scripts
```

## Documentation

- Architecture: docs/ARCHITECTURE.md
- Contributing guide: CONTRIBUTING.md

## License

No license file is currently included in this repository.
If you plan to open-source this project, add a LICENSE file (for example MIT).
