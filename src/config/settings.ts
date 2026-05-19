import * as vscode from "vscode";
import type { ProjectClassmateConfig } from "../types";

const DEFAULTS: ProjectClassmateConfig = {
  llm: { provider: "openai", model: "gpt-4o", endpoint: "" },
  analysis: { maxDepth: "module", includeTests: true, maxFileSize: 5000 },
  ui: { language: "zh" },
};

export function getConfig(): ProjectClassmateConfig {
  const ws = vscode.workspace.getConfiguration("projectclassmate");
  return {
    llm: {
      provider: ws.get("llm.provider", DEFAULTS.llm.provider) as any,
      model: ws.get("llm.model", DEFAULTS.llm.model),
      endpoint: ws.get("llm.endpoint", DEFAULTS.llm.endpoint),
    },
    analysis: {
      maxDepth: ws.get("analysis.maxDepth", DEFAULTS.analysis.maxDepth) as any,
      includeTests: ws.get("analysis.includeTests", DEFAULTS.analysis.includeTests),
      maxFileSize: ws.get("analysis.maxFileSize", DEFAULTS.analysis.maxFileSize),
    },
    ui: { language: ws.get("ui.language", DEFAULTS.ui.language) as any },
  };
}

export async function getApiKey(provider: string): Promise<string | undefined> {
  return vscode.workspace.getConfiguration("projectclassmate").get(`llm.apiKeys.${provider}`) as string || undefined;
}

export async function setApiKey(provider: string, key: string): Promise<void> {
  await vscode.workspace.getConfiguration("projectclassmate").update(
    `llm.apiKeys.${provider}`, key, vscode.ConfigurationTarget.Global
  );
}

export function getReportLanguage(): "zh" | "en" { return getConfig().ui.language; }
