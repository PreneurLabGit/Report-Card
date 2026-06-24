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
    endDate: z.string().date(),
    startDate: z.string().date().optional(),
    mode: z.literal("api").default("api"),
  });

const supportedReportRoleSchema = z.enum([
  "team_member",
  "project_lead",
  "freelancer",
  "contributor",
  "department_owner",
  "business_owner",
  "super_admin",
]);

const reportPeriodSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  displayLabel: z.string().min(1),
});

const normalizedUserReportSchema = z.object({
  userId: z.string().min(1),
  recipientEmail: z.string().email().nullable(),
  userName: z.string().min(1),
  role: supportedReportRoleSchema.nullable(),
  department: z.string().nullable(),
  disabled: z.boolean(),
  reportPeriod: reportPeriodSchema,
  metrics: z.object({
    loginCount: z.number(),
    pipelineEntriesCreated: z.number(),
    estimatesCreated: z.number().nullable(),
    estimatesSubmitted: z.number(),
    sentForBusinessOwnerApproval: z.number(),
    firstApprovals: z.number(),
    approvalsCompleted: z.number(),
    clientApprovals: z.number(),
    projectsConfirmed: z.number(),
    reworkEvents: z.number(),
    activeDaysCount: z.number().nullable(),
    lastActivityTs: z.string().nullable(),
    score: z.number().nullable(),
    priorPeriodScore: z.number().nullable(),
    wowScoreDelta: z.number().nullable(),
  }),
  status: z.object({
    label: z.string().nullable(),
    color: z.enum(["green", "yellow", "red"]).nullable(),
  }),
  content: z.object({
    lede: z.string(),
    observation: z.string(),
    whatStandsOut: z.string(),
    worthDoingThisWeek: z.array(z.string()),
    coachingItems: z.array(z.string()),
  }),
  missingFields: z.array(z.string()),
  previewStatus: z.enum(["ready", "missing_data", "disabled"]),
  narrativeStatus: z.enum(["generated", "fallback", "empty_state"]),
  narrativeDetail: z.string().nullable(),
  scopeSummary: z
    .object({
      role: supportedReportRoleSchema,
      eligibleChildCount: z.number(),
      activeChildCount: z.number(),
      emptyStateMessage: z.string().nullable(),
    })
    .nullable(),
  scopeEntries: z.array(
    z.object({
      userId: z.string().min(1),
      userName: z.string().min(1),
      role: supportedReportRoleSchema,
      disabled: z.boolean(),
      hasActivity: z.boolean(),
      metrics: z.object({
        loginCount: z.number(),
        projectsConfirmed: z.number(),
        pipelineEntriesCreated: z.number(),
        estimatesSubmitted: z.number(),
        approvalsCompleted: z.number(),
        reworkEvents: z.number(),
      }),
    }),
  ),
  html: z.string().min(1),
  templateMode: z.enum(["file-template", "fallback-template"]),
});

export const reportSendRequestSchema = z.object({
  reports: z.array(normalizedUserReportSchema).min(1).max(100),
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
