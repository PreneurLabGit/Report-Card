import type {
  ActivitySummaryResponse,
  ActivityUserSummary,
  ApiReportResult,
  DirectoryUser,
  NormalizedUserReport,
  OrganizationTreeResponse,
  ReportPeriod,
  ReportScopeEntry,
  ReportScopeSummary,
  SupportedReportRole,
  ValidationMessage,
} from "@/lib/domain";
import { getEmailDeliveryConfigSummary } from "@/lib/brevo";
import { flattenOrganizationTree } from "@/lib/organization-tree";
import {
  calculateBusinessOwnerScore,
  calculateSuperAdminScore,
  calculateTeamMemberScore,
  getScoreStatus,
  type ScoreMetrics,
} from "@/lib/scoring";
import { generateAiNarrativeContent } from "@/reporting/generate-ai-content";
import { renderUserEmailHtml } from "@/reporting/render-user-email";

const ACCOUNT_MANAGEMENT_DEPARTMENT = "Account Management";
const INDIVIDUAL_REPORT_ROLES = [
  "team_member",
  "project_lead",
  "freelancer",
  "contributor",
  "department_owner",
] as const satisfies SupportedReportRole[];
const SUPPORTED_REPORT_ROLES: SupportedReportRole[] = [
  ...INDIVIDUAL_REPORT_ROLES,
  "business_owner",
  "super_admin",
];
const SUPPORTED_REPORT_ROLE_SET = new Set<string>(SUPPORTED_REPORT_ROLES);
const INDIVIDUAL_REPORT_ROLE_SET = new Set<string>(INDIVIDUAL_REPORT_ROLES);

type AggregatedMetrics = ScoreMetrics;

function getActionCount(user: ActivityUserSummary, key: string) {
  return user.otherActions?.[key] ?? 0;
}

function getActivityMetrics(user?: ActivityUserSummary): AggregatedMetrics {
  if (!user) {
    return {
      loginCount: 0,
      pipelineEntriesCreated: 0,
      estimatesCreated: 0,
      estimatesSubmitted: 0,
      sentForBusinessOwnerApproval: 0,
      firstApprovals: 0,
      approvalsCompleted: 0,
      clientApprovals: 0,
      projectsConfirmed: 0,
      reworkEvents: 0,
    };
  }

  return {
    loginCount: user.loginCount ?? 0,
    pipelineEntriesCreated: getActionCount(user, "pipeline_create"),
    estimatesCreated: user.estimatesCreated ?? 0,
    estimatesSubmitted: getActionCount(user, "estimate_submit_for_approval"),
    sentForBusinessOwnerApproval: user.sentForBusinessOwnerApproval ?? 0,
    firstApprovals: getActionCount(user, "estimate_approve_first"),
    approvalsCompleted: getActionCount(user, "estimate_approve_second"),
    clientApprovals: getActionCount(user, "estimate_client_approve"),
    projectsConfirmed: user.projectsConfirmed ?? 0,
    reworkEvents: getActionCount(user, "estimate_unapprove") + getActionCount(user, "estimate_request_second_approval"),
  };
}

function sumMetrics(users: ActivityUserSummary[]) {
  return users.reduce<AggregatedMetrics>(
    (total, user) => {
      const metrics = getActivityMetrics(user);

      total.loginCount += metrics.loginCount;
      total.pipelineEntriesCreated += metrics.pipelineEntriesCreated;
      total.estimatesCreated += metrics.estimatesCreated;
      total.estimatesSubmitted += metrics.estimatesSubmitted;
      total.sentForBusinessOwnerApproval += metrics.sentForBusinessOwnerApproval;
      total.firstApprovals += metrics.firstApprovals;
      total.approvalsCompleted += metrics.approvalsCompleted;
      total.clientApprovals += metrics.clientApprovals;
      total.projectsConfirmed += metrics.projectsConfirmed;
      total.reworkEvents += metrics.reworkEvents;

      return total;
    },
    {
      loginCount: 0,
      pipelineEntriesCreated: 0,
      estimatesCreated: 0,
      estimatesSubmitted: 0,
      sentForBusinessOwnerApproval: 0,
      firstApprovals: 0,
      approvalsCompleted: 0,
      clientApprovals: 0,
      projectsConfirmed: 0,
      reworkEvents: 0,
    },
  );
}

