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
      department: "Account Management",
      disabled: false,
      businessOwners: [
        {
          userId: "bo-1",
          userName: "Business Owner",
          email: "bo@example.com",
          role: "business_owner",
          department: "Account Management",
          disabled: false,
          teamMembers: [
            {
              userId: "tm-1",
              userName: "Project Lead",
              email: "tm@example.com",
              role: "project_lead",
              department: "Account Management",
              disabled: false,
            },
            {
              userId: "tm-2",
              userName: "Non AM",
              email: "nonam@example.com",
              role: "project_lead",
              department: "Creative",
              disabled: false,
            },
          ],
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
      userId: "bo-1",
      userName: "Business Owner",
      userEmail: "bo@example.com",
      loginCount: 4,
      otherActions: {
        pipeline_create: 2,
        estimate_submit_for_approval: 3,
        estimate_unapprove: 1,
        estimate_request_second_approval: 2,
      },
    },
    {
      userId: "tm-2",
      userName: "Non AM",
      userEmail: "nonam@example.com",
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
  it("generates reports only for exact Account Management users with activity", async () => {
    const result = await buildApiReportResult({
      startDate: "2026-06-15",
      endDate: "2026-06-21",
      organizationTree,
      currentActivity,
      priorActivity,
    });

    expect(result.reports).toHaveLength(1);
    expect(result.reports[0]?.userId).toBe("bo-1");
    expect(result.summary.skippedIneligibleActivityUserCount).toBe(1);
  });

  it("marks unavailable score fields and calculates rework events", async () => {
    const result = await buildApiReportResult({
      startDate: "2026-06-15",
      endDate: "2026-06-21",
      organizationTree,
      currentActivity,
      priorActivity,
    });

    const report = result.reports[0];
    expect(report?.metrics.reworkEvents).toBe(3);
    expect(report?.metrics.score).toBeNull();
    expect(report?.missingFields).toContain("score");
    expect(report?.previewStatus).toBe("ready");
  });
});
