import type { ValidationMessage } from "@/lib/domain";

export interface ParsedJson {
  data: unknown;
  messages: ValidationMessage[];
}

export function parseJsonText(text: string): ParsedJson {
  try {
    return {
      data: JSON.parse(text) as unknown,
      messages: [],
    };
  } catch (error) {
    return {
      data: null,
      messages: [
        {
          level: "error",
          code: "json_parse_error",
          message: error instanceof Error ? error.message : "Invalid JSON payload.",
        },
      ],
    };
  }
}
