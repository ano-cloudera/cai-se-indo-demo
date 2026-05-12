"use client";

import { forwardRef } from "react";

import type { InferenceResponse } from "../lib/api";

interface ReportTemplateProps {
  result: InferenceResponse;
  previewUrl: string | null;
  timestamp: string;
}

function severityBg(severity: string | undefined): string {
  switch ((severity ?? "").toLowerCase()) {
    case "high":   return "#fff0f0";
    case "medium": return "#fffbe6";
    case "low":    return "#f0fdf4";
    default:       return "#f4f6fb";
  }
}

function severityBorder(severity: string | undefined): string {
  switch ((severity ?? "").toLowerCase()) {
    case "high":   return "#fca5a5";
    case "medium": return "#fcd34d";
    case "low":    return "#86efac";
    default:       return "#e6e9f2";
  }
}

function severityLabel(severity: string | undefined): string {
  const s = (severity ?? "").toLowerCase();
  if (s === "high")   return "High Priority";
  if (s === "medium") return "Moderate";
  if (s === "low")    return "Low";
  return "—";
}

function confidenceBg(c: number): string {
  if (c >= 0.85) return "#f0fdf4";
  if (c >= 0.6)  return "#fffbe6";
  return "#fff0f0";
}

function confidenceBorder(c: number): string {
  if (c >= 0.85) return "#86efac";
  if (c >= 0.6)  return "#fcd34d";
  return "#fca5a5";
}

