"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { processUpload, type ProcessedUpload } from "@/ingestion/process-upload";
import type { ApiReportResult, NormalizedUserReport, SimpleGeneratedReport, ValidationMessage } from "@/lib/domain";
import { formatDate } from "@/lib/format";
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

function UploadReportPreview({ report }: { report: SimpleGeneratedReport }) {
  return (
    <article className={styles.previewCard}>
      <header className={styles.previewHeader}>
        <div>
          <p className={styles.kicker}>Fallback upload preview</p>
          <h2>{report.title}</h2>
          <p className={styles.muted}>Built from uploaded SaltHub exports in the current browser session.</p>
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

function ApiPreviewPlaceholder() {
  return (
    <div className={styles.previewPlaceholder}>
      <div className={styles.previewPlaceholderBadge}>Preview</div>
      <h3>User email preview appears here</h3>
      <p>Select a generated user report to inspect the final HTML preview and missing-field warnings.</p>
      <div className={styles.placeholderGrid}>
        <div className={styles.placeholderTile} />
        <div className={styles.placeholderTile} />
        <div className={styles.placeholderLine} />
        <div className={styles.placeholderLineShort} />
      </div>
    </div>
  );
}

function UploadPreviewPlaceholder() {
  return (
    <div className={styles.previewPlaceholder}>
      <div className={styles.previewPlaceholderBadge}>Fallback</div>
      <h3>Upload-mode preview appears here</h3>
      <p>Upload CSV or Excel exports only if the API path is unavailable or you need a manual comparison run.</p>
    </div>
  );
}

function ApiReportPreview({ report }: { report: NormalizedUserReport }) {
  return (
    <article className={styles.previewCard}>
      <header className={styles.previewHeader}>
        <div>
          <p className={styles.kicker}>API-first email preview</p>
          <h2>{report.userName}</h2>
          <p className={styles.muted}>
            {report.reportPeriod.displayLabel} · {report.role ?? "Role unavailable"} · {report.department ?? "Department unavailable"}
          </p>
        </div>
        <span className={`${styles.reportStatusPill} ${styles[`report${report.previewStatus}`]}`}>{report.previewStatus}</span>
      </header>

      {report.missingFields.length > 0 ? (
        <section className={styles.noteBox}>
          <strong>Missing fields</strong>
          <p>{report.missingFields.join(", ")}</p>
        </section>
      ) : null}

      <section className={styles.summaryGrid}>
        <div className={styles.summaryTile}>
          <span>Recipient</span>
          <strong className={styles.summaryText}>{report.recipientEmail ?? "Missing"}</strong>
        </div>
        <div className={styles.summaryTile}>
          <span>Login count</span>
          <strong>{report.metrics.loginCount}</strong>
        </div>
        <div className={styles.summaryTile}>
          <span>Projects confirmed</span>
          <strong>{report.metrics.projectsConfirmed}</strong>
        </div>
        <div className={styles.summaryTile}>
          <span>Pipeline entries</span>
          <strong>{report.metrics.pipelineEntriesCreated}</strong>
        </div>
      </section>

      <section className={styles.previewMeta}>
        <div>
          <strong>Template mode</strong>
          <span>{report.templateMode}</span>
        </div>
        <div>
          <strong>Status</strong>
          <span>{report.status.label ?? "Not available"}</span>
        </div>
        <div>
          <strong>Last activity</strong>
          <span>{report.metrics.lastActivityTs ? formatDate(report.metrics.lastActivityTs) : "Not available"}</span>
        </div>
      </section>

      <div className={styles.iframeFrame}>
        <iframe title={`${report.userName} preview`} srcDoc={report.html} className={styles.previewFrame} />
      </div>
    </article>
  );
}

function getDefaultDates() {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export function SalthubApp() {
  const defaults = useMemo(() => getDefaultDates(), []);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [apiResult, setApiResult] = useState<ApiReportResult | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<ProcessedUpload[]>([]);
  const [uploadReport, setUploadReport] = useState<SimpleGeneratedReport | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const acceptedUploads = useMemo(
    () => uploads.filter((upload) => upload.artifact.status !== "unsupported" && upload.artifact.status !== "error"),
    [uploads],
  );
  const uploadDataset = useMemo(() => (acceptedUploads.length > 0 ? normalizeDataset(acceptedUploads) : null), [acceptedUploads]);
  const selectedApiReport = useMemo(
    () => apiResult?.reports.find((report) => report.userId === selectedReportId) ?? null,
    [apiResult, selectedReportId],
  );

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

  function handleFetchGenerate() {
    setApiError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/report-cards", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            startDate,
            endDate,
            mode: "api",
          }),
        });

        const payload = (await response.json()) as ApiReportResult | { error?: string };

        if (!response.ok) {
          const message = "error" in payload && payload.error ? payload.error : "Failed to generate report cards.";
          setApiError(message);
          pushToast({
            title: "API generation failed",
            message,
            tone: "error",
          });
          return;
        }

        setApiResult(payload as ApiReportResult);
        const firstReport = (payload as ApiReportResult).reports[0];
        setSelectedReportId(firstReport?.userId ?? null);

        pushToast({
          title: "API reports generated",
          message: `${(payload as ApiReportResult).reports.length} eligible Account Management report${(payload as ApiReportResult).reports.length === 1 ? "" : "s"} prepared.`,
          tone: "success",
        });

        if ((payload as ApiReportResult).warnings.length > 0) {
          pushToast({
            title: "Generation completed with warnings",
            message: (payload as ApiReportResult).warnings[0]?.message ?? "Some users were skipped or had missing fields.",
            tone: "warning",
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected API generation failure.";
        setApiError(message);
        pushToast({
          title: "API generation failed",
          message,
          tone: "error",
        });
      }
    });
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
      setUploadReport(null);

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
            title: "Fallback uploads accepted",
            message: `${successfulAccepted} file${successfulAccepted === 1 ? "" : "s"} accepted for upload-mode preview.`,
            tone: "success",
          });
        }

        if (rejectedProcessed > 0) {
          pushToast({
            title: "Fallback uploads have issues",
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
            title: "Fallback upload failed",
            message:
              fatalFailures.length === 1
                ? `${fatalFailures[0].fileName} could not be processed.`
                : `${fatalFailures.length} files could not be processed.`,
            tone: "error",
          });
        }
      } catch (error) {
        pushToast({
          title: "Fallback upload failed",
          message: error instanceof Error ? error.message : "Unexpected upload failure.",
          tone: "error",
        });
      }
    });
  }

  function handleGenerateUploadReport() {
    if (!uploadDataset) {
      pushToast({
        title: "Upload required",
        message: "Upload at least one supported SaltHub export before generating a fallback preview.",
        tone: "error",
      });
      return;
    }

    try {
      const nextReport = buildSimpleReport(uploadDataset);
      setUploadReport(nextReport);
      pushToast({
        title: "Fallback preview generated",
        message: "Upload-mode report preview is ready.",
        tone: nextReport.missingInputs.length > 0 ? "warning" : "success",
      });
    } catch (error) {
      pushToast({
        title: "Fallback preview failed",
        message: error instanceof Error ? error.message : "The upload-mode report could not be generated.",
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
            <Link href="/account-management-team" className={styles.secondaryButton}>
              Ac M. Team
            </Link>
            <Link href="/good-to-know" className={styles.secondaryButton}>
              Good to know
            </Link>
          </div>
          <div className={styles.heroContent}>
            <div>
              <p className={styles.kicker}>Salthub Report Card</p>
              <h1>Generate Account Management report cards from the SaltHub APIs</h1>
              <p className={styles.heroSubcopy}>
                API generation is now the primary workflow. Upload-based generation remains available below as a fallback mode and does not merge with API data.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.layout}>
        <div className={styles.leftColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Report configuration</h2>
                <p className={styles.muted}>Choose a reporting window, fetch activity and hierarchy data server-side, and generate user-level report cards.</p>
              </div>
              <span className={styles.cardBadge}>API-first</span>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Start date</span>
                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={styles.input} />
              </label>
              <label className={styles.field}>
                <span>End date</span>
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={styles.input} />
              </label>
            </div>

            <div className={styles.actionRow}>
              <button type="button" className={styles.primaryButton} onClick={handleFetchGenerate} disabled={isPending}>
                {isPending ? "Generating..." : "Fetch and Generate"}
              </button>
              <p className={styles.helperText}>Eligible users must have `department === Account Management` and activity in the selected period.</p>
            </div>

            {apiError ? <p className={styles.errorText}>{apiError}</p> : null}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Generated reports</h2>
                <p className={styles.muted}>Each row represents one eligible user returned by the activity API and matched to the organization tree.</p>
              </div>
              <span className={styles.cardBadge}>Preview queue</span>
            </div>

            {apiResult ? (
              <>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryTile}>
                    <span>Activity users</span>
                    <strong>{apiResult.summary.activityUserCount}</strong>
                  </div>
                  <div className={styles.summaryTile}>
                    <span>Eligible AM users</span>
                    <strong>{apiResult.summary.eligibleDirectoryUserCount}</strong>
                  </div>
                  <div className={styles.summaryTile}>
                    <span>Generated reports</span>
                    <strong>{apiResult.summary.matchedEligibleUserCount}</strong>
                  </div>
                  <div className={styles.summaryTile}>
                    <span>Ready previews</span>
                    <strong>{apiResult.summary.readyReportCount}</strong>
                  </div>
                </div>

                {apiResult.warnings.length > 0 ? (
                  <div className={styles.warningStack}>
                    {apiResult.warnings.map((warning) => (
                      <div key={warning.code} className={`${styles.message} ${styles[warning.level]}`}>
                        <strong>{warning.level}</strong>
                        <span>{warning.message}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Disabled</th>
                        <th>Logins</th>
                        <th>Score</th>
                        <th>Prior</th>
                        <th>Delta</th>
                        <th>Missing</th>
                        <th>Status</th>
                        <th>Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiResult.reports.map((report) => (
                        <tr key={report.userId} className={selectedReportId === report.userId ? styles.selectedRow : undefined}>
                          <td>{report.userName}</td>
                          <td>{report.recipientEmail ?? "Missing"}</td>
                          <td>{report.role ?? "Missing"}</td>
                          <td>{report.department ?? "Missing"}</td>
                          <td>{report.disabled ? "Yes" : "No"}</td>
                          <td>{report.metrics.loginCount}</td>
                          <td>{report.metrics.score ?? "N/A"}</td>
                          <td>{report.metrics.priorPeriodScore ?? "N/A"}</td>
                          <td>{report.metrics.wowScoreDelta ?? "N/A"}</td>
                          <td>{report.missingFields.length}</td>
                          <td>
                            <span className={`${styles.reportStatusPill} ${styles[`report${report.previewStatus}`]}`}>{report.previewStatus}</span>
                          </td>
                          <td>
                            <button type="button" className={styles.inlineButton} onClick={() => setSelectedReportId(report.userId)}>
                              Preview
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <strong>No API report cards generated yet</strong>
                <p className={styles.muted}>Choose a reporting window and fetch the SaltHub APIs to populate the table.</p>
              </div>
            )}
          </section>
        </div>

        <div className={styles.rightColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Email preview</h2>
                <p className={styles.muted}>This is the HTML that would be sent later once email delivery is configured.</p>
              </div>
              <span className={styles.cardBadge}>{apiResult ? apiResult.period.displayLabel : "Select a user"}</span>
            </div>

            {selectedApiReport ? <ApiReportPreview report={selectedApiReport} /> : <ApiPreviewPlaceholder />}
          </section>
        </div>
      </section>

      <section className={styles.fallbackShell}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Fallback upload mode</h2>
              <p className={styles.muted}>Use uploads only when API data is unavailable or when you need a manual export comparison. Upload mode stays isolated from API mode.</p>
            </div>
            <span className={styles.cardBadge}>Optional</span>
          </div>

          <div className={styles.fallbackGrid}>
            <div className={styles.fallbackColumn}>
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
                <strong>{isPending ? "Processing files..." : "Select fallback exports"}</strong>
                <small className={styles.uploadHint}>CSV or Excel exports only</small>
              </label>

              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleGenerateUploadReport}
                  disabled={acceptedUploads.length === 0}
                >
                  Generate fallback preview
                </button>
                <p className={styles.helperText}>
                  {acceptedUploads.length > 0
                    ? `${acceptedUploads.length} accepted file${acceptedUploads.length === 1 ? "" : "s"} ready`
                    : "Upload at least one supported export to continue"}
                </p>
              </div>

              {uploads.length === 0 ? (
                <div className={styles.emptyState}>
                  <strong>No fallback files uploaded yet</strong>
                  <p className={styles.muted}>Validated upload details will appear here after files are processed.</p>
                </div>
              ) : (
                <div className={styles.fileList}>
                  {uploads.map((upload) => (
                    <article key={upload.artifact.id} className={styles.fileCard}>
                      <div className={styles.fileHeader}>
                        <div>
                          <strong>{upload.artifact.name}</strong>
                          <p className={styles.muted}>{upload.artifact.detectedKind} · {upload.artifact.rowCount} rows</p>
                        </div>
                        <span className={`${styles.statusPill} ${styles[upload.artifact.status]}`}>{upload.artifact.status}</span>
                      </div>
                      <ValidationList messages={upload.artifact.messages} />
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.fallbackColumn}>
              {uploadReport ? <UploadReportPreview report={uploadReport} /> : <UploadPreviewPlaceholder />}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
