import type { ReportViewModel, ValidationMessage } from "@/lib/domain";

export function qaReportViewModel(report: ReportViewModel): ValidationMessage[] {
  const issues: ValidationMessage[] = [];

  if (!report.title || !report.subjectLabel) {
    issues.push({
      level: "error",
      code: "missing_report_identity",
      message: "Report title and subject label are required.",
    });
  }

  if (report.score.band === "green" && report.score.score < 80) {
    issues.push({
      level: "error",
      code: "score_band_mismatch",
      message: "Green reports must have a score of at least 80.",
    });
  }

  if (report.score.band === "yellow" && (report.score.score < 60 || report.score.score > 79)) {
    issues.push({
      level: "error",
      code: "score_band_mismatch",
      message: "Yellow reports must have a score between 60 and 79.",
    });
  }

  if (report.score.band === "red" && report.score.score > 59) {
    issues.push({
      level: "error",
      code: "score_band_mismatch",
      message: "Red reports must have a score below 60.",
    });
  }

  return issues;
}
