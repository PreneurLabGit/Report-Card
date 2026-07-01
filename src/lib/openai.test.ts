import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createStructuredOpenAiResponse } from "@/lib/openai";

const originalFetch = global.fetch;
const originalApiKey = process.env.OpenAI_API_Key;

describe("createStructuredOpenAiResponse", () => {
  beforeEach(() => {
    process.env.OpenAI_API_Key = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.OpenAI_API_Key;
    } else {
      process.env.OpenAI_API_Key = originalApiKey;
    }
    vi.restoreAllMocks();
  });

  it("extracts structured output text from a completed response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "completed",
        output: [
          { type: "reasoning", content: [] },
          {
            type: "message",
            content: [{ type: "output_text", text: "{\"lede\":\"Hello\"}" }],
          },
        ],
      }),
    } as Response);

    await expect(
      createStructuredOpenAiResponse({
        schemaName: "probe_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: { lede: { type: "string" } },
          required: ["lede"],
        },
        systemPrompt: "Return JSON.",
        userPayload: { hello: "world" },
      }),
    ).resolves.toBe("{\"lede\":\"Hello\"}");
  });

  it("surfaces incomplete responses instead of misclassifying them as missing text", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "incomplete",
        incomplete_details: {
          reason: "max_output_tokens",
        },
        output: [{ type: "reasoning", content: [] }],
      }),
    } as Response);

    await expect(
      createStructuredOpenAiResponse({
        schemaName: "probe_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: { lede: { type: "string" } },
          required: ["lede"],
        },
        systemPrompt: "Return JSON.",
        userPayload: { hello: "world" },
      }),
    ).rejects.toThrow("OpenAI narrative request was incomplete. Reason: max_output_tokens.");
  });

  it("sends low-reasoning structured-output settings to reduce truncation risk", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "{\"lede\":\"Hello\"}" }],
          },
        ],
      }),
    } as Response);
    global.fetch = fetchMock;

    await createStructuredOpenAiResponse({
      schemaName: "probe_schema",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { lede: { type: "string" } },
        required: ["lede"],
      },
      systemPrompt: "Return JSON.",
      userPayload: { hello: "world" },
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(requestInit.body));

    expect(body.max_output_tokens).toBe(900);
    expect(body.reasoning).toEqual({ effort: "low" });
    expect(body.text.verbosity).toBe("low");
  });
});
