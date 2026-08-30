# Environment Variables

This document lists every environment variable recognized by ExamHelper AI.

## Quick Setup

1. Copy the template:
   ```bash
   cp .env.example .env.local      # macOS/Linux
   Copy-Item .env.example .env.local  # Windows PowerShell
   ```
2. Fill in values below.
3. Restart the dev server after changes.

> The app runs in demo mode if no variables are set.

---

## Groq API Keys

Task-isolated key pools prevent rate-limit cascades. Each pool rotates keys on 429 errors.

### Notes Keys (up to 3)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_GROQ_NOTES_KEY_1` | Yes* | Primary key for note generation |
| `NEXT_PUBLIC_GROQ_NOTES_KEY_2` | No | Fallback |
| `NEXT_PUBLIC_GROQ_NOTES_KEY_3` | No | Second fallback |

### Flashcard Keys (up to 2)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_GROQ_FLASHCARD_KEY_1` | Yes* | Primary key for flashcards + diagrams |
| `NEXT_PUBLIC_GROQ_FLASHCARD_KEY_2` | No | Fallback |

### Quiz Keys (up to 2)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_GROQ_QUIZ_KEY_1` | Yes* | Primary key for quiz generation |
| `NEXT_PUBLIC_GROQ_QUIZ_KEY_2` | No | Fallback |

### Course Tutor Keys (up to 2)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_GROQ_TUTOR_KEY_1` | No | Primary key for tutor RAG (falls back to Notes pool) |
| `NEXT_PUBLIC_GROQ_TUTOR_KEY_2` | No | Fallback |

> *At least one key across any pool enables AI generation. Zero keys = demo mode.

Get keys at [console.groq.com](https://console.groq.com) → API Keys.

---

## Supabase Authentication (Optional)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | No | Project URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Anonymous/public key |

If missing, auth falls back to demo mode (auto-login).

Get credentials at [supabase.com](https://supabase.com) → Settings → API.

---

## Example `.env.local`

```env
# Groq (https://console.groq.com)
NEXT_PUBLIC_GROQ_NOTES_KEY_1=gsk_...
NEXT_PUBLIC_GROQ_FLASHCARD_KEY_1=gsk_...
NEXT_PUBLIC_GROQ_QUIZ_KEY_1=gsk_...
NEXT_PUBLIC_GROQ_TUTOR_KEY_1=gsk_...

# Supabase (optional)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```
