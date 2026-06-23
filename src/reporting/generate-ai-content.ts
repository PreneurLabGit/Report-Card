import { z } from "zod";

import { createStructuredOpenAiResponse, isOpenAiConfigured, OpenAiError } from "@/lib/openai";
import type { NormalizedUserReport, ReportScopeEntry } from "@/lib/domain";

const teamMemberContentSchema = z.object({
  lede: z.string().min(1).max(280),
  observation: z.string().min(1).max(420),
});

const businessOwnerContentSchema = z.object({
  lede: z.string().min(1).max(320),
  whatStandsOut: z.string().min(1).max(520),
  worthDoingThisWeek: z.array(z.string().min(1).max(220)).length(3),
});

const superAdminContentSchema = z.object({
  lede: z.string().min(1).max(320),
  coachingItems: z.array(z.string().min(1).max(260)).length(3),
});

function toSafeScopeEntries(entries: ReportScopeEntry[]) {
  return entries.map((entry) => ({
    userName: entry.userName,
    role: entry.role,
    hasActivity: entry.hasActivity,
    metrics: entry.metrics,
  }));
}

function buildTeamMemberPrompt() {
  return [
    "You write internal SaltHub adoption email copy for one team member.",
    "Write concise, supportive, observational text in second person.",
    "Do not mention AI, the model, or hidden reasoning.",
    "Use only the provided metrics. Do not invent names, numbers, causes, dates, or activity.",
    "If the evidence is weak, stay neutral and simple.",
    "Return valid JSON matching the required schema.",
  ].join(" ");
}

function buildBusinessOwnerPrompt() {
  return [
    "You write internal SaltHub adoption email copy for one business owner.",
    "Write diagnostic, workflow-focused text for a leader reviewing direct team members.",
    "Use only the provided metrics and listed team-member names. Do not invent names, numbers, inactivity windows, causes, or recommendations unsupported by the payload.",
    "Keep recommendations concrete but neutral. Do not shame users.",
    "If the evidence is weak, say so plainly and keep the guidance light.",
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
    "Return valid JSON matching the required schema.",
  ].join(" ");
}

async function generateTeamMemberContent(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const output = await createStructuredOpenAiResponse({
    schemaName: "team_member_report_content",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        lede: { type: "string" },
        observation: { type: "string" },
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

  return teamMemberContentSchema.parse(JSON.parse(output));
}

async function generateBusinessOwnerContent(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const output = await createStructuredOpenAiResponse({
    schemaName: "business_owner_report_content",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        lede: { type: "string" },
        whatStandsOut: { type: "string" },
        worthDoingThisWeek: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "string" },
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

  return businessOwnerContentSchema.parse(JSON.parse(output));
}

async function generateSuperAdminContent(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const output = await createStructuredOpenAiResponse({
    schemaName: "super_admin_report_content",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        lede: { type: "string" },
        coachingItems: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "string" },
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

  return superAdminContentSchema.parse(JSON.parse(output));
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
    if (report.role === "team_member") {
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
