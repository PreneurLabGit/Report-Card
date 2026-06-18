import type { ProcessedUpload } from "@/ingestion/process-upload";
import type { ReportAudience, ReportViewModel } from "@/lib/domain";

export type UserRole = "admin" | "uploader" | "reviewer" | "publisher" | "viewer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: string;
}

export type ReportingCadence = "weekly" | "biweekly" | "monthly";

export interface ReportingPeriodRecord {
  id: string;
  label: string;
  cadence: ReportingCadence;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface UploadedFileRecord {
  id: string;
  batchId: string;
  name: string;
  format: string;
  detectedKind: string;
  status: string;
  rowCount: number;
  validationMessages: Array<{ level: string; message: string }>;
  blobPath: string;
}

export interface UploadBatchRecord {
  id: string;
  periodId: string;
  createdAt: string;
  uploaderUserId: string;
  normalizedPayload: ProcessedUpload[];
  fileIds: string[];
}

export type ReportWorkflowState = "draft" | "approved" | "published";

export interface ReportVersionRecord {
  id: string;
  reportId: string;
  versionNumber: number;
  createdAt: string;
  createdByUserId: string;
  workflowState: ReportWorkflowState;
  viewModel: ReportViewModel;
  emailHtml: string;
  llmProvider: string;
  llmEnabled: boolean;
}

export interface GeneratedReportRecord {
  id: string;
  periodId: string;
  audience: ReportAudience;
  subjectId?: string;
  subjectLabel: string;
  createdAt: string;
  currentVersionId: string;
  versionIds: string[];
}

export interface ReviewActionRecord {
  id: string;
  reportId: string;
  versionId: string;
  action: "approve" | "publish";
  createdAt: string;
  actorUserId: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  actorUserId: string;
  createdAt: string;
  targetId?: string;
  metadata?: Record<string, string>;
}

export interface PersistedAppState {
  users: AuthUser[];
  sessions: SessionRecord[];
  periods: ReportingPeriodRecord[];
  uploadedFiles: UploadedFileRecord[];
  uploadBatches: UploadBatchRecord[];
  generatedReports: GeneratedReportRecord[];
  reportVersions: ReportVersionRecord[];
  reviewActions: ReviewActionRecord[];
  auditLog: AuditLogRecord[];
}

export interface AppStatePayload {
  currentUser: Omit<AuthUser, "password">;
  storage: {
    mode: "local-file" | "seed-readonly";
    writable: boolean;
  };
  periods: ReportingPeriodRecord[];
  uploadBatches: Array<{
    id: string;
    periodId: string;
    createdAt: string;
    uploaderUserId: string;
    files: UploadedFileRecord[];
  }>;
  reports: Array<{
    id: string;
    periodId: string;
    audience: ReportAudience;
    subjectId?: string;
    subjectLabel: string;
    workflowState: ReportWorkflowState;
    currentVersionId: string;
    updatedAt: string;
  }>;
  reportVersions: ReportVersionRecord[];
}
