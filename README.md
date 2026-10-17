# ExactSize (working name)

Compress an image to an exact file size (max KB, optional min KB, optional exact pixels). Runs in the browser; nothing is uploaded.

- `npm install` (node_modules, dist and .astro are set to be ignored by Dropbox)
- `npm test` runs the size-search tests (test/fit.test.js)
- `npm run dev` for a local preview at http://localhost:4321, `npm run build` for the static site in dist/

Key files: `src/lib/fit.js` (engine), `src/components/Tool.astro` (UI), `src/data/sizes.json` (size pages and their copy, with last-checked date).