function isIndividualReportRole(role: string | null): role is (typeof INDIVIDUAL_REPORT_ROLES)[number] {
  return role !== null && INDIVIDUAL_REPORT_ROLE_SET.has(role);
}

function isEligibleAccountManagementUser(user: DirectoryUser) {
  return isIndividualReportRole(user.role) && user.department === ACCOUNT_MANAGEMENT_DEPARTMENT;
}

function getEligibleAccountManagementChildren(directoryUsers: DirectoryUser[], businessOwnerId: string) {
  return sortUsers(
    directoryUsers.filter((child) => child.managerUserId === businessOwnerId && isEligibleAccountManagementUser(child)),
  );
}

function getEligibleBusinessOwnerChildren(directoryUsers: DirectoryUser[], superAdminId: string) {
  return sortUsers(
    directoryUsers.filter((child) => {
      if (child.managerUserId !== superAdminId || child.role !== "business_owner") {
        return false;
      }

      return child.department === ACCOUNT_MANAGEMENT_DEPARTMENT || getEligibleAccountManagementChildren(directoryUsers, child.userId).length > 0;
    }),
  );
}

function isEligibleReportUser(user: DirectoryUser, directoryUsers: DirectoryUser[]) {
  if (isIndividualReportRole(user.role)) {
    return isEligibleAccountManagementUser(user);
  }

  if (user.role === "business_owner") {
    return user.department === ACCOUNT_MANAGEMENT_DEPARTMENT || getEligibleAccountManagementChildren(directoryUsers, user.userId).length > 0;
  }

  if (user.role === "super_admin") {
    return user.department === ACCOUNT_MANAGEMENT_DEPARTMENT || getEligibleBusinessOwnerChildren(directoryUsers, user.userId).length > 0;
  }

  return false;
}

function isSupportedReportRole(role: string | null): role is SupportedReportRole {
  return role !== null && SUPPORTED_REPORT_ROLE_SET.has(role);
}

function getMissingFields(
  user: DirectoryUser,
  availability: {
    scoreAvailable: boolean;
    priorPeriodScoreAvailable: boolean;
    wowScoreDeltaAvailable: boolean;
  },
) {
  const missing: string[] = [];

  if (!user.email) {
    missing.push("recipientEmail");
  }

  if (!user.role || !isSupportedReportRole(user.role)) {
    missing.push("role");
  }

  if (!user.department) {
    missing.push("department");
  }

  if (!availability.scoreAvailable) {
    missing.push("score");
  }

  if (!availability.priorPeriodScoreAvailable) {
    missing.push("priorPeriodScore");
  }

  if (!availability.wowScoreDeltaAvailable) {
    missing.push("wowScoreDelta");
  }

  missing.push("activeDaysCount", "lastActivityTs");

  return missing;
}

export { flattenOrganizationTree };

function buildPreviewStatus(user: DirectoryUser, missingFields: string[]) {
  if (user.disabled) {
    return "disabled" as const;
  }

  const blockingFields = new Set(["recipientEmail", "role", "department"]);
  return missingFields.some((field) => blockingFields.has(field)) ? "missing_data" : "ready";
}

function buildEmptyStateMessage(role: SupportedReportRole, eligibleChildCount: number, activeChildCount: number) {
  if (role === "business_owner") {
    if (eligibleChildCount === 0) {
      return "No eligible Account Management users were found under this business owner.";
    }

    if (activeChildCount === 0) {
      return "No eligible Account Management user activity was found for this business owner in the selected period.";
    }
  }

  if (role === "super_admin") {
    if (eligibleChildCount === 0) {
      return "No business owners with eligible Account Management team members were found under this super admin.";
    }

    if (activeChildCount === 0) {
      return "No eligible business owner activity was found for this super admin in the selected period.";
    }
  }

  return null;
}