function capitalize(s: string): string {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function formatCaseId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "18px 32px 0" }}>
      <p style={{
        fontSize: "9px",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        color: "#9197a6",
        margin: "0 0 8px",
        borderBottom: "1px solid #eaecf2",
        paddingBottom: "6px",
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

export const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateProps>(
  function ReportTemplate({ result, previewUrl, timestamp }, ref) {
    const imageUrl = result.annotated_image_path ?? previewUrl;
    const confidencePct = Math.round(result.confidence * 100);
    const shortCaseId = formatCaseId(result.case_id);

    return (
      <div
        ref={ref}
        style={{
          width: "900px",
          backgroundColor: "#ffffff",
          fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
          fontSize: "13px",
          color: "#1a1d23",
          lineHeight: "1.55",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          backgroundColor: "#08004d",
          padding: "22px 32px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}>
          {/* Left: brand + meta */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{
                fontSize: "20px",
                fontWeight: "800",
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}>
                Xray Assist
              </span>
              <span style={{ color: "#6e74c8", fontSize: "13px" }}>·</span>
              <span style={{ color: "#a5a9f0", fontSize: "12px", fontWeight: "500" }}>
                Cloudera AI Healthcare Demo
              </span>
            </div>
            <div style={{ display: "flex", gap: "28px" }}>
              <div>
                <p style={{ color: "#7a7fc8", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>Case Reference</p>
                <p style={{ color: "#ffffff", fontSize: "14px", fontWeight: "700", margin: "3px 0 0", letterSpacing: "0.04em" }}>{shortCaseId}</p>
              </div>
              <div>
                <p style={{ color: "#7a7fc8", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>Report Date</p>
                <p style={{ color: "#ffffff", fontSize: "14px", fontWeight: "700", margin: "3px 0 0" }}>{timestamp}</p>
              </div>
              <div>
                <p style={{ color: "#7a7fc8", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>Analysis Engine</p>
                <p style={{ color: "#ffffff", fontSize: "14px", fontWeight: "700", margin: "3px 0 0" }}>Chest X-Ray AI v1.0</p>
              </div>
              <div>
                <p style={{ color: "#7a7fc8", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>Study Type</p>
                <p style={{ color: "#ffffff", fontSize: "14px", fontWeight: "700", margin: "3px 0 0" }}>Chest Radiograph (PA)</p>
              </div>
            </div>
          </div>

          {/* Right: demo badge */}
          <div style={{
            backgroundColor: "rgba(255,179,71,0.12)",
            border: "1px solid rgba(255,179,71,0.35)",
            borderRadius: "10px",
            padding: "10px 16px",
            textAlign: "center",
            minWidth: "120px",
          }}>
            <p style={{ color: "#ffb347", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.14em", margin: 0 }}>⚠ Demo Only</p>
            <p style={{ color: "#c5c7ff", fontSize: "10px", margin: "4px 0 0", lineHeight: "1.4" }}>Not for clinical<br />decision-making</p>
          </div>
        </div>

        {/* Accent line */}
        <div style={{ height: "3px", background: "linear-gradient(90deg, #5c63f2 0%, #8f94ff 100%)" }} />

        {/* ── Key Findings Bar ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", padding: "18px 32px 0" }}>
          {/* Primary Finding */}
          <div style={{ border: "1px solid #e6e9f2", borderRadius: "14px", padding: "14px 16px", backgroundColor: "#f8f9fd" }}>
            <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em", color: "#9197a6", margin: 0 }}>Primary Finding</p>
            <p style={{ fontSize: "17px", fontWeight: "700", color: "#1a1d23", margin: "6px 0 0", textTransform: "capitalize" }}>
              {capitalize(result.finding)}
            </p>
          </div>

          {/* Confidence */}
          <div style={{ border: `1px solid ${confidenceBorder(result.confidence)}`, borderRadius: "14px", padding: "14px 16px", backgroundColor: confidenceBg(result.confidence) }}>
            <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em", color: "#9197a6", margin: 0 }}>Model Confidence</p>
            <p style={{ fontSize: "17px", fontWeight: "700", color: "#1a1d23", margin: "6px 0 0" }}>
              {confidencePct}%
            </p>
          </div>

          {/* Severity */}
          <div style={{ border: `1px solid ${severityBorder(result.severity)}`, borderRadius: "14px", padding: "14px 16px", backgroundColor: severityBg(result.severity) }}>
            <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em", color: "#9197a6", margin: 0 }}>Clinical Priority</p>
            <p style={{ fontSize: "17px", fontWeight: "700", color: "#1a1d23", margin: "6px 0 0" }}>
              {severityLabel(result.severity)}
            </p>
          </div>

          {/* Review Status */}
          <div style={{ border: "1px solid #86efac", borderRadius: "14px", padding: "14px 16px", backgroundColor: "#f0fdf4" }}>
            <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em", color: "#9197a6", margin: 0 }}>Review Status</p>
            <p style={{ fontSize: "17px", fontWeight: "700", color: "#1a1d23", margin: "6px 0 0" }}>
              Pending Review
            </p>
          </div>
        </div>

        {/* ── Annotated Image ── */}
        <Section title="Radiograph — AI Annotated View">
          {imageUrl ? (
            <div style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid #e6e9f2", backgroundColor: "#0a0a0a", textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Annotated chest X-ray"
                crossOrigin="anonymous"
                style={{ maxWidth: "100%", maxHeight: "360px", objectFit: "contain", display: "block", margin: "0 auto" }}
              />
            </div>
          ) : (
            <div style={{ borderRadius: "14px", border: "1px dashed #cbd1e1", backgroundColor: "#f4f6fb", padding: "48px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
              Annotated image not available for this study.
            </div>
          )}
        </Section>

        {/* ── Impression / Clinical Summary ── */}
        <Section title="Radiological Impression">
          <div style={{ backgroundColor: "#f8f9fd", border: "1px solid #e6e9f2", borderRadius: "12px", padding: "14px 18px" }}>
            <p style={{ fontSize: "13px", lineHeight: "1.8", color: "#2e3240", margin: 0 }}>{result.summary}</p>
          </div>
        </Section>

        {/* ── Clinical Interpretation ── */}
        <Section title="Clinical Interpretation">
          <div style={{ backgroundColor: "#f0f4ff", border: "1px solid #c7d4fd", borderRadius: "12px", padding: "14px 18px" }}>
            <p style={{ fontSize: "13px", lineHeight: "1.8", color: "#2e3240", margin: 0 }}>{result.explanation}</p>
          </div>
        </Section>

        {/* ── Findings Table ── */}
        {result.detections.length > 0 && (
          <Section title="Detected Findings">
            <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e6e9f2" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f4f6fb" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: "600", color: "#3f4350", borderBottom: "1px solid #e6e9f2", width: "22%" }}>Finding</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: "600", color: "#3f4350", borderBottom: "1px solid #e6e9f2", width: "16%" }}>Confidence</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: "600", color: "#3f4350", borderBottom: "1px solid #e6e9f2", width: "14%" }}>Priority</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: "600", color: "#3f4350", borderBottom: "1px solid #e6e9f2" }}>Clinical Note</th>
                  </tr>
                </thead>
                <tbody>
                  {result.detections.map((item, index) => (
                    <tr key={`${item.label}-${index}`} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8f9fd" }}>
                      <td style={{ padding: "10px 16px", color: "#1a1d23", textTransform: "capitalize", fontWeight: "600", borderBottom: "1px solid #eaecf2" }}>{capitalize(item.label)}</td>
                      <td style={{ padding: "10px 16px", color: "#3f4350", borderBottom: "1px solid #eaecf2" }}>{Math.round(item.confidence * 100)}%</td>
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #eaecf2" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "10px",
                          fontWeight: "700",
                          backgroundColor: severityBg(item.confidence >= 0.85 ? "high" : item.confidence >= 0.6 ? "medium" : "low"),
                          color: item.confidence >= 0.85 ? "#b91c1c" : item.confidence >= 0.6 ? "#92400e" : "#166534",
                        }}>
                          {item.confidence >= 0.85 ? "High" : item.confidence >= 0.6 ? "Moderate" : "Low"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", color: "#5a5f72", borderBottom: "1px solid #eaecf2" }}>
                        Requires clinical correlation and specialist review.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── Recommended Actions ── */}
        {result.action_items.length > 0 && (
          <Section title="Recommended Next Steps">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {result.action_items.map((item, index) => (
                <div key={index} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  backgroundColor: "#f8f9fd",
                  border: "1px solid #e6e9f2",
                  borderRadius: "10px",
                  padding: "11px 16px",
                }}>
                  <span style={{
                    flexShrink: 0,
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    backgroundColor: "#e3e4ff",
                    color: "#4f56d9",
                    fontSize: "11px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {index + 1}
                  </span>
                  <p style={{ fontSize: "12px", lineHeight: "1.65", color: "#3a3f52", margin: 0 }}>{item}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Disclaimer Footer ── */}
        <div style={{
          margin: "20px 32px 0",
          padding: "13px 18px",
          backgroundColor: "#fffbf0",
          border: "1px solid #f5d87a",
          borderRadius: "10px",
          marginBottom: "32px",
        }}>
          <p style={{ fontSize: "10px", color: "#78500a", margin: 0, lineHeight: "1.65" }}>
            <strong>Clinical Disclaimer:</strong> This report is produced by an AI-assisted demonstration system (Cloudera AI) and is intended solely for educational and review support purposes. It does not constitute a medical diagnosis and must not be used as the basis for clinical decision-making without validation by a qualified radiologist or licensed medical professional. All findings require appropriate clinical correlation.
          </p>
        </div>

        {/* ── Report Footer Bar ── */}
        <div style={{
          borderTop: "1px solid #e6e9f2",
          padding: "10px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#f8f9fd",
          marginBottom: 0,
        }}>
          <p style={{ fontSize: "10px", color: "#9197a6", margin: 0 }}>
            Xray Assist · Cloudera AI Healthcare Demo · AI-generated report for review support
          </p>
          <p style={{ fontSize: "10px", color: "#9197a6", margin: 0 }}>
            Ref: {shortCaseId} · {timestamp}
          </p>
        </div>
      </div>
    );
  }
);
