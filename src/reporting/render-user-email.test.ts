import { describe, expect, it } from "vitest";

import type { NormalizedUserReport } from "@/lib/domain";
import { calculateTeamMemberScore, getScoreStatus } from "@/lib/scoring";
import { renderUserEmailHtml } from "@/reporting/render-user-email";

const baseScore = calculateTeamMemberScore({
  loginCount: 6,
  pipelineEntriesCreated: 4,
  estimatesCreated: 4,
  estimatesSubmitted: 3,
  sentForBusinessOwnerApproval: 0,
  firstApprovals: 0,
  approvalsCompleted: 2,
  clientApprovals: 0,
  projectsConfirmed: 2,
  reworkEvents: 0,
});

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
    estimatesCreated: 4,
    estimatesSubmitted: 3,
    sentForBusinessOwnerApproval: 0,
    firstApprovals: 0,
    approvalsCompleted: 2,
    clientApprovals: 0,
    projectsConfirmed: 2,
    reworkEvents: 0,
    activeDaysCount: 5,
    lastActivityTs: "2026-06-19",
    score: baseScore,
    priorPeriodScore: 72,
    wowScoreDelta: baseScore - 72,
  },
  status: getScoreStatus(
    {
      loginCount: 6,
      pipelineEntriesCreated: 4,
      estimatesCreated: 4,
      estimatesSubmitted: 3,
      sentForBusinessOwnerApproval: 0,
      firstApprovals: 0,
      approvalsCompleted: 2,
      clientApprovals: 0,
      projectsConfirmed: 2,
      reworkEvents: 0,
    },
    baseScore,
    72,
  ),
  content: {
    lede: "",
    observation: "",
    whatStandsOut: "",
    worthDoingThisWeek: [],
    coachingItems: [],
  },
  missingFields: [],
  previewStatus: "ready",
  narrativeStatus: "fallback",
  narrativeDetail: null,
  scopeSummary: null,
  scopeEntries: [],
};

describe("renderUserEmailHtml", () => {
  it("renders the team member template with configured placeholders", async () => {
    const rendered = await renderUserEmailHtml(baseReport);

    expect(rendered.templateMode).toBe("file-template");
    expect(rendered.html).toContain("Your week in Salt Hub, Jamie");
    expect(rendered.html).toContain("SALT HUB");
    expect(rendered.html).toContain("JUNE 16");
    expect(rendered.html).toContain("Logins");
    expect(rendered.html).toContain("6");
    expect(rendered.html).toContain("5 of 5");
    expect(rendered.html).toContain("Fri");
    expect(rendered.html).toContain("Jun 19");
    expect(rendered.html).toContain("Estimates created");
    expect(rendered.html).toContain("4");
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
        teamSize: 5,
        managerCount: null,
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
        teamSize: 11,
        managerCount: 3,
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
          score: 84,
          status: {
            label: "Reliable",
            color: "green",
          },
          activeDisplay: "3 / 5",
          metrics: {
            loginCount: 8,
            projectsConfirmed: 3,
            pipelineEntriesCreated: 5,
            estimatesCreated: 5,
            estimatesSubmitted: 2,
            sentForBusinessOwnerApproval: 0,
            firstApprovals: 0,
            approvalsCompleted: 1,
            clientApprovals: 0,
            reworkEvents: 0,
          },
        },
        {
          userId: "bo-2",
          userName: "Priya Shah",
          role: "business_owner",
          disabled: false,
          hasActivity: true,
          score: 66,
          status: {
            label: "Holding",
            color: "yellow",
          },
          activeDisplay: "2 / 4",
          metrics: {
            loginCount: 5,
            projectsConfirmed: 2,
            pipelineEntriesCreated: 4,
            estimatesCreated: 4,
            estimatesSubmitted: 1,
            sentForBusinessOwnerApproval: 0,
            firstApprovals: 0,
            approvalsCompleted: 1,
            clientApprovals: 0,
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
    expect(rendered.html).toContain("84");
    expect(rendered.html).toContain("3 / 5");
  });
});
