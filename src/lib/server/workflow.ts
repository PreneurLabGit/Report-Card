import { randomUUID } from "node:crypto";

import { normalizeDataset } from "@/normalization/normalize";
import { buildReportViewModel } from "@/reporting/build-report";
import { buildAudienceOptions } from "@/reporting/options";
import { renderReportEmailHtml } from "@/lib/server/report-renderers";
import { getNarrativeProvider } from "@/lib/server/llm";
import { getStorageAdapter, readState, saveBlob, writeState } from "@/lib/server/store";
import type { AppStatePayload, ReportWorkflowState, UploadedFileRecord } from "@/lib/server/types";
import type { ProcessedUpload } from "@/ingestion/process-upload";
import { processUpload } from "@/ingestion/process-upload";
import { sanitizeUser } from "@/lib/server/auth";

export async function loadAppStatePayload(currentUserId: string): Promise<AppStatePayload> {
  const state = await readState();
  const user = state.users.find((item) => item.id === currentUserId);
  if (!user) {
    throw new Error("User not found.");
  }

  return {
    currentUser: sanitizeUser(user),
    storage: {
      mode: getStorageAdapter().mode,
      writable: getStorageAdapter().writable,
    },
    periods: state.periods,
    uploadBatches: state.uploadBatches.map((batch) => ({
      id: batch.id,
      periodId: batch.periodId,
      createdAt: batch.createdAt,
      uploaderUserId: batch.uploaderUserId,
      files: state.uploadedFiles.filter((file) => batch.fileIds.includes(file.id)),
    })),
    reports: state.generatedReports.map((report) => {
      const version = state.reportVersions.find((item) => item.id === report.currentVersionId);
      return {
        id: report.id,
        periodId: report.periodId,
        audience: report.audience,
        subjectId: report.subjectId,
        subjectLabel: report.subjectLabel,
        workflowState: version?.workflowState ?? "draft",
        currentVersionId: report.currentVersionId,
        updatedAt: version?.createdAt ?? report.createdAt,
      };
    }),
    reportVersions: state.reportVersions,
  };
}

export async function createUploadBatch(params: { periodId: string; uploaderUserId: string; files: File[] }) {
  const state = await readState();
  const batchId = randomUUID();
  const processedUploads: ProcessedUpload[] = [];
  const uploadedFileRecords: UploadedFileRecord[] = [];

  for (const file of params.files) {
    const processed = await processUpload(file);
    processedUploads.push(processed);
    const blobPath = await saveBlob(file.name, await file.text());
    uploadedFileRecords.push({
      id: randomUUID(),
      batchId,
      name: file.name,
      format: processed.artifact.format,
      detectedKind: processed.artifact.detectedKind,
      status: processed.artifact.status,
      rowCount: processed.artifact.rowCount,
      validationMessages: processed.artifact.messages.map((message) => ({
        level: message.level,
        message: message.message,
      })),
      blobPath,
    });
  }

  state.uploadedFiles.push(...uploadedFileRecords);
  state.uploadBatches.push({
    id: batchId,
    periodId: params.periodId,
    createdAt: new Date().toISOString(),
    uploaderUserId: params.uploaderUserId,
    normalizedPayload: processedUploads,
    fileIds: uploadedFileRecords.map((item) => item.id),
  });
  state.auditLog.push({
    id: randomUUID(),
    action: "upload_batch_created",
    actorUserId: params.uploaderUserId,
    createdAt: new Date().toISOString(),
    targetId: batchId,
  });
  await writeState(state);
  return batchId;
}

function getPeriodProcessedUploads(state: Awaited<ReturnType<typeof readState>>, periodId: string) {
  return state.uploadBatches.filter((batch) => batch.periodId === periodId).flatMap((batch) => batch.normalizedPayload);
}

function previousPeriodId(state: Awaited<ReturnType<typeof readState>>, periodId: string) {
  const periods = [...state.periods].sort((left, right) => left.startDate.localeCompare(right.startDate));
  const index = periods.findIndex((item) => item.id === periodId);
  return index > 0 ? periods[index - 1]?.id : undefined;
}

function applyHistoricalContext(viewModel: ReturnType<typeof buildReportViewModel>, priorVersion?: { viewModel: ReturnType<typeof buildReportViewModel> }) {
  if (!priorVersion) {
    return viewModel;
  }

  const delta = viewModel.score.score - priorVersion.viewModel.score.score;
  return {
    ...viewModel,
    notes: [
      ...viewModel.notes,
      delta === 0
        ? "No score movement versus the prior comparable period."
        : delta > 0
          ? `Up ${delta} points versus the prior comparable period.`
          : `Down ${Math.abs(delta)} points versus the prior comparable period.`,
    ],
  };
}

