"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { ValidationMessage } from "@/lib/domain";
import type { AppStatePayload } from "@/lib/server/types";
import { ReportCardTemplate } from "@/templates/report-card-template";
import styles from "@/ui/salthub-app.module.css";

function ValidationList({ messages }: { messages: ValidationMessage[] }) {
  if (messages.length === 0) {
    return <p className={styles.emptyNote}>No validation issues.</p>;
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

function statusClass(status: string) {
  switch (status) {
    case "published":
      return styles.statusGreen;
    case "approved":
      return styles.statusBlue;
    case "draft":
      return styles.statusAmber;
    case "error":
      return styles.statusRed;
    default:
      return styles.statusSlate;
  }
}

export function SalthubApp() {
  const [appState, setAppState] = useState<AppStatePayload | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [actionError, setActionError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [emailHtml, setEmailHtml] = useState<string>("");
  const [previewMode, setPreviewMode] = useState<"web" | "email">("web");
  const [includeNarrative, setIncludeNarrative] = useState(true);
  const [isPending, startTransition] = useTransition();

  const activeReport = useMemo(
    () => appState?.reports.find((report) => report.id === selectedReportId) ?? appState?.reports[0],
    [appState, selectedReportId],
  );
  const activeVersion = useMemo(
    () => appState?.reportVersions.find((version) => version.id === activeReport?.currentVersionId) ?? null,
    [activeReport, appState],
  );

  async function refreshState() {
    const response = await fetch("/api/app-state", { cache: "no-store" });
    if (response.status === 401) {
      setAppState(null);
      return;
    }
    const payload = (await response.json()) as AppStatePayload;
    setAppState(payload);
    setSelectedPeriodId((current) => current || payload.periods[0]?.id || "");
    setSelectedReportId((current) => current || payload.reports[0]?.id || "");
  }

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/app-state", { cache: "no-store" })
      .then(async (response) => {
        if (cancelled) {
          return;
        }
        if (response.status === 401) {
          setAppState(null);
          return;
        }
        const payload = (await response.json()) as AppStatePayload;
        setAppState(payload);
        setSelectedPeriodId((current) => current || payload.periods[0]?.id || "");
        setSelectedReportId((current) => current || payload.reports[0]?.id || "");
      })
      .finally(() => {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeVersion || previewMode !== "email") {
      return;
    }

    void fetch(`/api/report-versions/${activeVersion.id}/email`)
      .then((response) => response.text())
      .then(setEmailHtml);
  }, [activeVersion, previewMode]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFiles || !selectedPeriodId) {
      return;
    }

    startTransition(async () => {
      setActionError("");
      const formData = new FormData();
      formData.append("periodId", selectedPeriodId);
      Array.from(selectedFiles).forEach((file) => formData.append("files", file));
      const response = await fetch("/api/upload-batches", { method: "POST", body: formData });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setActionError(payload.error ?? "Upload failed.");
        return;
      }
      setSelectedFiles(null);
      await refreshState();
    });
  }

  async function generateDrafts(report?: { audience: string; subjectId?: string }) {
    if (!selectedPeriodId) {
      return;
    }

    startTransition(async () => {
      setActionError("");
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          periodId: selectedPeriodId,
          includeNarrative,
          audience: report?.audience,
          subjectId: report?.subjectId,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setActionError(payload.error ?? "Draft generation failed.");
        return;
      }
      await refreshState();
    });
  }

  async function transitionReport(action: "approve" | "publish") {
    if (!activeReport) {
      return;
    }

    startTransition(async () => {
      setActionError("");
      const response = await fetch(`/api/reports/${activeReport.id}/workflow`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setActionError(payload.error ?? "Workflow transition failed.");
        return;
      }
      await refreshState();
    });
  }

  if (isBootstrapping) {
    return (
      <main className={styles.authPage}>
        <section className={styles.authCard}>
          <div className={styles.brandRow}>
            <div className={styles.logoMark}>S</div>
            <div>
              <h1>Salthub Report Card</h1>
              <p>Loading workspace...</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!appState) {
    /*
    Demo sign-in screen is temporarily disabled.
    Keep this UI block for later when real auth replaces the temporary auto-auth bypass.
    return (
      <main className={styles.authPage}>
        <section className={styles.authCard}>
          <div className={styles.brandRow}>
            <div className={styles.logoMark}>S</div>
            <div>
              <h1>Salthub Report Card</h1>
              <p>Production workflow console for uploads, review, publishing, and email-ready outputs.</p>
            </div>
          </div>

          <form className={styles.authForm} onSubmit={handleLogin}>
            <label>
              Email
              <input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} />
            </label>
            <label>
              Password
              <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} />
            </label>
            <button type="submit" className={styles.primaryButton}>
              Sign in
            </button>
          </form>

          {authError ? <p className={styles.errorText}>{authError}</p> : null}

          <section className={styles.demoCard}>
            <h2>Demo users</h2>
            <div className={styles.credentialList}>
              {[
                { role: "Admin", email: "admin@salthub.local", password: "admin123" },
                { role: "Uploader", email: "uploader@salthub.local", password: "upload123" },
                { role: "Reviewer", email: "reviewer@salthub.local", password: "review123" },
                { role: "Publisher", email: "publisher@salthub.local", password: "publish123" },
              ].map((user) => (
                <div key={user.email} className={styles.credentialRow}>
                  <strong>{user.role}</strong>
                  <span>{user.email}</span>
                  <span>{user.password}</span>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>
    );
    */

    return (
      <main className={styles.authPage}>
        <section className={styles.authCard}>
          <div className={styles.brandRow}>
            <div className={styles.logoMark}>S</div>
            <div>
              <h1>Salthub Report Card</h1>
              <p>Temporary auth bypass is enabled, but app state could not be loaded.</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const currentPeriod = appState.periods.find((period) => period.id === selectedPeriodId) ?? appState.periods[0];
  const isReadOnly = !appState.storage.writable;

  return (
    <main className={styles.appPage}>
      <header className={styles.header}>
        <div className={styles.brandRow}>
          <div className={styles.logoMark}>S</div>
          <div>
            <h1>Salthub Report Card</h1>
            <p>Validated uploads, grounded drafts, review workflow, and publish-ready outputs.</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <span className={`${styles.statusPill} ${styles.statusBlue}`}>{appState.currentUser.role}</span>
          <span className={styles.userMeta}>{appState.currentUser.name}</span>
          {/* Demo sign-out is intentionally hidden while auth bypass is enabled. */}
        </div>
      </header>

      {isReadOnly ? (
        <section className={styles.banner}>
          <strong>Read-only production mode</strong>
          <span>
            This deployment is using seeded in-memory data until persistent storage is wired. Upload, generate, approve,
            and publish actions are disabled.
          </span>
        </section>
      ) : null}

      {actionError ? (
        <section className={`${styles.banner} ${styles.bannerError}`}>
          <strong>Action failed</strong>
          <span>{actionError}</span>
        </section>
      ) : null}

      <section className={styles.contentGrid}>
        <div className={styles.leftRail}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Upload batch</h2>
                <p>Attach exports to a reporting period. Raw files are persisted and normalized server-side.</p>
              </div>
            </div>

            <form className={styles.stack} onSubmit={handleUpload}>
              <label>
                Reporting period
                <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
                  {appState.periods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Upload files
                <input type="file" multiple accept=".csv,.json" onChange={(event) => setSelectedFiles(event.target.files)} />
              </label>
              <button type="submit" className={styles.primaryButton} disabled={isPending || !selectedFiles || isReadOnly}>
                {isPending ? "Processing..." : "Upload batch"}
              </button>
            </form>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Reporting periods</h2>
                <p>Historical periods support reproducible snapshots and period-over-period review.</p>
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Cadence</th>
                    <th>Date range</th>
                  </tr>
                </thead>
                <tbody>
                  {appState.periods.map((period) => (
                    <tr key={period.id} className={period.id === currentPeriod?.id ? styles.activeRow : undefined}>
                      <td>{period.label}</td>
                      <td>{period.cadence}</td>
                      <td>
                        {period.startDate} to {period.endDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Uploaded files</h2>
                <p>Validation results and schema detection per file.</p>
              </div>
            </div>
            {appState.uploadBatches.length === 0 ? (
              <p className={styles.emptyNote}>No upload batches yet.</p>
            ) : (
              <div className={styles.stack}>
                {appState.uploadBatches
                  .filter((batch) => batch.periodId === currentPeriod?.id)
                  .map((batch) => (
                    <article key={batch.id} className={styles.batchCard}>
                      <div className={styles.batchHeader}>
                        <strong>Batch {batch.id.slice(0, 8)}</strong>
                        <span>{new Date(batch.createdAt).toLocaleString()}</span>
                      </div>
                      {batch.files.map((file) => (
                        <div key={file.id} className={styles.fileRow}>
                          <div>
                            <strong>{file.name}</strong>
                            <div className={styles.inlineMeta}>
                              <span>{file.detectedKind}</span>
                              <span>{file.rowCount} rows</span>
                              <span className={`${styles.statusPill} ${statusClass(file.status)}`}>{file.status}</span>
                            </div>
                          </div>
                          <ValidationList
                            messages={file.validationMessages.map((message, index) => ({
                              level: (message.level as "info" | "warning" | "error") ?? "info",
                              code: `validation-${index}`,
                              message: message.message,
                            }))}
                          />
                        </div>
                      ))}
                    </article>
                  ))}
              </div>
            )}
          </section>
        </div>

        <div className={styles.rightRail}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Draft generation</h2>
                <p>Generate grounded drafts in bulk by period or selectively by report.</p>
              </div>
              <div className={styles.inlineControls}>
                <label className={styles.inlineCheckbox}>
                  <input
                    type="checkbox"
                    checked={includeNarrative}
                    onChange={(event) => setIncludeNarrative(event.target.checked)}
                  />
                  Enable grounded narrative layer
                </label>
                <button type="button" className={styles.primaryButton} disabled={isReadOnly} onClick={() => void generateDrafts()}>
                  Generate drafts for period
                </button>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Audience</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {appState.reports
                    .filter((report) => report.periodId === currentPeriod?.id)
                    .map((report) => (
                      <tr key={report.id} className={report.id === activeReport?.id ? styles.activeRow : undefined}>
                        <td>{report.audience}</td>
                        <td>{report.subjectLabel}</td>
                        <td>
                          <span className={`${styles.statusPill} ${statusClass(report.workflowState)}`}>{report.workflowState}</span>
                        </td>
                        <td>{new Date(report.updatedAt).toLocaleString()}</td>
                        <td>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.linkButton} onClick={() => setSelectedReportId(report.id)}>
                              Preview
                            </button>
                            <button
                              type="button"
                              className={styles.linkButton}
                              disabled={isReadOnly}
                              onClick={() => void generateDrafts({ audience: report.audience, subjectId: report.subjectId })}
                            >
                              Regenerate
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Review and publish</h2>
                <p>Drafts are versioned. Approval and publishing update workflow state without mutating history.</p>
              </div>
              {activeReport ? (
                <div className={styles.inlineControls}>
                  <button type="button" className={styles.secondaryButton} disabled={isReadOnly} onClick={() => void transitionReport("approve")}>
                    Approve
                  </button>
                  <button type="button" className={styles.primaryButton} disabled={isReadOnly} onClick={() => void transitionReport("publish")}>
                    Publish
                  </button>
                </div>
              ) : null}
            </div>

            {activeVersion ? (
              <>
                <div className={styles.previewTabs}>
                  <button
                    type="button"
                    className={previewMode === "web" ? styles.tabActive : styles.tabButton}
                    onClick={() => setPreviewMode("web")}
                  >
                    Web preview
                  </button>
                  <button
                    type="button"
                    className={previewMode === "email" ? styles.tabActive : styles.tabButton}
                    onClick={() => setPreviewMode("email")}
                  >
                    Email HTML
                  </button>
                </div>
                {previewMode === "web" ? (
                  <ReportCardTemplate report={activeVersion.viewModel} />
                ) : (
                  <iframe title="Email preview" className={styles.emailFrame} srcDoc={emailHtml} />
                )}
              </>
            ) : (
              <p className={styles.emptyNote}>No generated report selected for preview.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
