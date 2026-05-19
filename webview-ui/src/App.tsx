import React, { useState } from "react";
import { OutlineTree } from "./components/OutlineTree";
import { ReportView } from "./components/ReportView";
import { TechBadge } from "./components/TechBadge";
import { ExtensionPanel } from "./components/ExtensionPanel";
import { AskPanel } from "./components/AskPanel";
import { useStreamReport } from "./hooks/useStreamReport";
import { PHASE_LABELS } from "./types";
import type { ReportSection } from "./types";

export const App: React.FC = () => {
  const { phase, staticResult, sections, extensions, error, sendAsk, sendExpandTech } = useStreamReport();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const SK: { key: ReportSection; label: string }[] = [
    { key: "overview", label: "概览" }, { key: "architecture", label: "架构" },
    { key: "modules", label: "模块" }, { key: "difficulty", label: "难点" },
  ];
  const isDone = phase==="done"||phase==="extension";
  const isError = phase==="error";

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <button className="header-toggle" onClick={()=>setSidebarVisible(!sidebarVisible)} title="切换侧边栏">☰</button>
          <h1 className="header-title">ProjectClassmate</h1>
          {staticResult&&<span className="header-project">{staticResult.projectName}</span>}
        </div>
        <div className="header-phase">{PHASE_LABELS[phase]??""}</div>
      </header>
      <div className="app-body">
        {sidebarVisible&&staticResult&&(
          <aside className="app-sidebar">
            <div className="sidebar-stats">
              <div className="stat-item"><span className="stat-value">{staticResult.stats.totalFiles}</span><span className="stat-label">文件</span></div>
              <div className="stat-item"><span className="stat-value">{staticResult.stats.totalLines}</span><span className="stat-label">行</span></div>
              <div className="stat-item"><span className="stat-value">{staticResult.stats.totalClasses}</span><span className="stat-label">类</span></div>
              <div className="stat-item"><span className="stat-value">{staticResult.stats.totalFunctions}</span><span className="stat-label">函数</span></div>
            </div>
            <div className="sidebar-sections">{SK.map(({key,label})=><button key={key} className="section-jump">{label}</button>)}</div>
            {staticResult.dependencies.length>0&&(
              <div className="sidebar-tech">
                <div className="sidebar-tech-title">🛠 技术栈</div>
                <div className="sidebar-tech-badges">
                  {staticResult.dependencies.slice(0,15).map(d=><TechBadge key={d.name} dep={d} onClick={sendExpandTech}/>)}
                  {staticResult.dependencies.length>15&&<span className="tech-more">+{staticResult.dependencies.length-15} 更多</span>}
                </div>
              </div>
            )}
            {staticResult.modules.length>0&&<OutlineTree modules={staticResult.modules} dependencies={staticResult.dependencies}/>}
          </aside>
        )}
        <main className="app-main">
          <ReportView phase={phase} sections={sections} error={error}/>
          {isDone&&extensions.length>0&&<ExtensionPanel items={extensions} onExpand={sendExpandTech}/>}
        </main>
      </div>
      {isDone&&!isError&&<footer className="app-footer"><AskPanel onAsk={sendAsk} disabled={!isDone}/></footer>}
    </div>
  );
};
export default App;
