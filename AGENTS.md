# AGENTS.md

This file provides practical working guidance for coding agents (Codex, Claude Opus, and similar tools) in this repository.

## Repository overview
- Stack: Nuxt 4 + Electron + Go services + Go scanner utility.
- Key folders:
  - `app/` — Nuxt UI and shared frontend utilities.
  - `server/` — Nuxt/Nitro server routes and middleware.
  - `electron/` — Electron main/preload utilities.
  - `go/` — Go HTTP/WebSocket backend.
  - `scanner/` — standalone Go scanner process.

## Working rules
- Prefer small, targeted changes and keep behavior backward-compatible unless asked otherwise.
- Add or update tests with every non-trivial change.
- Keep security-sensitive logic explicit (auth/session checks, secrets, integrity checks).
- Do not introduce new dependencies unless necessary.

## Testing expectations
- For Go backend changes:
  - Run: `cd go && go test ./...`
- For scanner changes:
  - Run: `cd scanner && go test ./...`
- For Electron TypeScript changes:
  - Run: `npm run build:electron`
- For Nuxt/server/frontend changes:
  - Run: `npm run build:nuxt`

## Test authoring guidance
- Go tests: table-driven tests where possible.
- TypeScript tests:
  - Use Node's built-in test runner (`node:test`) + `node:assert/strict` for lightweight utility tests.
  - Keep tests deterministic and free of external network calls.

## PR quality bar
- Include:
  1. What changed.
  2. Why it changed.
  3. Exact verification commands run.
- Avoid broad refactors in bug-fix PRs unless explicitly requested.
