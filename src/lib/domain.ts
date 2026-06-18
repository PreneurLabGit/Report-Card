export type FileKind =
  | "action_logs"
  | "project_fees_by_department_by_month"
  | "department_breakdown_report"
  | "client_summary_report"
  | "user_directory"
  | "analytics_payload"
  | "unsupported";

export type ParseFormat = "csv" | "json" | "unknown";

export type ValidationLevel = "info" | "warning" | "error";

export interface ValidationMessage {
  level: ValidationLevel;
  code: string;
  message: string;
}

export interface UploadArtifact {
  id: string;
  name: string;
  size: number;
  format: ParseFormat;
  detectedKind: FileKind;
  status: "pending" | "validated" | "normalized" | "unsupported" | "error";
  messages: ValidationMessage[];
  rowCount: number;
  hash: string;
}

export interface RawActionLog {
  id: string;
  user_email: string;
  action: string;
  created: string;
  payload: string | Record<string, unknown> | null;
}

export interface RawProjectFeesByDepartmentRow {
  projectCode: string;
  client: string;
  programName: string;
  startMonth: string;
  endMonth: string;
  status: string;
  totalFees: number;
  departmentFees: Record<string, number>;
}

export interface RawDepartmentBreakdownRow {
  department: string;
  totalFees: number;
  percentOfTotal: number;
}

export interface RawClientSummaryRow {
  client: string;
  totalProjects: number;
  totalFees: number;
  totalRevenue: number;
}

export interface RawUserDirectoryRow {
  id?: string;
  email: string;
  name?: string;
  role?: string;
  department?: string;
  managerEmail?: string;
  leaderEmail?: string;
}

export interface RawAnalyticsPayload {
  users?: Array<Record<string, unknown>>;
  managers?: Array<Record<string, unknown>>;
  summary?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface NormalizedUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  department?: string;
  managerEmail?: string;
  leaderEmail?: string;
}

export interface IndividualMetric {
  subjectId: string;
  subjectType: "user" | "manager" | "leader";
  activityCount: number;
  workflowScore?: number;
  lastActivityAt?: string;
}

export interface DepartmentRollup {
  id: string;
  department: string;
  totalFees: number;
  percentOfTotal?: number;
}

export interface EnterpriseRollup {
  totalFees: number;
  totalProjects: number;
  totalRevenue?: number;
  totalActions: number;
}

export interface NormalizedDataset {
  uploads: UploadArtifact[];
  actionLogs: RawActionLog[];
  projectFeesByDepartment: RawProjectFeesByDepartmentRow[];
  departmentBreakdown: RawDepartmentBreakdownRow[];
  clientSummaries: RawClientSummaryRow[];
  userDirectory: NormalizedUser[];
  analyticsPayloads: RawAnalyticsPayload[];
  individualMetrics: IndividualMetric[];
  departmentRollups: DepartmentRollup[];
  enterpriseRollup: EnterpriseRollup;
  missingSources: string[];
  duplicateUploads: string[];
}

export type ReportAudience = "user" | "manager" | "leader" | "departmentLead" | "elt";

export interface ScoreBand {
  score: number;
  band: "green" | "yellow" | "red";
  label: string;
}

export interface ReportSection {
  title: string;
  body: string;
  availability: "available" | "placeholder" | "hidden";
}

export interface ComparisonRow {
  label: string;
  value: string;
  context?: string;
}

export interface ReportViewModel {
  audience: ReportAudience;
  title: string;
  subtitle: string;
  subjectLabel: string;
  generatedAt: string;
  score: ScoreBand;
  metrics: Array<{ label: string; value: string; detail?: string }>;
  comparisons: ComparisonRow[];
  sections: ReportSection[];
  notes: string[];
  printHint: string;
}

export interface AudienceOption {
  id: string;
  audience: ReportAudience;
  label: string;
  subjectId?: string;
}
