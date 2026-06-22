import {
  actionLogCsvSchema,
  clientSummarySchema,
  departmentBreakdownSchema,
  projectFeesBaseSchema,
} from "@/schemas/contracts";
import { parseCsvText } from "@/ingestion/csv";
import { detectCsvKind, detectFormat } from "@/ingestion/detect";
import { parseExcelFile } from "@/ingestion/excel";
import type {
  FileKind,
  RawActionLog,
  RawClientSummaryRow,
  RawDepartmentBreakdownRow,
  RawProjectFeesByDepartmentRow,
  UploadArtifact,
  ValidationMessage,
} from "@/lib/domain";
import { hashText } from "@/lib/utils";

export interface ProcessedUpload {
  artifact: UploadArtifact;
  kind: FileKind;
  actionLogs?: RawActionLog[];
  projectFeesByDepartment?: RawProjectFeesByDepartmentRow[];
  departmentBreakdown?: RawDepartmentBreakdownRow[];
  clientSummaries?: RawClientSummaryRow[];
}

function buildMessages(required: string[], headers: string[], allowUnknown: boolean): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const headerSet = new Set(headers);
  const missing = required.filter((item) => !headerSet.has(item));

  if (missing.length > 0) {
    messages.push({
      level: "error",
      code: "missing_columns",
      message: `Missing required columns: ${missing.join(", ")}`,
    });
  }

  if (!allowUnknown) {
    const extra = headers.filter((item) => !required.includes(item));

    if (extra.length > 0) {
      messages.push({
        level: "warning",
        code: "extra_columns",
        message: `Extra columns will be ignored: ${extra.join(", ")}`,
      });
    }
  }

  return messages;
}

function parseMaybeJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return value;
  }
}

function parseProjectRow(row: Record<string, string>) {
  const base = projectFeesBaseSchema.safeParse(row);

  if (!base.success) {
    return null;
  }

  const baseKeys = ["Project Code", "Client", "Program Name", "Start Month", "End Month", "Status", "Total Fees"];
  const departmentFees = Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => !baseKeys.includes(key))
      .map(([key, value]) => [key, Number(value || 0)]),
  );

  return {
    projectCode: base.data["Project Code"],
    client: base.data.Client,
    programName: base.data["Program Name"],
    startMonth: base.data["Start Month"],
    endMonth: base.data["End Month"],
    status: base.data.Status,
    totalFees: base.data["Total Fees"],
    departmentFees,
  } satisfies RawProjectFeesByDepartmentRow;
}

