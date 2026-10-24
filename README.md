# Chat Disclosure Linter
Live page: https://aamirtechs.github.io/chat-disclosure-linter/

Lint chat transcripts for required debt relief disclosures and prohibited claims, with line level evidence, before QA ever opens the conversation. A chat floor produces far more text than any QA team can sample. This linter checks every conversation against the same rule pack, with evidence a supervisor can act on.

Disclaimer: This is a QA and compliance-support tool, not legal advice. A lint pass does not prove a conversation was compliant.

## Features
- Rule pack editable in the UI as JSON: required disclosures and prohibited claim patterns, each with keyword and regex patterns
- Required disclosures checked only against agent messages: recording notice, program is not a loan, fees only after settlement, timeline range, and credit impact warning
- Prohibited patterns flagged in agent messages with line numbers and the exact evidence quote: guaranteed savings, government program, and unqualified percentage promises
- Per-conversation score plus aggregate counts by rule
- Feedback loop per hit: mark acceptable in context with a reason, excluded from the fail count but kept in the report, plus a downloadable report CSV
## How it works
Paste a transcript with Agent: and Customer: lines, or upload a .txt or .json transcript. Edit the rule pack JSON if your program wording differs. The tool checks required disclosures in agent messages only, flags prohibited patterns with line numbers and quotes, applies your acceptable-in-context feedback, and exports a report CSV. It runs entirely in the browser.

## Privacy
Runs 100% in your browser. Your files never leave this device, nothing is uploaded,
and there is no tracking.

## Development
Core logic lives in `src/logic.js` and is shared by the page and the tests.
Run the tests with `npm test`.

## License
MIT, Copyright 2026 Amir Hussain.
