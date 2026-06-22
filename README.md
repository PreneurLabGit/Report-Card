# Salthub Report Card

Salthub Report Card is now an API-first Next.js app for generating Account Management user adoption report previews from the SaltHub APIs. The current primary flow is:

1. choose a reporting date range
2. fetch the SaltHub organization tree and activity summary server-side
3. generate eligible Account Management user report cards
4. review the final HTML preview

Upload-based generation is still available, but only as a fallback mode. This build intentionally excludes email sending, AI-generated copy, server-side persistence, and review/publish workflows.

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
- builds one previewable user report per eligible activity user
- surfaces missing fields instead of fabricating unavailable metrics

Current API-first limitations:

- no SendGrid sending yet
- no AI-generated lede/observation yet
- no official score formula yet, so score/prior-score/delta remain unavailable
- no database or historical persistence

## Supported upload types

The current first-use flow focuses on Action Logs and Downloads exports from the existing SaltHub product.

Supported Action Logs files:

- `action_logs.csv`
- `action_logs.xls`
- `action_logs.xlsx`

Required Action Logs columns:

- CSV: `id`, `user_email`, `action`, `created`, `payload`
- Excel logical columns: `ID`, `User Email`, `Action`, `Created`, `Payload`

Supported Downloads files:

- `project_fees_by_department_by_month.csv`
- Excel equivalent (`.xls`, `.xlsx`)
- `department_breakdown_report.csv`
- Excel equivalent (`.xls`, `.xlsx`)
- `client_summary_report.csv`
- Excel equivalent (`.xls`, `.xlsx`)

Required Downloads columns:

`project_fees_by_department_by_month`
- `Project Code`
- `Client`
- `Program Name`
- `Start Month`
- `End Month`
- `Status`
- `Total Fees`
- all columns after `Total Fees` are treated as dynamic department allocation columns

`department_breakdown_report`
- `Department`
- `Total Fees`
- `% of Total`

`client_summary_report`
- `Client`
- `Total Projects`
- `Total Fees`
- `Total Revenue`

## What the UI does

The main page now provides:

- report configuration with `start_date` and `end_date`
- API fetch and generation
- generated user report dashboard table
- exact HTML preview for a selected user
- missing-field warnings
- optional upload fallback mode

## Architecture

The code stays modular even though the UI is simple:

- `src/ingestion/`: CSV and Excel parsing, file detection, upload processing
- `src/app/api/report-cards/route.ts`: server-owned report generation endpoint
- `src/lib/salthub-api.ts`: SaltHub API client
- `src/schemas/`: Zod validation contracts
- `src/normalization/`: upload normalization
- `src/reporting/`: API report builder, upload fallback report builder, and preview rendering
- `src/ui/`: first-use upload and preview experience
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
- Only users whose own department is exactly `Account Management` are eligible in the first API-first release.
- Department allocation columns are parsed dynamically and are not hardcoded.
- Unsupported files are rejected with friendly validation messages.
- Empty files are rejected.
- Upload mode remains isolated from the API-generated report path.
