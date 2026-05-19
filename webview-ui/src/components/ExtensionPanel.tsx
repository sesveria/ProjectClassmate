import React from "react";
import type { TechExtension } from "../types";
interface Props { items: TechExtension[]; onExpand: (techName: string) => void; }
const RL: Record<string,string> = { upgrade:"⬆️ 升级", alternative:"🔄 替代", complement:"➕ 补充", infrastructure:"🏗 基础设施" };
export const ExtensionPanel: React.FC<Props> = ({ items, onExpand }) => {
  if(items.length===0) return null;
  return (
    <div className="extension-panel"><h3 className="extension-title">📚 延申学习推荐</h3>
      <div className="extension-list">
        {items.map(item => (
          <div key={item.techName} className="extension-item" onClick={()=>onExpand(item.techName)}>
            <div className="extension-item-header"><span className="extension-relation">{RL[item.relation]??item.relation}</span><span className="extension-name">{item.techName}</span></div>
            <p className="extension-summary">{item.summary}</p>
            {item.learnMoreUrl&&<a className="extension-link" href={item.learnMoreUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>📖 了解更多</a>}
          </div>
        ))}
      </div>
    </div>
  );
};
