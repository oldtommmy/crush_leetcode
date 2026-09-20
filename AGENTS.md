# AGENTS.md

Crush LeetCode is a bilingual Chrome Manifest V3 extension that turns accepted LeetCode submissions into an FSRS-based review workflow with notes, reminders, and an optional local-first sync path.

## Setup commands

- Install dependencies: `npm ci`
- Start development: `npm run dev`
- Build extension: `npm run build`
- Run tests: `npm test`
- Typecheck: `npm run typecheck`

## Project layout

- `src/background/` — service worker, alarms, notifications, reports, and remote metadata requests.
- `src/content/` — LeetCode page detection, submission bridge, accepted flow, and injected UI.
- `src/popup/` — extension popup and daily review experience.
- `src/options/` — settings, reminders, import/export, and installation checks.
- `src/library/` — standalone problem-library and company-hot-question views.
- `src/shared/` — storage, FSRS scheduling, selectors, i18n, sync, and shared UI/types.
- `src/styles/` — Tailwind entrypoint and shared design tokens.
- `public/` — extension manifest, icons, and README screenshots copied to build output.
- `scripts/` — post-build content bundling utilities.
- `tests/` — Vitest unit and integration-style coverage.

## Code style

- TypeScript is strict (`tsconfig.json` enables `strict`). Keep types explicit at storage, runtime-message, and browser API boundaries.
- Follow the existing React function-component and Tailwind utility conventions; shared visual tokens belong in `src/styles/tokens.css`.
- Keep extension storage changes backward-compatible: add defaults and normalize imported/legacy state in `src/shared/storage/chromeStorage.ts`.
- Preserve Chinese and English copy through `src/shared/i18n/messages.ts`; do not hardcode new UI copy in one locale only.
- Do not add dependencies without checking `package.json` and explaining the need.

## Testing instructions

- Run `npm run typecheck`, `npm test`, and `npm run build` for behavior or build changes.
- Add or update Vitest coverage in `tests/` for storage, scheduling, parsing, or runtime behavior changes.
- Keep test data synthetic; never use real user records, credentials, or recovery codes.

## PR and commit conventions

- Branch from `main`; do not push directly to `main`.
- Use concise conventional commits, for example `feat:`, `fix:`, `docs:`, `style:`, or `chore:`.
- Summarize UI, storage-schema, and manifest changes in the PR description and include validation commands.

## Security

- Never commit secrets, recovery codes, API keys, personal emails, or private operational endpoints.
- Treat `chrome.storage` exports as user data; preserve existing backup sanitization for sensitive sync and email settings.
- Keep external requests restricted to the manifest allowlist and avoid logging tokens or full user state.
