import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchActivitySummary, fetchOrganizationTree } from "@/lib/salthub-api";

describe("SaltHub API client", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.All_Users_API_Key = "https://example.com/org-tree";
    process.env.Users_Activity_API_Key = "https://example.com/activity";
    process.env.API_Secret_Key = "secret-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("requests the organization tree with bearer auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        superAdmins: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchOrganizationTree();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/org-tree",
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer secret-token",
        },
      }),
    );
  });

  it("requests the activity endpoint with start and end dates", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        start_date: "2026-06-05",
        end_date: "2026-06-21",
        users: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchActivitySummary("2026-06-05", "2026-06-21");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/activity?start_date=2026-06-05&end_date=2026-06-21",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer secret-token",
        },
      }),
    );
  });
});
