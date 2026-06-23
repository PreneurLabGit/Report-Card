import { describe, expect, it } from "vitest";

import type { NormalizedUserReport } from "@/lib/domain";
import { renderUserEmailHtml } from "@/reporting/render-user-email";

const baseReport: Omit<NormalizedUserReport, "html" | "templateMode"> = {
  userId: "tm-1",
  recipientEmail: "member@example.com",
  userName: "Jamie",
  role: "team_member",
  department: "Account Management",
  disabled: false,
  reportPeriod: {
    startDate: "2026-06-16",
    endDate: "2026-06-22",
    displayLabel: "Jun 16, 2026 - Jun 22, 2026",
  },
  metrics: {
    loginCount: 6,
    pipelineEntriesCreated: 4,
    estimatesCreated: null,
    estimatesSubmitted: 3,
    sentForBusinessOwnerApproval: 0,
    firstApprovals: 0,
    approvalsCompleted: 2,
    clientApprovals: 0,
    projectsConfirmed: 2,
    reworkEvents: 0,
    activeDaysCount: null,
    lastActivityTs: null,
    score: null,
    priorPeriodScore: null,
    wowScoreDelta: null,
  },
  status: {
    label: null,
    color: null,
  },
  content: {
    lede: "",
    observation: "",
    whatStandsOut: "",
    worthDoingThisWeek: [],
    coachingItems: [],
  },
  missingFields: ["score"],
  previewStatus: "ready",
  scopeSummary: null,
  scopeEntries: [],
};

describe("renderUserEmailHtml", () => {
  it("renders the team member template with configured placeholders", async () => {
    const rendered = await renderUserEmailHtml(baseReport);

    expect(rendered.templateMode).toBe("file-template");
    expect(rendered.html).toContain("Your week in Salt Hub, Jamie");
    expect(rendered.html).toContain("SALT HUB");
    expect(rendered.html).toContain("WEEK OF JUNE 16");
    expect(rendered.html).toContain("Logins");
    expect(rendered.html).toContain("6");
    expect(rendered.html).toContain("N/A");
  });

  it("renders the business owner template with sample manager sections", async () => {
    const rendered = await renderUserEmailHtml({
      ...baseReport,
      userId: "bo-1",
      userName: "Jordan Lee",
      role: "business_owner",
      metrics: {
        ...baseReport.metrics,
        pipelineEntriesCreated: 12,
        estimatesSubmitted: 4,
        approvalsCompleted: 3,
        projectsConfirmed: 2,
        reworkEvents: 1,
      },
      scopeSummary: {
        role: "business_owner",
        eligibleChildCount: 5,
        activeChildCount: 3,
        emptyStateMessage: null,
      },
      content: {
        ...baseReport.content,
        lede: "A productive week on output.",
        whatStandsOut: "Five estimates were created but not submitted.",
        worthDoingThisWeek: ["Check in with Alex and Sam.", "Walk one draft estimate with the team.", "Recognize Jamie."],
      },
    });

    expect(rendered.templateMode).toBe("file-template");
    expect(rendered.html).toContain("Worth doing this week");
    expect(rendered.html).toContain("What stands out");
    expect(rendered.html).toContain("Your friction note from last week");
    expect(rendered.html).toContain("Five estimates were created but not submitted.");
    expect(rendered.html).toContain("Recognize Jamie.");
  });

  it("renders the super admin template with sample leader sections", async () => {
    const rendered = await renderUserEmailHtml({
      ...baseReport,
      userId: "sa-1",
      userName: "Maya Patel",
      role: "super_admin",
      metrics: {
        ...baseReport.metrics,
        pipelineEntriesCreated: 9,
        projectsConfirmed: 3,
        reworkEvents: 1,
      },
      scopeSummary: {
        role: "super_admin",
        eligibleChildCount: 3,
        activeChildCount: 2,
        emptyStateMessage: null,
      },
      content: {
        ...baseReport.content,
        lede: "Two managers look stable and one needs attention.",
        coachingItems: ["Review Casey Brown first.", "Ask Sam Liu about rework.", "Learn from Reese Okafor."],
      },
      scopeEntries: [
        {
          userId: "bo-1",
          userName: "Jordan Lee",
          role: "business_owner",
          disabled: false,
          hasActivity: true,
          metrics: {
            loginCount: 8,
            projectsConfirmed: 3,
            pipelineEntriesCreated: 5,
            estimatesSubmitted: 2,
            approvalsCompleted: 1,
            reworkEvents: 0,
          },
        },
        {
          userId: "bo-2",
          userName: "Priya Shah",
          role: "business_owner",
          disabled: false,
          hasActivity: true,
          metrics: {
            loginCount: 5,
            projectsConfirmed: 2,
            pipelineEntriesCreated: 4,
            estimatesSubmitted: 1,
            approvalsCompleted: 1,
            reworkEvents: 1,
          },
        },
      ],
    });

    expect(rendered.templateMode).toBe("file-template");
    expect(rendered.html).toContain("Where to spend coaching time");
    expect(rendered.html).toContain("Friction themes across your span");
    expect(rendered.html).toContain("Jordan Lee");
    expect(rendered.html).toContain("Review Casey Brown first.");
  });
});
