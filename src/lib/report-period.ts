import type { ReportPeriod } from "@/lib/domain";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
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

export function calculatePriorPeriod(startDate: string, endDate: string): ReportPeriod {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);
  const lengthInDays = Math.round((end.getTime() - start.getTime()) / DAY_IN_MS) + 1;
  const priorEnd = new Date(start.getTime() - DAY_IN_MS);
  const priorStart = new Date(priorEnd.getTime() - (lengthInDays - 1) * DAY_IN_MS);

  const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

  return buildReportPeriod(toIsoDate(priorStart), toIsoDate(priorEnd));
}
