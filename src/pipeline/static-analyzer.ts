import * as fs from "fs";
import * as path from "path";
import type { StaticAnalysisResult, ModuleInfo, ClassSummary, FuncSummary, DependencyInfo, ProjectStats, PatternTag } from "../types";
import { getConfig } from "../config/settings";

export async function runStaticAnalysis(rootPath: string): Promise<StaticAnalysisResult> {
  const config = getConfig();
  const allFiles = collectPythonFiles(rootPath, config.analysis.includeTests);
  const modules = analyzeModules(rootPath, allFiles, config.analysis.maxFileSize);
  const dependencies = parseDependencies(rootPath);
  const patterns = detectPatterns(allFiles, rootPath, modules);
  const stats = computeStats(modules, allFiles);
  return { projectName: path.basename(rootPath), projectRoot: rootPath, modules, dependencies, entryFiles: findEntryPoints(allFiles, rootPath), stats, patterns };
}

function collectPythonFiles(root: string, includeTests: boolean): string[] {
  const result: string[] = [];
  function walk(dir: string) {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "__pycache__") continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (!includeTests && isTestDir(e.name)) continue; walk(full); }
      else if (e.isFile() && e.name.endsWith(".py")) result.push(full);
    }
  }
  walk(root);
  return result;
}

function isTestDir(name: string): boolean { const l = name.toLowerCase(); return l==="test"||l==="tests"||l==="testing"||l.startsWith("test_"); }

function analyzeModules(root: string, files: string[], maxSize: number): ModuleInfo[] {
  const mm = new Map<string, ModuleInfo>();
  for (const file of files) {
    let content: string; try { content = fs.readFileSync(file, "utf-8"); } catch { continue; }
    const lines = content.split("\n");
    if (lines.length > maxSize) continue;
    const mn = moduleName(root, file);
    if (!mm.has(mn)) mm.set(mn, { name: mn, files: [], classes: [], functions: [], lineCount: 0 });
    const mod = mm.get(mn)!;
    mod.files.push(path.relative(root, file));
    mod.lineCount += lines.length;
    const { classes, functions } = parseTopLevelDefs(lines);
    mod.classes.push(...classes);
    mod.functions.push(...functions);
  }
  return [...mm.values()];
}

function moduleName(root: string, file: string): string {
  const rel = path.relative(root, file);
  const parts = rel.replace(/\.py$/, "").split(path.sep);
  return parts[0] || "root";
}

function parseTopLevelDefs(lines: string[]): { classes: ClassSummary[]; functions: FuncSummary[] } {
  const classes: ClassSummary[] = []; const functions: FuncSummary[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]; const t = line.trim();
    if (t.startsWith("#") || t === "" || t.startsWith("@")) continue;
    const cm = t.match(/^class\s+(\w+)\s*(?:\(([^)]*)\))?\s*:/);
    if (cm && !line.startsWith(" ") && !line.startsWith("\t")) {
      const name = cm[1]; const bases = cm[2] ? cm[2].split(",").map((b: string) => b.trim()).filter(Boolean) : [];
      const decs = collectDecorators(lines, i);
      const end = findBlockEnd(lines, i);
      const meths = collectMethods(lines, i + 1, end);
      classes.push({ name, methods: meths, bases, decorators: decs, lineCount: end - i + 1 });
      i = end; continue;
    }
    const fm = t.match(/^(?:async\s+)?def\s+(\w+)\s*\(/);
    if (fm && !line.startsWith(" ") && !line.startsWith("\t")) {
      const name = fm[1]; const decs = collectDecorators(lines, i);
      const doc = extractDocstring(lines, i);
      const end = findBlockEnd(lines, i);
      functions.push({ name, decorators: decs, lineCount: end - i + 1, doc });
      i = end;
    }
  }
  return { classes, functions };
}

function collectDecorators(lines: string[], defLine: number): string[] {
  const d: string[] = [];
  for (let j = defLine - 1; j >= 0; j--) { const t = lines[j].trim(); if (t.startsWith("@")) d.unshift(t.slice(1).split("(")[0].trim()); else if (t === "") continue; else break; }
  return d;
}

