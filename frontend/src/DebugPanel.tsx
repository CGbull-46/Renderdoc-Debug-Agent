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
  const [openrouterKey, setOpenrouterKey] = useState<string | null>(null);

  React.useEffect(() => {
    const saved = window.localStorage.getItem('openrouter_api_key');
    if (saved) {
      setOpenrouterKey(saved);
    } else {
      const entered = window.prompt('请输入 OpenRouter API Key（只需输入一次，将保存在本机浏览器）：') || '';
      const trimmed = entered.trim();
      if (trimmed) {
        window.localStorage.setItem('openrouter_api_key', trimmed);
        setOpenrouterKey(trimmed);
      }
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
    if (!file || !capturePath || !openrouterKey) {
      return;
    }
    const body = {
      question: '请帮我基于这个capture做一次初步诊断，优先列出可疑的 drawcall 或 NaN/几何异常。',
      capturePath,
      openrouterKey
    };
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
      if (maybeHistory.length && typeof maybeHistory[0].eventId === 'number' && Array.isArray(maybeHistory[0].postColour)) {
        const mapped: PixelMod[] = maybeHistory.map(h => ({
          eventId: h.eventId,
          color: h.postColour,
          shader: undefined
        }));
        setHistory(mapped);
      } else {
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
    setThoughts([JSON.stringify(data.planned), '分析结果已返回，请查看说明。']);
  };

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h2>RenderDoc Debug Agent</h2>
      <input type="file" accept=".rdc" onChange={handleUpload} />
      <button onClick={runAnalysis} disabled={!file} style={{ marginLeft: 8 }}>
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
