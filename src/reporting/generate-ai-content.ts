import { z } from "zod";

import { createStructuredOpenAiResponse, isOpenAiConfigured, OpenAiError } from "@/lib/openai";
import type { NormalizedUserReport, ReportScopeEntry } from "@/lib/domain";

const TEAM_MEMBER_LIMITS = {
  lede: 280,
  observation: 420,
} as const;

const BUSINESS_OWNER_LIMITS = {
  lede: 320,
  whatStandsOut: 520,
  worthDoingItem: 220,
  worthDoingCount: 3,
} as const;

const SUPER_ADMIN_LIMITS = {
  lede: 320,
  coachingItem: 260,
  coachingCount: 3,
} as const;

const teamMemberContentSchema = z.object({
  lede: z.string().min(1).max(TEAM_MEMBER_LIMITS.lede),
  observation: z.string().min(1).max(TEAM_MEMBER_LIMITS.observation),
});

const businessOwnerContentSchema = z.object({
  lede: z.string().min(1).max(BUSINESS_OWNER_LIMITS.lede),
  whatStandsOut: z.string().min(1).max(BUSINESS_OWNER_LIMITS.whatStandsOut),
  worthDoingThisWeek: z.array(z.string().min(1).max(BUSINESS_OWNER_LIMITS.worthDoingItem)).length(BUSINESS_OWNER_LIMITS.worthDoingCount),
});

const superAdminContentSchema = z.object({
  lede: z.string().min(1).max(SUPER_ADMIN_LIMITS.lede),
  coachingItems: z.array(z.string().min(1).max(SUPER_ADMIN_LIMITS.coachingItem)).length(SUPER_ADMIN_LIMITS.coachingCount),
});

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clipText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalizeWhitespace(normalized.slice(0, maxLength));
}

function clipStringArray(value: unknown, itemMaxLength: number, exactLength: number) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value
    .slice(0, exactLength)
    .map((item) => clipText(item, itemMaxLength))
    .filter((item): item is string => typeof item === "string" && item.length > 0);
}

function parseTeamMemberContent(output: string) {
  const parsed = JSON.parse(output) as Record<string, unknown>;
  return teamMemberContentSchema.parse({
    lede: clipText(parsed.lede, TEAM_MEMBER_LIMITS.lede),
    observation: clipText(parsed.observation, TEAM_MEMBER_LIMITS.observation),
  });
}

function parseBusinessOwnerContent(output: string) {
  const parsed = JSON.parse(output) as Record<string, unknown>;
  return businessOwnerContentSchema.parse({
    lede: clipText(parsed.lede, BUSINESS_OWNER_LIMITS.lede),
    whatStandsOut: clipText(parsed.whatStandsOut, BUSINESS_OWNER_LIMITS.whatStandsOut),
    worthDoingThisWeek: clipStringArray(
      parsed.worthDoingThisWeek,
      BUSINESS_OWNER_LIMITS.worthDoingItem,
      BUSINESS_OWNER_LIMITS.worthDoingCount,
    ),
  });
}

function parseSuperAdminContent(output: string) {
  const parsed = JSON.parse(output) as Record<string, unknown>;
  return superAdminContentSchema.parse({
    lede: clipText(parsed.lede, SUPER_ADMIN_LIMITS.lede),
    coachingItems: clipStringArray(parsed.coachingItems, SUPER_ADMIN_LIMITS.coachingItem, SUPER_ADMIN_LIMITS.coachingCount),
  });
}

function toSafeScopeEntries(entries: ReportScopeEntry[]) {
  return entries.map((entry) => ({
    userName: entry.userName,
    role: entry.role,
    hasActivity: entry.hasActivity,
    score: entry.score,
    status: entry.status,
    activeDisplay: entry.activeDisplay,
    metrics: entry.metrics,
  }));
}

function buildTeamMemberPrompt() {
  return [
    "You write internal SaltHub adoption email copy for one individual SaltHub user.",
    "Write concise, supportive, observational text in second person.",
    "Do not mention AI, the model, or hidden reasoning.",
    "Use only the provided metrics. Do not invent names, numbers, causes, dates, or activity.",
    "If the evidence is weak, stay neutral and simple.",
    `Keep lede at or under ${TEAM_MEMBER_LIMITS.lede} characters and observation at or under ${TEAM_MEMBER_LIMITS.observation} characters.`,
    "Return valid JSON matching the required schema.",
  ].join(" ");
}

function buildBusinessOwnerPrompt() {
  return [
    "You write internal SaltHub adoption email copy for one business owner.",
    "Write diagnostic, workflow-focused text for a leader reviewing direct Account Management users.",
    "Use only the provided metrics and listed user names. Do not invent names, numbers, inactivity windows, causes, or recommendations unsupported by the payload.",
    "Keep recommendations concrete but neutral. Do not shame users.",
    "If the evidence is weak, say so plainly and keep the guidance light.",
    `Keep lede at or under ${BUSINESS_OWNER_LIMITS.lede} characters, whatStandsOut at or under ${BUSINESS_OWNER_LIMITS.whatStandsOut} characters, and each worthDoingThisWeek item at or under ${BUSINESS_OWNER_LIMITS.worthDoingItem} characters.`,
    "Return valid JSON matching the required schema.",
  ].join(" ");
}

function buildSuperAdminPrompt() {
  return [
    "You write internal SaltHub adoption email copy for one super admin.",
    "Write concise coaching-oriented text about direct business owners only.",
    "Use only the provided business-owner names and metrics. Do not invent names, scores, trends, or causes not present in the payload.",
    "Keep the language executive and diagnostic.",
    "If evidence is weak, stay neutral and avoid over-claiming.",
    `Keep lede at or under ${SUPER_ADMIN_LIMITS.lede} characters and each coaching item at or under ${SUPER_ADMIN_LIMITS.coachingItem} characters.`,
    "Return valid JSON matching the required schema.",
  ].join(" ");
}

