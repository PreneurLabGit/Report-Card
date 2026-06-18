"use client";

import { useMemo, useState, useTransition } from "react";

import { processUpload, type ProcessedUpload } from "@/ingestion/process-upload";
import type { SimpleGeneratedReport, ValidationMessage } from "@/lib/domain";
import { normalizeDataset } from "@/normalization/normalize";
import { buildSimpleReport } from "@/reporting/build-simple-report";
import styles from "@/ui/salthub-app.module.css";

function ValidationList({ messages }: { messages: ValidationMessage[] }) {
  if (messages.length === 0) {
    return <p className={styles.muted}>No validation issues.</p>;
  }

  return (
    <div className={styles.messageList}>
      {messages.map((message, index) => (
        <div key={`${message.code}-${index}`} className={`${styles.message} ${styles[message.level]}`}>
          <strong>{message.level}</strong>
          <span>{message.message}</span>
        </div>
      ))}
    </div>
  );
}

function ReportPreview({ report }: { report: SimpleGeneratedReport }) {
  return (
    <article className={styles.previewCard}>
      <header className={styles.previewHeader}>
        <div>
          <p className={styles.kicker}>Generated report</p>
          <h2>{report.title}</h2>
          <p className={styles.muted}>Built from the uploaded SaltHub exports available in this session.</p>
        </div>
        <span className={styles.generatedAt}>{new Date(report.generatedAt).toLocaleString()}</span>
      </header>

      <section className={styles.summaryGrid}>
        {report.summaryCards.map((card) => (
          <div key={card.label} className={styles.summaryTile}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            {card.detail ? <small>{card.detail}</small> : null}
          </div>
        ))}
      </section>

      {report.missingInputs.length > 0 ? (
        <section className={styles.noteBox}>
          <strong>Missing optional or required inputs</strong>
          <p>{report.missingInputs.join(", ")}</p>
        </section>
      ) : null}

      <section className={styles.sectionStack}>
        {report.sections.map((section) => (
          <section key={section.title} className={styles.sectionCard}>
            <h3>{section.title}</h3>
            {section.bullets.length > 0 ? (
              <ul className={styles.bulletList}>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>{section.emptyState ?? "No data available."}</p>
            )}
          </section>
        ))}
      </section>
    </article>
  );
}

export function SalthubApp() {
  const [uploads, setUploads] = useState<ProcessedUpload[]>([]);
  const [report, setReport] = useState<SimpleGeneratedReport | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const acceptedUploads = useMemo(
    () => uploads.filter((upload) => upload.artifact.status !== "unsupported" && upload.artifact.status !== "error"),
    [uploads],
  );
  const dataset = useMemo(() => (acceptedUploads.length > 0 ? normalizeDataset(acceptedUploads) : null), [acceptedUploads]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    startTransition(async () => {
      setError("");
      setReport(null);
      const nextUploads = await Promise.all(Array.from(fileList).map((file) => processUpload(file)));
      setUploads((current) => {
        const combined = [...current];

        for (const upload of nextUploads) {
          if (!combined.some((item) => item.artifact.hash === upload.artifact.hash)) {
            combined.push(upload);
          }
        }

        return combined;
      });
    });
  }

  function handleGenerate() {
    if (!dataset) {
      setError("Upload at least one supported SaltHub export before generating a report.");
      return;
    }

    setError("");
    setReport(buildSimpleReport(dataset));
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Salthub Report Card</p>
          <h1>Upload SaltHub exports and generate a report preview</h1>
          <p className={styles.subtitle}>
            This first-use version is focused on Action Logs and Downloads exports only. Upload supported files, review
            validation results, and generate a preview from the accepted inputs.
          </p>
        </div>
      </header>

      <section className={styles.layout}>
        <div className={styles.leftColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Upload files</h2>
                <p className={styles.muted}>
                  Supported: `action_logs.csv`, `action_logs.xls/.xlsx`, project fees by department by month, department
                  breakdown, and client summary exports.
                </p>
              </div>
            </div>

            <label className={styles.uploadBox}>
              <input type="file" multiple accept=".csv,.xls,.xlsx" className={styles.fileInput} onChange={(event) => void handleFiles(event.target.files)} />
              <strong>{isPending ? "Processing files..." : "Select one or more SaltHub exports"}</strong>
              <span>CSV and Excel formats are supported for the known Action Logs and Downloads exports.</span>
            </label>

            <button type="button" className={styles.primaryButton} onClick={handleGenerate} disabled={acceptedUploads.length === 0}>
              Generate report
            </button>

            {error ? <p className={styles.errorText}>{error}</p> : null}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Uploaded files</h2>
                <p className={styles.muted}>Each file is detected, validated, and either accepted or rejected.</p>
              </div>
            </div>

            {uploads.length === 0 ? (
              <p className={styles.muted}>No files uploaded yet.</p>
            ) : (
              <div className={styles.fileList}>
                {uploads.map((upload) => (
                  <article key={upload.artifact.id} className={styles.fileCard}>
                    <div className={styles.fileHeader}>
                      <div>
                        <strong>{upload.artifact.name}</strong>
                        <p className={styles.muted}>
                          {upload.artifact.detectedKind} · {upload.artifact.rowCount} rows
                        </p>
                      </div>
                      <span className={`${styles.statusPill} ${styles[upload.artifact.status]}`}>{upload.artifact.status}</span>
                    </div>
                    <ValidationList messages={upload.artifact.messages} />
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className={styles.rightColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Report preview</h2>
                <p className={styles.muted}>The report generates from the accepted files in the current browser session.</p>
              </div>
            </div>

            {report ? <ReportPreview report={report} /> : <p className={styles.muted}>Generate a report to see the preview here.</p>}
          </section>
        </div>
      </section>
    </main>
  );
}
