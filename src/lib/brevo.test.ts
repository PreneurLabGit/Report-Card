import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedUserReport } from "@/lib/domain";
import { getEmailDeliveryConfigSummary, sendReportEmail } from "@/lib/brevo";

const baseReport: NormalizedUserReport = {
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
  html: "<html><body><h1>Jamie</h1></body></html>",
  templateMode: "file-template",
};

describe("Brevo email client", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.Brevo_API_Key = "brevo-key";
    process.env.BREVO_SENDER_EMAIL = "reports@example.com";
    process.env.BREVO_SENDER_NAME = "Salthub Report Card";
    process.env.REPORT_EMAIL_MODE = "test";
    process.env.REPORT_EMAIL_TEST_OVERRIDE = "rizvi.preneurlab@gmail.com";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("reports configured test-mode delivery when override is present", () => {
    expect(getEmailDeliveryConfigSummary()).toEqual({
      configured: true,
      mode: "test",
      overrideRecipient: "rizvi.preneurlab@gmail.com",
      senderEmail: "reports@example.com",
      senderName: "Salthub Report Card",
    });
  });

  it("sends to the override recipient in test mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messageId: "<abc@example.com>",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendReportEmail(baseReport);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "api-key": "brevo-key",
        }),
      }),
    );
    expect(fetchMock.mock.calls[0]?.[1]?.body).toContain("rizvi.preneurlab@gmail.com");
    expect(result.actualRecipient).toBe("rizvi.preneurlab@gmail.com");
    expect(result.intendedRecipient).toBe("member@example.com");
    expect(result.status).toBe("sent");
  });
});
