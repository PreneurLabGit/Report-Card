import type { NormalizedDataset, NormalizedUser } from "@/lib/domain";
import type { ProcessedUpload } from "@/ingestion/process-upload";
import { slugify, uniqueBy } from "@/lib/utils";

function normalizeUsers(processed: ProcessedUpload[]): NormalizedUser[] {
  const fromDirectory = processed.flatMap((item) => item.userDirectory ?? []);
  const fromAnalytics = processed.flatMap((item) =>
    (item.analyticsPayloads ?? []).flatMap((payload) =>
      (payload.users ?? [])
        .filter((user): user is Record<string, unknown> => typeof user === "object" && user !== null)
        .flatMap((user) =>
          typeof user.email === "string"
            ? [
                {
                  id: typeof user.id === "string" ? user.id : slugify(user.email),
                  email: user.email,
                  name: typeof user.name === "string" ? user.name : user.email,
                  role: typeof user.role === "string" ? user.role : undefined,
                  department: typeof user.department === "string" ? user.department : undefined,
                  managerEmail: typeof user.managerEmail === "string" ? user.managerEmail : undefined,
                  leaderEmail: typeof user.leaderEmail === "string" ? user.leaderEmail : undefined,
                } satisfies NormalizedUser,
              ]
            : [],
        ),
    ),
  );

  return uniqueBy(
    [...fromDirectory, ...fromAnalytics].map((user) => ({
      id: user.id ?? slugify(user.email),
      email: user.email,
      name: user.name ?? user.email,
      role: user.role,
      department: user.department,
      managerEmail: user.managerEmail,
      leaderEmail: user.leaderEmail,
    })),
    (user) => user.email.toLowerCase(),
  );
}

export function normalizeDataset(processed: ProcessedUpload[]): NormalizedDataset {
  const uploads = processed.map((item) => item.artifact);
  const actionLogs = processed.flatMap((item) => item.actionLogs ?? []);
  const projectFeesByDepartment = processed.flatMap((item) => item.projectFeesByDepartment ?? []);
  const departmentBreakdown = processed.flatMap((item) => item.departmentBreakdown ?? []);
  const clientSummaries = processed.flatMap((item) => item.clientSummaries ?? []);
  const userDirectory = normalizeUsers(processed);
  const analyticsPayloads = processed.flatMap((item) => item.analyticsPayloads ?? []);

  const departmentRollups = departmentBreakdown.map((item) => ({
    id: slugify(item.department),
    department: item.department,
    totalFees: item.totalFees,
    percentOfTotal: item.percentOfTotal,
  }));

  const actionCountsByEmail = actionLogs.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.user_email] = (accumulator[item.user_email] ?? 0) + 1;
    return accumulator;
  }, {});

  const individualMetrics = userDirectory.map((user) => {
    const relatedAnalytics = analyticsPayloads
      .flatMap((payload) => payload.users ?? [])
      .find((item) => item.email === user.email);
    const workflowScore =
      relatedAnalytics && typeof relatedAnalytics.workflowScore === "number"
        ? relatedAnalytics.workflowScore
        : undefined;
    const lastActivityAt = actionLogs
      .filter((item) => item.user_email === user.email)
      .sort((left, right) => right.created.localeCompare(left.created))[0]?.created;

    return {
      subjectId: user.id,
      subjectType: user.role?.toLowerCase().includes("manager")
        ? "manager"
        : user.role?.toLowerCase().includes("leader")
          ? "leader"
          : "user",
      activityCount: actionCountsByEmail[user.email] ?? 0,
      workflowScore,
      lastActivityAt,
    } as const;
  });

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
    userDirectory.length === 0 ? "user_directory" : null,
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
    userDirectory,
    analyticsPayloads,
    individualMetrics,
    departmentRollups,
    enterpriseRollup,
    missingSources,
    duplicateUploads,
  };
}
