import type { ReportPeriod } from "@/lib/domain";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMondayStart(date: Date) {
  const dayOfWeek = date.getUTCDay();
  const offsetFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return new Date(date.getTime() - offsetFromMonday * DAY_IN_MS);
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(toUtcDate(value));
}

export function buildDisplayLabel(startDate: string, endDate: string) {
  return `${formatDay(startDate)} - ${formatDay(endDate)}`;
}

export function buildReportPeriod(startDate: string, endDate: string): ReportPeriod {
  return {
    startDate,
    endDate,
    displayLabel: buildDisplayLabel(startDate, endDate),
  };
}

export function buildTrailingPeriod(endDate: string, lengthInDays: number): ReportPeriod {
  const end = toUtcDate(endDate);
  const start = new Date(end.getTime() - (lengthInDays - 1) * DAY_IN_MS);

  return buildReportPeriod(toIsoDate(start), toIsoDate(end));
}

export function calculatePriorPeriod(startDate: string, endDate: string): ReportPeriod {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);
  const lengthInDays = Math.round((end.getTime() - start.getTime()) / DAY_IN_MS) + 1;
  const priorEnd = new Date(start.getTime() - DAY_IN_MS);
  const priorStart = new Date(priorEnd.getTime() - (lengthInDays - 1) * DAY_IN_MS);

  return buildReportPeriod(toIsoDate(priorStart), toIsoDate(priorEnd));
}

export function buildWeeklyPeriodEnding(endDate: string) {
  const end = toUtcDate(endDate);
  const start = getMondayStart(end);

  return buildReportPeriod(toIsoDate(start), toIsoDate(end));
}

export function buildBiweeklyPeriodEnding(endDate: string) {
  const end = toUtcDate(endDate);
  const currentWeekMonday = getMondayStart(end);
  const start = new Date(currentWeekMonday.getTime() - 7 * DAY_IN_MS);

  return buildReportPeriod(toIsoDate(start), toIsoDate(end));
}
