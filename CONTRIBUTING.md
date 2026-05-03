# Contributing to ExamHelper AI

Thanks for contributing.
This guide defines the workflow and quality bar for pull requests.

## Prerequisites

- Node.js 18+
- npm 9+
- Git

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

3. Start dev server:

```bash
npm run dev
```

## Development Workflow

1. Create a feature branch from main.
2. Make focused, minimal changes.
3. Run checks before opening a pull request.
4. Open PR with clear summary and testing notes.

Recommended branch naming:

- feat/short-description
- fix/short-description
- docs/short-description
- refactor/short-description

## Quality Checks

Run before every PR:

```bash
npm run lint
npm run build
```

If your change affects behavior, include manual test steps in the PR description.

## Code Guidelines

- Keep changes scoped to the requested feature/fix.
- Follow the existing React + Zustand patterns in the repository.
- Preserve naming consistency and folder conventions.
- Prefer small reusable components over duplicated page logic.
- Keep AI response handling defensive (null checks and parse safety).

## Documentation Guidelines

When you change behavior, update docs in the same PR:

- README.md for setup, scripts, and user-facing changes
- docs/ARCHITECTURE.md for structural/runtime changes
- Inline comments only where logic is non-obvious

## Pull Request Checklist

- [ ] Feature/fix is scoped and complete
- [ ] Lint passes locally
- [ ] Production build succeeds
- [ ] Docs updated where relevant
- [ ] No secrets committed (.env keys, tokens, credentials)
- [ ] Screenshots added for UI changes

## Reporting Issues

Open an issue with:

- clear problem statement
- steps to reproduce
- expected vs actual behavior
- browser, OS, and environment details
- console errors (if any)

## Security

- Never commit API keys or credentials.
- Treat AI provider outputs as untrusted input.
- Keep dependencies updated and avoid unmaintained packages.
