# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.0.x | ✅ Active |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue.
2. Email the maintainer directly with a description of the vulnerability, steps to reproduce, and potential impact.
3. Allow up to 72 hours for an initial response.

## Security Practices

### API Keys

- API keys are stored in `.env.local`, which is listed in `.gitignore` and never committed.
- All API keys are prefixed with `NEXT_PUBLIC_` because they are used client-side. This is a known trade-off of the local-first architecture.
- If you suspect a key has been exposed, rotate it immediately at the provider's dashboard.

### AI Output Handling

- All AI-generated responses are treated as **untrusted input**.
- JSON responses pass through a multi-stage extraction and validation pipeline (`extractJSON` in `aiService.ts`).
- Generated markdown is rendered with `react-markdown`, which sanitizes HTML by default.

### Authentication

- Supabase handles password hashing and session management.
- Auth tokens are managed by the Supabase client SDK and stored in browser storage.
- A 15-second timeout prevents indefinite hangs if Supabase is unreachable.

### Data Storage

- All study data is stored locally in IndexedDB. No user data is sent to any server other than the configured AI provider.
- The Supabase integration is limited to authentication only — no user content is stored in Supabase.

### Dependencies

- Run `npm audit` regularly to check for known vulnerabilities.
- Keep dependencies updated, especially `@supabase/supabase-js`, `groq-sdk`, and `next`.
