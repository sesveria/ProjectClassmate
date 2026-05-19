import type { StaticAnalysisResult, LLMMessage } from "../types";
import { getReportLanguage } from "../config/settings";

export function buildSystemPrompt(): string {
  const lang = getReportLanguage();
  if (lang === "zh") {
    return `你是一位资深的编程导师和技术教育家。你的任务是为初学者分析一个 Python 项目，以教学式的方式帮助他们理解项目的全貌。

## 输出风格
1. 教学式: 像老师在课堂上讲解一样，解释概念和设计决策
2. 结构化: 使用清晰的标题、分点说明技术栈和模块
3. 循序渐进: 从整体到局部，先理解大图景再看细节
4. 实用导向: 指出真实的难点和学习要点

## 输出格式
请按以下章节顺序逐章输出（每章用 [SECTION:章节名] 标记开始）：

### [SECTION:overview] 项目概览
- 一句话描述这个项目是做什么的
- 项目的核心价值/目标
- 适合什么样的学习者

### [SECTION:architecture] 架构设计
- 整体架构模式（MVC、分层、微服务等）
- 各层职责说明
- 数据流向简述
- 初学者容易困惑的架构点

### [SECTION:modules] 模块详解
- 每个主要模块的功能和职责
- 关键类/函数的作用
- 模块之间的依赖关系
- 学习阅读顺序建议

### [SECTION:difficulty] 学习难点与技巧
- 项目中需要重点理解的难点
- 可能踩到的坑
- 建议的学习路径
- 推荐的预备知识

### [SECTION:extensions] 延申学习
- 基于本项目技术栈推荐 3-5 个可延申学习的方向
- 每个推荐包含：技术名、与本项目的关系、为何值得学

请严格遵循以上格式。每个 [SECTION:] 必须在单独一行开始。`;
  }
  return `You are a senior programming mentor...`;
}

export function buildUserPrompt(analysis: StaticAnalysisResult): string {
  const lang = getReportLanguage();
  const depGroups = groupByCategory(analysis.dependencies);
  const statsStr = `总文件数: ${analysis.stats.totalFiles}\n总代码行: ${analysis.stats.totalLines}\n总类数: ${analysis.stats.totalClasses}\n总函数数: ${analysis.stats.totalFunctions}\n测试文件: ${analysis.stats.testFiles}`;
  const modulesStr = analysis.modules.map(m => `模块: ${m.name}\n  文件: ${m.files.join(", ")}\n  类 (${m.classes.length}): ${m.classes.map(c => `${c.name}(${c.methods.length}方法)` + (c.bases.length ? ` extends ${c.bases.join(",")}` : "")).join("; ") || "无"}\n  顶层函数 (${m.functions.length}): ${m.functions.map(f => f.name + (f.doc ? ` - ${f.doc}` : "")).join("; ") || "无"}\n  代码行: ${m.lineCount}`).join("\n");
  const depsStr = Object.entries(depGroups).map(([cat, deps]) => `${cat}: ${deps.map(d => d.name + (d.version ? `(${d.version})` : "")).join(", ")}`).join("\n");
  const patternsStr = analysis.patterns.map(p => `  - [${p.pattern}] ${p.location}: ${p.detail}`).join("\n");
  const entriesStr = analysis.entryFiles.join(", ");

  if (lang === "zh") {
    return `请分析以下 Python 项目。\n\n## 项目基本信息\n- 项目名: ${analysis.projectName}\n- 入口文件: ${entriesStr || "未检测到明确入口"}\n\n## 代码统计\n${statsStr}\n\n## 模块结构\n${modulesStr}\n\n## 依赖与技术栈\n${depsStr}\n\n## 检测到的代码模式\n${patternsStr}\n\n请按照约定格式，逐章输出分析报告。`;
  }
  return `Analyze the following Python project...`;
}

function groupByCategory(deps: StaticAnalysisResult["dependencies"]): Record<string, StaticAnalysisResult["dependencies"]> {
  const g: Record<string, StaticAnalysisResult["dependencies"]> = {};
  for (const d of deps) { if (!g[d.category]) g[d.category] = []; g[d.category].push(d); }
  return g;
}

export function buildExtensionPrompt(analysis: StaticAnalysisResult): string {
  const lang = getReportLanguage();
  const techStack = [...new Set(analysis.dependencies.map(d => d.name))];
  if (lang === "zh") {
    return `基于以下项目的技术栈，推荐 3-5 个值得延申学习的技术方向。输出 JSON 数组，每项含: techName, relation (升级/替代/补充/基础设施), summary, learnMoreUrl。\n\n当前技术栈: ${techStack.join(", ")}\n项目类型特征: ${analysis.patterns.map(p => p.pattern).join(", ")}`;
  }
  return `Based on the following tech stack...`;
}

export function buildAskPrompt(question: string, context?: string): string {
  const lang = getReportLanguage();
  if (lang === "zh") {
    return `用户正在学习这个项目。以教学导师的口吻回答。${context ? `\n\n上下文: ${context}` : ""}\n\n问题: ${question}`;
  }
  return `The learner asks: ${question}`;
}
