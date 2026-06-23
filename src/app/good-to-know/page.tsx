import Link from "next/link";

import styles from "./page.module.css";

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
              <li>Review generated Account Management hierarchy reports in the table.</li>
              <li>Open the selected user&apos;s email preview below the table.</li>
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
              <li>Only users whose own department is exactly `Account Management` are eligible.</li>
              <li>Only these roles are enabled right now: `team_member`, `business_owner`, `super_admin`.</li>
              <li>`team_member` reports are generated only when that user has activity in the selected period.</li>
              <li>`business_owner` reports are built from direct eligible team-member activity and can render as empty-state reports when no child activity exists.</li>
              <li>`super_admin` reports are built from direct eligible business-owner personal activity and can render as empty-state reports when no child activity exists.</li>
            </ul>
          </article>

          <article className={styles.card}>
            <h2>What the homepage does</h2>
            <ul className={styles.list}>
              <li>Date-range based report generation</li>
              <li>Current-period activity fetch</li>
              <li>Prior equal-length period fetch for comparison readiness</li>
              <li>Role-aware generated reports table</li>
              <li>User email preview</li>
            </ul>
          </article>

          <article className={styles.card}>
            <h2>Current limitations</h2>
            <ul className={styles.list}>
              <li>Email sending is not configured yet.</li>
              <li>AI-generated narrative text runs only when `OpenAI_API_Key` is configured.</li>
              <li>The official scoring formula is not implemented yet.</li>
              <li>Score, prior score, and delta remain unavailable until that formula exists.</li>
              <li>No database or long-term persistence is configured in the current build.</li>
              <li>Friction-note driven AI sections still use placeholders until that source is wired.</li>
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
            <h2>Current input sources</h2>
            <ul className={styles.list}>
              <li>The organization tree comes from `All_Users_API_Key`.</li>
              <li>User activity comes from `Users_Activity_API_Key`.</li>
              <li>Both requests use `API_Secret_Key` as the bearer token.</li>
              <li>Optional narrative generation uses `OpenAI_API_Key` server-side.</li>
              <li>The current release no longer exposes manual upload mode in the product UI.</li>
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
