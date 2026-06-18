import type { ReportViewModel } from "@/lib/domain";

export interface NarrativeProvider {
  name: string;
  generate(report: ReportViewModel): Promise<Partial<ReportViewModel>>;
}

class DeterministicNarrativeProvider implements NarrativeProvider {
  name = "deterministic-fallback";

  async generate(report: ReportViewModel) {
    const sections = report.sections.map((section, index) =>
      index === 1
        ? {
            ...section,
            body:
              report.score.band === "green"
                ? "Signals are positive and supported by the uploaded evidence for this reporting scope."
                : report.score.band === "yellow"
                  ? "Signals are mixed. The uploaded evidence shows progress alongside areas that need follow-through."
                  : "Signals indicate meaningful friction or weak consistency in the current reporting scope.",
          }
        : section,
    );

    return {
      subtitle: `${report.subtitle} Narrative phrasing is grounded in validated inputs.`,
      sections,
    };
  }
}

export function getNarrativeProvider(): NarrativeProvider {
  return new DeterministicNarrativeProvider();
}