function toScopeEntry(
  user: DirectoryUser,
  activityUser?: ActivityUserSummary,
  options?: {
    metricsOverride?: ReportScopeEntry["metrics"];
    hasActivityOverride?: boolean;
    score?: number | null;
    status?: ReportScopeEntry["status"];
    activeDisplay?: string | null;
  },
): ReportScopeEntry | null {
  if (!isSupportedReportRole(user.role)) {
    return null;
  }

  const metrics = getActivityMetrics(activityUser);

  return {
    userId: user.userId,
    userName: user.userName,
    role: user.role,
    disabled: user.disabled,
    hasActivity: options?.hasActivityOverride ?? Boolean(activityUser),
    score: options?.score ?? null,
    status: options?.status ?? {
      label: null,
      color: null,
    },
    activeDisplay: options?.activeDisplay ?? null,
    metrics:
      options?.metricsOverride ?? {
        loginCount: metrics.loginCount,
        projectsConfirmed: metrics.projectsConfirmed,
        pipelineEntriesCreated: metrics.pipelineEntriesCreated,
        estimatesCreated: metrics.estimatesCreated,
        estimatesSubmitted: metrics.estimatesSubmitted,
        sentForBusinessOwnerApproval: metrics.sentForBusinessOwnerApproval,
        firstApprovals: metrics.firstApprovals,
        approvalsCompleted: metrics.approvalsCompleted,
        clientApprovals: metrics.clientApprovals,
        reworkEvents: metrics.reworkEvents,
      },
  };
}

async function buildUserReport(params: {
  user: DirectoryUser;
  reportRole: SupportedReportRole;
  currentActivityUsers: ActivityUserSummary[];
  priorActivityUsers: ActivityUserSummary[];
  period: ReportPeriod;
  scopeSummary: ReportScopeSummary | null;
  scopeEntries: ReportScopeEntry[];
  currentScore: number | null;
  priorPeriodScore: number | null;
}) {
  const currentMetrics = sumMetrics(params.currentActivityUsers);
  const wowScoreDelta =
    params.currentScore !== null && params.priorPeriodScore !== null ? params.currentScore - params.priorPeriodScore : null;
  const status = getScoreStatus(currentMetrics, params.currentScore, params.priorPeriodScore);
  const missingFields = getMissingFields(params.user, {
    scoreAvailable: params.currentScore !== null,
    priorPeriodScoreAvailable: params.priorPeriodScore !== null,
    wowScoreDeltaAvailable: wowScoreDelta !== null,
  });

  const reportBase: Omit<NormalizedUserReport, "html" | "templateMode"> = {
    userId: params.user.userId,
    recipientEmail: params.user.email,
    userName: params.user.userName,
    role: params.reportRole,
    department: params.user.department,
    disabled: params.user.disabled,
    reportPeriod: params.period,
    metrics: {
      loginCount: currentMetrics.loginCount,
      pipelineEntriesCreated: currentMetrics.pipelineEntriesCreated,
      estimatesCreated: currentMetrics.estimatesCreated,
      estimatesSubmitted: currentMetrics.estimatesSubmitted,
      sentForBusinessOwnerApproval: currentMetrics.sentForBusinessOwnerApproval,
      firstApprovals: currentMetrics.firstApprovals,
      approvalsCompleted: currentMetrics.approvalsCompleted,
      clientApprovals: currentMetrics.clientApprovals,
      projectsConfirmed: currentMetrics.projectsConfirmed,
      reworkEvents: currentMetrics.reworkEvents,
      activeDaysCount: null,
      lastActivityTs: null,
      score: params.currentScore,
      priorPeriodScore: params.priorPeriodScore,
      wowScoreDelta,
    },
    status,
    content: {
      lede: "",
      observation: "",
      whatStandsOut: "",
      worthDoingThisWeek: [],
      coachingItems: [],
    },
    missingFields,
    previewStatus: buildPreviewStatus(params.user, missingFields),
    narrativeStatus: "fallback",
    narrativeDetail: null,
    scopeSummary: params.scopeSummary,
    scopeEntries: params.scopeEntries,
  };

  const narrative = await generateAiNarrativeContent(reportBase);
  const rendered = await renderUserEmailHtml({
    ...reportBase,
    content: narrative.content,
    narrativeStatus: narrative.narrativeStatus,
    narrativeDetail: narrative.narrativeDetail,
  });

  return {
    ...reportBase,
    content: narrative.content,
    narrativeStatus: narrative.narrativeStatus,
    narrativeDetail: narrative.narrativeDetail,
    html: rendered.html,
    templateMode: rendered.templateMode,
  } satisfies NormalizedUserReport;
}

