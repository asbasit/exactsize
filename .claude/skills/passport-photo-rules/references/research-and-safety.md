# Official-source research and photo safety

## Research method

1. Define the jurisdiction and exact application pathway before gathering measurements. A country may use different rules for paper applications, online renewals, child applications, in-person service centres, or overseas missions.
2. Search for the issuing authority's current pages, open the pages themselves, and record titles, URLs, and the date checked. Use a second official page when a workflow page points to separate photo specifications. Avoid relying on result snippets, third-party summaries, or generic ICAO guidance as if they were country-specific upload rules.
3. For each mode, extract only the published fields: supplied-vs-captured photo, file format, file-size range and units, pixel limits, aspect ratio and orientation, face/head range, photo age, print dimensions, copies, paper, and alteration restrictions. Mark unsupported fields `notSpecified`.
4. Cross-check ambiguous units, min/max ordering, portrait notation, eligibility, and print-vs-digital differences against the exact official wording. If sources conflict or the pathway is unclear, do not choose the more convenient value. Record the conflict and keep the rule pathway-dependent until resolved.
5. Attach each rule to its source IDs and checked date. Keep the project research report synchronized when substantial country research changes the recommendation.

## Safe preflight behavior

A preflight may inspect a user's selected file locally for published technical properties such as filename extension/MIME type, byte count, image width/height, and aspect ratio. A metadata check cannot verify that a photo is recent, facially neutral, correctly lit, unaltered, professionally taken, printed on suitable paper, or accepted by a government system.

Do not alter the input or generate a passport-photo export. In particular, do not crop, resize, compress, pad, retouch, replace or blur the background, remove glasses or red-eye, apply filters, or use AI editing. This rule is stricter than ExactSize's general-purpose compressor because some passport authorities explicitly reject modified or cropped files. Do not invoke `fitToSize`, `coverCrop`, or canvas-based encoder code for passport checks.

Keep processing in the browser and do not upload the image. If an authority prohibits editing or requires a camera-original file, warn that the existing compressor can change the file and provide the official checker or application link. Show technical results as advisory only, with no pass/fail claim about final acceptance.

## Implementation boundary

Keep passport rules in `src/data/passportRules.json`. If the user requests a checker, isolate its pure metadata validation in `src/lib/passportPreflight.js` and its controls in `src/components/PassportPhotoPreflight.astro`; do not change `src/lib/fit.js` or `src/components/Tool.astro` to reuse compression behavior. Make route content static-rendered from the data and include source links and the advisory note.

Test lower/upper boundaries, wrong orientation/aspect ratio, unsupported format, unknown values, and modes where digital upload is not applicable or is pathway-dependent. Confirm that selecting a file does not create or download a transformed image. Preserve a clear distinction between verified data, user guidance, and properties the software cannot check.
