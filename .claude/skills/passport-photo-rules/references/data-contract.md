# Passport rules data contract

The live data file is `src/data/passportRules.json` relative to the ExactSize repository root. When working from the parent workspace root, its path is `sites/exactsize/src/data/passportRules.json`. Read the live file before changing any field; this reference explains its intended semantics and does not replace the data.

## Top-level shape

- `_meta`: `schemaVersion`, `lastVerified`, description/disclaimer, permitted `ruleStatuses`, and measurement conventions.
- `sources`: unique source records with `id`, descriptive `title`, official `url`, and `checkedOn` date in `YYYY-MM-DD` format.
- `countries`: country objects with an uppercase two-letter code, a display name, and one or more `modes`.

Every mode should have a stable kebab-case `id`, a user-readable `label`, `sourceIds` that resolve to the source registry, and both `physicalPrint` and `digitalUpload` objects. When a mode has neither a supplied print nor digital image, include an appropriate `capture` or `scope` explanation instead of inventing requirements.

## Status values

- `specified`: the cited official source publishes the value stored beside the status.
- `notSpecified`: the reviewed official source does not publish this field; it is not a zero or an assumed default.
- `notApplicable`: this field does not apply to the described submission mode.
- `pathwayDependent`: more than one process exists and the correct rule depends on the centre, mission, applicant, or application path.

Put a status on each field whose presence could otherwise be mistaken for a verified rule. Do not interpret a missing field as `notApplicable`.

## Measurements and evidence

- Store `aspectRatio` as `width:height`. Store pixels as `widthPx` and `heightPx`; retain `orientation` where the source specifies it.
- Preserve the authority's file-size unit as `{ "value": number, "unit": "KB" | "MB" }`. Do not convert to bytes unless the source defines the unit convention and the implementation records that convention.
- Store print width/height in millimetres and identify head-height landmarks (for example, chin-to-crown). Do not derive pixels from millimetres.
- Keep the exact official source URL and `checkedOn` date in `sources`; put the corresponding `sourceIds` on each mode. If several pages support different fields, link each relevant page.
- Store ranges as ranges, not as an average or a guessed single point. Retain eligibility scope in the mode's `scope` field.

## Existing shape notes

The current data contains six countries and 12 modes. Its Australia `physicalPrint.size.width` and `.height` are range objects; other entries use scalar dimensions. Before writing UI or validators that consume print sizes, normalize this representation in a deliberate, tested schema change rather than silently assuming one shape. Canada's portrait digital dimensions are stored width:height 2:3, derived from 1,200 × 1,800 through 3,000 × 4,500 px; the authority words this as a 3:2 ratio with portrait camera orientation.

Digital fields already used include `format`, `fileSize`, `dimensions`, `aspectRatio`, `faceHeightPercent`, `photoAgeMaxMonths`, `cropping`, `colourRequired`, and an official checker link. Add a field only when it is sourced and useful to the feature. Preserve exceptions and negative constraints, especially restrictions on image editing.
