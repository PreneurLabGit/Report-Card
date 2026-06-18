# Salthub Report Card

Salthub Report Card is a Vercel-friendly Next.js App Router application for ingesting SaltHub exports, validating them, normalizing them into typed internal models, and previewing narrative report-card briefs for multiple audiences.

## Phase 1 scope

Phase 1 includes:

- Multi-file upload for CSV and JSON
- Schema detection and validation for supported SaltHub exports
- In-browser normalization into typed internal models
- Dataset preview and validation summary
- Audience-specific report-card previews for User, Manager, Leader, Department Lead, and ELT
- Deterministic score bands with print-friendly rendering

Phase 2 is intentionally deferred for:

- Friction-note ingestion
- Friction clustering and theme analysis
- Bottleneck summaries
- Decisions / asks generation
- LLM-driven narrative enrichment

## Supported files

Supported CSV files:

- `action_logs.csv`
- `project_fees_by_department_by_month.csv`
- `department_breakdown_report.csv`
- `client_summary_report.csv`
- User directory CSV with `email` and optional hierarchy fields

Supported JSON files:

- User directory JSON with a top-level `users` array, or a raw array of user objects
- Analytics payload JSON with `users`, `managers`, `summary`, and/or `metadata`

Unsupported CSV/JSON uploads fail gracefully with explicit messages in the UI.

## Architecture

The app is organized for later extension rather than a one-off upload page:

- `src/ingestion/`: file-format detection and CSV/JSON parsing
- `src/schemas/`: Zod contracts for supported inputs
- `src/normalization/`: conversion from raw uploads into normalized dataset models
- `src/derivation/`: deterministic score and comparison derivation
- `src/reporting/`: audience options and report view-model builders
- `src/qa/`: report-level quality checks
- `src/ui/`: upload workflow, validation views, and report previews
- `src/lib/`: shared types and formatting helpers

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful commands:

```bash
npm run lint
npm run test
npm run build
```

## Deploy to Vercel

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Use the default Next.js build settings.
4. Deploy.

No database or secret configuration is required in Phase 1.

## Assumptions

- The repository did not contain the referenced HTML/CSS/DOCX support files at implementation time.
- Phase 1 keeps uploaded data in local app state only.
- No authentication is required yet.
- Analytics JSON shape is intentionally flexible and normalized conservatively.
- Score formulas are provisional, but the score/band/label separation is stable.

## Notes

- Dynamic department columns are supported for `project_fees_by_department_by_month.csv`.
- Missing upstream sources remain explicit in the UI and are not backfilled with fake data.
- The current report narratives are deterministic placeholders and scaffolding for a later content-generation layer.
