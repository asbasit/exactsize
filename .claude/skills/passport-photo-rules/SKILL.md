---
name: passport-photo-rules
description: Research, encode, and maintain official passport-photo requirements for ExactSize. Use when adding a country or submission pathway, reviewing passport photo constraints, updating passportRules.json, or implementing the project's non-destructive passport-photo preflight.
---

# Passport Photo Rules for ExactSize

## Purpose and current checkpoint

Maintain country- and submission-mode-specific passport-photo guidance for the ExactSize Astro site. Prefer official, verifiable sources and make uncertainty explicit. Keep automated checks non-destructive and advisory.

Locate the site root from the current directory. If `src/data/passportRules.json` exists, use the current directory as the repository root. If `sites/exactsize/src/data/passportRules.json` exists, use `sites/exactsize/` as the repository root. Read that root's `README.md`, `src/data/passportRules.json`, and relevant source/tests. When the surrounding UtilityPages workspace is available, also read its `CLAUDE.md` and `research/passport-photo-rules-six-markets-2026.md`.

The current checkpoint has a local Git repository in `sites/exactsize` tracking `origin/main`; the rules data contains six countries and 12 modes. The same skill is installed at the workspace root for parent-folder sessions and inside the repository for cloned/repository sessions. Treat the repository copy as canonical for GitHub; keep both copies in sync when changing the skill.

## Workflow

1. **Confirm scope.** Identify the requested country, passport pathway, and submission mode (paper, online, in-person capture, overseas mission, or another explicit process). Distinguish passport requirements from visa, ID-card, or driver's-licence rules. Ask only when an unresolved pathway would materially change the rules.
2. **Research official sources.** Use current government or issuing-authority pages and open the source itself; do not rely on search snippets. Check rules for the exact mode. Record source title, URL, and checked date. Resolve units, portrait/landscape notation, ranges, eligibility, and exceptions before encoding them. If evidence is incomplete or conflicting, preserve the uncertainty as `notSpecified` or `pathwayDependent` and explain it; never fill gaps by inference.
3. **Update the data model.** Treat `<site-root>/src/data/passportRules.json` as the source of truth; prefix `sites/exactsize/` only when working from the parent workspace. Keep print and digital requirements separate, attach source IDs to every mode, preserve source units, and explicitly mark unknown or inapplicable fields. Read `references/data-contract.md` before changing the schema. Run `scripts/validate_passport_rules.py` after every data update.
4. **Implement separately from compression.** If asked to build the checker, create a pure `src/lib/passportPreflight.js`, a separate `src/components/PassportPhotoPreflight.astro`, static guide routes under `src/pages/passport-photos/`, and focused tests under `test/`. Do not fold passport logic into `src/lib/fit.js` or the existing `Tool.astro` compressor. Read `references/research-and-safety.md` before implementing image handling.
5. **Validate and report.** Run the data validator, add/update tests for every machine-checkable published bound and each unknown-status case, then run `npm test` and `npm run build` when the local toolchain is available. Report checks that could not be run. Preserve Git history and unrelated changes. Do not stage, commit, push, publish, register a domain, or change hosting unless the user explicitly asks.

## Non-negotiable product safeguards

- Never crop, resize, recompress, pad, retouch, replace backgrounds, apply filters, or generate an export in the passport preflight. Do not reuse the compressor's output path for passport requirements.
- Keep selected photo files on-device. Limit checks to file metadata and dimensions that the source publishes; do not upload images to a server.
- Do not claim approval, compliance, or guaranteed acceptance. Label results as an advisory preflight and link to the authority's official application or checker.
- Do not infer pixel dimensions from print measurements or infer image properties that the tool cannot measure reliably.
- Preserve source recency. Re-verify affected official pages before updating rules; do not treat the skill's creation date as a future source-verification date.

## References and helper

- Read `references/data-contract.md` when editing `passportRules.json` or designing code that consumes it.
- Read `references/research-and-safety.md` before researching new jurisdictions or handling photos.
- Use `scripts/validate_passport_rules.py [path]` to check JSON syntax, required structure, statuses, dates, and source references. It discovers the data file from either the parent workspace root or repository root by default.
