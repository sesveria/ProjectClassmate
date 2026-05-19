import { runStaticAnalysis } from "./static-analyzer";
import { buildSystemPrompt, buildUserPrompt, buildExtensionPrompt, buildAskPrompt } from "./prompt-builder";
import { createProvider } from "../llm/provider";
import { getConfig, getApiKey } from "../config/settings";
import type { StaticAnalysisResult, TechExtension, LLMProvider, LLMMessage, ReportSection } from "../types";

export interface PipelineCallbacks {
  onPhase: (phase: "scanning" | "llm" | "extension" | "done") => void;
  onStaticResult: (result: StaticAnalysisResult) => void;
  onReportChunk: (section: ReportSection, content: string) => void;
  onExtensions: (exts: TechExtension[]) => void;
  onError: (message: string) => void;
}

export async function runFullAnalysis(rootPath: string, cbs: PipelineCallbacks): Promise<void> {
  try {
    cbs.onPhase("scanning");
    const staticResult = await runStaticAnalysis(rootPath);
    cbs.onStaticResult(staticResult);

    const config = getConfig();
    const apiKey = await getApiKey(config.llm.provider);
    if (!apiKey) { cbs.onError(`请先设置 ${config.llm.provider} 的 API Key (命令: ProjectClassmate: 设置 API Key)`); return; }

    const provider = createProvider({ provider: config.llm.provider, model: config.llm.model, endpoint: config.llm.endpoint || "", apiKey });
    cbs.onPhase("llm");

    const messages: LLMMessage[] = [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(staticResult) },
    ];

    await streamReport(provider, messages, cbs);

    cbs.onPhase("extension");
    const extPrompt = buildExtensionPrompt(staticResult);
    const extMessages: LLMMessage[] = [
      { role: "system", content: "你是一个技术趋势分析师。输出严格的 JSON 数组。" },
      { role: "user", content: extPrompt },
    ];
    const extensions = await fetchExtensions(provider, extMessages);
    cbs.onExtensions(extensions);
    cbs.onPhase("done");
  } catch (err: any) { cbs.onError(err.message ?? String(err)); }
}

async function streamReport(provider: LLMProvider, messages: LLMMessage[], cbs: PipelineCallbacks): Promise<string> {
  let currentSection: ReportSection | null = null;
  let sectionBuffer = "";

  return provider.chatStream(messages, (chunk) => {
    sectionBuffer += chunk;
    const markerMatch = sectionBuffer.match(/\[SECTION:(\w+)\]/);
    if (markerMatch) {
      const idx = sectionBuffer.indexOf(markerMatch[0]);
      const before = sectionBuffer.slice(0, idx).trim();
      if (before && currentSection) cbs.onReportChunk(currentSection, before);
      const ns = markerMatch[1] as ReportSection;
      if (ns !== "extensions") currentSection = ns;
      else currentSection = null;
      sectionBuffer = sectionBuffer.slice(idx + markerMatch[0].length);
    } else if (sectionBuffer.length > 200 && currentSection) {
      const lastNl = sectionBuffer.lastIndexOf("\n\n");
      const lastPd = sectionBuffer.lastIndexOf("。");
      const sp = Math.max(lastNl, lastPd);
      if (sp > 50) {
        cbs.onReportChunk(currentSection, sectionBuffer.slice(0, sp + 1));
        sectionBuffer = sectionBuffer.slice(sp + 1);
      }
    }
  });
}

async function fetchExtensions(provider: LLMProvider, messages: LLMMessage[]): Promise<TechExtension[]> {
  try {
    const raw = await provider.chat(messages);
    const m = raw.match(/\[[\s\S]*\]/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      if (Array.isArray(parsed)) return parsed.slice(0, 5).map((i: any) => ({
        techName: i.techName ?? i.tech_name ?? "", relation: i.relation ?? "complement",
        summary: i.summary ?? "", learnMoreUrl: i.learnMoreUrl ?? i.learn_more_url,
      }));
    }
  } catch {}
  return [];
}

export async function handleAskQuestion(question: string, context?: string): Promise<string> {
  const config = getConfig();
  const apiKey = await getApiKey(config.llm.provider);
  if (!apiKey) throw new Error("API Key 未配置");
  const provider = createProvider({ provider: config.llm.provider, model: config.llm.model, endpoint: config.llm.endpoint || "", apiKey });
  return provider.chat([
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildAskPrompt(question, context) },
  ]);
}
