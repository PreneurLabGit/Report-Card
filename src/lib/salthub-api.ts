import type { ActivitySummaryResponse, OrganizationTreeResponse } from "@/lib/domain";
import { activitySummaryResponseSchema, organizationTreeResponseSchema } from "@/schemas/contracts";

class SaltHubApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SaltHubApiError";
    this.status = status;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getEnv(name: "All_Users_API_Key" | "Users_Activity_API_Key" | "API_Secret_Key") {
  const value = process.env[name];

  if (!value) {
    throw new SaltHubApiError(`Missing required environment variable: ${name}.`);
  }

  return value;
}

async function fetchJson<T>(
  label: string,
  url: string,
  schema: { safeParse: (value: unknown) => { success: boolean; data: T } | { success: false } },
) {
  const token = getEnv("API_Secret_Key");
  let lastError: SaltHubApiError | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseText = await response.text();
        const details = responseText.trim().slice(0, 200);
        const message = details
          ? `${label} request failed with status ${response.status}. Upstream response: ${details}`
          : `${label} request failed with status ${response.status}.`;
        const error = new SaltHubApiError(message, response.status);

        if (response.status >= 500 && attempt < 2) {
          lastError = error;
          await sleep(350);
          continue;
        }

        throw error;
      }

      const payload = (await response.json()) as unknown;
      const validated = schema.safeParse(payload);

      if (!validated.success) {
        throw new SaltHubApiError(`${label} returned a malformed response payload.`);
      }

      return validated.data;
    } catch (error) {
      if (error instanceof SaltHubApiError) {
        if ((error.status ?? 0) >= 500 && attempt < 2) {
          lastError = error;
          await sleep(350);
          continue;
        }

        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        const timeoutError = new SaltHubApiError(`${label} request timed out.`);
        if (attempt < 2) {
          lastError = timeoutError;
          await sleep(350);
          continue;
        }
        throw timeoutError;
      }

      const genericError = new SaltHubApiError(
        error instanceof Error ? `${label} request failed: ${error.message}` : `${label} request failed.`,
      );
      if (attempt < 2) {
        lastError = genericError;
        await sleep(350);
        continue;
      }
      throw genericError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new SaltHubApiError(`${label} request failed.`);
}

export async function fetchOrganizationTree() {
  const url = getEnv("All_Users_API_Key");
  return fetchJson<OrganizationTreeResponse>("Organization tree", url, organizationTreeResponseSchema);
}

export async function fetchActivitySummary(startDate: string, endDate: string) {
  const baseUrl = getEnv("Users_Activity_API_Key");
  const url = new URL(baseUrl);
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);

  return fetchJson<ActivitySummaryResponse>(
    `Activity summary (${startDate} to ${endDate})`,
    url.toString(),
    activitySummaryResponseSchema,
  );
}

export { SaltHubApiError };
