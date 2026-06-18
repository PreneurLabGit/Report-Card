# Salthub Report Card

Salthub Report Card is a simplified first-use Next.js app for testing SaltHub export uploads. The current primary flow is:

1. upload SaltHub exports
2. validate the files
3. generate a report
4. review the preview

This build is intentionally lightweight. It does not center approval workflows, publishing flows, historical complexity, analytics JSON ingestion, or friction-note operations.

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

The main page keeps the initial experience simple:

- file upload
- file validation
- uploaded file list with detected type
- Generate Report button
- report preview

If some files are missing, the report still generates from the available accepted uploads and notes what is missing.

## Architecture

The code stays modular even though the UI is simple:

- `src/ingestion/`: CSV and Excel parsing, file detection, upload processing
- `src/schemas/`: Zod validation contracts
- `src/normalization/`: normalized internal models
- `src/reporting/`: simplified report builder
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

- Department allocation columns are parsed dynamically and are not hardcoded.
- Unsupported files are rejected with friendly validation messages.
- Empty files are rejected.
- The current report is generated only from uploaded SaltHub exports in the browser session.
