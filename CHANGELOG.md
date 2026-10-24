# Changelog

## 1.0.0 - 2026-10-23

- Rule pack editable in the UI as JSON: required disclosures and prohibited claim patterns, each with keyword and regex patterns
- Required disclosures checked only against agent messages: recording notice, program is not a loan, fees only after settlement, timeline range, and credit impact warning
- Prohibited patterns flagged in agent messages with line numbers and the exact evidence quote: guaranteed savings, government program, and unqualified percentage promises
- Per-conversation score plus aggregate counts by rule
- Feedback loop per hit: mark acceptable in context with a reason, excluded from the fail count but kept in the report, plus a downloadable report CSV
