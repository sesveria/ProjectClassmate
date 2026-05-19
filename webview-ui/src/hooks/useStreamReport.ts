import { useState, useEffect, useCallback } from "react";
import type { ExtensionMessage, StaticAnalysisResult, TechExtension, ReportSection } from "../types";

interface ReportState {
  phase: "idle" | "scanning" | "llm" | "extension" | "done" | "error";
  staticResult: StaticAnalysisResult | null;
  sections: Record<ReportSection, string>;
  extensions: TechExtension[];
  error: string | null;
}

export function useStreamReport() {
  const [state, setState] = useState<ReportState>({
    phase: "idle", staticResult: null,
    sections: { overview: "", architecture: "", modules: "", difficulty: "", extensions: "" },
    extensions: [], error: null,
  });

  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionMessage>) => {
      const msg = event.data;
      if (!msg || typeof msg.type !== "string") return;
      switch (msg.type) {
        case "phase": setState(prev => ({ ...prev, phase: msg.phase })); break;
        case "static-result": setState(prev => ({ ...prev, staticResult: msg.payload })); break;
        case "report-chunk": setState(prev => ({ ...prev, sections: { ...prev.sections, [msg.section]: prev.sections[msg.section] + msg.content } })); break;
        case "extensions": setState(prev => ({ ...prev, extensions: msg.items })); break;
        case "error": setState(prev => ({ ...prev, phase: "error", error: msg.message })); break;
      }
    };
    window.addEventListener("message", handler);
    window.acquireVsCodeApi().postMessage({ type: "ready" });
    return () => window.removeEventListener("message", handler);
  }, []);

  const sendAsk = useCallback((question: string, context?: string) => {
    window.acquireVsCodeApi().postMessage({ type: "ask", question, context });
  }, []);

  const sendExpandTech = useCallback((techName: string) => {
    window.acquireVsCodeApi().postMessage({ type: "expand-tech", techName });
  }, []);

  return { ...state, sendAsk, sendExpandTech };
}
