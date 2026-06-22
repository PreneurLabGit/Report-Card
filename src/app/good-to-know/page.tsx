import Link from "next/link";

import styles from "./page.module.css";

const actionLogColumns = ["id", "user_email", "action", "created", "payload"];

const projectFeeColumns = [
  "Project Code",
  "Client",
  "Program Name",
  "Start Month",
  "End Month",
  "Status",
  "Total Fees",
];

const departmentBreakdownColumns = ["Department", "Total Fees", "% of Total"];

const clientSummaryColumns = ["Client", "Total Projects", "Total Fees", "Total Revenue"];

export default function GoodToKnowPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <p className={styles.kicker}>Good to know</p>
            <h1>Current project setup and usage notes</h1>
          </div>
          <Link href="/" className={styles.backButton}>
            Back to app
          </Link>
        </header>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>Current flow</h2>
            <ol className={styles.numberList}>
              <li>Choose a start date and end date on the homepage.</li>
              <li>Click `Fetch and Generate` to load SaltHub data server-side.</li>
              <li>Review generated Account Management user reports in the table.</li>
              <li>Open the selected user’s email preview below the table.</li>
              <li>Use upload mode only when you need the manual fallback path.</li>
            </ol>
          </article>

          <article className={styles.card}>
            <h2>Live API configuration</h2>
            <ul className={styles.list}>
              <li>The app is API-first.</li>
              <li>External SaltHub credentials stay on the server.</li>
              <li>The app reads `All_Users_API_Key`, `Users_Activity_API_Key`, and `API_Secret_Key` from `.env.local`.</li>
              <li>The Account Management Team page now uses the live organization tree instead of hardcoded users.</li>
            </ul>
          </article>

          <article className={styles.card}>
            <h2>Eligibility rules</h2>
            <ul className={styles.list}>
              <li>Reports are generated only for users returned by the activity API for the selected period.</li>
              <li>Those users must also exist in the organization tree.</li>
              <li>For the current release, the user’s own department must be exactly `Account Management`.</li>
              <li>Users outside that exact department are skipped from report generation.</li>
            </ul>
          </article>

          <article className={styles.card}>
            <h2>What the homepage does</h2>
            <ul className={styles.list}>
              <li>Date-range based report generation</li>
              <li>Current-period activity fetch</li>
              <li>Prior equal-length period fetch for comparison readiness</li>
              <li>Generated reports table</li>
              <li>User email preview</li>
              <li>Optional upload fallback mode</li>
            </ul>
          </article>

          <article className={styles.card}>
            <h2>Current limitations</h2>
            <ul className={styles.list}>
              <li>Email sending is not configured yet.</li>
              <li>AI-generated narrative text is not enabled yet.</li>
              <li>The official scoring formula is not implemented yet.</li>
              <li>Score, prior score, and delta remain unavailable until that formula exists.</li>
              <li>No database or long-term persistence is configured in the current build.</li>
            </ul>
          </article>

          <article className={styles.card}>
            <h2>Missing-data behavior</h2>
            <ul className={styles.list}>
              <li>The app does not fabricate unavailable fields.</li>
              <li>Missing fields are shown directly in the preview.</li>
              <li>Unavailable score-related values remain empty rather than guessed.</li>
              <li>Disabled users can still appear in results, but they are flagged clearly.</li>
            </ul>
          </article>

          <article className={styles.card}>
            <h2>Fallback uploads</h2>
            <ul className={styles.list}>
              <li>`action_logs.csv`, `.xls`, `.xlsx`</li>
              <li>`project_fees_by_department_by_month.csv` and Excel equivalents</li>
              <li>`department_breakdown_report.csv` and Excel equivalents</li>
              <li>`client_summary_report.csv` and Excel equivalents</li>
            </ul>
          </article>

          <article className={styles.card}>
            <h2>Action Logs requirements</h2>
            <p className={styles.bodyText}>CSV must contain these columns:</p>
            <ul className={styles.chipList}>
              {actionLogColumns.map((column) => (
                <li key={column}>{column}</li>
              ))}
            </ul>
            <p className={styles.bodyText}>Excel logical columns: `ID`, `User Email`, `Action`, `Created`, `Payload`.</p>
          </article>

          <article className={styles.card}>
            <h2>Project Fees requirements</h2>
            <p className={styles.bodyText}>Required columns:</p>
            <ul className={styles.chipList}>
              {projectFeeColumns.map((column) => (
                <li key={column}>{column}</li>
              ))}
            </ul>
            <p className={styles.bodyText}>Any column after `Total Fees` is treated as a dynamic department allocation column.</p>
          </article>

          <article className={styles.card}>
            <h2>Department Breakdown requirements</h2>
            <ul className={styles.chipList}>
              {departmentBreakdownColumns.map((column) => (
                <li key={column}>{column}</li>
              ))}
            </ul>
          </article>

          <article className={styles.card}>
            <h2>Client Summary requirements</h2>
            <ul className={styles.chipList}>
              {clientSummaryColumns.map((column) => (
                <li key={column}>{column}</li>
              ))}
            </ul>
          </article>

          <article className={styles.card}>
            <h2>Fallback validation behavior</h2>
            <ul className={styles.list}>
              <li>Unsupported files are rejected with validation messages.</li>
              <li>Empty files are rejected.</li>
              <li>Extra harmless columns are tolerated where supported.</li>
              <li>Accepted fallback uploads are used only in the current browser session.</li>
              <li>Upload mode stays separate from API-generated report data.</li>
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
