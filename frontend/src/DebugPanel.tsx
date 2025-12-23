import React, { useState } from 'react';
import PixelHistoryTable, { PixelMod } from './PixelHistoryTable';
import ThoughtChain from './ThoughtChain';

interface DebugResponse {
  planned: {
    tool: string;
    arguments: Record<string, unknown>;
  };
  mcp: unknown;
  explanation: string;
}

const DebugPanel = () => {
  const [file, setFile] = useState<File | null>(null);
  const [capturePath, setCapturePath] = useState<string | null>(null);
  const [history, setHistory] = useState<PixelMod[]>([]);
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [explanation, setExplanation] = useState<string>('');
  const [openrouterKey, setOpenrouterKey] = useState<string>('');

  React.useEffect(() => {
    const saved = window.localStorage.getItem('openrouter_api_key');
    if (saved) {
      setOpenrouterKey(saved);
    }
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);

    if (!f) {
      setCapturePath(null);
      return;
    }

    // Upload the capture to the orchestrator so that non-technical users
    // don't need to configure file paths manually.
    const res = await fetch(`http://localhost:8080/upload-capture?name=${encodeURIComponent(f.name)}`, {
      method: 'POST',
      body: f
    });
    const data = (await res.json()) as { capturePath: string };
    setCapturePath(data.capturePath);
  };

  const runAnalysis = async () => {
    if (!file || !capturePath) {
      return;
    }
    const trimmedKey = openrouterKey.trim();
    const body: Record<string, unknown> = {
      question: '请帮我基于这个 capture 做一次初步诊断，优先列出可疑的 drawcall、NaN 或几何异常。',
      capturePath
    };
    if (trimmedKey) {
      body.openrouterKey = trimmedKey;
    }

    const res = await fetch('http://localhost:8080/nl-debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data: DebugResponse = await res.json();
    setExplanation(data.explanation);
    const mcp = data.mcp as any;
    if (mcp && mcp.ok && Array.isArray(mcp.result)) {
      const maybeHistory = mcp.result as any[];
      const mapped: PixelMod[] = maybeHistory
        .map(entry => {
          const eventId = entry.eventId ?? entry.eventID;
          const color = entry.postColour ?? entry.color;
          if (typeof eventId !== 'number' || !Array.isArray(color)) {
            return null;
          }
          return {
            eventId,
            color,
            shader: entry.shaderName ?? entry.shader
          } as PixelMod;
        })
        .filter(Boolean) as PixelMod[];
      setHistory(mapped);
    } else {
      setHistory([]);
    }
    setThoughts([JSON.stringify(data.planned), '分析结果已返回，请查看说明。']);
  };

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h2>RenderDoc Debug Agent</h2>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>
          OpenRouter API Key（可选，仅保存在本机浏览器）
        </label>
        <input
          type="password"
          value={openrouterKey}
          placeholder="sk-..."
          onChange={e => {
            const value = e.target.value;
            setOpenrouterKey(value);
            if (value.trim()) {
              window.localStorage.setItem('openrouter_api_key', value.trim());
            } else {
              window.localStorage.removeItem('openrouter_api_key');
            }
          }}
          style={{ width: '100%', maxWidth: 420 }}
        />
      </div>
      <input type="file" accept=".rdc" onChange={handleUpload} />
      <button onClick={runAnalysis} disabled={!file || !capturePath} style={{ marginLeft: 8 }}>
        运行智能诊断
      </button>
      <div style={{ marginTop: 16 }}>
        <h3>解释结果</h3>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{explanation}</pre>
      </div>
      <PixelHistoryTable history={history} />
      <ThoughtChain thoughts={thoughts} />
    </div>
  );
};

export default DebugPanel;
