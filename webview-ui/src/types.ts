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
export type ReportSection = "overview" | "architecture" | "modules" | "difficulty" | "extensions";
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
export const CATEGORY_LABELS: Record<string, string> = {
  web: "Web 框架", database: "数据库", "ai-ml": "AI/ML", testing: "测试",
  "dev-tool": "开发工具", cli: "命令行", async: "异步/任务队列", other: "其他",
};
export const PHASE_LABELS: Record<string, string> = {
  scanning: "🔍 正在扫描项目结构...", llm: "🤖 AI 正在分析...",
  extension: "📚 正在生成延申推荐...", done: "✅ 分析完成",
};
declare global { interface Window { acquireVsCodeApi: () => VsCodeApi; } }
export interface VsCodeApi {
  postMessage(message: WebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}
