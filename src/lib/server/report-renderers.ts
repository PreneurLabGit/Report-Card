import type { ReportViewModel } from "@/lib/domain";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderReportEmailHtml(report: ReportViewModel) {
  const sections = report.sections
    .filter((section) => section.availability !== "hidden")
    .map((section) => {
      const bullets = section.bullets?.length
        ? `<ul style="margin:12px 0 0 18px;padding:0;">${section.bullets.map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`).join("")}</ul>`
        : "";
      const body =
        section.tone === "quote"
          ? `<blockquote style="margin:0;padding:12px 16px;border-left:4px solid #2563eb;background:#eff6ff;">${escapeHtml(section.body)}</blockquote>`
          : `<p style="margin:0;">${escapeHtml(section.body)}</p>`;
      const callout = section.callout ? `<p style="margin:10px 0 0;color:#6b7280;font-size:12px;">${escapeHtml(section.callout)}</p>` : "";
      return `
        <section style="margin:0 0 24px;">
          <h3 style="margin:0 0 10px;font-size:16px;color:#111827;">${escapeHtml(section.title)}</h3>
          ${body}
          ${callout}
          ${bullets}
        </section>
      `;
    })
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f9fafb;font-family:Roboto,Arial,sans-serif;color:#111827;">
    <main style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
      <p style="margin:0 0 8px;color:#2563eb;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Salthub Report Card</p>
      <h1 style="margin:0 0 6px;font-size:26px;">${escapeHtml(report.title)}</h1>
      <p style="margin:0 0 24px;color:#6b7280;">${escapeHtml(report.subtitle)}</p>
      ${sections}
    </main>
  </body>
</html>`;
}
