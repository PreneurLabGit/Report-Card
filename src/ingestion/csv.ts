import Papa from "papaparse";

import type { ValidationMessage } from "@/lib/domain";

export interface ParsedCsv {
  rows: Record<string, string>[];
  headers: string[];
  messages: ValidationMessage[];
}

export async function parseCsvText(text: string): Promise<ParsedCsv> {
  return new Promise((resolve) => {
    const config: Papa.ParseConfig<Record<string, string>> = {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header: string) => header.trim(),
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        const headers = results.meta.fields ?? [];
        const messages: ValidationMessage[] = [];

        if (results.errors.length > 0) {
          messages.push(
            ...results.errors.map((error) => ({
              level: "error" as const,
              code: "csv_parse_error",
              message: `${error.message} at row ${error.row ?? "unknown"}`,
            })),
          );
        }

        resolve({
          rows: results.data,
          headers,
          messages,
        });
      },
    };

    Papa.parse<Record<string, string>>(text, config);
  });
}
