class OpenAiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "OpenAiError";
    this.status = status;
  }
}

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_REPORT_MODEL = "gpt-5-mini";

function getOpenAiApiKey() {
  return process.env.OpenAI_API_Key?.trim() || null;
}

export function isOpenAiConfigured() {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return false;
  }

  return Boolean(getOpenAiApiKey());
}

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ("output_text" in payload && typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text;
  }

  if ("output" in payload && Array.isArray(payload.output)) {
    for (const item of payload.output) {
      if (!item || typeof item !== "object" || !("content" in item) || !Array.isArray(item.content)) {
        continue;
      }

      for (const content of item.content) {
        if (
          content &&
          typeof content === "object" &&
          "type" in content &&
          content.type === "output_text" &&
          "text" in content &&
          typeof content.text === "string" &&
          content.text.trim().length > 0
        ) {
          return content.text;
        }
      }
    }
  }

  return null;
}

function getIncompleteReason(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("incomplete_details" in payload)) {
    return null;
  }

  const details = payload.incomplete_details;

  if (!details || typeof details !== "object" || !("reason" in details) || typeof details.reason !== "string") {
    return null;
  }

  return details.reason;
}

function getResponseStatus(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("status" in payload) || typeof payload.status !== "string") {
    return null;
  }

  return payload.status;
}

export async function createStructuredOpenAiResponse(params: {
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPayload: Record<string, unknown>;
  maxOutputTokens?: number;
}) {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new OpenAiError("Missing required environment variable: OpenAI_API_Key.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
      body: JSON.stringify({
        model: DEFAULT_REPORT_MODEL,
        store: false,
        max_output_tokens: Math.max(params.maxOutputTokens ?? 0, 900),
        reasoning: {
          effort: "low",
        },
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: params.systemPrompt,
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(params.userPayload),
              },
            ],
          },
        ],
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            strict: true,
            name: params.schemaName,
            schema: params.schema,
          },
        },
      }),
    });

    if (!response.ok) {
      const details = (await response.text()).trim().slice(0, 300);
      throw new OpenAiError(
        details
          ? `OpenAI narrative request failed with status ${response.status}. Response: ${details}`
          : `OpenAI narrative request failed with status ${response.status}.`,
        response.status,
      );
    }

    const payload = (await response.json()) as unknown;
    const responseStatus = getResponseStatus(payload);
    const incompleteReason = getIncompleteReason(payload);

    if (responseStatus === "incomplete") {
      throw new OpenAiError(
        incompleteReason
          ? `OpenAI narrative request was incomplete. Reason: ${incompleteReason}.`
          : "OpenAI narrative request was incomplete.",
      );
    }

    const outputText = extractOutputText(payload);

    if (!outputText) {
      throw new OpenAiError("OpenAI narrative request returned no structured output text.");
    }

    return outputText;
  } catch (error) {
    if (error instanceof OpenAiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new OpenAiError("OpenAI narrative request timed out.");
    }

    throw new OpenAiError(
      error instanceof Error ? `OpenAI narrative request failed: ${error.message}` : "OpenAI narrative request failed.",
    );
  } finally {
    clearTimeout(timer);
  }
}

export { DEFAULT_REPORT_MODEL, OpenAiError };
