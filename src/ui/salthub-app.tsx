"use client";

import { useMemo, useState, useTransition } from "react";

import type { ProcessedUpload } from "@/ingestion/process-upload";
import { processUpload } from "@/ingestion/process-upload";
import type { AudienceOption, NormalizedDataset, ValidationMessage } from "@/lib/domain";
import { normalizeDataset } from "@/normalization/normalize";
import { qaReportViewModel } from "@/qa/report-qa";
import { buildReportViewModel } from "@/reporting/build-report";
import { buildAudienceOptions } from "@/reporting/options";
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

function buildDatasetPreview(dataset: NormalizedDataset | null) {
  if (!dataset) {
    return [];
  }

  return [
    { label: "Uploads", value: dataset.uploads.length },
    { label: "Action logs", value: dataset.actionLogs.length },
    { label: "Projects", value: dataset.projectFeesByDepartment.length },
    { label: "Departments", value: dataset.departmentRollups.length },
    { label: "Friction notes", value: dataset.frictionNotes.length },
    { label: "Users", value: dataset.userDirectory.length },
    { label: "Analytics payloads", value: dataset.analyticsPayloads.length },
  ];
}

export function SalthubApp() {
  const [processedUploads, setProcessedUploads] = useState<ProcessedUpload[]>([]);
  const [reportOptionId, setReportOptionId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const dataset = useMemo(
    () => (processedUploads.length > 0 ? normalizeDataset(processedUploads) : null),
    [processedUploads],
  );
  const reportOptions = useMemo(() => (dataset ? buildAudienceOptions(dataset) : []), [dataset]);

  const activeOption: AudienceOption | undefined = reportOptions.find((item) => item.id === reportOptionId) ?? reportOptions[0];
  const report = dataset && activeOption ? buildReportViewModel(dataset, activeOption) : null;
  const reportQa = report ? qaReportViewModel(report) : [];

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const files = Array.from(fileList);

    startTransition(async () => {
      const nextUploads = await Promise.all(files.map((file) => processUpload(file)));
      setProcessedUploads((current) => {
        const combined = [...current];

        for (const upload of nextUploads) {
          const duplicate = combined.find((item) => item.artifact.hash === upload.artifact.hash);

          if (!duplicate) {
            combined.push(upload);
          }
        }

        return combined;
      });
    });
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Phase 2 foundation</p>
          <h1>Salthub Report Card</h1>
          <p>
            Upload SaltHub exports and structured JSON feeds, validate them, normalize them, and preview audience-specific
            narrative briefs.
          </p>
        </div>
        <div className={styles.heroPanel}>
          <span className={styles.metaLabel}>Supported in Phase 1</span>
          <ul>
            <li>`action_logs.csv`</li>
            <li>`project_fees_by_department_by_month.csv`</li>
            <li>`department_breakdown_report.csv`</li>
            <li>`client_summary_report.csv`</li>
            <li>`friction_notes.csv` or JSON</li>
            <li>User directory CSV or JSON</li>
            <li>Analytics JSON payloads</li>
          </ul>
        </div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.leftRail}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Upload</p>
                <h2>Landing zone</h2>
              </div>
              {isPending ? <span className={styles.pending}>Processing...</span> : null}
            </div>

            <label className={styles.uploadDropzone}>
              <input
                type="file"
                multiple
                accept=".csv,.json"
                className={styles.fileInput}
                onChange={(event) => void handleFiles(event.target.files)}
              />
              <strong>Drop files here or browse</strong>
              <span>Files stay in local app state for this phase. Unsupported CSV or JSON is rejected with guidance.</span>
            </label>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Validation</p>
                <h2>Uploaded files</h2>
              </div>
            </div>

            {processedUploads.length === 0 ? (
              <p className={styles.emptyNote}>No uploads yet. Start with an action log export or a user directory file.</p>
            ) : (
              <div className={styles.uploadList}>
                {processedUploads.map((upload) => (
                  <article key={upload.artifact.id} className={styles.uploadRow}>
                    <div className={styles.uploadMeta}>
                      <strong>{upload.artifact.name}</strong>
                      <span>
                        {upload.artifact.detectedKind} · {upload.artifact.rowCount} rows
                      </span>
                    </div>
                    <ValidationList messages={upload.artifact.messages} />
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Normalization</p>
                <h2>Dataset preview</h2>
              </div>
            </div>

            {dataset ? (
              <>
                <div className={styles.previewGrid}>
                  {buildDatasetPreview(dataset).map((item) => (
                    <div key={item.label} className={styles.previewTile}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
                <ValidationList
                  messages={[
                    ...dataset.duplicateUploads.map((name) => ({
                      level: "warning" as const,
                      code: "duplicate_upload",
                      message: `Duplicate upload ignored: ${name}`,
                    })),
                    ...dataset.missingSources.map((name) => ({
                      level: "info" as const,
                      code: "missing_source",
                      message: `Missing source for richer previews: ${name}`,
                    })),
                  ]}
                />
              </>
            ) : (
              <p className={styles.emptyNote}>Normalized data will appear after at least one valid file is uploaded.</p>
            )}
          </section>
        </div>

        <div className={styles.rightRail}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Reports</p>
                <h2>Generation controls</h2>
              </div>
            </div>

            {reportOptions.length > 0 ? (
              <div className={styles.controls}>
                <label>
                  Audience / subject
                  <select value={activeOption?.id ?? ""} onChange={(event) => setReportOptionId(event.target.value)}>
                    {reportOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className={styles.printButton} onClick={() => window.print()}>
                  Print / export PDF
                </button>
              </div>
            ) : (
              <p className={styles.emptyNote}>Upload a user directory, department export, or analytics payload to unlock report previews.</p>
            )}
          </section>

          <section className={`${styles.panel} ${styles.previewPanel}`}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Preview</p>
                <h2>Report card output</h2>
              </div>
            </div>

            {report ? (
              <>
                <ValidationList messages={reportQa} />
                <ReportCardTemplate report={report} />
              </>
            ) : (
              <p className={styles.emptyNote}>No report available yet. Upload supported sources and select an audience.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