export async function processUpload(file: File): Promise<ProcessedUpload> {
  const format = detectFormat(file.name);
  const hashSeed = format === "excel" ? `${file.name}:${file.size}:excel` : `${file.name}:${file.size}:${(await file.text()).slice(0, 1000)}`;
  const hash = await hashText(hashSeed);
  const messages: ValidationMessage[] = [];
  let rowCount = 0;
  let kind: FileKind = "unsupported";
  const artifactBase = {
    id: hash,
    name: file.name,
    size: file.size,
    format,
    rowCount,
    hash,
  };

  if (format === "excel") {
    const parsed = await parseExcelFile(file);
    rowCount = parsed.rows.length;
    messages.push(...parsed.messages);
    kind = detectCsvKind(file.name.replace(/\.(xls|xlsx)$/i, ".csv"), parsed.headers);

    if (parsed.rows.length === 0) {
      return {
        artifact: {
          ...artifactBase,
          detectedKind: kind,
          status: "error",
          messages,
          rowCount,
        },
        kind,
      };
    }

    const virtualCsvText = ""; // unused for excel path, keeps flow aligned below
    void virtualCsvText;

    switch (kind) {
      case "action_logs": {
        messages.push(...buildMessages(["id", "user_email", "action", "created", "payload"], parsed.headers, false));
        const actionLogs = parsed.rows
          .map((row) => actionLogCsvSchema.safeParse({ ...row, payload: parseMaybeJson(row.payload ?? "") }))
          .flatMap((result) => (result.success ? [result.data] : []));

        return {
          artifact: { ...artifactBase, detectedKind: kind, status: messages.some((item) => item.level === "error") ? "error" : "validated", messages, rowCount },
          kind,
          actionLogs,
        };
      }
      case "project_fees_by_department_by_month": {
        messages.push(
          ...buildMessages(
            ["Project Code", "Client", "Program Name", "Start Month", "End Month", "Status", "Total Fees"],
            parsed.headers,
            true,
          ),
        );
        const projectFeesByDepartment = parsed.rows.map(parseProjectRow).filter(Boolean) as RawProjectFeesByDepartmentRow[];
        return {
          artifact: { ...artifactBase, detectedKind: kind, status: messages.some((item) => item.level === "error") ? "error" : "validated", messages, rowCount },
          kind,
          projectFeesByDepartment,
        };
      }
      case "department_breakdown_report": {
        messages.push(...buildMessages(["Department", "Total Fees", "% of Total"], parsed.headers, false));
        const departmentBreakdown = parsed.rows
          .map((row) => departmentBreakdownSchema.safeParse(row))
          .flatMap((result) =>
            result.success
              ? [{ department: result.data.Department, totalFees: result.data["Total Fees"], percentOfTotal: result.data["% of Total"] } satisfies RawDepartmentBreakdownRow]
              : [],
          );
        return {
          artifact: { ...artifactBase, detectedKind: kind, status: messages.some((item) => item.level === "error") ? "error" : "validated", messages, rowCount },
          kind,
          departmentBreakdown,
        };
      }
      case "client_summary_report": {
        messages.push(...buildMessages(["Client", "Total Projects", "Total Fees", "Total Revenue"], parsed.headers, false));
        const clientSummaries = parsed.rows
          .map((row) => clientSummarySchema.safeParse(row))
          .flatMap((result) =>
            result.success
              ? [{ client: result.data.Client, totalProjects: result.data["Total Projects"], totalFees: result.data["Total Fees"], totalRevenue: result.data["Total Revenue"] } satisfies RawClientSummaryRow]
              : [],
          );
        return {
          artifact: { ...artifactBase, detectedKind: kind, status: messages.some((item) => item.level === "error") ? "error" : "validated", messages, rowCount },
          kind,
          clientSummaries,
        };
      }
      default:
        return {
          artifact: {
            ...artifactBase,
            detectedKind: "unsupported",
            status: "unsupported",
            messages: [
              ...messages,
              {
                level: "error",
                code: "unsupported_excel",
                message:
                  "Unsupported Excel schema. Supported Excel uploads are action logs, project fees by department, department breakdown, and client summary exports.",
              },
            ],
            rowCount,
          },
          kind: "unsupported",
        };
    }
  }

  const text = await file.text();

  if (!text.trim()) {
    return {
      artifact: {
        ...artifactBase,
        detectedKind: "unsupported",
        status: "error",
        messages: [{ level: "error", code: "empty_file", message: "The file is empty." }],
        rowCount: 0,
      },
      kind: "unsupported",
    };
  }

  if (format === "csv") {
    const parsed = await parseCsvText(text);
    rowCount = parsed.rows.length;
    messages.push(...parsed.messages);
    kind = detectCsvKind(file.name, parsed.headers);

    switch (kind) {
      case "action_logs": {
        messages.push(...buildMessages(["id", "user_email", "action", "created", "payload"], parsed.headers, false));
        const actionLogs = parsed.rows
          .map((row) =>
            actionLogCsvSchema.safeParse({
              ...row,
              payload: parseMaybeJson(row.payload ?? ""),
            }),
          )
          .flatMap((result) => (result.success ? [result.data] : []));

        return {
          artifact: {
            ...artifactBase,
            detectedKind: kind,
            status: messages.some((item) => item.level === "error") ? "error" : "validated",
            messages,
            rowCount,
          },
          kind,
          actionLogs,
        };
      }
      case "project_fees_by_department_by_month": {
        messages.push(
          ...buildMessages(
            ["Project Code", "Client", "Program Name", "Start Month", "End Month", "Status", "Total Fees"],
            parsed.headers,
            true,
          ),
        );
        const projectFeesByDepartment = parsed.rows.map(parseProjectRow).filter(Boolean) as RawProjectFeesByDepartmentRow[];

        return {
          artifact: {
            ...artifactBase,
            detectedKind: kind,
            status: messages.some((item) => item.level === "error") ? "error" : "validated",
            messages,
            rowCount,
          },
          kind,
          projectFeesByDepartment,
        };
      }
      case "department_breakdown_report": {
        messages.push(...buildMessages(["Department", "Total Fees", "% of Total"], parsed.headers, false));
        const departmentBreakdown = parsed.rows
          .map((row) => departmentBreakdownSchema.safeParse(row))
          .flatMap((result) =>
            result.success
              ? [
                  {
                    department: result.data.Department,
                    totalFees: result.data["Total Fees"],
                    percentOfTotal: result.data["% of Total"],
                  } satisfies RawDepartmentBreakdownRow,
                ]
              : [],
          );

        return {
          artifact: {
            ...artifactBase,
            detectedKind: kind,
            status: messages.some((item) => item.level === "error") ? "error" : "validated",
            messages,
            rowCount,
          },
          kind,
          departmentBreakdown,
        };
      }
      case "client_summary_report": {
        messages.push(...buildMessages(["Client", "Total Projects", "Total Fees", "Total Revenue"], parsed.headers, false));
        const clientSummaries = parsed.rows
          .map((row) => clientSummarySchema.safeParse(row))
          .flatMap((result) =>
            result.success
              ? [
                  {
                    client: result.data.Client,
                    totalProjects: result.data["Total Projects"],
                    totalFees: result.data["Total Fees"],
                    totalRevenue: result.data["Total Revenue"],
                  } satisfies RawClientSummaryRow,
                ]
              : [],
          );

        return {
          artifact: {
            ...artifactBase,
            detectedKind: kind,
            status: messages.some((item) => item.level === "error") ? "error" : "validated",
            messages,
            rowCount,
          },
          kind,
          clientSummaries,
        };
      }
      default:
        return {
          artifact: {
            ...artifactBase,
            detectedKind: "unsupported",
            status: "unsupported",
            messages: [
              {
                level: "error",
                code: "unsupported_csv",
                message:
                  "Unsupported CSV schema. Supported CSV uploads are action logs, project fees by department, department breakdown, and client summary exports.",
              },
            ],
            rowCount,
          },
          kind: "unsupported",
        };
    }
  }

  return {
    artifact: {
      ...artifactBase,
      detectedKind: "unsupported",
      status: "unsupported",
      messages: [
        {
          level: "error",
          code: "unsupported_file_type",
          message: "Only CSV and Excel uploads are supported in this first-use phase.",
        },
      ],
      rowCount: 0,
    },
    kind: "unsupported",
  };
}
