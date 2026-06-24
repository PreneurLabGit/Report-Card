"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { ApiReportResult, EmailSendResponse, NormalizedUserReport } from "@/lib/domain";
import styles from "@/ui/salthub-app.module.css";

type ToastTone = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  title: string;
  message: string;
  tone: ToastTone;
}

type SendState = "idle" | "sending" | "sent" | "failed" | "skipped";

interface SendStateEntry {
  state: SendState;
  detail?: string;
}

function GenerationNotes({ result }: { result: ApiReportResult }) {
  const warnings = result.warnings.filter((item) => item.level === "warning");
  const infoItems = result.warnings.filter((item) => item.level === "info");

  if (warnings.length === 0 && infoItems.length === 0) {
    return null;
  }

  return (
    <section className={styles.notesPanel} aria-label="Generation notes">
      <div className={styles.notesHeader}>
        <div>
          <h3>Generation notes</h3>
          <p className={styles.muted}>Items that were skipped, limited, or generated in empty-state mode.</p>
        </div>
        <div className={styles.notesPills}>
          {warnings.length > 0 ? <span className={styles.warningPill}>{warnings.length} warning{warnings.length === 1 ? "" : "s"}</span> : null}
          {infoItems.length > 0 ? <span className={styles.infoPill}>{infoItems.length} info</span> : null}
        </div>
      </div>

      <div className={styles.notesGrid}>
        {warnings.length > 0 ? (
          <section className={`${styles.notesGroup} ${styles.notesWarning}`}>
            <div className={styles.notesGroupHeader}>
              <span className={styles.notesBadge}>Warning</span>
              <strong>Needs attention</strong>
            </div>
            <div className={styles.notesList}>
              {warnings.map((warning) => (
                <article key={warning.code} className={styles.noteItem}>
                  <p>{warning.message}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {infoItems.length > 0 ? (
          <section className={`${styles.notesGroup} ${styles.notesInfo}`}>
            <div className={styles.notesGroupHeader}>
              <span className={styles.notesBadge}>Info</span>
              <strong>Generation summary</strong>
            </div>
            <div className={styles.notesList}>
              {infoItems.map((item) => (
                <article key={item.code} className={styles.noteItem}>
                  <p>{item.message}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {result.reports.some((report) => report.narrativeStatus !== "generated") ? (
        <div className={styles.aiStatusBar}>
          <strong>AI narrative status</strong>
          <p>
            {result.reports.filter((report) => report.narrativeStatus === "generated").length} generated,{" "}
            {result.reports.filter((report) => report.narrativeStatus === "fallback").length} fallback,{" "}
            {result.reports.filter((report) => report.narrativeStatus === "empty_state").length} empty-state.
          </p>
        </div>
      ) : null}
    </section>
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
            x
          </button>
        </article>
      ))}
    </div>
  );
}

function ApiPreviewPlaceholder() {
  return (
    <div className={styles.previewPlaceholder}>
      <div className={styles.previewPlaceholderBadge}>Preview</div>
      <h3>User email preview appears here</h3>
      <div className={styles.placeholderGrid}>
        <div className={styles.placeholderTile} />
        <div className={styles.placeholderTile} />
        <div className={styles.placeholderLine} />
        <div className={styles.placeholderLineShort} />
      </div>
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
            {report.reportPeriod.displayLabel} - {report.role ?? "Role unavailable"} -{" "}
            {report.department ?? "Department unavailable"}
          </p>
        </div>
        <span className={`${styles.reportStatusPill} ${styles[`report${report.previewStatus}`]}`}>
          {report.previewStatus}
        </span>
      </header>

      {report.missingFields.length > 0 ? (
        <section className={styles.noteBox}>
          <strong>Missing fields</strong>
          <p>{report.missingFields.join(", ")}</p>
        </section>
      ) : null}

      {report.narrativeStatus !== "generated" ? (
        <section className={styles.aiNoteBox}>
          <strong>
            {report.narrativeStatus === "fallback" ? "AI fallback copy in use" : "AI narrative skipped for empty-state report"}
          </strong>
          <p>{report.narrativeDetail ?? "The report preview is using non-AI fallback copy."}</p>
        </section>
      ) : null}

      <section className={styles.previewSummaryGrid}>
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
      <div className={styles.iframeFrame}>
        <iframe title={`${report.userName} preview`} srcDoc={report.html} className={styles.previewFrame} />
      </div>
    </article>
  );
}

function getDefaultDates() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const formatDateInputValue = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    endDate: formatDateInputValue(end),
    maxDate: formatDateInputValue(end),
  };
}

export function SalthubApp() {
  const defaults = useMemo(() => getDefaultDates(), []);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [apiResult, setApiResult] = useState<ApiReportResult | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [sendStates, setSendStates] = useState<Record<string, SendStateEntry>>({});
  const [isPending, startTransition] = useTransition();
  const [isSendingAll, startSendAllTransition] = useTransition();
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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
        setSendStates({});
        const firstReport = (payload as ApiReportResult).reports[0];
        setSelectedReportId(firstReport?.userId ?? null);

        pushToast({
          title: "API reports generated",
          message: `${(payload as ApiReportResult).reports.length} eligible hierarchy report${
            (payload as ApiReportResult).reports.length === 1 ? "" : "s"
          } prepared.`,
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

  async function postSendRequest(reports: NormalizedUserReport[]) {
    const response = await fetch("/api/report-cards/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ reports }),
    });

    const payload = (await response.json()) as EmailSendResponse | { error?: string };

    if (!response.ok) {
      throw new Error("error" in payload && payload.error ? payload.error : "Email send failed.");
    }

    return payload as EmailSendResponse;
  }

  async function handleSendReports(reports: NormalizedUserReport[]) {
    if (reports.length === 0) {
      return;
    }

    setSendStates((current) => {
      const next = { ...current };

      for (const report of reports) {
        next[report.userId] = {
          state: "sending",
        };
      }

      return next;
    });

    try {
      const payload = await postSendRequest(reports);

      setSendStates((current) => {
        const next = { ...current };

        for (const result of payload.results) {
          next[result.reportId] = {
            state:
              result.status === "sent"
                ? "sent"
                : result.status === "failed"
                  ? "failed"
                  : result.status === "skipped"
                    ? "skipped"
                    : "idle",
            detail: result.errorMessage ?? result.actualRecipient,
          };
        }

        return next;
      });

      const destination =
        payload.mode === "test" && payload.overrideRecipient
          ? ` All mail was redirected to ${payload.overrideRecipient}.`
          : "";

      pushToast({
        title: "Email send completed",
        message: `${payload.sentCount} sent, ${payload.skippedCount} skipped, ${payload.failedCount} failed.${destination}`,
        tone: payload.failedCount > 0 ? "warning" : "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected email send failure.";

      setSendStates((current) => {
        const next = { ...current };

        for (const report of reports) {
          next[report.userId] = {
            state: "failed",
            detail: message,
          };
        }

        return next;
      });

      pushToast({
        title: "Email send failed",
        message,
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
              <h1>Report Cards of Account Management Users of Salthub</h1>
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
              </div>
              <span className={styles.cardBadge}>API-first</span>
            </div>

            <div className={styles.formGrid}>
              <label className={`${styles.field} ${styles.singleField}`}>
                <span>Report end date</span>
                <input
                  type="date"
                  value={endDate}
                  max={defaults.maxDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className={styles.input}
                />
              </label>
            </div>

            <div className={styles.actionRow}>
              <button type="button" className={styles.primaryButton} onClick={handleFetchGenerate} disabled={isPending}>
                {isPending ? "Generating..." : "Fetch and Generate"}
              </button>
              <p className={styles.helperText}>
                Team Member and Business Owner reports start on Monday of the selected week. Super Admin reports start on Monday of the previous week.
              </p>
            </div>

            {apiError ? <p className={styles.errorText}>{apiError}</p> : null}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Generated reports</h2>
              </div>
              <div className={styles.headerActions}>
                {apiResult?.emailDelivery ? (
                  <span className={`${styles.cardBadge} ${apiResult.emailDelivery.mode === "test" ? styles.testBadge : styles.liveBadge}`}>
                    {apiResult.emailDelivery.mode === "test"
                      ? `Test send${apiResult.emailDelivery.overrideRecipient ? ` -> ${apiResult.emailDelivery.overrideRecipient}` : ""}`
                      : "Live send enabled"}
                  </span>
                ) : null}
                <span className={styles.cardBadge}>Users Preview Queue</span>
              </div>
            </div>

            {apiResult ? (
              <>
                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={
                      isSendingAll ||
                      !apiResult.emailDelivery.configured ||
                      apiResult.reports.filter((report) => report.previewStatus === "ready").length === 0
                    }
                    onClick={() =>
                      startSendAllTransition(async () => {
                        await handleSendReports(apiResult.reports.filter((report) => report.previewStatus === "ready"));
                      })
                    }
                  >
                    {isSendingAll ? "Sending..." : "Send all ready"}
                  </button>
                  {apiResult.emailDelivery.configured ? (
                    <p className={styles.helperText}>
                      {apiResult.emailDelivery.mode === "test" && apiResult.emailDelivery.overrideRecipient
                        ? `Testing mode is active. Every email will go to ${apiResult.emailDelivery.overrideRecipient}.`
                        : "Live sending is enabled for actual recipients."}
                    </p>
                  ) : (
                    <p className={styles.helperText}>Email sending is not configured yet.</p>
                  )}
                </div>

                <div className={styles.summaryGrid}>
                  <div className={styles.summaryTile}>
                    <span>Weekly activity users</span>
                    <strong>{apiResult.summary.weeklyActivityUserCount}</strong>
                  </div>
                  <div className={styles.summaryTile}>
                    <span>Bi-weekly activity users</span>
                    <strong>{apiResult.summary.biweeklyActivityUserCount}</strong>
                  </div>
                  <div className={styles.summaryTile}>
                    <span>Eligible hierarchy users</span>
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
                  <div className={styles.summaryTile}>
                    <span>AI generated</span>
                    <strong>{apiResult.reports.filter((report) => report.narrativeStatus === "generated").length}</strong>
                  </div>
                </div>

                <GenerationNotes result={apiResult} />

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
                        <th>AI copy</th>
                        <th>Send</th>
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
                            <span className={`${styles.reportStatusPill} ${styles[`report${report.previewStatus}`]}`}>
                              {report.previewStatus}
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.reportStatusPill} ${styles[`narrative${report.narrativeStatus}`]}`}>
                              {report.narrativeStatus === "generated"
                                ? "AI generated"
                                : report.narrativeStatus === "fallback"
                                  ? "Fallback"
                                  : "Empty-state"}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.inlineButton}
                              disabled={
                                !apiResult.emailDelivery.configured ||
                                report.previewStatus !== "ready" ||
                                sendStates[report.userId]?.state === "sending"
                              }
                              onClick={() => {
                                void handleSendReports([report]);
                              }}
                            >
                              {sendStates[report.userId]?.state === "sending" ? "Sending..." : "Send"}
                            </button>
                            {sendStates[report.userId] ? (
                              <div className={styles.sendStateText}>{sendStates[report.userId]?.state}</div>
                            ) : null}
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.inlineButton}
                              onClick={() => setSelectedReportId(report.userId)}
                            >
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

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Email preview</h2>
              </div>
              <span className={styles.cardBadge}>{selectedApiReport ? selectedApiReport.reportPeriod.displayLabel : "Select a user"}</span>
            </div>

            {selectedApiReport ? <ApiReportPreview report={selectedApiReport} /> : <ApiPreviewPlaceholder />}
          </section>
        </div>
      </section>
    </main>
  );
}
