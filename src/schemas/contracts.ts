import { z } from "zod";

export const actionLogCsvSchema = z.object({
  id: z.string().min(1),
  user_email: z.string().email(),
  action: z.string().min(1),
  created: z.string().min(1),
  payload: z.union([z.string(), z.record(z.string(), z.unknown()), z.null()]),
});

export const projectFeesBaseSchema = z.object({
  "Project Code": z.string().min(1),
  Client: z.string().min(1),
  "Program Name": z.string().min(1),
  "Start Month": z.string().min(1),
  "End Month": z.string().min(1),
  Status: z.string().min(1),
  "Total Fees": z.coerce.number(),
});

export const departmentBreakdownSchema = z.object({
  Department: z.string().min(1),
  "Total Fees": z.coerce.number(),
  "% of Total": z.coerce.number(),
});

export const clientSummarySchema = z.object({
  Client: z.string().min(1),
  "Total Projects": z.coerce.number(),
  "Total Fees": z.coerce.number(),
  "Total Revenue": z.coerce.number(),
});
