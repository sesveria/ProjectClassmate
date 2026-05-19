import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { ReportSection } from "../types";
import { PHASE_LABELS } from "../types";

interface Props { phase: "idle"|"scanning"|"llm"|"extension"|"done"|"error"; sections: Record<ReportSection,string>; error: string|null; }

const LABELS: Record<ReportSection,string> = {
  overview:"📋 项目概览", architecture:"🏗 架构设计", modules:"📦 模块详解", difficulty:"⚠️ 学习难点与技巧", extensions:"🚀 延申学习",
};
const ORDER: ReportSection[] = ["overview","architecture","modules","difficulty","extensions"];

export const ReportView: React.FC<Props> = ({ phase, sections, error }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if(ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [sections]);

  if (phase==="idle"||phase==="scanning") return (
    <div className="report-view report-view--loading">
      <div className="report-loading"><div className="spinner"/><p className="loading-text">{PHASE_LABELS[phase]??"准备中..."}</p></div>
    </div>
  );
  if (phase==="error"&&error) return (
    <div className="report-view report-view--error">
      <div className="error-card"><span className="error-icon">❌</span><h3>分析出错</h3><p>{error}</p></div>
    </div>
  );

  return (
    <div className="report-view" ref={ref}>
      {ORDER.map(s => {
        const c = sections[s];
        if(!c && s!=="extensions") return null;
        return (<div key={s} className="report-section">
          <h2 className="section-title">{LABELS[s]}</h2>
          <div className="section-content">
            <ReactMarkdown components={{
              code: ({className,children,...props}:any) => !className ? <code className="inline-code" {...props}>{children}</code> : <pre className="code-block"><code className={className} {...props}>{children}</code></pre>,
              h3: ({children,...props}:any) => <h3 className="subsection-title" {...props}>{children}</h3>,
              ul: ({children,...props}:any) => <ul className="report-list" {...props}>{children}</ul>,
              li: ({children,...props}:any) => <li className="report-list-item" {...props}>{children}</li>,
            }}>{c||(phase==="llm"?"💭 正在生成...":"")}</ReactMarkdown>
            {phase==="llm"&&c&&<span className="typing-cursor"/>}
          </div>
        </div>);
      })}
    </div>
  );
};
