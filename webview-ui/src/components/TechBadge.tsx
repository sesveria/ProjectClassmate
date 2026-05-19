import React from "react";
import type { DependencyInfo } from "../types";
import { CATEGORY_LABELS } from "../types";
interface Props { dep: DependencyInfo; onClick?: (name: string) => void; }
const COLORS: Record<string, string> = { web:"#4ecdc4", database:"#45b7d1", "ai-ml":"#96ceb4", testing:"#ffeaa7", "dev-tool":"#dfe6e9", cli:"#74b9ff", async:"#a29bfe", other:"#b2bec3" };
export const TechBadge: React.FC<Props> = ({ dep, onClick }) => (
  <span className="tech-badge" style={{borderColor:COLORS[dep.category]??"#ccc"}} title={`${CATEGORY_LABELS[dep.category]??dep.category}${dep.version?` v${dep.version}`:""}`} onClick={()=>onClick?.(dep.name)}>
    <span className="tech-badge-dot" style={{backgroundColor:COLORS[dep.category]??"#ccc"}}/>{dep.name}{dep.version&&<span className="tech-badge-version">@{dep.version}</span>}
  </span>
);
