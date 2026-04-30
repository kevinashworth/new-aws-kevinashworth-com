# Development Notes

This repo contains the source for my Astro-based personal website and blog. The public-facing `README.md` is kept concise; this file is for developer tooling, workflow, and formatting details.

## Formatting

This project uses two formatters:

- `oxfmt` for supported source files
- `prettier` for `.astro` and remaining files

Scripts:

- `npm run format` — run `oxfmt` then `prettier`
- `npm run format:check` — check formatting without writing changes
- `npm run format:oxc` — run only `oxfmt`
- `npm run format:oxc:check` — check only `oxfmt`
- `npm run format:prettier` — run only `prettier`
- `npm run format:prettier:check` — check only `prettier`

Aliases:

- `npm run fmt` → `npm run format:oxc`
- `npm run fmt:check` → `npm run format:oxc:check`

## Linting and checks

- `npm run lint` — run `oxlint`
- `npm run lint:fix` — auto-fix lint issues
- `npm run check:astro` — run Astro diagnostics
- `npm run check:types` — run TypeScript checks
- `npm run check:spell` — run spellcheck with `cspell`

Install CSpell globally. See <https://cspell.org/docs/installation>. If CSpell is not installed globally, use `npx cspell --config cspell.json --no-progress --relative .`.

## Notes

- Keep [README.md](./README.md) public-oriented and focused on the project overview.
- Keep this file for internal workflow guidance and developer tooling details.

## Useful commands

- `npm run dev` — start local development server
- `npm run build` — build the site for production
- `npm run preview` — preview the built site locally

## Deployment

Build output is static files in `dist/`. Deployment commands are intentionally kept out of the public-facing README.

For reference, see: <https://docs.astro.build/en/guides/deploy/>
