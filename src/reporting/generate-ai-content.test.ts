import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/openai", () => ({
  isOpenAiConfigured: vi.fn(() => true),
  createStructuredOpenAiResponse: vi.fn(),
  OpenAiError: class OpenAiError extends Error {},
}));

import { createStructuredOpenAiResponse } from "@/lib/openai";
import type { NormalizedUserReport } from "@/lib/domain";
import { generateAiNarrativeContent } from "@/reporting/generate-ai-content";

function makeBaseReport(role: NormalizedUserReport["role"]): Omit<NormalizedUserReport, "html" | "templateMode"> {
  return {
    userId: "user-1",
    recipientEmail: "user@example.com",
    userName: "Sample User",
    role,
    department: "Account Management",
    disabled: false,
    reportPeriod: {
      startDate: "2026-06-15",
      endDate: "2026-06-19",
      displayLabel: "Jun 15, 2026 - Jun 19, 2026",
    },
    metrics: {
      loginCount: 4,
      pipelineEntriesCreated: 2,
      estimatesCreated: 3,
      estimatesSubmitted: 2,
      sentForBusinessOwnerApproval: 1,
      firstApprovals: 1,
      approvalsCompleted: 1,
      clientApprovals: 0,
      projectsConfirmed: 1,
      reworkEvents: 0,
      activeDaysCount: null,
      lastActivityTs: null,
      score: 78,
      priorPeriodScore: 72,
      wowScoreDelta: 6,
    },
    status: {
      label: "Improving",
      color: "yellow",
    },
    content: {
      lede: "",
      observation: "",
      whatStandsOut: "",
      worthDoingThisWeek: [],
      coachingItems: [],
      inferredFrictionTheme: "",
    },
    missingFields: [],
    previewStatus: "ready",
    narrativeStatus: "fallback",
    narrativeDetail: null,
    scopeSummary: null,
    scopeEntries: [],
  };
}

describe("generateAiNarrativeContent", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("clips overlong team member ledes instead of falling back", async () => {
    vi.mocked(createStructuredOpenAiResponse).mockResolvedValueOnce(
      JSON.stringify({
        lede: "A".repeat(310),
        observation: "A concise observation.",
      }),
    );

    const result = await generateAiNarrativeContent(makeBaseReport("team_member"));

    expect(result.narrativeStatus).toBe("generated");
    expect(result.content.lede.length).toBeLessThanOrEqual(280);
    expect(result.content.observation).toBe("A concise observation.");
  });

  it("clips business owner list items to the configured limits", async () => {
    vi.mocked(createStructuredOpenAiResponse).mockResolvedValueOnce(
      JSON.stringify({
        lede: "Team summary",
        whatStandsOut: "Something notable",
        worthDoingThisWeek: ["X".repeat(260), "Second action", "Third action"],
        inferredFrictionTheme: "Drafts appear to be opened but not consistently pushed through submission.",
      }),
    );

    const result = await generateAiNarrativeContent(makeBaseReport("business_owner"));

    expect(result.narrativeStatus).toBe("generated");
    expect(result.content.worthDoingThisWeek).toHaveLength(3);
    expect(result.content.worthDoingThisWeek[0].length).toBeLessThanOrEqual(220);
    expect(result.content.inferredFrictionTheme.length).toBeGreaterThan(0);
  });
});