function isIndividualUserReportRole(role: NormalizedUserReport["role"]) {
  return (
    role === "team_member" ||
    role === "project_lead" ||
    role === "freelancer" ||
    role === "contributor" ||
    role === "department_owner"
  );
}

async function generateTeamMemberContent(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const output = await createStructuredOpenAiResponse({
    schemaName: "team_member_report_content",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        lede: { type: "string", minLength: 1, maxLength: TEAM_MEMBER_LIMITS.lede },
        observation: { type: "string", minLength: 1, maxLength: TEAM_MEMBER_LIMITS.observation },
      },
      required: ["lede", "observation"],
    },
    systemPrompt: buildTeamMemberPrompt(),
    userPayload: {
      role: report.role,
      userName: report.userName,
      reportPeriod: report.reportPeriod,
      metrics: report.metrics,
      missingFields: report.missingFields,
    },
    maxOutputTokens: 320,
  });

  return parseTeamMemberContent(output);
}

async function generateBusinessOwnerContent(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const output = await createStructuredOpenAiResponse({
    schemaName: "business_owner_report_content",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        lede: { type: "string", minLength: 1, maxLength: BUSINESS_OWNER_LIMITS.lede },
        whatStandsOut: { type: "string", minLength: 1, maxLength: BUSINESS_OWNER_LIMITS.whatStandsOut },
        worthDoingThisWeek: {
          type: "array",
          minItems: BUSINESS_OWNER_LIMITS.worthDoingCount,
          maxItems: BUSINESS_OWNER_LIMITS.worthDoingCount,
          items: { type: "string", minLength: 1, maxLength: BUSINESS_OWNER_LIMITS.worthDoingItem },
        },
      },
      required: ["lede", "whatStandsOut", "worthDoingThisWeek"],
    },
    systemPrompt: buildBusinessOwnerPrompt(),
    userPayload: {
      role: report.role,
      userName: report.userName,
      reportPeriod: report.reportPeriod,
      scopeSummary: report.scopeSummary,
      teamMembers: toSafeScopeEntries(report.scopeEntries),
      aggregatedMetrics: report.metrics,
      missingFields: report.missingFields,
    },
    maxOutputTokens: 520,
  });

  return parseBusinessOwnerContent(output);
}

async function generateSuperAdminContent(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const output = await createStructuredOpenAiResponse({
    schemaName: "super_admin_report_content",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        lede: { type: "string", minLength: 1, maxLength: SUPER_ADMIN_LIMITS.lede },
        coachingItems: {
          type: "array",
          minItems: SUPER_ADMIN_LIMITS.coachingCount,
          maxItems: SUPER_ADMIN_LIMITS.coachingCount,
          items: { type: "string", minLength: 1, maxLength: SUPER_ADMIN_LIMITS.coachingItem },
        },
      },
      required: ["lede", "coachingItems"],
    },
    systemPrompt: buildSuperAdminPrompt(),
    userPayload: {
      role: report.role,
      userName: report.userName,
      reportPeriod: report.reportPeriod,
      scopeSummary: report.scopeSummary,
      businessOwners: toSafeScopeEntries(report.scopeEntries),
      aggregatedMetrics: report.metrics,
      missingFields: report.missingFields,
    },
    maxOutputTokens: 420,
  });

  return parseSuperAdminContent(output);
}

export async function generateAiNarrativeContent(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  if (!isOpenAiConfigured()) {
    return {
      content: report.content,
      narrativeStatus: "fallback" as const,
      narrativeDetail: "OpenAI narrative generation is not configured. Fallback copy is being used.",
    };
  }

  if (report.scopeSummary?.emptyStateMessage) {
    return {
      content: report.content,
      narrativeStatus: "empty_state" as const,
      narrativeDetail: "This report is in empty-state mode, so AI narrative generation was skipped.",
    };
  }

  try {
    if (isIndividualUserReportRole(report.role)) {
      const generated = await generateTeamMemberContent(report);
      return {
        content: {
          ...report.content,
          lede: generated.lede,
          observation: generated.observation,
        },
        narrativeStatus: "generated" as const,
        narrativeDetail: null,
      };
    }

    if (report.role === "business_owner") {
      const generated = await generateBusinessOwnerContent(report);
      return {
        content: {
          ...report.content,
          lede: generated.lede,
          whatStandsOut: generated.whatStandsOut,
          worthDoingThisWeek: generated.worthDoingThisWeek,
        },
        narrativeStatus: "generated" as const,
        narrativeDetail: null,
      };
    }

    if (report.role === "super_admin") {
      const generated = await generateSuperAdminContent(report);
      return {
        content: {
          ...report.content,
          lede: generated.lede,
          coachingItems: generated.coachingItems,
        },
        narrativeStatus: "generated" as const,
        narrativeDetail: null,
      };
    }
  } catch (error) {
    const message = error instanceof OpenAiError || error instanceof Error ? error.message : "Unknown AI generation error.";
    console.error(`OpenAI narrative generation fallback for ${report.userId}: ${message}`);
    return {
      content: report.content,
      narrativeStatus: "fallback" as const,
      narrativeDetail: `AI narrative generation failed. Fallback copy is being used. ${message}`,
    };
  }

  return {
    content: report.content,
    narrativeStatus: "fallback" as const,
    narrativeDetail: "AI narrative generation did not run for this report. Fallback copy is being used.",
  };
}