export async function generateReports(params: {
  periodId: string;
  actorUserId: string;
  includeNarrative: boolean;
  audience?: string;
  subjectId?: string;
}) {
  const state = await readState();
  const processedUploads = getPeriodProcessedUploads(state, params.periodId);
  const dataset = normalizeDataset(processedUploads);
  const allOptions = buildAudienceOptions(dataset);
  const options = allOptions.filter((option) => {
    if (params.audience && option.audience !== params.audience) {
      return false;
    }
    if (params.subjectId && option.subjectId !== params.subjectId) {
      return false;
    }
    return true;
  });

  const provider = getNarrativeProvider();
  const priorPeriod = previousPeriodId(state, params.periodId);

  for (const option of options) {
    let viewModel = buildReportViewModel(dataset, option);
    const priorReport = priorPeriod
      ? state.generatedReports.find(
          (report) => report.periodId === priorPeriod && report.audience === option.audience && report.subjectId === option.subjectId,
        )
      : undefined;
    const priorVersion = priorReport
      ? state.reportVersions.find((version) => version.id === priorReport.currentVersionId)
      : undefined;
    viewModel = applyHistoricalContext(viewModel, priorVersion ? { viewModel: priorVersion.viewModel } : undefined);

    if (params.includeNarrative) {
      const generated = await provider.generate(viewModel);
      viewModel = {
        ...viewModel,
        ...generated,
        sections: generated.sections ?? viewModel.sections,
      };
    }

    const emailHtml = renderReportEmailHtml(viewModel);
    const existingReport = state.generatedReports.find(
      (report) => report.periodId === params.periodId && report.audience === option.audience && report.subjectId === option.subjectId,
    );
    const reportId = existingReport?.id ?? randomUUID();
    const versionId = randomUUID();
    const nextVersionNumber = existingReport
      ? (state.reportVersions.filter((version) => version.reportId === existingReport.id).at(-1)?.versionNumber ?? 0) + 1
      : 1;

    if (existingReport) {
      existingReport.currentVersionId = versionId;
      existingReport.versionIds.push(versionId);
      existingReport.subjectLabel = viewModel.subjectLabel;
    } else {
      state.generatedReports.push({
        id: reportId,
        periodId: params.periodId,
        audience: option.audience,
        subjectId: option.subjectId,
        subjectLabel: viewModel.subjectLabel,
        createdAt: new Date().toISOString(),
        currentVersionId: versionId,
        versionIds: [versionId],
      });
    }
    state.reportVersions.push({
      id: versionId,
      reportId,
      versionNumber: nextVersionNumber,
      createdAt: new Date().toISOString(),
      createdByUserId: params.actorUserId,
      workflowState: "draft",
      viewModel,
      emailHtml,
      llmProvider: provider.name,
      llmEnabled: params.includeNarrative,
    });
  }

  state.auditLog.push({
    id: randomUUID(),
    action: "reports_generated",
    actorUserId: params.actorUserId,
    createdAt: new Date().toISOString(),
    targetId: params.periodId,
  });
  await writeState(state);
}

export async function transitionReportVersion(params: {
  reportId: string;
  actorUserId: string;
  action: "approve" | "publish";
}) {
  const state = await readState();
  const report = state.generatedReports.find((item) => item.id === params.reportId);
  if (!report) {
    throw new Error("Report not found.");
  }
  const version = state.reportVersions.find((item) => item.id === report.currentVersionId);
  if (!version) {
    throw new Error("Report version not found.");
  }

  const nextState: ReportWorkflowState = params.action === "approve" ? "approved" : "published";
  version.workflowState = nextState;
  state.reviewActions.push({
    id: randomUUID(),
    reportId: report.id,
    versionId: version.id,
    action: params.action,
    createdAt: new Date().toISOString(),
    actorUserId: params.actorUserId,
  });
  state.auditLog.push({
    id: randomUUID(),
    action: `report_${params.action}`,
    actorUserId: params.actorUserId,
    createdAt: new Date().toISOString(),
    targetId: version.id,
  });
  await writeState(state);
}

export async function getEmailHtml(versionId: string) {
  const state = await readState();
  return state.reportVersions.find((item) => item.id === versionId)?.emailHtml ?? "";
}
