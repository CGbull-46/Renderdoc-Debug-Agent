import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Gauge,
  History as HistoryIcon,
  Image as ImageIcon,
  Loader2,
  PlayCircle,
  PlugZap,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';
import { CoTStep, Message, Submission, SubmissionStatus } from './types';

type CanvasMode = 'aggregated' | 'single';

const SIDEBAR_MIN = 10;
const SIDEBAR_MAX = 15;
const FEED_MIN = 15;
const FEED_MAX = 25;
const DEFAULT_SIDEBAR = 12;
const DEFAULT_FEED = 20;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const PLACEHOLDER_PNG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a855f7" stop-opacity="0.35"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0.35"/></linearGradient></defs><rect width="320" height="180" rx="12" fill="#18181b" stroke="#27272a" stroke-width="4"/><rect x="16" y="16" width="288" height="148" rx="10" fill="url(#g)"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#e4e4e7" font-family="Segoe UI, sans-serif" font-size="18">Render Target</text></svg>`
  );

const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: 'sub-003',
    timestamp: '2025-12-29T14:02:00Z',
    title: 'Shadow map culling investigation',
    status: 'warning',
    pipelineState: { highlightStage: 'RS', warningMessage: 'Cull mode mismatch, RS flagged' },
    evidence: {
      colorBuffer: PLACEHOLDER_PNG,
      depthBuffer: PLACEHOLDER_PNG,
    },
  },
  {
    id: 'sub-002',
    timestamp: '2025-12-29T12:20:00Z',
    title: 'Depth format mismatch',
    status: 'resolved',
    pipelineState: { highlightStage: 'OM', warningMessage: 'Depth format expected D32_FLOAT' },
    evidence: { colorBuffer: PLACEHOLDER_PNG },
  },
  {
    id: 'sub-001',
    timestamp: '2025-12-28T21:15:00Z',
    title: 'Geometry UV clamp check',
    status: 'resolved',
    pipelineState: { highlightStage: 'VS' },
    evidence: { depthBuffer: PLACEHOLDER_PNG },
  },
  {
    id: 'sub-004',
    timestamp: '2025-12-29T15:30:00Z',
    title: 'Resource leak analysis',
    status: 'processing',
    pipelineState: { highlightStage: null },
    evidence: {},
  },
];

const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg-u-1',
    role: 'user',
    content: '为什么阴影在旋转时闪烁？',
  },
  {
    id: 'msg-a-1',
    role: 'agent',
    submissionId: 'sub-003',
    status: 'warning',
    steps: [
      {
        id: 'step-1',
        title: 'Texture Signature Scan',
        status: 'completed',
        logs: [{ type: 'tool', content: 'iterate_actions: 215 drawcalls enumerated' }],
      },
      {
        id: 'step-2',
        title: 'Cull mode verification',
        status: 'completed',
        logs: [{ type: 'analysis', content: 'Backface culling enabled with CW winding' }],
      },
    ],
    summary: {
      title: 'CULL MODE ISSUE',
      description: 'Cull mode uses CW while meshes are CCW; RS stage highlighted.',
      tag: 'warning',
    },
  },
  {
    id: 'msg-a-2',
    role: 'agent',
    submissionId: 'sub-004',
    status: 'processing',
    steps: [
      {
        id: 'step-3',
        title: 'Texture Signature Scan',
        status: 'completed',
        logs: [{ type: 'tool', content: 'enumerate_counters: GPU load 74%' }],
      },
      {
        id: 'step-4',
        title: 'Memory Footprint Analysis',
        status: 'processing',
        logs: [{ type: 'analysis', content: 'Comparing VRAM delta between DrawCall #140 and #141...' }],
      },
    ],
  },
];

const assets = [
  { name: 'scene.rdc', kind: 'rdc' },
  { name: 'cache/', kind: 'folder' },
  { name: 'shadow_map.png', kind: 'image' },
];

