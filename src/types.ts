import * as vscode from "vscode";

export type ExtensionMessage =
  | { type: "phase"; phase: "scanning" | "llm" | "extension" | "done" }
  | { type: "static-result"; payload: StaticAnalysisResult }
  | { type: "report-chunk"; section: ReportSection; content: string }
  | { type: "extensions"; items: TechExtension[] }
  | { type: "error"; message: string };

export type WebviewMessage =
  | { type: "ready" }
  | { type: "ask"; question: string; context?: string }
  | { type: "expand-tech"; techName: string };

export type ReportSection = "overview" | "architecture" | "modules" | "difficulty" | "extensions";

export interface StaticAnalysisResult {
  projectName: string; projectRoot: string; modules: ModuleInfo[];
  dependencies: DependencyInfo[]; entryFiles: string[];
  stats: ProjectStats; patterns: PatternTag[];
}

export interface ModuleInfo {
  name: string; files: string[]; classes: ClassSummary[];
  functions: FuncSummary[]; lineCount: number; docSummary?: string;
}

export interface ClassSummary {
  name: string; methods: string[]; bases: string[];
  decorators: string[]; lineCount: number;
}

export interface FuncSummary {
  name: string; decorators: string[]; lineCount: number; doc?: string;
}

export interface DependencyInfo {
  name: string; version?: string;
  category: "web" | "database" | "ai-ml" | "testing" | "dev-tool" | "cli" | "async" | "other";
}

export interface ProjectStats {
  totalFiles: number; totalLines: number; totalClasses: number;
  totalFunctions: number; testFiles: number;
}

export interface PatternTag { pattern: string; location: string; detail: string; }

export interface TechExtension {
  techName: string; relation: "upgrade" | "alternative" | "complement" | "infrastructure";
  summary: string; learnMoreUrl?: string;
}

export interface LLMProviderConfig { provider: string; model: string; endpoint?: string; apiKey: string; }
export interface LLMMessage { role: "system" | "user" | "assistant"; content: string; }
export type StreamCallback = (chunk: string) => void;
export interface LLMProvider {
  name: string;
  chat(messages: LLMMessage[], onChunk?: StreamCallback): Promise<string>;
  chatStream(messages: LLMMessage[], onChunk: StreamCallback): Promise<string>;
}

export interface ProjectClassmateConfig {
  llm: { provider: "openai" | "anthropic" | "ollama" | "custom"; model: string; endpoint: string; };
  analysis: { maxDepth: "module" | "function"; includeTests: boolean; maxFileSize: number; };
  ui: { language: "zh" | "en"; };
}
