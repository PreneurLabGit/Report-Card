import * as XLSX from "xlsx";

import type { ValidationMessage } from "@/lib/domain";

export interface ParsedExcel {
  rows: Record<string, string>[];
  headers: string[];
  messages: ValidationMessage[];
}

const ACTION_LOG_HEADER_MAP: Record<string, string> = {
  ID: "id",
  "User Email": "user_email",
  Action: "action",
  Created: "created",
  Payload: "payload",
};

function normalizeExcelHeader(header: string) {
  return ACTION_LOG_HEADER_MAP[header.trim()] ?? header.trim();
}

export async function parseExcelFile(file: File): Promise<ParsedExcel> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  const sheet = firstSheet ? workbook.Sheets[firstSheet] : undefined;

  if (!sheet) {
    return {
      rows: [],
      headers: [],
      messages: [{ level: "error", code: "empty_workbook", message: "The Excel workbook does not contain a readable sheet." }],
    };
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rawRows.length === 0) {
    return {
      rows: [],
      headers: [],
      messages: [{ level: "error", code: "empty_file", message: "The Excel file is empty." }],
    };
  }

  const rows = rawRows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [normalizeExcelHeader(key), String(value ?? "").trim()]),
    ),
  );
  const headers = Object.keys(rows[0] ?? {});

  return {
    rows,
    headers,
    messages: [],
  };
}
