export type FileKind =
  | "action_logs"
  | "project_fees_by_department_by_month"
  | "department_breakdown_report"
  | "client_summary_report"
  | "unsupported";

export type ParseFormat = "csv" | "excel" | "unknown";

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
  departmentRollups: DepartmentRollup[];
  enterpriseRollup: EnterpriseRollup;
  missingSources: string[];
  duplicateUploads: string[];
}

export interface SimpleReportSection {
  title: string;
  bullets: string[];
  emptyState?: string;
}

export interface SimpleGeneratedReport {
  title: string;
  generatedAt: string;
  summaryCards: Array<{ label: string; value: string; detail?: string }>;
  sections: SimpleReportSection[];
  missingInputs: string[];
}
