import React, { useState } from "react";
interface Props { onAsk: (q: string) => void; disabled: boolean; }
export const AskPanel: React.FC<Props> = ({ onAsk, disabled }) => {
  const [q, setQ] = useState("");
  const handle = (e: React.FormEvent) => { e.preventDefault(); const t = q.trim(); if(!t) return; onAsk(t); setQ(""); };
  return (
    <div className="ask-panel">
      <form className="ask-form" onSubmit={handle}>
        <input className="ask-input" type="text" placeholder="💡 针对这个项目提出你的问题..." value={q} onChange={e=>setQ(e.target.value)} disabled={disabled}/>
        <button className="ask-btn" type="submit" disabled={disabled||!q.trim()}>提问</button>
      </form>
    </div>
  );
};
