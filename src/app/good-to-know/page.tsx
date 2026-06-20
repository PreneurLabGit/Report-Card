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
            <h1>Everything you need before uploading files</h1>
            <p className={styles.subtitle}>
              This page holds the instructional details for the first-use flow so the homepage can stay focused on the
              upload and preview experience.
            </p>
          </div>
          <Link href="/" className={styles.backButton}>
            Back to app
          </Link>
        </header>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>Current flow</h2>
            <ol className={styles.numberList}>
              <li>Upload SaltHub exports.</li>
              <li>Let the app validate and classify each file.</li>
              <li>Generate a report from accepted inputs.</li>
              <li>Review the preview on the main page.</li>
            </ol>
          </article>

          <article className={styles.card}>
            <h2>Supported uploads</h2>
            <ul className={styles.list}>
              <li>`action_logs.csv`</li>
              <li>`action_logs.xls`</li>
              <li>`action_logs.xlsx`</li>
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
            <p className={styles.bodyText}>
              Excel logical columns: `ID`, `User Email`, `Action`, `Created`, `Payload`.
            </p>
          </article>

          <article className={styles.card}>
            <h2>Project Fees requirements</h2>
            <p className={styles.bodyText}>Required columns:</p>
            <ul className={styles.chipList}>
              {projectFeeColumns.map((column) => (
                <li key={column}>{column}</li>
              ))}
            </ul>
            <p className={styles.bodyText}>
              Any column after `Total Fees` is treated as a dynamic department allocation column.
            </p>
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
            <h2>Validation behavior</h2>
            <ul className={styles.list}>
              <li>Unsupported files are rejected with validation messages.</li>
              <li>Empty files are rejected.</li>
              <li>Accepted files are used to build the preview in the current browser session.</li>
              <li>If some expected inputs are missing, the report still generates and notes what is absent.</li>
            </ul>
          </article>

          <article className={styles.card}>
            <h2>What the homepage does</h2>
            <ul className={styles.list}>
              <li>File upload</li>
              <li>File validation status</li>
              <li>Uploaded file list with detected type</li>
              <li>Generate Report action</li>
              <li>Report preview</li>
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
