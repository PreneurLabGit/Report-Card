import { describe, expect, it } from "vitest";

import type { ActivitySummaryResponse, OrganizationTreeResponse } from "@/lib/domain";
import { buildApiReportResult, flattenOrganizationTree } from "@/reporting/build-api-report";

const organizationTree: OrganizationTreeResponse = {
  superAdmins: [
    {
      userId: "sa-1",
      userName: "Super Admin",
      email: "sa@example.com",
      role: "super_admin",
      department: "Creative",
      disabled: false,
      businessOwners: [
        {
          userId: "bo-1",
          userName: "Business Owner",
          email: "bo@example.com",
          role: "business_owner",
          department: "Media",
          disabled: false,
          teamMembers: [
            {
              userId: "tm-1",
              userName: "Team Member",
              email: "tm@example.com",
              role: "team_member",
              department: "Account Management",
              disabled: false,
            },
            {
              userId: "tm-2",
              userName: "Project Lead",
              email: "lead@example.com",
              role: "project_lead",
              department: "Account Management",
              disabled: false,
            },
            {
              userId: "tm-3",
              userName: "Creative Member",
              email: "creative@example.com",
              role: "team_member",
              department: "Creative",
              disabled: false,
            },
          ],
        },
        {
          userId: "bo-2",
          userName: "Idle Owner",
          email: "idle@example.com",
          role: "business_owner",
          department: "Account Management",
          disabled: false,
          teamMembers: [],
        },
      ],
    },
  ],
};

const currentActivity: ActivitySummaryResponse = {
  start_date: "2026-06-15",
  end_date: "2026-06-21",
  users: [
    {
      userId: "sa-1",
      userName: "Super Admin",
      userEmail: "sa@example.com",
      loginCount: 9,
    },
    {
      userId: "bo-1",
      userName: "Business Owner",
      userEmail: "bo@example.com",
      loginCount: 4,
      projectsConfirmed: 2,
      otherActions: {
        pipeline_create: 2,
      },
    },
    {
      userId: "tm-1",
      userName: "Team Member",
      userEmail: "tm@example.com",
      loginCount: 6,
      projectsConfirmed: 1,
      sentForBusinessOwnerApproval: 1,
      otherActions: {
        pipeline_create: 3,
        estimate_submit_for_approval: 2,
        estimate_approve_second: 1,
        estimate_unapprove: 1,
      },
    },
    {
      userId: "tm-2",
      userName: "Project Lead",
      userEmail: "lead@example.com",
      loginCount: 7,
    },
    {
      userId: "tm-3",
      userName: "Creative Member",
      userEmail: "creative@example.com",
      loginCount: 8,
    },
  ],
};

const priorActivity: ActivitySummaryResponse = {
  start_date: "2026-06-08",
  end_date: "2026-06-14",
  users: [
    {
      userId: "bo-1",
      userName: "Business Owner",
      userEmail: "bo@example.com",
      loginCount: 1,
    },
    {
      userId: "tm-1",
      userName: "Team Member",
      userEmail: "tm@example.com",
      loginCount: 2,
    },
  ],
};

describe("flattenOrganizationTree", () => {
  it("assigns hierarchy ids deterministically", () => {
    const directory = flattenOrganizationTree(organizationTree);

    expect(directory.get("sa-1")?.managerUserId).toBeNull();
    expect(directory.get("bo-1")?.managerUserId).toBe("sa-1");
    expect(directory.get("tm-1")?.managerUserId).toBe("bo-1");
    expect(directory.get("tm-1")?.superAdminId).toBe("sa-1");
  });
});

describe("buildApiReportResult", () => {
  it("generates hierarchy-scoped reports for all eligible AM users and their parent hierarchy", async () => {
    const result = await buildApiReportResult({
      startDate: "2026-06-15",
      endDate: "2026-06-21",
      organizationTree,
      currentActivity,
      priorActivity,
    });

    expect(result.reports.map((report) => [report.userId, report.role])).toEqual([
      ["sa-1", "super_admin"],
      ["bo-1", "business_owner"],
      ["bo-2", "business_owner"],
      ["tm-2", "project_lead"],
      ["tm-1", "team_member"],
    ]);
    expect(result.summary.skippedIneligibleActivityUserCount).toBe(1);
    expect(result.summary.skippedUnsupportedRoleUserCount).toBe(0);
  });

  it("builds business owner reports from direct AM user activity only", async () => {
    const result = await buildApiReportResult({
      startDate: "2026-06-15",
      endDate: "2026-06-21",
      organizationTree,
      currentActivity,
      priorActivity,
    });

    const ownerReport = result.reports.find((report) => report.userId === "bo-1");
    expect(ownerReport?.scopeSummary).toMatchObject({
      role: "business_owner",
      eligibleChildCount: 2,
      activeChildCount: 2,
      emptyStateMessage: null,
    });
    expect(ownerReport?.metrics.loginCount).toBe(13);
    expect(ownerReport?.metrics.pipelineEntriesCreated).toBe(3);
    expect(ownerReport?.metrics.projectsConfirmed).toBe(1);
    expect(ownerReport?.metrics.reworkEvents).toBe(1);
    expect(ownerReport?.scopeEntries.map((entry) => entry.userId)).toEqual(["tm-2", "tm-1"]);
  });

  it("builds super admin reports from direct business owner rollups only", async () => {
    const result = await buildApiReportResult({
      startDate: "2026-06-15",
      endDate: "2026-06-21",
      organizationTree,
      currentActivity,
      priorActivity,
    });

    const superAdminReport = result.reports.find((report) => report.userId === "sa-1");
    expect(superAdminReport?.scopeSummary).toMatchObject({
      role: "super_admin",
      eligibleChildCount: 2,
      activeChildCount: 1,
      emptyStateMessage: null,
    });
    expect(superAdminReport?.metrics.loginCount).toBe(13);
    expect(superAdminReport?.metrics.pipelineEntriesCreated).toBe(3);
    expect(superAdminReport?.scopeEntries.map((entry) => [entry.userId, entry.hasActivity])).toEqual([
      ["bo-1", true],
      ["bo-2", false],
    ]);
  });

  it("generates empty-state parent reports when eligible child activity is absent", async () => {
    const result = await buildApiReportResult({
      startDate: "2026-06-15",
      endDate: "2026-06-21",
      organizationTree,
      currentActivity: {
        ...currentActivity,
        users: currentActivity.users.filter((user) => !["bo-1", "tm-1", "tm-2"].includes(user.userId)),
      },
      priorActivity,
    });

    const ownerReport = result.reports.find((report) => report.userId === "bo-1");
    const idleOwnerReport = result.reports.find((report) => report.userId === "bo-2");
    const superAdminReport = result.reports.find((report) => report.userId === "sa-1");

    expect(ownerReport?.scopeSummary?.emptyStateMessage).toContain("No eligible Account Management user activity");
    expect(idleOwnerReport?.scopeSummary?.emptyStateMessage).toContain("No eligible Account Management users");
    expect(superAdminReport?.scopeSummary?.emptyStateMessage).toContain("No eligible business owner activity");
    expect(result.summary.emptyStateReportCount).toBe(3);
  });
});
