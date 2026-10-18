# ExactSize (working name)

Compress an image to an exact file size (max KB, optional min KB, optional exact pixels). Runs in the browser; nothing is uploaded.

- `npm install` (node_modules, dist and .astro are set to be ignored by Dropbox)
- `npm test` runs the size-search and passport-preflight tests in `test/`
- `npm run dev` for a local preview at http://localhost:4321, `npm run build` for the static site in `dist/`

Key files: `src/lib/fit.js` (image-size engine), `src/components/Tool.astro` (compressor UI), `src/data/sizes.json` (size pages), and `src/data/passportRules.json` (source-linked passport guidance).

## Passport-photo preflight

`/passport-photos/` provides country- and application-path-specific guidance for the six countries in `src/data/passportRules.json`. `src/lib/passportPreflight.js` and `src/components/PassportPhotoPreflight.astro` implement an advisory, metadata-only check in the browser; the file is not uploaded or modified. File-size limits remain manual because the dataset does not specify the issuing sources' KB/MB-to-byte convention. The UI and rules-maintenance workflow are documented in `.claude/skills/passport-photo-rules/SKILL.md`.
