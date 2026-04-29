# kevinashworth.com

Personal website and blog built with Astro and a few interactive React islands.

## Formatting

This project intentionally uses **two** formatters:

- `oxfmt` for fast formatting on supported file types.
- `prettier` for file types and cases `oxfmt` does not cover (including `.astro`).

Use these scripts based on intent:

- `npm run format` - run both formatters (`oxfmt` first, then `prettier`).
- `npm run format:check` - check formatting with both formatters without writing changes.
- `npm run format:oxc` - run only `oxfmt`.
- `npm run format:oxc:check` - check only `oxfmt`.
- `npm run format:prettier` - run only `prettier`.
- `npm run format:prettier:check` - check only `prettier`.

Compatibility aliases:

- `npm run fmt` -> `npm run format:oxc`
- `npm run fmt:check` -> `npm run format:oxc:check`
