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

export const reportGenerationRequestSchema = z
  .object({
    startDate: z.string().date(),
    endDate: z.string().date(),
    mode: z.enum(["api", "upload-fallback"]).default("api"),
  })
  .refine((value) => value.startDate <= value.endDate, {
    path: ["endDate"],
    message: "endDate must be on or after startDate.",
  });

const organizationTreeMemberSchema = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1),
  department: z.string().min(1),
  disabled: z.boolean(),
});

const organizationTreeTeamMemberSchema = organizationTreeMemberSchema;

const organizationTreeBusinessOwnerSchema = organizationTreeMemberSchema.extend({
  teamMembers: z.array(organizationTreeTeamMemberSchema),
});

const organizationTreeSuperAdminSchema = organizationTreeMemberSchema.extend({
  businessOwners: z.array(organizationTreeBusinessOwnerSchema),
});

export const organizationTreeResponseSchema = z.object({
  superAdmins: z.array(organizationTreeSuperAdminSchema),
});

export const activityUserSummarySchema = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  userEmail: z.string().email(),
  loginCount: z.number().optional(),
  projectsConfirmed: z.number().optional(),
  sentForBusinessOwnerApproval: z.number().optional(),
  otherActions: z.record(z.string(), z.number()).optional(),
});

export const activitySummaryResponseSchema = z.object({
  start_date: z.string().date(),
  end_date: z.string().date(),
  users: z.array(activityUserSummarySchema),
});
