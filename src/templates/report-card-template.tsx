import type { ReportViewModel } from "@/lib/domain";
import styles from "@/ui/salthub-app.module.css";

export function ReportCardTemplate({ report }: { report: ReportViewModel }) {
  return (
    <article className={styles.reportCard}>
      <header className={styles.reportHeader}>
        <div>
          <p className={styles.eyebrow}>Salthub Report Card</p>
          <h2>{report.title}</h2>
          <p className={styles.reportSubtitle}>{report.subtitle}</p>
        </div>
        <div className={`${styles.scoreBadge} ${styles[`score${report.score.band}`]}`}>
          <strong>{report.score.score}</strong>
          <span>{report.score.label}</span>
        </div>
      </header>

      <div className={styles.subjectBar}>
        <div>
          <span className={styles.metaLabel}>Audience</span>
          <strong>{report.audience}</strong>
        </div>
        <div>
          <span className={styles.metaLabel}>Subject</span>
          <strong>{report.subjectLabel}</strong>
        </div>
        <div>
          <span className={styles.metaLabel}>Generated</span>
          <strong>{new Date(report.generatedAt).toLocaleString()}</strong>
        </div>
      </div>

      <section className={styles.metricGrid}>
        {report.metrics.map((metric) => (
          <div key={metric.label} className={styles.metricTile}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            {metric.detail ? <small>{metric.detail}</small> : null}
          </div>
        ))}
      </section>

      <section className={styles.sectionGrid}>
        <div className={styles.sectionPanel}>
          <h3>Comparison view</h3>
          <div className={styles.comparisonList}>
            {report.comparisons.map((row) => (
              <div key={row.label} className={styles.comparisonRow}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
                {row.context ? <small>{row.context}</small> : null}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.sectionPanel}>
          <h3>Report narrative</h3>
          <div className={styles.narrativeList}>
            {report.sections
              .filter((section) => section.availability !== "hidden")
              .map((section) => (
                <section key={section.title} className={styles.narrativeSection}>
                  <div className={styles.sectionHeading}>
                    <h4>{section.title}</h4>
                    <span>{section.classification ?? section.availability}</span>
                  </div>
                  {section.tone === "quote" ? <blockquote className={styles.quoteBlock}>{section.body}</blockquote> : <p>{section.body}</p>}
                  {section.callout ? <small className={styles.sectionCallout}>{section.callout}</small> : null}
                  {section.bullets && section.bullets.length > 0 ? (
                    <ul className={styles.sectionBullets}>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
          </div>
        </div>
      </section>

      <footer className={styles.reportFooter}>
        <div>
          <span className={styles.metaLabel}>Notes</span>
          {report.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
        <p>{report.printHint}</p>
      </footer>
    </article>
  );
}
