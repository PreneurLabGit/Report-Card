import type { FileKind, ParseFormat } from "@/lib/domain";

const KNOWN_CSV_FILENAMES: Record<string, FileKind> = {
  "action_logs.csv": "action_logs",
  "project_fees_by_department_by_month.csv": "project_fees_by_department_by_month",
  "department_breakdown_report.csv": "department_breakdown_report",
  "client_summary_report.csv": "client_summary_report",
};

function normalizeKeys(rows: Record<string, unknown>[]) {
  return new Set(rows.flatMap((row) => Object.keys(row).map((key) => key.trim())));
}

export function detectFormat(name: string): ParseFormat {
  const lower = name.toLowerCase();

  if (lower.endsWith(".csv")) {
    return "csv";
  }

  if (lower.endsWith(".json")) {
    return "json";
  }

  return "unknown";
}

export function detectCsvKind(name: string, headers: string[]): FileKind {
  const lower = name.toLowerCase();

  if (KNOWN_CSV_FILENAMES[lower]) {
    return KNOWN_CSV_FILENAMES[lower];
  }

  const headerSet = new Set(headers);

  if (["id", "user_email", "action", "created", "payload"].every((item) => headerSet.has(item))) {
    return "action_logs";
  }

  if (
    ["Project Code", "Client", "Program Name", "Start Month", "End Month", "Status", "Total Fees"].every((item) =>
      headerSet.has(item),
    )
  ) {
    return "project_fees_by_department_by_month";
  }

  if (["Department", "Total Fees", "% of Total"].every((item) => headerSet.has(item))) {
    return "department_breakdown_report";
  }

  if (["Client", "Total Projects", "Total Fees", "Total Revenue"].every((item) => headerSet.has(item))) {
    return "client_summary_report";
  }

  if (headerSet.has("email")) {
    return "user_directory";
  }

  return "unsupported";
}

export function detectJsonKind(value: unknown): FileKind {
  if (!value || typeof value !== "object") {
    return "unsupported";
  }

  if (Array.isArray(value)) {
    const keys = normalizeKeys(value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object"));

    if (keys.has("email")) {
      return "user_directory";
    }

    return "unsupported";
  }

  const record = value as Record<string, unknown>;

  if (Array.isArray(record.users) || Array.isArray(record.managers) || typeof record.summary === "object") {
    if (Array.isArray(record.users)) {
      const userKeys = normalizeKeys(
        record.users.filter((item): item is Record<string, unknown> => !!item && typeof item === "object"),
      );

      if (userKeys.has("email")) {
        return "user_directory";
      }
    }

    return "analytics_payload";
  }

  return "unsupported";
}