function statusColor(status?: SubmissionStatus) {
  if (status === 'processing') return 'text-status-processing';
  if (status === 'resolved') return 'text-status-success';
  if (status === 'warning') return 'text-status-warning';
  if (status === 'critical') return 'text-status-critical';
  return 'text-obsidian-secondaryText';
}

const stageOrder: Array<'IA' | 'VS' | 'RS' | 'PS' | 'OM'> = ['IA', 'VS', 'RS', 'PS', 'OM'];

const StageLabel: Record<(typeof stageOrder)[number], string> = {
  IA: 'Input Assembler',
  VS: 'Vertex Shader',
  RS: 'Rasterizer',
  PS: 'Pixel Shader',
  OM: 'Output Merger',
};

function StageBadge({ stage, active }: { stage: (typeof stageOrder)[number]; active: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
        active
          ? 'border-status-warning bg-status-warning/10 text-status-warning shadow-glow'
          : 'border-obsidian-border bg-obsidian-panel text-obsidian-secondaryText'
      }`}
    >
      <Activity className="h-4 w-4" />
      <div className="flex flex-col leading-tight">
        <span className="font-semibold">{stage}</span>
        <span className="text-xs text-obsidian-secondaryText">{StageLabel[stage]}</span>
      </div>
    </div>
  );
}

function ThinkingProcess({ steps, defaultOpen }: { steps: CoTStep[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-obsidian-border bg-obsidian-panel/80 backdrop-blur-md">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-obsidian-primaryText"
        onClick={() => setOpen(v => !v)}
      >
        <span className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-status-processing" />
          思考过程
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="space-y-2 border-t border-obsidian-border px-4 py-3">
          {steps.map(step => (
            <div
              key={step.id}
              className={`rounded-lg border px-3 py-2 text-sm ${
                step.status === 'processing'
                  ? 'border-status-processing text-status-processing animate-pulse'
                  : 'border-obsidian-border text-obsidian-primaryText'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {step.status === 'processing' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-status-success" />
                )}
                <span>{step.title}</span>
              </div>
              <div className="mt-1 space-y-1 text-xs text-obsidian-secondaryText">
                {step.logs.map((log, idx) => (
                  <div key={idx} className="rounded bg-obsidian-bg/60 px-2 py-1">
                    <span className="text-status-tool font-mono uppercase">{log.type}</span>
                    <span className="ml-2 text-obsidian-primaryText">{log.content}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  description,
  tag,
  onInspect,
}: {
  title: string;
  description: string;
  tag: string;
  onInspect: () => void;
}) {
  return (
    <div className="rounded-xl border border-obsidian-border bg-obsidian-panel/80 p-4 shadow-inner">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-obsidian-primaryText">
        <AlertTriangle className="h-4 w-4 text-status-warning" />
        {title}
        <span className="rounded-full bg-status-warning/10 px-2 py-0.5 text-xs text-status-warning">{tag}</span>
      </div>
      <p className="text-sm text-obsidian-secondaryText">{description}</p>
      <button
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-status-processing px-3 py-2 text-sm font-semibold text-white shadow-glow transition hover:translate-y-[-1px] hover:shadow-lg active:translate-y-[0px]"
        onClick={onInspect}
      >
        <PlayCircle className="h-4 w-4" /> INSPECT IN CANVAS
      </button>
    </div>
  );
}

function MessageItem({
  message,
  onInspect,
}: {
  message: Message;
  onInspect: () => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-xl rounded-xl rounded-tr-none bg-obsidian-panel px-4 py-3 text-sm text-obsidian-primaryText shadow-glow">
          {message.content}
        </div>
      </div>
    );
  }

  const showSummary = message.status && message.status !== 'processing' && message.summary;
  const showThinking = Array.isArray(message.steps) && message.steps.length > 0;
  const defaultOpen = message.status === 'processing';

  return (
    <div className="flex gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-status-processing/20 text-status-processing">??</div>
      <div className="flex-1 space-y-3">
        {showThinking && <ThinkingProcess steps={message.steps!} defaultOpen={defaultOpen} />}
        {showSummary && message.summary && (
          <SummaryCard
            title={message.summary.title}
            description={message.summary.description}
            tag={message.summary.tag}
            onInspect={onInspect}
          />
        )}
      </div>
    </div>
  );
}

function CanvasPanel({
  submissions,
  mode,
  selectedId,
  onModeChange,
  onSelect,
}: {
  submissions: Submission[];
  mode: CanvasMode;
  selectedId: string | null;
  onModeChange: (m: CanvasMode) => void;
  onSelect: (id: string) => void;
}) {
  const selectable = submissions.filter(s => s.status !== 'processing');
  const current = submissions.find(s => s.id === selectedId) ?? selectable[0];

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-obsidian-border bg-obsidian-panel p-4 shadow-inner">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-xl border border-obsidian-border bg-obsidian-bg p-1">
          <button
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              mode === 'aggregated'
                ? 'bg-status-processing text-white shadow-glow'
                : 'text-obsidian-secondaryText hover:text-obsidian-primaryText'
            }`}
            onClick={() => onModeChange('aggregated')}
          >
            Aggregated
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              mode === 'single'
                ? 'bg-status-processing text-white shadow-glow'
                : 'text-obsidian-secondaryText hover:text-obsidian-primaryText'
            }`}
            onClick={() => onModeChange('single')}
          >
            Single
          </button>
        </div>

        {mode === 'single' && (
          <div className="flex items-center gap-2 text-sm">
            <HistoryIcon className="h-4 w-4 text-obsidian-secondaryText" />
            <select
              value={current?.id}
              onChange={e => onSelect(e.target.value)}
              className="rounded-lg border border-obsidian-border bg-obsidian-bg px-3 py-2 text-obsidian-primaryText"
            >
              {selectable.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {mode === 'aggregated' ? (
        <div className="space-y-2 rounded-xl border border-obsidian-border bg-obsidian-bg p-3 text-sm">
          {submissions.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-obsidian-panel">
              <div>
                <div className="font-semibold text-obsidian-primaryText">{s.title}</div>
                <div className="text-xs text-obsidian-secondaryText">{new Date(s.timestamp).toLocaleString()}</div>
              </div>
              <span className={`text-xs font-semibold ${statusColor(s.status)}`}>{s.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-obsidian-border bg-obsidian-bg p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-obsidian-primaryText">
              <Gauge className="h-4 w-4" /> Pipeline Verification
            </div>
            <div className="flex flex-wrap gap-2">
              {stageOrder.map(stage => (
                <StageBadge key={stage} stage={stage} active={current?.pipelineState.highlightStage === stage} />
              ))}
            </div>
            {current?.pipelineState.warningMessage && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-status-warning/40 bg-status-warning/5 px-3 py-2 text-sm text-status-warning">
                <AlertTriangle className="h-4 w-4" />
                {current.pipelineState.warningMessage}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-obsidian-border bg-obsidian-bg p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-obsidian-primaryText">
              <ImageIcon className="h-4 w-4" /> Extracted Evidence
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TexturePreview title="Color Buffer" src={current?.evidence.colorBuffer} />
              <TexturePreview title="Depth Buffer" src={current?.evidence.depthBuffer} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TexturePreview({ title, src }: { title: string; src?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-obsidian-border bg-obsidian-panel shadow-inner">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-obsidian-secondaryText">
        {title}
      </div>
      {src ? (
        <img src={src} alt={title} className="h-32 w-full object-cover" />
      ) : (
        <div className="flex h-32 items-center justify-center text-xs text-obsidian-secondaryText">No data</div>
      )}
    </div>
  );
}

function ResizeHandle({
  onPointerDown,
  label,
}: {
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  label: string;
}) {
  return (
    <div
      className="hidden w-3 shrink-0 cursor-col-resize items-stretch justify-center lg:mx-2 lg:flex"
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title={label}
      style={{ touchAction: 'none' }}
    >
      <div className="h-full w-1 rounded-full bg-obsidian-border/60 transition-colors hover:bg-status-processing/60" />
    </div>
  );
}

function Sidebar({
  connection,
  onOpenSettings,
  onUpload,
  capturePath,
  uploading,
}: {
  connection: { state: 'connected' | 'disconnected' | 'unknown'; message?: string };
  onOpenSettings: () => void;
  onUpload: (file: File) => void;
  capturePath: string;
  uploading: boolean;
}) {
  return (
    <div className="flex h-full w-full flex-col gap-4 rounded-2xl border border-obsidian-border bg-obsidian-panel p-4 shadow-inner">
      <button className="flex items-center justify-center gap-2 rounded-xl border border-status-processing/60 bg-status-processing/20 px-3 py-2 text-sm font-semibold text-status-processing transition hover:shadow-glow">
        <FolderOpen className="h-4 w-4" /> Open Project
      </button>

      <label className="block rounded-xl border border-obsidian-border bg-obsidian-bg p-3 text-sm text-obsidian-primaryText">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-obsidian-secondaryText">
          Capture Upload
          {capturePath ? <span className="text-status-success">已上传</span> : <span>需要 .rdc</span>}
        </div>
        <input
          type="file"
          accept=".rdc"
          className="w-full text-obsidian-secondaryText"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
          disabled={uploading}
        />
        {uploading && <div className="mt-2 text-xs text-status-processing">正在上传...</div>}
        {capturePath && <div className="mt-2 text-xs text-obsidian-secondaryText break-all">{capturePath}</div>}
      </label>

      <div className="rounded-xl border border-obsidian-border bg-obsidian-bg p-3">
        <div className="mb-2 text-xs font-semibold uppercase text-obsidian-secondaryText">Project Assets</div>
        <div className="space-y-2 text-sm text-obsidian-primaryText">
          {assets.map(item => (
            <div key={item.name} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-obsidian-panel">
              {item.kind === 'folder' ? (
                <FolderOpen className="h-4 w-4 text-obsidian-secondaryText" />
              ) : item.kind === 'image' ? (
                <ImageIcon className="h-4 w-4 text-obsidian-secondaryText" />
              ) : (
                <PlugZap className="h-4 w-4 text-obsidian-secondaryText" />
              )}
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-obsidian-border bg-obsidian-bg px-3 py-2 text-sm font-semibold text-obsidian-primaryText transition hover:bg-obsidian-panel"
          onClick={onOpenSettings}
        >
          <SettingsIcon className="h-4 w-4" /> Settings
        </button>
        <div
          className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
            connection.state === 'connected'
              ? 'border-status-success/50 text-status-success'
              : connection.state === 'disconnected'
              ? 'border-status-critical/50 text-status-critical'
              : 'border-obsidian-border text-obsidian-secondaryText'
          }`}
        >
          <span className="font-semibold">{connection.state === 'connected' ? 'Connected' : 'Disconnected'}</span>
          <div className={`h-2.5 w-2.5 rounded-full ${connection.state === 'connected' ? 'bg-status-success' : 'bg-status-critical'}`} />
        </div>
        {connection.message && <p className="text-xs text-obsidian-secondaryText">{connection.message}</p>}
      </div>
    </div>
  );
}

function SettingsModal({
  open,
  baseUrl,
  apiKey,
  model,
  onClose,
  onApply,
  status,
}: {
  open: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  onClose: () => void;
  onApply: (next: { baseUrl: string; apiKey: string; model: string }) => Promise<void>;
  status: { state: 'idle' | 'loading' | 'ok' | 'error'; message?: string };
}) {
  const [form, setForm] = useState({ baseUrl, apiKey, model });

  useEffect(() => {
    setForm({ baseUrl, apiKey, model });
  }, [baseUrl, apiKey, model]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl border border-obsidian-border bg-obsidian-panel p-6 shadow-glow">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold text-obsidian-primaryText">
            <SettingsIcon className="h-5 w-5" /> Settings
          </div>
          <button className="text-obsidian-secondaryText hover:text-obsidian-primaryText" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="space-y-4">
          <label className="block space-y-2 text-sm text-obsidian-primaryText">
            <span>Agent Base URL</span>
            <input
              className="w-full rounded-lg border border-obsidian-border bg-obsidian-bg px-3 py-2 text-sm text-obsidian-primaryText"
              value={form.baseUrl}
              onChange={e => setForm(prev => ({ ...prev, baseUrl: e.target.value }))}
            />
          </label>

          <label className="block space-y-2 text-sm text-obsidian-primaryText">
            <span>Provider API Key（仅本机存储，可为空）</span>
            <input
              className="w-full rounded-lg border border-obsidian-border bg-obsidian-bg px-3 py-2 text-sm text-obsidian-primaryText"
              type="password"
              value={form.apiKey}
              onChange={e => setForm(prev => ({ ...prev, apiKey: e.target.value }))}
            />
          </label>

          <label className="block space-y-2 text-sm text-obsidian-primaryText">
            <span>Model</span>
            <input
              className="w-full rounded-lg border border-obsidian-border bg-obsidian-bg px-3 py-2 text-sm text-obsidian-primaryText"
              value={form.model}
              onChange={e => setForm(prev => ({ ...prev, model: e.target.value }))}
            />
          </label>

          {status.state !== 'idle' && status.message && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                status.state === 'ok'
                  ? 'border border-status-success/50 bg-status-success/10 text-status-success'
                  : status.state === 'error'
                  ? 'border border-status-critical/50 bg-status-critical/10 text-status-critical'
                  : 'text-obsidian-secondaryText'
              }`}
            >
              {status.message}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              className="rounded-lg border border-obsidian-border bg-obsidian-bg px-4 py-2 text-sm text-obsidian-primaryText"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-status-processing px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-70"
              onClick={() => onApply(form)}
              disabled={status.state === 'loading'}
            >
              {status.state === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
              APPLY & TEST
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const DebugPanel = () => {
  const [sidebarPercent, setSidebarPercent] = useState(DEFAULT_SIDEBAR);
  const [feedPercent, setFeedPercent] = useState(DEFAULT_FEED);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [submissions, setSubmissions] = useState<Submission[]>(MOCK_SUBMISSIONS);
  const initialSelection = useMemo(
    () => submissions.find(s => s.status !== 'processing')?.id ?? submissions[0]?.id ?? null,
    [submissions]
  );
  const [mode, setMode] = useState<CanvasMode>('single');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(initialSelection);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:8080');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [connection, setConnection] = useState<{ state: 'connected' | 'disconnected' | 'unknown'; message?: string }>(
    { state: 'unknown' }
  );
  const [testStatus, setTestStatus] = useState<{ state: 'idle' | 'loading' | 'ok' | 'error'; message?: string }>(
    { state: 'idle' }
  );
  const [userInput, setUserInput] = useState('');
  const [capturePath, setCapturePath] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    type: 'sidebar' | 'feed';
    startX: number;
    startSidebar: number;
    startFeed: number;
  } | null>(null);
  const bodyStyleRef = useRef<{ userSelect: string; cursor: string } | null>(null);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!dragRef.current || !layoutRef.current) return;
    const width = layoutRef.current.clientWidth;
    if (!width) return;
    const deltaPercent = ((event.clientX - dragRef.current.startX) / width) * 100;
    if (dragRef.current.type === 'sidebar') {
      setSidebarPercent(clamp(dragRef.current.startSidebar + deltaPercent, SIDEBAR_MIN, SIDEBAR_MAX));
      return;
    }
    setFeedPercent(clamp(dragRef.current.startFeed + deltaPercent, FEED_MIN, FEED_MAX));
  }, []);

  const stopDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopDrag);
    if (bodyStyleRef.current) {
      document.body.style.userSelect = bodyStyleRef.current.userSelect;
      document.body.style.cursor = bodyStyleRef.current.cursor;
      bodyStyleRef.current = null;
    }
  }, [handlePointerMove]);

  const startDrag = useCallback(
    (type: 'sidebar' | 'feed') => (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || !layoutRef.current) return;
      event.preventDefault();
      dragRef.current = {
        type,
        startX: event.clientX,
        startSidebar: sidebarPercent,
        startFeed: feedPercent,
      };
      if (!bodyStyleRef.current) {
        bodyStyleRef.current = {
          userSelect: document.body.style.userSelect,
          cursor: document.body.style.cursor,
        };
      }
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopDrag);
    },
    [feedPercent, handlePointerMove, sidebarPercent, stopDrag]
  );

  useEffect(() => () => stopDrag(), [stopDrag]);

  useEffect(() => {
    const savedBase = window.localStorage.getItem('agent_base_url');
    const savedKey = window.localStorage.getItem('provider_api_key');
    const savedModel = window.localStorage.getItem('model_name');
    if (savedBase) setBaseUrl(savedBase);
    if (savedKey) setApiKey(savedKey);
    if (savedModel) setModel(savedModel);
  }, []);

  const handleInspect = (submissionId?: string) => {
    if (!submissionId) return;
    setMode('single');
    setSelectedSubmissionId(submissionId);
  };

  const applySettings = async (next: { baseUrl: string; apiKey: string; model: string }) => {
    setTestStatus({ state: 'loading', message: 'Testing connectivity...' });
    setBaseUrl(next.baseUrl);
    setApiKey(next.apiKey);
    setModel(next.model);
    window.localStorage.setItem('agent_base_url', next.baseUrl.trim());
    if (next.apiKey.trim()) {
      window.localStorage.setItem('provider_api_key', next.apiKey.trim());
    } else {
      window.localStorage.removeItem('provider_api_key');
    }
    window.localStorage.setItem('model_name', next.model.trim());

    try {
      const res = await fetch(`${next.baseUrl.replace(/\/$/, '')}/health`);
      const data = await res.json();
      if (data && data.status === 'ok') {
        setConnection({ state: 'connected', message: data.version || 'ready' });
        setTestStatus({ state: 'ok', message: '连接成功' });
      } else {
        setConnection({ state: 'disconnected', message: '健康检查失败' });
        setTestStatus({ state: 'error', message: '健康检查失败' });
      }
    } catch (e) {
      setConnection({ state: 'disconnected', message: '无法连接本地 Orchestrator' });
      setTestStatus({ state: 'error', message: String(e) });
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/upload-capture?name=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
      });
      const data = await res.json();
      if (data && data.capturePath) {
        setCapturePath(data.capturePath);
        setConnection({ state: 'connected', message: 'Capture uploaded' });
      } else {
        setConnection({ state: 'disconnected', message: 'Upload failed' });
      }
    } catch (e) {
      setConnection({ state: 'disconnected', message: String(e) });
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    const question = userInput.trim();
    if (!question) return;

    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');

    if (!capturePath) {
      const warnMsg: Message = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        status: 'warning',
        summary: {
          title: '缺少捕获文件',
          description: '请先在左侧上传 .rdc 捕获，再提交诊断请求。',
          tag: 'warning',
        },
      };
      setMessages(prev => [...prev, warnMsg]);
      return;
    }

    const pendingId = `agent-${Date.now()}`;
    const pending: Message = {
      id: pendingId,
      role: 'agent',
      status: 'processing',
      steps: [
        {
          id: 'pending',
          title: 'Planner/Tool executing',
          status: 'processing',
          logs: [{ type: 'info', content: '等待 orchestrator 返回诊断结果…' }],
        },
      ],
    };
    setMessages(prev => [...prev, pending]);
    setSending(true);

    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/nl-debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, capturePath, openrouterKey: apiKey }),
      });
      const data = await res.json();
      const agentMessage: Message = data.message || pending;
      setMessages(prev => prev.map(m => (m.id === pendingId ? agentMessage : m)));

      if (data.submission) {
        setSubmissions(prev => [data.submission, ...prev]);
        if (data.submission.status !== 'processing') {
          setSelectedSubmissionId(data.submission.id);
        }
      }
      setConnection({ state: 'connected', message: '诊断完成' });
    } catch (e) {
      const failMsg: Message = {
        id: pendingId,
        role: 'agent',
        status: 'warning',
        summary: {
          title: '诊断失败',
          description: String(e),
          tag: 'critical',
        },
      };
      setMessages(prev => prev.map(m => (m.id === pendingId ? failMsg : m)));
      setConnection({ state: 'disconnected', message: '诊断请求失败' });
    } finally {
      setSending(false);
    }
  };

  const sidebarStyle = { '--sidebar-width': `${sidebarPercent}%` } as React.CSSProperties;
  const feedStyle = { '--feed-width': `${feedPercent}%` } as React.CSSProperties;

  return (
    <div className="min-h-screen w-full bg-obsidian-bg text-obsidian-primaryText">
      <div
        ref={layoutRef}
        className="flex min-h-screen w-full flex-col gap-4 px-4 py-4 lg:h-screen lg:flex-row lg:items-stretch lg:gap-0 lg:overflow-hidden"
      >
        <div className="w-full lg:w-[var(--sidebar-width)] lg:shrink-0" style={sidebarStyle}>
          <Sidebar
            connection={connection}
            onOpenSettings={() => setSettingsOpen(true)}
            onUpload={handleUpload}
            capturePath={capturePath}
            uploading={uploading}
          />
        </div>

        <ResizeHandle label="Resize sidebar" onPointerDown={startDrag('sidebar')} />

        <div className="flex min-h-0 w-full flex-col gap-4 lg:w-[var(--feed-width)] lg:shrink-0" style={feedStyle}>
          <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-obsidian-border bg-obsidian-panel p-4 shadow-inner">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-wide text-obsidian-secondaryText">Diagnostic Feed</div>
                <div className="text-xl font-semibold text-obsidian-primaryText">Renderdoc Agent Workspace</div>
              </div>
              <button className="inline-flex items-center gap-2 rounded-lg border border-status-processing/60 bg-status-processing/10 px-3 py-2 text-sm font-semibold text-status-processing">
                <Sparkles className="h-4 w-4" /> New Query
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
              {messages.map(msg => (
                <MessageItem key={msg.id} message={msg} onInspect={() => handleInspect(msg.submissionId)} />
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-obsidian-border bg-obsidian-bg px-3 py-2">
              <input
                className="flex-1 rounded-lg bg-transparent px-2 py-2 text-sm text-obsidian-primaryText outline-none"
                placeholder="输入诊断问题，回车发送"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-status-processing px-3 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                发送
              </button>
            </div>

            <div className="rounded-xl border border-obsidian-border bg-obsidian-bg px-3 py-2 text-sm text-obsidian-secondaryText">
              <span>诊断提示：</span> processing 状态的 Submission 不会出现在右侧历史下拉中。
            </div>
          </div>
        </div>

        <ResizeHandle label="Resize canvas" onPointerDown={startDrag('feed')} />

        <div className="min-h-0 w-full lg:flex-1 lg:min-w-0">
          <CanvasPanel
            submissions={submissions}
            mode={mode}
            selectedId={selectedSubmissionId}
            onModeChange={setMode}
            onSelect={setSelectedSubmissionId}
          />
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        baseUrl={baseUrl}
        apiKey={apiKey}
        model={model}
        onClose={() => setSettingsOpen(false)}
        onApply={applySettings}
        status={testStatus}
      />
    </div>
  );
};

export default DebugPanel;

