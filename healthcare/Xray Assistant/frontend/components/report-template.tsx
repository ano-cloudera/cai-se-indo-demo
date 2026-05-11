"use client";

import { forwardRef } from "react";

import type { InferenceResponse } from "../lib/api";

interface ReportTemplateProps {
  result: InferenceResponse;
  previewUrl: string | null;
  timestamp: string;
}

function severityColor(severity: string | undefined): string {
  switch ((severity ?? "").toLowerCase()) {
    case "high": return "#fff0f0";
    case "medium": return "#fffbe6";
    case "low": return "#f0fdf4";
    default: return "#f4f6fb";
  }
}

function severityBorder(severity: string | undefined): string {
  switch ((severity ?? "").toLowerCase()) {
    case "high": return "#fca5a5";
    case "medium": return "#fcd34d";
    case "low": return "#86efac";
    default: return "#e6e9f2";
  }
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.85) return "#f0fdf4";
  if (confidence >= 0.6) return "#fffbe6";
  return "#fff0f0";
}

function confidenceBorder(confidence: number): string {
  if (confidence >= 0.85) return "#86efac";
  if (confidence >= 0.6) return "#fcd34d";
  return "#fca5a5";
}

export const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateProps>(
  function ReportTemplate({ result, previewUrl, timestamp }, ref) {
    const imageUrl = result.annotated_image_path ?? previewUrl;
    const confidencePct = Math.round(result.confidence * 100);

    return (
      <div
        ref={ref}
        style={{
          width: "900px",
          backgroundColor: "#ffffff",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontSize: "14px",
          color: "#191c1f",
          lineHeight: "1.5",
        }}
      >
        {/* Header */}
        <div style={{
          backgroundColor: "#08004d",
          padding: "24px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span style={{
                fontFamily: "'Outfit', 'Segoe UI', sans-serif",
                fontSize: "22px",
                fontWeight: "800",
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}>
                Xray Assist
              </span>
              <span style={{ color: "#8f94ff", fontSize: "13px" }}>·</span>
              <span style={{ color: "#c5c7ff", fontSize: "13px", fontWeight: "500" }}>
                Cloudera Healthcare Demo
              </span>
            </div>
            <div style={{ display: "flex", gap: "24px" }}>
              <div>
                <span style={{ color: "#8f94ff", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em" }}>Case ID</span>
                <p style={{ color: "#ffffff", fontSize: "14px", fontWeight: "700", margin: "2px 0 0" }}>{result.case_id}</p>
              </div>
              <div>
                <span style={{ color: "#8f94ff", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em" }}>Generated</span>
                <p style={{ color: "#ffffff", fontSize: "14px", fontWeight: "700", margin: "2px 0 0" }}>{timestamp}</p>
              </div>
              <div>
                <span style={{ color: "#8f94ff", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em" }}>Model</span>
                <p style={{ color: "#ffffff", fontSize: "14px", fontWeight: "700", margin: "2px 0 0" }}>{result.model_info.name} v{result.model_info.version}</p>
              </div>
            </div>
          </div>
          <div style={{
            backgroundColor: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "10px",
            padding: "8px 14px",
            textAlign: "right",
          }}>
            <p style={{ color: "#ffb347", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.14em", margin: 0 }}>⚠ Demo Only</p>
            <p style={{ color: "#c5c7ff", fontSize: "11px", margin: "3px 0 0" }}>Not for clinical use</p>
          </div>
        </div>

        {/* Accent line */}
        <div style={{ height: "3px", background: "linear-gradient(90deg, #6970ff 0%, #5c63f2 100%)" }} />

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", padding: "20px 32px 0" }}>
          {/* Finding */}
          <div style={{
            border: "1px solid #e6e9f2",
            borderRadius: "14px",
            padding: "14px 16px",
            backgroundColor: "#f8f9fd",
          }}>
            <p style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", color: "#656774", margin: 0 }}>Finding</p>
            <p style={{ fontSize: "18px", fontWeight: "700", color: "#191c1f", margin: "6px 0 0", textTransform: "capitalize", fontFamily: "'Outfit', sans-serif" }}>
              {result.finding || "—"}
            </p>
          </div>
          {/* Confidence */}
          <div style={{
            border: `1px solid ${confidenceBorder(result.confidence)}`,
            borderRadius: "14px",
            padding: "14px 16px",
            backgroundColor: confidenceColor(result.confidence),
          }}>
            <p style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", color: "#656774", margin: 0 }}>Confidence</p>
            <p style={{ fontSize: "18px", fontWeight: "700", color: "#191c1f", margin: "6px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>
              {confidencePct}%
            </p>
          </div>
          {/* Severity */}
          <div style={{
            border: `1px solid ${severityBorder(result.severity)}`,
            borderRadius: "14px",
            padding: "14px 16px",
            backgroundColor: severityColor(result.severity),
          }}>
            <p style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", color: "#656774", margin: 0 }}>Severity</p>
            <p style={{ fontSize: "18px", fontWeight: "700", color: "#191c1f", margin: "6px 0 0", textTransform: "capitalize", fontFamily: "'Outfit', sans-serif" }}>
              {result.severity || "—"}
            </p>
          </div>
          {/* Status */}
          <div style={{
            border: "1px solid #86efac",
            borderRadius: "14px",
            padding: "14px 16px",
            backgroundColor: "#f0fdf4",
          }}>
            <p style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", color: "#656774", margin: 0 }}>Status</p>
            <p style={{ fontSize: "18px", fontWeight: "700", color: "#191c1f", margin: "6px 0 0", textTransform: "capitalize", fontFamily: "'Outfit', sans-serif" }}>
              {result.status || "—"}
            </p>
          </div>
        </div>

        {/* Image */}
        <div style={{ padding: "20px 32px 0" }}>
          <p style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.14em", color: "#656774", marginBottom: "10px" }}>
            Analysis Result Image
          </p>
          {imageUrl ? (
            <div style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid #e6e9f2", backgroundColor: "#f4f6fb", textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="X-ray analysis result"
                crossOrigin="anonymous"
                style={{ maxWidth: "100%", maxHeight: "340px", objectFit: "contain", display: "block", margin: "0 auto" }}
              />
            </div>
          ) : (
            <div style={{ borderRadius: "16px", border: "1px dashed #cbd1e1", backgroundColor: "#f4f6fb", padding: "40px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
              No annotated image available for this result.
            </div>
          )}
        </div>

        {/* Clinical Summary */}
        <div style={{ padding: "20px 32px 0" }}>
          <p style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.14em", color: "#656774", marginBottom: "8px" }}>
            Clinical Summary
          </p>
          <div style={{ backgroundColor: "#f8f9fd", border: "1px solid #e6e9f2", borderRadius: "14px", padding: "16px 18px" }}>
            <p style={{ fontSize: "14px", lineHeight: "1.75", color: "#3f4350", margin: 0 }}>{result.summary}</p>
          </div>
        </div>

        {/* Clinical Interpretation */}
        <div style={{ padding: "16px 32px 0" }}>
          <p style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.14em", color: "#656774", marginBottom: "8px" }}>
            Clinical Interpretation
          </p>
          <div style={{ backgroundColor: "#eef7ff", border: "1px solid #bfd6fb", borderRadius: "14px", padding: "16px 18px" }}>
            <p style={{ fontSize: "14px", lineHeight: "1.75", color: "#3f4350", margin: 0 }}>{result.explanation}</p>
          </div>
        </div>

        {/* Findings Table */}
        {result.detections.length > 0 && (
          <div style={{ padding: "16px 32px 0" }}>
            <p style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.14em", color: "#656774", marginBottom: "8px" }}>
              Findings Overview
            </p>
            <div style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid #e6e9f2" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f4f6fb" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: "600", color: "#191c1f", borderBottom: "1px solid #e6e9f2" }}>Finding</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: "600", color: "#191c1f", borderBottom: "1px solid #e6e9f2" }}>Confidence</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: "600", color: "#191c1f", borderBottom: "1px solid #e6e9f2" }}>Review Note</th>
                  </tr>
                </thead>
                <tbody>
                  {result.detections.map((item, index) => (
                    <tr key={`${item.label}-${index}`} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8f9fd" }}>
                      <td style={{ padding: "10px 16px", color: "#191c1f", textTransform: "capitalize", borderBottom: "1px solid #e6e9f2" }}>{item.label}</td>
                      <td style={{ padding: "10px 16px", color: "#3f4350", fontFamily: "'JetBrains Mono', monospace", borderBottom: "1px solid #e6e9f2" }}>{Math.round(item.confidence * 100)}%</td>
                      <td style={{ padding: "10px 16px", color: "#3f4350", borderBottom: "1px solid #e6e9f2" }}>
                        {item.label} flagged for clinical review support at {Math.round(item.confidence * 100)}% confidence.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {result.action_items.length > 0 && (
          <div style={{ padding: "16px 32px 0" }}>
            <p style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.14em", color: "#656774", marginBottom: "8px" }}>
              Recommended Actions
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {result.action_items.map((item, index) => (
                <div key={index} style={{
                  display: "flex", alignItems: "flex-start", gap: "12px",
                  backgroundColor: "#f8f9fd", border: "1px solid #e6e9f2",
                  borderRadius: "12px", padding: "12px 16px",
                }}>
                  <span style={{
                    flexShrink: 0, width: "24px", height: "24px",
                    borderRadius: "50%", backgroundColor: "#e3e4ff",
                    color: "#5c63f2", fontSize: "12px", fontWeight: "700",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {index + 1}
                  </span>
                  <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#3f4350", margin: 0 }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          margin: "24px 32px 0",
          padding: "14px 18px",
          backgroundColor: "#fff8f0",
          border: "1px solid #fed7aa",
          borderRadius: "12px",
          marginBottom: "32px",
        }}>
          <p style={{ fontSize: "11px", color: "#92400e", margin: 0, lineHeight: "1.6" }}>
            <strong>⚠ Disclaimer:</strong> This report is generated by an AI-assisted demonstration system and is intended for review support only. It does not constitute a medical diagnosis and should not be used as the sole basis for clinical decision-making. Always correlate findings with clinical context and consult a qualified radiologist.
          </p>
        </div>
      </div>
    );
  }
);
