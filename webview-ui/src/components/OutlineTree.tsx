import React, { useState } from "react";
import type { ModuleInfo, DependencyInfo } from "../types";
import { CATEGORY_LABELS } from "../types";

interface Props { modules: ModuleInfo[]; dependencies: DependencyInfo[]; }

export const OutlineTree: React.FC<Props> = ({ modules, dependencies }) => {
  const [activeTab, setActiveTab] = useState<"modules"|"tech">("modules");
  const [expandedMods, setExpandedMods] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const grouped = dependencies.reduce<Record<string, DependencyInfo[]>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = [];
    acc[d.category].push(d);
    return acc;
  }, {});

  return (
    <div className="outline-tree">
      <div className="outline-tabs">
        <button className={`outline-tab ${activeTab==="modules"?"active":""}`} onClick={()=>setActiveTab("modules")}>📁 模块</button>
        <button className={`outline-tab ${activeTab==="tech"?"active":""}`} onClick={()=>setActiveTab("tech")}>🛠 技术栈</button>
      </div>
      <div className="outline-content">
        {activeTab==="modules" && (
          <ul className="outline-list">
            {modules.map(mod => (
              <li key={mod.name} className="outline-item">
                <div className="outline-item-header" onClick={()=>{const n=new Set(expandedMods); n.has(mod.name)?n.delete(mod.name):n.add(mod.name); setExpandedMods(n);}}>
                  <span className="outline-arrow">{expandedMods.has(mod.name)?"▼":"▶"}</span>
                  <span className="outline-module-name">{mod.name}</span>
                  <span className="outline-badge">{mod.files.length} 文件</span>
                </div>
                {expandedMods.has(mod.name) && (
                  <div className="outline-item-detail">
                    {mod.classes.map(c => <div key={c.name} className="outline-detail-row"><span className="outline-icon">C</span><span className="outline-text">{c.name}</span><span className="outline-meta">{c.methods.length} 方法</span></div>)}
                    {mod.functions.map(f => <div key={f.name} className="outline-detail-row"><span className="outline-icon">ƒ</span><span className="outline-text">{f.name}</span></div>)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {activeTab==="tech" && (
          <ul className="outline-list">
            {Object.entries(grouped).map(([cat, deps]) => (
              <li key={cat} className="outline-item">
                <div className="outline-item-header" onClick={()=>{const n=new Set(expandedCats); n.has(cat)?n.delete(cat):n.add(cat); setExpandedCats(n);}}>
                  <span className="outline-arrow">{expandedCats.has(cat)?"▼":"▶"}</span>
                  <span className="outline-module-name">{CATEGORY_LABELS[cat]??cat}</span>
                  <span className="outline-badge">{deps.length}</span>
                </div>
                {expandedCats.has(cat) && (
                  <div className="outline-item-detail">
                    {deps.map(d => <div key={d.name} className="outline-detail-row"><span className="outline-text">{d.name}</span>{d.version&&<span className="outline-meta">{d.version}</span>}</div>)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
