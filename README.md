# Salthub Report Card

Salthub Report Card is now an API-first Next.js app for generating Account Management report previews from the SaltHub APIs. The current primary flow is:

1. choose a reporting date range
2. fetch the SaltHub organization tree and activity summary server-side
3. generate eligible Account Management hierarchy report cards
4. review the final HTML preview

This build intentionally excludes email sending, AI-generated copy, server-side persistence, and review/publish workflows.

## API-first flow

The app reads these server-side environment variables:

- `All_Users_API_Key`
- `Users_Activity_API_Key`
- `API_Secret_Key`

The main page:

- accepts `start_date` and `end_date`
- fetches the organization tree and current-period activity summary
- fetches the immediately preceding equal-length period for comparison readiness
- filters to users whose own `department === "Account Management"`
- supports only these roles in the current release:
  - `team_member`
  - `business_owner`
  - `super_admin`
- builds hierarchy-scoped reports with these rules:
  - `team_member`: own activity only, and only when they have activity in the selected period
  - `business_owner`: direct eligible `team_member` activity rollup, with empty-state reports when no child activity exists
  - `super_admin`: direct eligible `business_owner` personal-activity rollup, with empty-state reports when no child activity exists
- surfaces missing fields instead of fabricating unavailable metrics

Current API-first limitations:

- no SendGrid sending yet
- no AI-generated lede/observation yet
- no official score formula yet, so score/prior-score/delta remain unavailable
- no database or historical persistence

## What the UI does

The main page now provides:

- report configuration with `start_date` and `end_date`
- API fetch and generation
- generated report dashboard table
- exact HTML preview for a selected user
- missing-field warnings

## Architecture

The code stays modular even though the UI is simple:

- `src/app/api/report-cards/route.ts`: server-owned report generation endpoint
- `src/lib/salthub-api.ts`: SaltHub API client
- `src/schemas/`: Zod validation contracts
- `src/reporting/`: API report builder and preview rendering
- `src/ui/`: API-first report generation and preview experience
- `src/lib/`: shared domain types and formatting

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

## Notes

- The primary generation path is API-first and keeps external credentials off the client.
- Only users whose own department is exactly `Account Management` are eligible in the current release.
- Only `team_member`, `business_owner`, and `super_admin` are enabled for report generation right now.
- The current product flow uses the SaltHub APIs only.
