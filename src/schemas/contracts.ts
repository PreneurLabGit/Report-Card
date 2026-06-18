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

export const userDirectoryCsvSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  managerEmail: z.string().email().optional(),
  leaderEmail: z.string().email().optional(),
});

export const userDirectoryJsonSchema = z.object({
  users: z.array(
    z.object({
      id: z.string().optional(),
      email: z.string().email(),
      name: z.string().optional(),
      role: z.string().optional(),
      department: z.string().optional(),
      managerEmail: z.string().email().optional(),
      leaderEmail: z.string().email().optional(),
    }),
  ),
});

export const analyticsPayloadSchema = z.object({
  users: z.array(z.record(z.string(), z.unknown())).optional(),
  managers: z.array(z.record(z.string(), z.unknown())).optional(),
  summary: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
