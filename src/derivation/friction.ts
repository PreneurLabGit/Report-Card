import type { FrictionClassification, FrictionTheme, RawFrictionNote } from "@/lib/domain";
import { slugify } from "@/lib/utils";

const THEME_RULES: Array<{
  label: string;
  classification: FrictionClassification;
  keywords: string[];
}> = [
  {
    label: "Workflow builder complexity",
    classification: "Platform",
    keywords: ["workback builder", "builder", "spreadsheet", "workflow", "planning"],
  },
  {
    label: "Platform usability friction",
    classification: "Platform",
    keywords: ["platform", "tool", "system", "load", "slow", "bug", "harder"],
  },
  {
    label: "Skill and enablement gaps",
    classification: "Capability",
    keywords: ["training", "enablement", "capability", "knowledge", "onboarding"],
  },
  {
    label: "Operating rhythm and handoff friction",
    classification: "Behavioral",
    keywords: ["handoff", "follow-up", "ownership", "alignment", "communication"],
  },
];

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function classifyNote(note: RawFrictionNote) {
  const normalized = normalizeText(note.noteText);

  for (const rule of THEME_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule;
    }
  }

  const words = normalized
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .slice(0, 3);

  return {
    label: words.length > 0 ? words.join(" ") : "General friction pattern",
    classification: undefined,
    keywords: words,
  };
}

function buildSummary(theme: FrictionTheme) {
  const managerBase = `${theme.noteCount} notes across ${theme.distinctManagerCount} manager${theme.distinctManagerCount === 1 ? "" : "s"}`;
  const teamBase =
    theme.distinctTeamCount > 1 ? `, spanning ${theme.distinctTeamCount} teams` : "";
  return `${managerBase}${teamBase}.`;
}

export function rankFrictionThemes(notes: RawFrictionNote[]): FrictionTheme[] {
  const buckets = new Map<string, FrictionTheme>();
  const noteThemeIds = new Map<string, string>();

  for (const note of notes) {
    const matched = classifyNote(note);
    const id = slugify(`${matched.label}-${matched.classification ?? "uncategorized"}`);
    noteThemeIds.set(note.noteId, id);
    const existing = buckets.get(id);

    if (!existing) {
      buckets.set(id, {
        id,
        themeKey: matched.label.toLowerCase(),
        label: matched.label,
        keywords: matched.keywords,
        classification: matched.classification,
        noteCount: 1,
        distinctManagerCount: 1,
        distinctTeamCount: 1,
        periods: [`${note.reportingPeriodStart}:${note.reportingPeriodEnd}`],
        evidenceSnippets: [note.noteText],
        sampleManagerNames: [note.managerName],
        summary: "",
      });
      continue;
    }

    existing.noteCount += 1;
    existing.periods = Array.from(new Set([...existing.periods, `${note.reportingPeriodStart}:${note.reportingPeriodEnd}`]));
    existing.sampleManagerNames = Array.from(new Set([...existing.sampleManagerNames, note.managerName]));
    existing.evidenceSnippets = Array.from(new Set([...existing.evidenceSnippets, note.noteText])).slice(0, 3);
  }

  const themeById = Array.from(buckets.values()).map((theme) => {
    const matchingNotes = notes.filter((note) => noteThemeIds.get(note.noteId) === theme.id);
    theme.distinctManagerCount = new Set(matchingNotes.map((note) => note.managerId)).size;
    theme.distinctTeamCount = new Set(matchingNotes.map((note) => note.team)).size;
    theme.summary = buildSummary(theme);
    return theme;
  });

  return themeById.sort((left, right) => {
    const periodDelta = right.periods.length - left.periods.length;
    if (left.noteCount !== right.noteCount) {
      return right.noteCount - left.noteCount;
    }
    if (left.distinctManagerCount !== right.distinctManagerCount) {
      return right.distinctManagerCount - left.distinctManagerCount;
    }
    return periodDelta;
  });
}

export function buildFrictionRollups(notes: RawFrictionNote[]) {
  const byManagerId = notes.reduce<Record<string, RawFrictionNote[]>>((accumulator, note) => {
    accumulator[note.managerId] ??= [];
    accumulator[note.managerId].push(note);
    return accumulator;
  }, {});
  const byLeaderId = notes.reduce<Record<string, RawFrictionNote[]>>((accumulator, note) => {
    accumulator[note.leaderId] ??= [];
    accumulator[note.leaderId].push(note);
    return accumulator;
  }, {});
  const byDepartment = notes.reduce<Record<string, RawFrictionNote[]>>((accumulator, note) => {
    accumulator[note.department] ??= [];
    accumulator[note.department].push(note);
    return accumulator;
  }, {});

  return {
    allNotes: notes,
    byManagerId,
    byLeaderId,
    byDepartment,
    enterpriseThemes: rankFrictionThemes(notes),
  };
}
