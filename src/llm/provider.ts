import type { LLMProvider, LLMMessage, StreamCallback, LLMProviderConfig } from "../types";

export function createProvider(config: LLMProviderConfig): LLMProvider {
  switch (config.provider) {
    case "openai": case "custom": return createOpenAIProvider(config);
    case "anthropic": return createAnthropicProvider(config);
    case "ollama": return createOllamaProvider(config);
    default: throw new Error(`Unknown provider: ${config.provider}`);
  }
}

function createOpenAIProvider(config: LLMProviderConfig): LLMProvider {
  const baseUrl = config.endpoint || "https://api.openai.com/v1";
  return {
    name: "openai",
    async chat(messages: LLMMessage[]): Promise<string> {
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages, temperature: 0.3 }),
      });
      if (!resp.ok) throw new Error(`OpenAI error: ${resp.status} ${await resp.text()}`);
      const json = await resp.json() as any;
      return json.choices?.[0]?.message?.content ?? "";
    },
    async chatStream(messages: LLMMessage[], onChunk: StreamCallback): Promise<string> {
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages, temperature: 0.3, stream: true }),
      });
      if (!resp.ok) throw new Error(`OpenAI stream error: ${resp.status}`);
      const reader = resp.body?.getReader(); if (!reader) throw new Error("No body");
      const decoder = new TextDecoder(); let full = "", buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim(); if (!t || !t.startsWith("data: ")) continue;
          const data = t.slice(6); if (data === "[DONE]") continue;
          try { const p = JSON.parse(data); const d = p.choices?.[0]?.delta?.content; if (d) { full += d; onChunk(d); } } catch {}
        }
      }
      return full;
    },
  };
}

function createAnthropicProvider(config: LLMProviderConfig): LLMProvider {
  const baseUrl = config.endpoint || "https://api.anthropic.com/v1";
  return {
    name: "anthropic",
    async chat(messages: LLMMessage[]): Promise<string> {
      const sysMsg = messages.find(m => m.role === "system")?.content ?? "";
      const rest = messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
      const resp = await fetch(`${baseUrl}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: config.model, system: sysMsg, messages: rest, max_tokens: 4096 }),
      });
      if (!resp.ok) throw new Error(`Anthropic error: ${resp.status}`);
      const json = await resp.json() as any;
      return json.content?.[0]?.text ?? "";
    },
    async chatStream(messages: LLMMessage[], onChunk: StreamCallback): Promise<string> {
      const sysMsg = messages.find(m => m.role === "system")?.content ?? "";
      const rest = messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
      const resp = await fetch(`${baseUrl}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: config.model, system: sysMsg, messages: rest, max_tokens: 4096, stream: true }),
      });
      if (!resp.ok) throw new Error(`Anthropic stream error: ${resp.status}`);
      const reader = resp.body?.getReader(); if (!reader) throw new Error("No body");
      const decoder = new TextDecoder(); let full = "", buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim(); if (!t || !t.startsWith("data: ")) continue;
          const data = t.slice(6);
          try { const p = JSON.parse(data); if (p.type === "content_block_delta") { const d = p.delta?.text; if (d) { full += d; onChunk(d); } } } catch {}
        }
      }
      return full;
    },
  };
}

function createOllamaProvider(config: LLMProviderConfig): LLMProvider {
  const baseUrl = config.endpoint || "http://localhost:11434/api";
  return {
    name: "ollama",
    async chat(messages: LLMMessage[]): Promise<string> {
      const resp = await fetch(`${baseUrl}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.model, messages, stream: false }),
      });
      if (!resp.ok) throw new Error(`Ollama error: ${resp.status}`);
      const json = await resp.json() as any;
      return json.message?.content ?? "";
    },
    async chatStream(messages: LLMMessage[], onChunk: StreamCallback): Promise<string> {
      const resp = await fetch(`${baseUrl}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.model, messages, stream: true }),
      });
      if (!resp.ok) throw new Error(`Ollama stream error: ${resp.status}`);
      const reader = resp.body?.getReader(); if (!reader) throw new Error("No body");
      const decoder = new TextDecoder(); let full = "", buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim(); if (!t) continue;
          try { const p = JSON.parse(t); const d = p.message?.content; if (d) { full += d; onChunk(d); } } catch {}
        }
      }
      return full;
    },
  };
}
