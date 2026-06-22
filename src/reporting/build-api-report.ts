import type {
  ActivitySummaryResponse,
  ActivityUserSummary,
  ApiReportResult,
  DirectoryUser,
  NormalizedUserReport,
  OrganizationTreeResponse,
  ReportPeriod,
  ValidationMessage,
} from "@/lib/domain";
import { buildReportPeriod, calculatePriorPeriod } from "@/lib/report-period";
import { renderUserEmailHtml } from "@/reporting/render-user-email";

function getActionCount(user: ActivityUserSummary, key: string) {
  return user.otherActions?.[key] ?? 0;
}

export function flattenOrganizationTree(response: OrganizationTreeResponse) {
  const directory = new Map<string, DirectoryUser>();

  for (const superAdmin of response.superAdmins) {
    directory.set(superAdmin.userId, {
      userId: superAdmin.userId,
      userName: superAdmin.userName,
      email: superAdmin.email,
      role: superAdmin.role,
      department: superAdmin.department,
      disabled: superAdmin.disabled,
      superAdminId: superAdmin.userId,
      businessOwnerId: null,
      managerUserId: null,
    });

    for (const businessOwner of superAdmin.businessOwners) {
      directory.set(businessOwner.userId, {
        userId: businessOwner.userId,
        userName: businessOwner.userName,
        email: businessOwner.email,
        role: businessOwner.role,
        department: businessOwner.department,
        disabled: businessOwner.disabled,
        superAdminId: superAdmin.userId,
        businessOwnerId: businessOwner.userId,
        managerUserId: superAdmin.userId,
      });

      for (const teamMember of businessOwner.teamMembers) {
        directory.set(teamMember.userId, {
          userId: teamMember.userId,
          userName: teamMember.userName,
          email: teamMember.email,
          role: teamMember.role,
          department: teamMember.department,
          disabled: teamMember.disabled,
          superAdminId: superAdmin.userId,
          businessOwnerId: businessOwner.userId,
          managerUserId: businessOwner.userId,
        });
      }
    }
  }

  return directory;
}

function getMissingFields(user: DirectoryUser, scoreAvailable: boolean) {
  const missing: string[] = [];

  if (!user.email) {
    missing.push("recipientEmail");
  }

  if (!user.role) {
    missing.push("role");
  }

  if (!user.department) {
    missing.push("department");
  }

  if (!scoreAvailable) {
    missing.push("score", "priorPeriodScore", "wowScoreDelta");
  }

  missing.push("estimatesCreated", "activeDaysCount", "lastActivityTs");

  return missing;
}

function buildPreviewStatus(user: DirectoryUser, missingFields: string[]) {
  if (user.disabled) {
    return "disabled" as const;
  }

  const blockingFields = new Set(["recipientEmail", "role", "department"]);
  return missingFields.some((field) => blockingFields.has(field)) ? "missing_data" : "ready";
}

async function buildUserReport(params: {
  user: DirectoryUser;
  currentActivity: ActivityUserSummary;
  priorActivity?: ActivityUserSummary;
  period: ReportPeriod;
}) {
  const scoreAvailable = false;
  const missingFields = getMissingFields(params.user, scoreAvailable);
  const reportBase: Omit<NormalizedUserReport, "html" | "templateMode"> = {
    userId: params.user.userId,
    recipientEmail: params.user.email,
    userName: params.user.userName || params.currentActivity.userName,
    role: params.user.role,
    department: params.user.department,
    disabled: params.user.disabled,
    reportPeriod: params.period,
    metrics: {
      loginCount: params.currentActivity.loginCount ?? 0,
      pipelineEntriesCreated: getActionCount(params.currentActivity, "pipeline_create"),
      estimatesCreated: null,
      estimatesSubmitted: getActionCount(params.currentActivity, "estimate_submit_for_approval"),
      sentForBusinessOwnerApproval: params.currentActivity.sentForBusinessOwnerApproval ?? 0,
      firstApprovals: getActionCount(params.currentActivity, "estimate_approve_first"),
      approvalsCompleted: getActionCount(params.currentActivity, "estimate_approve_second"),
      clientApprovals: getActionCount(params.currentActivity, "estimate_client_approve"),
      projectsConfirmed: params.currentActivity.projectsConfirmed ?? 0,
      reworkEvents:
        getActionCount(params.currentActivity, "estimate_unapprove") +
        getActionCount(params.currentActivity, "estimate_request_second_approval"),
      activeDaysCount: null,
      lastActivityTs: null,
      score: null,
      priorPeriodScore: params.priorActivity ? null : null,
      wowScoreDelta: null,
    },
    status: {
      label: null,
      color: null,
    },
    content: {
      lede: "",
      observation: "",
    },
    missingFields,
    previewStatus: buildPreviewStatus(params.user, missingFields),
  };

  const rendered = await renderUserEmailHtml(reportBase);

  return {
    ...reportBase,
    html: rendered.html,
    templateMode: rendered.templateMode,
  } satisfies NormalizedUserReport;
}

