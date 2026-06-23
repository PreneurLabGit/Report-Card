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

export interface OrganizationTreeTeamMember {
  userId: string;
  userName: string;
  email: string;
  role: string;
  department: string;
  disabled: boolean;
}

export interface OrganizationTreeBusinessOwner extends OrganizationTreeTeamMember {
  teamMembers: OrganizationTreeTeamMember[];
}

export interface OrganizationTreeSuperAdmin extends OrganizationTreeTeamMember {
  businessOwners: OrganizationTreeBusinessOwner[];
}

export interface OrganizationTreeResponse {
  superAdmins: OrganizationTreeSuperAdmin[];
}

export interface ActivityUserSummary {
  userId: string;
  userName: string;
  userEmail: string;
  loginCount?: number;
  projectsConfirmed?: number;
  sentForBusinessOwnerApproval?: number;
  otherActions?: Record<string, number>;
}

export interface ActivitySummaryResponse {
  start_date: string;
  end_date: string;
  users: ActivityUserSummary[];
}

export interface DirectoryUser {
  userId: string;
  userName: string;
  email: string | null;
  role: string | null;
  department: string | null;
  disabled: boolean;
  superAdminId: string | null;
  businessOwnerId: string | null;
  managerUserId: string | null;
}

export type SupportedReportRole = "team_member" | "business_owner" | "super_admin";

export interface ReportScopeEntry {
  userId: string;
  userName: string;
  role: SupportedReportRole;
  disabled: boolean;
  hasActivity: boolean;
  metrics: {
    loginCount: number;
    projectsConfirmed: number;
    pipelineEntriesCreated: number;
    estimatesSubmitted: number;
    approvalsCompleted: number;
    reworkEvents: number;
  };
}

export interface ReportScopeSummary {
  role: SupportedReportRole;
  eligibleChildCount: number;
  activeChildCount: number;
  emptyStateMessage: string | null;
}

export interface ReportPeriod {
  startDate: string;
  endDate: string;
  displayLabel: string;
}

export interface NormalizedUserReport {
  userId: string;
  recipientEmail: string | null;
  userName: string;
  role: SupportedReportRole | null;
  department: string | null;
  disabled: boolean;
  reportPeriod: ReportPeriod;
  metrics: {
    loginCount: number;
    pipelineEntriesCreated: number;
    estimatesCreated: number | null;
    estimatesSubmitted: number;
    sentForBusinessOwnerApproval: number;
    firstApprovals: number;
    approvalsCompleted: number;
    clientApprovals: number;
    projectsConfirmed: number;
    reworkEvents: number;
    activeDaysCount: number | null;
    lastActivityTs: string | null;
    score: number | null;
    priorPeriodScore: number | null;
    wowScoreDelta: number | null;
  };
  status: {
    label: string | null;
    color: "green" | "yellow" | "red" | null;
  };
  content: {
    lede: string;
    observation: string;
    whatStandsOut: string;
    worthDoingThisWeek: string[];
    coachingItems: string[];
  };
  missingFields: string[];
  previewStatus: "ready" | "missing_data" | "disabled";
  scopeSummary: ReportScopeSummary | null;
  scopeEntries: ReportScopeEntry[];
  html: string;
  templateMode: "file-template" | "fallback-template";
}

export interface ApiReportSummary {
  activityUserCount: number;
  eligibleDirectoryUserCount: number;
  matchedEligibleUserCount: number;
  readyReportCount: number;
  missingDataReportCount: number;
  disabledReportCount: number;
  skippedIneligibleActivityUserCount: number;
  skippedUsersWithoutDirectoryMatch: number;
  skippedUnsupportedRoleUserCount: number;
  emptyStateReportCount: number;
}

export interface ApiReportResult {
  mode: "api";
  generatedAt: string;
  period: ReportPeriod;
  priorPeriod: ReportPeriod;
  warnings: ValidationMessage[];
  summary: ApiReportSummary;
  reports: NormalizedUserReport[];
}
