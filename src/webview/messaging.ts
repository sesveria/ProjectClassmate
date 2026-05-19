import type { ExtensionMessage, StaticAnalysisResult, TechExtension, ReportSection } from "../types";

export function createPhaseMessage(phase: "scanning" | "llm" | "extension" | "done"): ExtensionMessage {
  return { type: "phase", phase };
}
export function createStaticResultMessage(payload: StaticAnalysisResult): ExtensionMessage {
  return { type: "static-result", payload };
}
export function createReportChunkMessage(section: ReportSection, content: string): ExtensionMessage {
  return { type: "report-chunk", section, content };
}
export function createExtensionsMessage(items: TechExtension[]): ExtensionMessage {
  return { type: "extensions", items };
}
export function createErrorMessage(message: string): ExtensionMessage {
  return { type: "error", message };
}
export function isWebviewMessage(data: unknown): data is import("../types").WebviewMessage {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return typeof d.type === "string" && ["ready", "ask", "expand-tech"].includes(d.type);
}
