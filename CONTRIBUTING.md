# Contributing to ExamHelper AI

Thank you for your interest in contributing. This guide covers the workflow, standards, and expectations for pull requests.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Documentation Guidelines](#documentation-guidelines)
- [Reporting Issues](#reporting-issues)
- [Security](#security)

---

## Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **npm** 9+
- **Git** ([download](https://git-scm.com/))
- (Optional) **Python 3.8+** — only if working on the PPTX extraction script

---

## Local Development Setup

1. **Fork and clone** the repository:

   ```bash
   git clone https://github.com/<your-username>/exam-helper-ai.git
   cd exam-helper-ai
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create environment file:**

   ```bash
   cp .env.example .env.local    # macOS/Linux
   Copy-Item .env.example .env.local  # Windows PowerShell
   ```

   See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for variable details. You can leave all values empty to run in demo mode.

4. **Start the dev server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

---

## Development Workflow

1. Create a feature branch from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make focused, minimal changes.

3. Run quality checks before pushing:

   ```bash
   npm run lint
   npm run type-check
   npm run build
   ```

4. Push and open a pull request with a clear summary.

### Branch Naming

| Prefix | Use Case |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code restructuring (no behavior change) |
| `chore/` | Dependency updates, tooling, CI |

---

## Coding Standards

- **TypeScript** — All new code must be TypeScript (`.ts` / `.tsx`). No `.js` files.
- **React patterns** — Use functional components with hooks. Follow existing Zustand store patterns.
- **Component design** — Prefer small, reusable components over duplicated page logic.
- **Defensive coding** — AI responses are untrusted input. Always validate, null-check, and use `extractJSON()` for parsing.
- **Naming** — Use PascalCase for components, camelCase for functions/variables, UPPER_SNAKE for constants.
- **Imports** — Use the `@/` path alias (maps to `src/`). Group imports: external → internal → relative.

---

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`, `perf`

**Examples:**

```
feat(flashcards): add "generate more" button after completing a deck
fix(auth): prevent infinite loading when Supabase key is invalid
docs(readme): update project structure tree
```

---

## Pull Request Process

### Before Opening

- [ ] Code compiles: `npm run type-check` passes
- [ ] Lint passes: `npm run lint` passes
- [ ] Build succeeds: `npm run build` completes without errors
- [ ] No secrets committed (`.env` keys, tokens, credentials)

### PR Description

Include:

1. **What** — summary of the change
2. **Why** — motivation or issue reference
3. **How** — brief implementation approach
4. **Testing** — manual test steps and/or screenshots for UI changes

### Review Criteria

- Does the change follow existing patterns?
- Are edge cases handled (empty states, errors, loading)?
- Is the change scoped to one concern?
- Are docs updated if behavior changed?

---

## Documentation Guidelines

When your change affects behavior, update documentation in the same PR:

| What Changed | Update |
|---|---|
| New/removed feature | `README.md` |
| Architecture or data flow | `docs/ARCHITECTURE.md` |
| New environment variable | `docs/ENVIRONMENT.md` + `.env.example` |
| New exported function or store | `docs/API_REFERENCE.md` |
| Inline logic that's non-obvious | Add a code comment explaining *why*, not *what* |

---

## Reporting Issues

Open a GitHub issue with:

- **Title:** Clear one-line summary
- **Description:** Steps to reproduce, expected vs. actual behavior
- **Environment:** Browser, OS, Node.js version
- **Console errors:** Copy any relevant error output
- **Screenshots:** Attach for UI issues

---

## Security

- **Never commit API keys or credentials.** Use `.env.local` (which is git-ignored).
- **Treat AI provider outputs as untrusted input.** Always validate and sanitize.
- **Keep dependencies updated.** Run `npm audit` periodically.
- For vulnerability reports, see [SECURITY.md](SECURITY.md).
