"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { processUpload, type ProcessedUpload } from "@/ingestion/process-upload";
import type { SimpleGeneratedReport, ValidationMessage } from "@/lib/domain";
import { normalizeDataset } from "@/normalization/normalize";
import { buildSimpleReport } from "@/reporting/build-simple-report";
import styles from "@/ui/salthub-app.module.css";

type ToastTone = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  title: string;
  message: string;
  tone: ToastTone;
}

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

function PreviewPlaceholder() {
  return (
    <div className={styles.previewPlaceholder}>
      <div className={styles.previewPlaceholderBadge}>Preview</div>
      <h3>Report preview appears here</h3>
      <div className={styles.placeholderGrid}>
        <div className={styles.placeholderTile} />
        <div className={styles.placeholderTile} />
        <div className={styles.placeholderLine} />
        <div className={styles.placeholderLineShort} />
      </div>
    </div>
  );
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={styles.toastViewport} aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <article key={toast.id} className={`${styles.toast} ${styles[`toast${toast.tone}`]}`}>
          <div className={styles.toastBody}>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>
          <button
            type="button"
            className={styles.toastClose}
            aria-label={`Dismiss ${toast.title}`}
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </article>
      ))}
    </div>
  );
}

export function SalthubApp() {
  const [uploads, setUploads] = useState<ProcessedUpload[]>([]);
  const [report, setReport] = useState<SimpleGeneratedReport | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const acceptedUploads = useMemo(
    () => uploads.filter((upload) => upload.artifact.status !== "unsupported" && upload.artifact.status !== "error"),
    [uploads],
  );
  const dataset = useMemo(() => (acceptedUploads.length > 0 ? normalizeDataset(acceptedUploads) : null), [acceptedUploads]);

  useEffect(() => {
    const toastTimers = toastTimersRef.current;

    return () => {
      for (const timer of toastTimers.values()) {
        clearTimeout(timer);
      }
      toastTimers.clear();
    };
  }, []);

  function dismissToast(id: string) {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function pushToast(toast: Omit<ToastItem, "id">) {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setToasts((current) => [...current, { ...toast, id }]);

    const timer = setTimeout(() => {
      toastTimersRef.current.delete(id);
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4800);

    toastTimersRef.current.set(id, timer);
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      pushToast({
        title: "No files selected",
        message: "Choose at least one SaltHub export to begin processing.",
        tone: "info",
      });
      return;
    }

    const selectedFiles = Array.from(fileList);

    startTransition(async () => {
      setReport(null);

      try {
        const settledUploads = await Promise.all(
          selectedFiles.map(async (file) => {
            try {
              const processed = await processUpload(file);
              return { status: "fulfilled" as const, value: processed };
            } catch (error) {
              return {
                status: "rejected" as const,
                reason: error instanceof Error ? error.message : "Unexpected upload failure.",
                fileName: file.name,
              };
            }
          }),
        );

        const nextUploads = settledUploads.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
        const fatalFailures = settledUploads.filter((result) => result.status === "rejected");

        let duplicateCount = 0;
        setUploads((current) => {
          const combined = [...current];

          for (const upload of nextUploads) {
            if (combined.some((item) => item.artifact.hash === upload.artifact.hash)) {
              duplicateCount += 1;
              continue;
            }
            combined.push(upload);
          }

          return combined;
        });

        const successfulAccepted = nextUploads.filter(
          (upload) => upload.artifact.status !== "unsupported" && upload.artifact.status !== "error",
        ).length;
        const rejectedProcessed = nextUploads.length - successfulAccepted;

        if (successfulAccepted > 0) {
          pushToast({
            title: "Successfully uploaded",
            message: `${successfulAccepted} file${successfulAccepted === 1 ? "" : "s"} accepted and ready for preview.`,
            tone: "success",
          });
        }

        if (rejectedProcessed > 0) {
          pushToast({
            title: "Upload completed with issues",
            message: `${rejectedProcessed} file${rejectedProcessed === 1 ? "" : "s"} failed validation or were unsupported.`,
            tone: "warning",
          });
        }

        if (duplicateCount > 0) {
          pushToast({
            title: "Duplicate files skipped",
            message: `${duplicateCount} duplicate file${duplicateCount === 1 ? "" : "s"} were ignored.`,
            tone: "info",
          });
        }

        if (fatalFailures.length > 0) {
          pushToast({
            title: "Upload failed",
            message:
              fatalFailures.length === 1
                ? `${fatalFailures[0].fileName} could not be processed.`
                : `${fatalFailures.length} files could not be processed.`,
            tone: "error",
          });
        }

        if (successfulAccepted === 0 && rejectedProcessed === 0 && fatalFailures.length === 0) {
          pushToast({
            title: "Nothing changed",
            message: "All selected files were already present in the current session.",
            tone: "info",
          });
        }
      } catch (error) {
        pushToast({
          title: "Upload failed",
          message: error instanceof Error ? error.message : "Unexpected upload failure.",
          tone: "error",
        });
      }
    });
  }

  function handleGenerate() {
    if (!dataset) {
      pushToast({
        title: "Upload required",
        message: "Upload at least one supported SaltHub export before generating a report.",
        tone: "error",
      });
      return;
    }

    try {
      const nextReport = buildSimpleReport(dataset);
      setReport(nextReport);

      if (nextReport.missingInputs.length > 0) {
        pushToast({
          title: "Report generated with gaps",
          message: `Preview created. Missing inputs: ${nextReport.missingInputs.join(", ")}.`,
          tone: "warning",
        });
      } else {
        pushToast({
          title: "Report generated",
          message: "Your report preview is ready.",
          tone: "success",
        });
      }
    } catch (error) {
      pushToast({
        title: "Report failed",
        message: error instanceof Error ? error.message : "The report could not be generated.",
        tone: "error",
      });
    }
  }

  return (
    <main className={styles.page}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <header className={styles.header}>
        <div className={styles.heroCard}>
          <div className={styles.heroActions}>
            <Link href="/good-to-know" className={styles.secondaryButton}>
              Good to know
            </Link>
          </div>
          <div className={styles.heroContent}>
            <div>
              <p className={styles.kicker}>Salthub Report Card</p>
              <h1>Upload SaltHub exports and generate a report preview</h1>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.layout}>
        <div className={styles.leftColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Upload files</h2>
              <span className={styles.cardBadge}>Step 1</span>
            </div>

            <label className={styles.uploadBox}>
              <input
                type="file"
                multiple
                accept=".csv,.xls,.xlsx"
                className={styles.fileInput}
                onChange={(event) => {
                  void handleFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <div className={styles.uploadIcon} aria-hidden="true">
                <span />
              </div>
              <strong>{isPending ? "Processing files..." : "Select exports"}</strong>
              <small className={styles.uploadHint}>CSV or Excel</small>
            </label>

            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleGenerate}
                disabled={acceptedUploads.length === 0}
              >
                Generate report
              </button>
              <p className={styles.helperText}>
                {acceptedUploads.length > 0
                  ? `${acceptedUploads.length} accepted file${acceptedUploads.length === 1 ? "" : "s"} ready for preview`
                  : "Upload at least one supported export to continue"}
              </p>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Uploaded files</h2>
              <span className={styles.cardBadge}>Step 2</span>
            </div>

            {uploads.length === 0 ? (
              <div className={styles.emptyState}>
                <strong>No files uploaded yet</strong>
                <p className={styles.muted}>Your validated file list will appear here as soon as uploads are processed.</p>
              </div>
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
                      <span className={`${styles.statusPill} ${styles[upload.artifact.status]}`}>
                        {upload.artifact.status}
                      </span>
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
              <h2>Report preview</h2>
              <span className={styles.cardBadge}>Step 3</span>
            </div>

            {report ? <ReportPreview report={report} /> : <PreviewPlaceholder />}
          </section>
        </div>
      </section>
    </main>
  );
}
