# Salthub Report Card

Salthub Report Card is a Vercel-friendly Next.js App Router application for ingesting SaltHub exports, validating them, normalizing them into typed internal models, and previewing narrative report-card briefs for multiple audiences.

## Current scope

Phase 1 foundation includes:

- Multi-file upload for CSV and JSON
- Schema detection and validation for supported SaltHub exports
- In-browser normalization into typed internal models
- Dataset preview and validation summary
- Audience-specific report-card previews for User, Manager, Leader, Department Lead, and ELT
- Deterministic score bands with print-friendly rendering

Phase 2 currently includes:

- Friction-note ingestion from CSV and JSON
- Deterministic friction-note normalization and audience-scoped rollups
- Theme grouping and ranking with frequency / breadth prioritization
- Manager quote-block rendering with empty state when no note exists
- Leader aggregated top-theme summaries
- Department Lead top three friction themes with `Platform` / `Capability` / `Behavioral` labels
- ELT bottleneck summary plus evidence-gated decisions / asks
- Privacy guardrails to avoid raw IDs, emails, and overexposed raw note content

Phase 3 currently includes:

- File-backed persistence for local development with a production-ready server-side persistence abstraction
- Authenticated access with role-based workflow gates for `admin`, `uploader`, `reviewer`, and `publisher`
- Persisted upload batches, uploaded file metadata, report versions, review actions, and audit events
- Reporting period model with historical comparison notes in generated report versions
- Draft generation, approval, publishing, and versioned regeneration
- Separate web preview and email-safe HTML renderer
- Grounded narrative provider abstraction layered on top of deterministic report building
- SaltHub-style neutral enterprise application shell instead of the earlier editorial prototype layout

Still intentionally deferred:

- External production database adapter wiring such as Vercel Postgres / Blob or Supabase credentials
- Direct email send integration
- Full provider-backed LLM implementation beyond the deterministic grounded provider
- The missing HTML/CSS/DOCX reference assets, which still were not present in the workspace

## Supported files

Supported CSV files:

- `action_logs.csv`
- `project_fees_by_department_by_month.csv`
- `department_breakdown_report.csv`
- `client_summary_report.csv`
- `friction_notes.csv`
- User directory CSV with `email` and optional hierarchy fields

Supported JSON files:

- Friction notes JSON with a top-level `friction_notes` or `notes` array, or a raw array of canonical note records
- User directory JSON with a top-level `users` array, or a raw array of user objects
- Analytics payload JSON with `users`, `managers`, `summary`, and/or `metadata`

Unsupported CSV/JSON uploads fail gracefully with explicit messages in the UI.

## Authentication

The current implementation ships with local demo accounts for development:

- `admin@salthub.local` / `admin123`
- `uploader@salthub.local` / `upload123`
- `reviewer@salthub.local` / `review123`
- `publisher@salthub.local` / `publish123`

Sessions are stored server-side and sent through an HTTP-only cookie.

## Architecture

The app is organized for later extension rather than a one-off upload page:

- `src/ingestion/`: file-format detection and CSV/JSON parsing
- `src/schemas/`: Zod contracts for supported inputs
- `src/normalization/`: conversion from raw uploads into normalized dataset models
- `src/derivation/`: deterministic score, comparison, and friction-theme derivation
- `src/reporting/`: audience options and report view-model builders
- `src/templates/`: browser preview renderers aligned to future email-safe adaptation
- `src/qa/`: report-level quality checks
- `src/ui/`: upload workflow, validation views, and report previews
- `src/lib/`: shared types and formatting helpers
- `src/lib/server/`: persistence, auth, workflow orchestration, and renderer/provider abstractions
- `src/app/api/`: route handlers for login, uploads, report generation, workflow transitions, and email export

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Local persistence writes to `data/`, which is gitignored.

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

No external database or secret configuration is required for local development.
For real production persistence on Vercel, swap the local adapter in `src/lib/server/store.ts` for a Postgres/Blob-backed implementation.

## Assumptions

- The repository did not contain the referenced HTML/CSS/DOCX support files at implementation time.
- Uploaded data is persisted locally through a file-backed adapter during development.
- Authentication is implemented as a local credential/session system and should be replaced or federated for real production identity.
- Analytics JSON shape is intentionally flexible and normalized conservatively.
- Score formulas are provisional, but the score/band/label separation is stable.
- Deterministic theme grouping uses conservative keyword/rule matching as the pre-LLM foundation.

## Notes

- Dynamic department columns are supported for `project_fees_by_department_by_month.csv`.
- Missing upstream sources remain explicit in the UI and are not backfilled with fake data.
- Manager friction sections only render the manager's own note or a safe empty state.
- Leader, Department Lead, and ELT friction sections render only when actual friction-note data exists.
- Generated narratives are optional and grounded; deterministic metrics remain the source of truth.
- Regeneration creates a new report version instead of overwriting the existing published history.