export async function buildApiReportResult(params: {
  startDate: string;
  endDate: string;
  organizationTree: OrganizationTreeResponse;
  currentActivity: ActivitySummaryResponse;
  priorActivity: ActivitySummaryResponse;
}) {
  const period = buildReportPeriod(params.startDate, params.endDate);
  const priorPeriod = calculatePriorPeriod(params.startDate, params.endDate);
  const warnings: ValidationMessage[] = [];
  const directory = flattenOrganizationTree(params.organizationTree);
  const directoryUsers = Array.from(directory.values());
  const eligibleUsers = directoryUsers.filter((user) => user.department === "Account Management");
  const eligibleIds = new Set(eligibleUsers.map((user) => user.userId));
  const priorActivityByUserId = new Map(params.priorActivity.users.map((user) => [user.userId, user]));

  let skippedIneligibleActivityUserCount = 0;
  let skippedUsersWithoutDirectoryMatch = 0;

  const reports: NormalizedUserReport[] = [];

  for (const activityUser of params.currentActivity.users) {
    const matchedUser = directory.get(activityUser.userId);

    if (!matchedUser) {
      skippedUsersWithoutDirectoryMatch += 1;
      continue;
    }

    if (!eligibleIds.has(activityUser.userId)) {
      skippedIneligibleActivityUserCount += 1;
      continue;
    }

    reports.push(
      await buildUserReport({
        user: matchedUser,
        currentActivity: activityUser,
        priorActivity: priorActivityByUserId.get(activityUser.userId),
        period,
      }),
    );
  }

  if (params.currentActivity.users.length === 0) {
    warnings.push({
      level: "warning",
      code: "empty_activity_window",
      message: "No activity users were returned for the selected reporting period.",
    });
  }

  if (skippedUsersWithoutDirectoryMatch > 0) {
    warnings.push({
      level: "warning",
      code: "activity_users_missing_directory_match",
      message: `${skippedUsersWithoutDirectoryMatch} activity users were skipped because they were not present in the organization tree.`,
    });
  }

  if (skippedIneligibleActivityUserCount > 0) {
    warnings.push({
      level: "info",
      code: "ineligible_activity_users_skipped",
      message: `${skippedIneligibleActivityUserCount} activity users were skipped because their department was not Account Management.`,
    });
  }

  reports.sort((left, right) => left.userName.localeCompare(right.userName));

  return {
    mode: "api",
    generatedAt: new Date().toISOString(),
    period,
    priorPeriod,
    warnings,
    summary: {
      activityUserCount: params.currentActivity.users.length,
      eligibleDirectoryUserCount: eligibleUsers.length,
      matchedEligibleUserCount: reports.length,
      readyReportCount: reports.filter((report) => report.previewStatus === "ready").length,
      missingDataReportCount: reports.filter((report) => report.previewStatus === "missing_data").length,
      disabledReportCount: reports.filter((report) => report.previewStatus === "disabled").length,
      skippedIneligibleActivityUserCount,
      skippedUsersWithoutDirectoryMatch,
    },
    reports,
  } satisfies ApiReportResult;
}
