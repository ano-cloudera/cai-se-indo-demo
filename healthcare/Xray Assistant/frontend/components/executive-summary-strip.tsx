import type { InferenceResponse } from "../lib/api";

interface ExecutiveSummaryStripProps {
  result: InferenceResponse | null;
}

function formatSeverity(severity: string | undefined) {
  if (!severity) return "Pending";
  return `${severity.charAt(0).toUpperCase()}${severity.slice(1)}`;
}

export function ExecutiveSummaryStrip({ result }: ExecutiveSummaryStripProps) {
  if (!result) return null;

  return (
    <section className="executive-strip">
      <div className="executive-strip__item">
        <span className="executive-strip__label">Primary Finding</span>
        <p className="executive-strip__value">{result.finding}</p>
      </div>
      <div className="executive-strip__item">
        <span className="executive-strip__label">Review Priority</span>
        <p className="executive-strip__value">{formatSeverity(result.severity)}</p>
      </div>
      <div className="executive-strip__item executive-strip__item--wide">
        <span className="executive-strip__label">Clinical Impression</span>
        <p className="executive-strip__copy">{result.summary}</p>
      </div>
    </section>
  );
}