function sortUsers(users: DirectoryUser[]) {
  return [...users].sort((left, right) => left.userName.localeCompare(right.userName));
}

export async function buildApiReportResult(params: {
  weeklyPeriod: ReportPeriod;
  priorWeeklyPeriod: ReportPeriod;
  biweeklyPeriod: ReportPeriod;
  priorBiweeklyPeriod: ReportPeriod;
  organizationTree: OrganizationTreeResponse;
  weeklyActivity: ActivitySummaryResponse;
  priorWeeklyActivity: ActivitySummaryResponse;
  biweeklyActivity: ActivitySummaryResponse;
  priorBiweeklyActivity: ActivitySummaryResponse;
  includeSuperAdminReports?: boolean;
  baseWarnings?: ValidationMessage[];
  priorWeeklyAvailable?: boolean;
  priorBiweeklyAvailable?: boolean;
}) {
  const warnings: ValidationMessage[] = [...(params.baseWarnings ?? [])];
  const includeSuperAdminReports = params.includeSuperAdminReports ?? true;
  const priorWeeklyAvailable = params.priorWeeklyAvailable ?? true;
  const priorBiweeklyAvailable = params.priorBiweeklyAvailable ?? true;
  const directory = flattenOrganizationTree(params.organizationTree);
  const directoryUsers = Array.from(directory.values());
  const eligibleSupportedUsers = sortUsers(
    directoryUsers.filter((user) => {
      if (!isSupportedReportRole(user.role) || !isEligibleReportUser(user, directoryUsers)) {
        return false;
      }

      if (!includeSuperAdminReports && user.role === "super_admin") {
        return false;
      }

      return true;
    }),
  );

  const weeklyActivityByUserId = new Map(params.weeklyActivity.users.map((user) => [user.userId, user]));
  const priorWeeklyActivityByUserId = new Map(params.priorWeeklyActivity.users.map((user) => [user.userId, user]));
  const biweeklyActivityByUserId = new Map(params.biweeklyActivity.users.map((user) => [user.userId, user]));
  const priorBiweeklyActivityByUserId = new Map(params.priorBiweeklyActivity.users.map((user) => [user.userId, user]));

  let skippedIneligibleActivityUserCount = 0;
  let skippedUsersWithoutDirectoryMatch = 0;
  let skippedUnsupportedRoleUserCount = 0;
  const currentActivityUsers = [
    ...params.weeklyActivity.users,
    ...params.biweeklyActivity.users.filter(
      (biweeklyUser) => !params.weeklyActivity.users.some((weeklyUser) => weeklyUser.userId === biweeklyUser.userId),
    ),
  ];

  for (const activityUser of currentActivityUsers) {
    const matchedUser = directory.get(activityUser.userId);

    if (!matchedUser) {
      skippedUsersWithoutDirectoryMatch += 1;
      continue;
    }

    if (isIndividualReportRole(matchedUser.role) && !isEligibleAccountManagementUser(matchedUser)) {
      skippedIneligibleActivityUserCount += 1;
      continue;
    }

    if (!isSupportedReportRole(matchedUser.role) && matchedUser.department === ACCOUNT_MANAGEMENT_DEPARTMENT) {
      skippedUnsupportedRoleUserCount += 1;
    }
  }

  const reports: NormalizedUserReport[] = [];
  let emptyStateReportCount = 0;

  for (const user of eligibleSupportedUsers) {
    if (!isSupportedReportRole(user.role)) {
      continue;
    }

    if (isIndividualReportRole(user.role)) {
      const currentActivityUser = weeklyActivityByUserId.get(user.userId);

      if (!currentActivityUser) {
        continue;
      }

      const priorActivityUser = priorWeeklyActivityByUserId.get(user.userId);
      const currentMetrics = getActivityMetrics(currentActivityUser);
      const priorMetrics = priorActivityUser ? getActivityMetrics(priorActivityUser) : getActivityMetrics();
      const currentScore = calculateTeamMemberScore(currentMetrics);
      const priorPeriodScore = priorWeeklyAvailable ? calculateTeamMemberScore(priorMetrics) : null;
      const report = await buildUserReport({
        user,
        reportRole: user.role,
        currentActivityUsers: [currentActivityUser],
        priorActivityUsers: priorActivityUser ? [priorActivityUser] : [],
        period: params.weeklyPeriod,
        scopeSummary: null,
        scopeEntries: [],
        currentScore,
        priorPeriodScore,
      });

      reports.push(report);
      continue;
    }

    if (user.role === "business_owner") {
      const eligibleChildren = getEligibleAccountManagementChildren(directoryUsers, user.userId);
      const activeChildren = eligibleChildren.filter((child) => weeklyActivityByUserId.has(child.userId));
      const activeChildMetrics = activeChildren
        .map((child) => weeklyActivityByUserId.get(child.userId))
        .filter((activityUser): activityUser is ActivityUserSummary => Boolean(activityUser))
        .map((activityUser) => getActivityMetrics(activityUser));
      const priorChildMetrics = eligibleChildren
        .map((child) => priorWeeklyActivityByUserId.get(child.userId))
        .filter((activityUser): activityUser is ActivityUserSummary => Boolean(activityUser))
        .map((activityUser) => getActivityMetrics(activityUser));
      const currentAggregateMetrics = sumMetrics(
        activeChildren
          .map((child) => weeklyActivityByUserId.get(child.userId))
          .filter((activityUser): activityUser is ActivityUserSummary => Boolean(activityUser)),
      );
      const priorAggregateMetrics = sumMetrics(
        eligibleChildren
          .map((child) => priorWeeklyActivityByUserId.get(child.userId))
          .filter((activityUser): activityUser is ActivityUserSummary => Boolean(activityUser)),
      );
      const scopeSummary: ReportScopeSummary = {
        role: "business_owner",
        eligibleChildCount: eligibleChildren.length,
        activeChildCount: activeChildren.length,
        teamSize: eligibleChildren.length,
        managerCount: null,
        emptyStateMessage: buildEmptyStateMessage("business_owner", eligibleChildren.length, activeChildren.length),
      };
      const scopeEntries = eligibleChildren
        .map((child) => {
          const currentActivityUser = weeklyActivityByUserId.get(child.userId);
          const priorActivityUser = priorWeeklyActivityByUserId.get(child.userId);
          const childCurrentMetrics = currentActivityUser ? getActivityMetrics(currentActivityUser) : getActivityMetrics();
          const childPriorMetrics = priorActivityUser ? getActivityMetrics(priorActivityUser) : getActivityMetrics();
          const childScore = currentActivityUser ? calculateTeamMemberScore(childCurrentMetrics) : null;
          const childPriorScore = priorWeeklyAvailable ? calculateTeamMemberScore(childPriorMetrics) : null;

          return toScopeEntry(child, currentActivityUser, {
            score: childScore,
            status: getScoreStatus(childCurrentMetrics, childScore, childPriorScore),
          });
        })
        .filter((entry): entry is ReportScopeEntry => entry !== null);
      const currentScore =
        scopeSummary.emptyStateMessage === null
          ? calculateBusinessOwnerScore({
              eligibleChildCount: eligibleChildren.length,
              activeChildMetrics,
              aggregateMetrics: currentAggregateMetrics,
            })
          : null;
      const priorPeriodScore = priorWeeklyAvailable
        ? calculateBusinessOwnerScore({
            eligibleChildCount: eligibleChildren.length,
            activeChildMetrics: priorChildMetrics,
            aggregateMetrics: priorAggregateMetrics,
          })
        : null;
      const report = await buildUserReport({
        user,
        reportRole: "business_owner",
        currentActivityUsers: activeChildren
          .map((child) => weeklyActivityByUserId.get(child.userId))
          .filter((activityUser): activityUser is ActivityUserSummary => Boolean(activityUser)),
        priorActivityUsers: eligibleChildren
          .map((child) => priorWeeklyActivityByUserId.get(child.userId))
          .filter((activityUser): activityUser is ActivityUserSummary => Boolean(activityUser)),
        period: params.weeklyPeriod,
        scopeSummary,
        scopeEntries,
        currentScore,
        priorPeriodScore,
      });

      if (scopeSummary.emptyStateMessage) {
        emptyStateReportCount += 1;
      }

      reports.push(report);
      continue;
    }

    const eligibleChildren = getEligibleBusinessOwnerChildren(directoryUsers, user.userId);
    const activeChildren = eligibleChildren.filter((child) =>
      getEligibleAccountManagementChildren(directoryUsers, child.userId).some((teamMember) => biweeklyActivityByUserId.has(teamMember.userId)),
    );
    const businessOwnerRollups = eligibleChildren.map((child) => {
      const childTeamMembers = getEligibleAccountManagementChildren(directoryUsers, child.userId);
      const currentChildActivityUsers = childTeamMembers
        .map((teamMember) => biweeklyActivityByUserId.get(teamMember.userId))
        .filter((activityUser): activityUser is ActivityUserSummary => Boolean(activityUser));
      const priorChildActivityUsers = childTeamMembers
        .map((teamMember) => priorBiweeklyActivityByUserId.get(teamMember.userId))
        .filter((activityUser): activityUser is ActivityUserSummary => Boolean(activityUser));
      const currentChildMetrics = currentChildActivityUsers.map((activityUser) => getActivityMetrics(activityUser));
      const priorChildMetrics = priorChildActivityUsers.map((activityUser) => getActivityMetrics(activityUser));
      const currentAggregateMetrics = sumMetrics(currentChildActivityUsers);
      const priorAggregateMetrics = sumMetrics(priorChildActivityUsers);
      const currentScore =
        currentChildMetrics.length > 0
          ? calculateBusinessOwnerScore({
              eligibleChildCount: childTeamMembers.length,
              activeChildMetrics: currentChildMetrics,
              aggregateMetrics: currentAggregateMetrics,
            })
          : null;
      const priorScore = priorBiweeklyAvailable
        ? calculateBusinessOwnerScore({
            eligibleChildCount: childTeamMembers.length,
            activeChildMetrics: priorChildMetrics,
            aggregateMetrics: priorAggregateMetrics,
          })
        : null;

      return {
        child,
        eligibleChildCount: childTeamMembers.length,
        activeChildCount: currentChildActivityUsers.length,
        currentAggregateMetrics,
        currentScore,
        priorScore,
      };
    });
    const scopeSummary: ReportScopeSummary = {
      role: "super_admin",
      eligibleChildCount: eligibleChildren.length,
      activeChildCount: activeChildren.length,
      teamSize: businessOwnerRollups.reduce((sum, rollup) => sum + rollup.eligibleChildCount, 0),
      managerCount: eligibleChildren.length,
      emptyStateMessage: buildEmptyStateMessage("super_admin", eligibleChildren.length, activeChildren.length),
    };
    const scopeEntries = businessOwnerRollups
      .map((rollup) => {
        return toScopeEntry(rollup.child, undefined, {
          metricsOverride: {
            loginCount: rollup.currentAggregateMetrics.loginCount,
            projectsConfirmed: rollup.currentAggregateMetrics.projectsConfirmed,
            pipelineEntriesCreated: rollup.currentAggregateMetrics.pipelineEntriesCreated,
            estimatesCreated: rollup.currentAggregateMetrics.estimatesCreated,
            estimatesSubmitted: rollup.currentAggregateMetrics.estimatesSubmitted,
            sentForBusinessOwnerApproval: rollup.currentAggregateMetrics.sentForBusinessOwnerApproval,
            firstApprovals: rollup.currentAggregateMetrics.firstApprovals,
            approvalsCompleted: rollup.currentAggregateMetrics.approvalsCompleted,
            clientApprovals: rollup.currentAggregateMetrics.clientApprovals,
            reworkEvents: rollup.currentAggregateMetrics.reworkEvents,
          },
          hasActivityOverride: rollup.activeChildCount > 0,
          score: rollup.currentScore,
          status: getScoreStatus(rollup.currentAggregateMetrics, rollup.currentScore, rollup.priorScore),
          activeDisplay: `${rollup.activeChildCount} / ${rollup.eligibleChildCount}`,
        });
      })
      .filter((entry): entry is ReportScopeEntry => entry !== null);
    const currentAggregateMetrics = sumMetrics(
      eligibleChildren.flatMap((child) =>
        getEligibleAccountManagementChildren(directoryUsers, child.userId)
          .map((teamMember) => biweeklyActivityByUserId.get(teamMember.userId))
          .filter((activityUser): activityUser is ActivityUserSummary => Boolean(activityUser)),
      ),
    );
    const priorAggregateMetrics = sumMetrics(
      eligibleChildren.flatMap((child) =>
        getEligibleAccountManagementChildren(directoryUsers, child.userId)
          .map((teamMember) => priorBiweeklyActivityByUserId.get(teamMember.userId))
          .filter((activityUser): activityUser is ActivityUserSummary => Boolean(activityUser)),
      ),
    );
    const currentBusinessOwnerScores = businessOwnerRollups
      .map((rollup) => rollup.currentScore)
      .filter((score): score is number => score !== null);
    const priorBusinessOwnerScores = priorBiweeklyAvailable
      ? eligibleChildren
          .map((child) => {
            const childTeamMembers = getEligibleAccountManagementChildren(directoryUsers, child.userId);
            const priorChildActivityUsers = childTeamMembers
              .map((teamMember) => priorBiweeklyActivityByUserId.get(teamMember.userId))
              .filter((activityUser): activityUser is ActivityUserSummary => Boolean(activityUser));

            return calculateBusinessOwnerScore({
              eligibleChildCount: childTeamMembers.length,
              activeChildMetrics: priorChildActivityUsers.map((activityUser) => getActivityMetrics(activityUser)),
              aggregateMetrics: sumMetrics(priorChildActivityUsers),
            });
          })
          .filter((score) => score > 0)
      : [];
    const currentScore =
      scopeSummary.emptyStateMessage === null
        ? calculateSuperAdminScore({
            eligibleBusinessOwnerCount: eligibleChildren.length,
            activeBusinessOwnerCount: activeChildren.length,
            businessOwnerScores: currentBusinessOwnerScores,
            aggregateMetrics: currentAggregateMetrics,
          })
        : null;
    const priorPeriodScore = priorBiweeklyAvailable
      ? calculateSuperAdminScore({
          eligibleBusinessOwnerCount: eligibleChildren.length,
          activeBusinessOwnerCount: priorBusinessOwnerScores.length,
          businessOwnerScores: priorBusinessOwnerScores,
          aggregateMetrics: priorAggregateMetrics,
        })
      : null;
    const report = await buildUserReport({
      user,
      reportRole: "super_admin",
      currentActivityUsers: eligibleChildren.flatMap((child) =>
        getEligibleAccountManagementChildren(directoryUsers, child.userId)
          .map((teamMember) => biweeklyActivityByUserId.get(teamMember.userId))
          .filter((activityUser): activityUser is ActivityUserSummary => Boolean(activityUser)),
      ),
      priorActivityUsers: eligibleChildren.flatMap((child) =>
        getEligibleAccountManagementChildren(directoryUsers, child.userId)
          .map((teamMember) => priorBiweeklyActivityByUserId.get(teamMember.userId))
          .filter((activityUser): activityUser is ActivityUserSummary => Boolean(activityUser)),
      ),
      period: params.biweeklyPeriod,
      scopeSummary,
      scopeEntries,
      currentScore,
      priorPeriodScore,
    });

    if (scopeSummary.emptyStateMessage) {
      emptyStateReportCount += 1;
    }

    reports.push(report);
  }

  if (params.weeklyActivity.users.length === 0 && params.biweeklyActivity.users.length === 0) {
    warnings.push({
      level: "warning",
      code: "empty_activity_window",
      message: "No activity users were returned for the weekly or bi-weekly reporting windows.",
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
      message: `${skippedIneligibleActivityUserCount} Account Management-scope user activity records were skipped because their department was not Account Management.`,
    });
  }

  if (skippedUnsupportedRoleUserCount > 0) {
    warnings.push({
      level: "info",
      code: "unsupported_role_users_skipped",
      message: `${skippedUnsupportedRoleUserCount} Account Management activity users were skipped because their role is not enabled yet.`,
    });
  }

  if (emptyStateReportCount > 0) {
    warnings.push({
      level: "info",
      code: "empty_state_parent_reports",
      message: `${emptyStateReportCount} parent report${emptyStateReportCount === 1 ? "" : "s"} were generated in empty-state mode because no eligible child activity was found for the selected period.`,
    });
  }

  const fallbackNarrativeReports = reports.filter((report) => report.narrativeStatus === "fallback");

  if (fallbackNarrativeReports.length > 0) {
    const quotaLimited = fallbackNarrativeReports.some((report) =>
      report.narrativeDetail?.toLowerCase().includes("insufficient_quota"),
    );
    warnings.push({
      level: "warning",
      code: quotaLimited ? "ai_narrative_quota_limited" : "ai_narrative_fallback",
      message: quotaLimited
        ? `${fallbackNarrativeReports.length} report narrative${fallbackNarrativeReports.length === 1 ? "" : "s"} used fallback copy because OpenAI quota or billing is unavailable.`
        : `${fallbackNarrativeReports.length} report narrative${fallbackNarrativeReports.length === 1 ? "" : "s"} used fallback copy because AI generation did not complete.`,
    });
  }

  reports.sort((left, right) => {
    const roleWeight: Record<SupportedReportRole, number> = {
      super_admin: 0,
      business_owner: 1,
      team_member: 2,
      project_lead: 2,
      freelancer: 2,
      contributor: 2,
      department_owner: 2,
    };

    return roleWeight[left.role ?? "team_member"] - roleWeight[right.role ?? "team_member"] || left.userName.localeCompare(right.userName);
  });

  return {
    mode: "api",
    generatedAt: new Date().toISOString(),
    weeklyPeriod: params.weeklyPeriod,
    priorWeeklyPeriod: params.priorWeeklyPeriod,
    biweeklyPeriod: params.biweeklyPeriod,
    priorBiweeklyPeriod: params.priorBiweeklyPeriod,
    warnings,
    summary: {
      weeklyActivityUserCount: params.weeklyActivity.users.length,
      biweeklyActivityUserCount: params.biweeklyActivity.users.length,
      eligibleDirectoryUserCount: eligibleSupportedUsers.length,
      matchedEligibleUserCount: reports.length,
      readyReportCount: reports.filter((report) => report.previewStatus === "ready").length,
      missingDataReportCount: reports.filter((report) => report.previewStatus === "missing_data").length,
      disabledReportCount: reports.filter((report) => report.previewStatus === "disabled").length,
      skippedIneligibleActivityUserCount,
      skippedUsersWithoutDirectoryMatch,
      skippedUnsupportedRoleUserCount,
      emptyStateReportCount,
    },
    emailDelivery: getEmailDeliveryConfigSummary(),
    reports,
  } satisfies ApiReportResult;
}