function collectMethods(lines: string[], start: number, end: number): string[] {
  const m: string[] = [];
  for (let i = start; i <= end; i++) { const t = lines[i].trim(); const match = t.match(/^\s+def\s+(\w+)\s*\(/); if (match && (t.startsWith("    ") || t.startsWith("\t"))) m.push(match[1]); }
  return m;
}

function extractDocstring(lines: string[], defLine: number): string | undefined {
  for (let j = defLine + 1; j < Math.min(defLine + 5, lines.length); j++) {
    const t = lines[j].trim();
    if (t.startsWith('"""') || t.startsWith("'''")) {
      let doc = t.replace(/^["']{3}/, "").trim();
      for (let k = j + 1; k < Math.min(j + 10, lines.length); k++) { if (lines[k].includes('"""') || lines[k].includes("'''")) { doc += " " + lines[k].replace(/["']{3}/g, "").trim(); return doc.trim() || undefined; } doc += " " + lines[k].trim(); }
    }
    if (!t.startsWith("#") && t !== "") break;
  }
  return undefined;
}

function findBlockEnd(lines: string[], start: number): number {
  const indent = lines[start].match(/^(\s*)/)?.[1]?.length ?? 0;
  let i = start + 1;
  while (i < lines.length) { if (lines[i].trim() === "" || lines[i].trim().startsWith("#")) { i++; continue; } if ((lines[i].match(/^(\s*)/)?.[1]?.length ?? 0) <= indent) break; i++; }
  return i - 1;
}

function parseDependencies(root: string): DependencyInfo[] {
  const deps: DependencyInfo[] = [];
  const addDep = (name: string, version?: string) => { if (deps.find(d => d.name === name)) return; deps.push({ name, version, category: categorizeDep(name) }); };

  const reqFiles = fs.readdirSync(root).filter(f => /^requirements.*\.txt$/.test(f));
  for (const f of reqFiles) {
    let content: string; try { content = fs.readFileSync(path.join(root, f), "utf-8"); } catch { continue; }
    for (const line of content.split("\n")) { const t = line.trim(); if (!t || t.startsWith("#") || t.startsWith("-")) continue; const m = t.match(/^([a-zA-Z0-9_\-\.]+)\s*(?:[><=!~]+\s*([\d\.\*]+))?/); if (m) addDep(m[1].toLowerCase(), m[2]); }
  }

  const pp = path.join(root, "pyproject.toml");
  if (fs.existsSync(pp)) {
    let content: string; try { content = fs.readFileSync(pp, "utf-8"); } catch { content = ""; }
    let inDeps = false;
    for (const line of content.split("\n")) { const t = line.trim(); if (t.startsWith("[") && t.includes("dependencies")) { inDeps = true; continue; } if (t.startsWith("[") && t.endsWith("]")) { inDeps = false; continue; } if (inDeps) { const m = t.match(/^["']?([a-zA-Z0-9_\-\.]+)\s*(?:[><=!~]+\s*([\d\.\*]+))?/); if (m) addDep(m[1].toLowerCase(), m[2]); } }
  }

  const sp = path.join(root, "setup.py");
  if (fs.existsSync(sp)) {
    let content: string; try { content = fs.readFileSync(sp, "utf-8"); } catch { content = ""; }
    const im = content.match(/install_requires\s*=\s*\[([^\]]+)\]/s);
    if (im) { for (const dep of im[1].split(",")) { const m = dep.trim().match(/["']([a-zA-Z0-9_\-\.]+)\s*(?:[><=!~]+\s*([\d\.\*]+))?/); if (m) addDep(m[1].toLowerCase(), m[2]); } }
  }
  deps.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  return deps;
}

function categorizeDep(name: string): DependencyInfo["category"] {
  const map: Record<string, DependencyInfo["category"]> = {
    flask: "web", django: "web", fastapi: "web", starlette: "web", tornado: "web", sanic: "web", aiohttp: "web", requests: "web", httpx: "web",
    sqlalchemy: "database", sqlmodel: "database", psycopg2: "database", psycopg: "database", pymongo: "database", motor: "database", redis: "database", alembic: "database", asyncpg: "database",
    tensorflow: "ai-ml", torch: "ai-ml", pytorch: "ai-ml", transformers: "ai-ml", scikit: "ai-ml", sklearn: "ai-ml", numpy: "ai-ml", pandas: "ai-ml", matplotlib: "ai-ml", jupyter: "ai-ml", openai: "ai-ml", langchain: "ai-ml",
    pytest: "testing", coverage: "testing", "pytest-cov": "testing", mock: "testing", hypothesis: "testing",
    black: "dev-tool", ruff: "dev-tool", flake8: "dev-tool", pylint: "dev-tool", mypy: "dev-tool", sphinx: "dev-tool", mkdocs: "dev-tool", poetry: "dev-tool",
    click: "cli", typer: "cli", argparse: "cli", rich: "cli", tqdm: "cli",
    asyncio: "async", celery: "async", dramatiq: "async", rq: "async", arq: "async",
    gunicorn: "web",
  };
  return map[name] ?? "other";
}

function detectPatterns(files: string[], root: string, modules: ModuleInfo[]): PatternTag[] {
  const p: PatternTag[] = [];
  for (const mod of modules) {
    for (const cls of mod.classes) {
      if (cls.bases.some(b => b.toLowerCase().includes("model") || b.toLowerCase().includes("base")))
        p.push({ pattern: "orm_model", location: `${mod.name}/${cls.name}`, detail: `数据模型: ${cls.bases.join(", ")}` });
      if (cls.bases.some(b => b.toLowerCase().includes("basemodel")))
        p.push({ pattern: "pydantic_model", location: `${mod.name}/${cls.name}`, detail: "Pydantic 数据校验模型" });
      for (const dec of cls.decorators) if (dec.includes("router") || dec.includes("route"))
        p.push({ pattern: "router_registration", location: `${mod.name}/${cls.name}`, detail: "路由注册" });
    }
    for (const fn of mod.functions) {
      for (const dec of fn.decorators) {
        if (dec.includes("route") || dec.includes("get") || dec.includes("post") || dec.includes("app."))
          p.push({ pattern: "endpoint", location: `${mod.name}/${fn.name}`, detail: "HTTP 端点" });
        if (dec.includes("task") || dec.includes("celery"))
          p.push({ pattern: "async_task", location: `${mod.name}/${fn.name}`, detail: "异步任务" });
      }
      if (fn.name === "main" || fn.name === "cli")
        p.push({ pattern: "entry_point", location: `${mod.name}/${fn.name}`, detail: "程序入口" });
    }
  }
  return p;
}

function findEntryPoints(files: string[], root: string): string[] {
  const names = ["main.py", "app.py", "cli.py", "run.py", "manage.py", "__main__.py", "server.py"];
  return files.filter(f => names.includes(path.basename(f))).map(f => path.relative(root, f));
}

function computeStats(modules: ModuleInfo[], files: string[]): ProjectStats {
  let tc = 0, tf = 0, tl = 0;
  for (const m of modules) { tc += m.classes.length; tf += m.functions.length; tl += m.lineCount; }
  return { totalFiles: files.length, totalLines: tl, totalClasses: tc, totalFunctions: tf, testFiles: files.filter(f => isTestDir(path.basename(path.dirname(f))) || path.basename(f).startsWith("test_")).length };
}
