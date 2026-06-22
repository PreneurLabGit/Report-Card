import type { NormalizedDataset } from "@/lib/domain";
import type { ProcessedUpload } from "@/ingestion/process-upload";
import { slugify } from "@/lib/utils";

export function normalizeDataset(processed: ProcessedUpload[]): NormalizedDataset {
  const uploads = processed.map((item) => item.artifact);
  const actionLogs = processed.flatMap((item) => item.actionLogs ?? []);
  const projectFeesByDepartment = processed.flatMap((item) => item.projectFeesByDepartment ?? []);
  const departmentBreakdown = processed.flatMap((item) => item.departmentBreakdown ?? []);
  const clientSummaries = processed.flatMap((item) => item.clientSummaries ?? []);

  const departmentRollups = departmentBreakdown.map((item) => ({
    id: slugify(item.department),
    department: item.department,
    totalFees: item.totalFees,
    percentOfTotal: item.percentOfTotal,
  }));

  const enterpriseRollup = {
    totalFees:
      departmentBreakdown.reduce((sum, item) => sum + item.totalFees, 0) ||
      projectFeesByDepartment.reduce((sum, item) => sum + item.totalFees, 0),
    totalProjects: projectFeesByDepartment.length,
    totalRevenue: clientSummaries.reduce((sum, item) => sum + item.totalRevenue, 0) || undefined,
    totalActions: actionLogs.length,
  };

  const missingSources = [
    actionLogs.length === 0 ? "action_logs" : null,
    projectFeesByDepartment.length === 0 ? "project_fees_by_department_by_month" : null,
    departmentBreakdown.length === 0 ? "department_breakdown_report" : null,
  ].filter(Boolean) as string[];

  const duplicateUploads = uploads
    .filter((artifact, index, items) => items.findIndex((candidate) => candidate.hash === artifact.hash) !== index)
    .map((artifact) => artifact.name);

  return {
    uploads,
    actionLogs,
    projectFeesByDepartment,
    departmentBreakdown,
    clientSummaries,
    departmentRollups,
    enterpriseRollup,
    missingSources,
    duplicateUploads,
  };
}
