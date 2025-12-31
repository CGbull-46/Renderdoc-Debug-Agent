import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  FileText,
  Gauge,
  History as HistoryIcon,
  Image as ImageIcon,
  Loader2,
  PlayCircle,
  Plus,
  PlugZap,
  RefreshCcw,
  Settings as SettingsIcon,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import {
  CoTStep,
  HistoryPayload,
  Message,
  ModelOption,
  ModelsResponse,
  ProjectMeta,
  ProjectResource,
  ProjectSummary,
  Submission,
  SubmissionStatus,
} from './types';

type CanvasMode = 'aggregated' | 'single';
type SettingsPayload = { apiKey?: string; plannerModel?: string; actionModel?: string };
type SettingsResponse = {
  ok?: boolean;
  hasApiKey?: boolean;
  plannerModel?: string;
  actionModel?: string;
  error?: string;
  detail?: string;
};

const SIDEBAR_MIN = 10;
const SIDEBAR_MAX = 15;
const FEED_MIN = 15;
const FEED_MAX = 25;
const DEFAULT_SIDEBAR = 12;
const DEFAULT_FEED = 20;
const BASE_URL = 'http://127.0.0.1:8080';

const STORAGE_KEYS = {
  activeProjectId: 'active_project_id',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
  onCreateProject,
  onToggleOpenPanel,
  openPanel,
  onSelectProject,
  onRefreshProjects,
  loadingProjects,
  onImportProject,
  importing,
  projects,
  activeProject,
  projectMode,
  onUpload,
  capturePath,
  uploading,
  resources,
  onPreviewResource,
  loadingResources,
}: {
  connection: { state: 'connected' | 'disconnected' | 'unknown'; message?: string };
  onOpenSettings: () => void;
  onCreateProject: () => void;
  onToggleOpenPanel: () => void;
  openPanel: boolean;
  onSelectProject: (projectId: string) => void;
  onRefreshProjects: () => void;
  loadingProjects: boolean;
  onImportProject: (files: FileList) => void;
  importing: boolean;
  projects: ProjectSummary[];
  activeProject: ProjectMeta | null;
  projectMode: 'open' | 'create' | null;
  onUpload: (file: File) => void;
  capturePath: string;
  uploading: boolean;
  resources: ProjectResource[];
  onPreviewResource: (resource: ProjectResource) => void;
  loadingResources: boolean;
}) {
  const groupedResources = useMemo(() => {
    const groups = {
      captures: [] as ProjectResource[],
      exports: [] as ProjectResource[],
      logs: [] as ProjectResource[],
      meta: [] as ProjectResource[],
      other: [] as ProjectResource[],
    };
    resources.forEach(item => {
      if (item.path === 'project.json' || item.path === 'history.json') groups.meta.push(item);
      else if (item.path.startsWith('captures/')) groups.captures.push(item);
      else if (item.path.startsWith('exports/')) groups.exports.push(item);
      else if (item.path.startsWith('logs/')) groups.logs.push(item);
      else groups.other.push(item);
    });
    return groups;
  }, [resources]);

  const projectLabel = activeProject ? activeProject.name : 'No active project';

  return (
    <div className="flex h-full w-full flex-col gap-4 rounded-2xl border border-obsidian-border bg-obsidian-panel p-4 shadow-inner">
      <div className="flex flex-col gap-2">
        <button
          className="flex items-center justify-center gap-2 rounded-xl border border-status-processing/60 bg-status-processing/20 px-3 py-2 text-sm font-semibold text-status-processing transition hover:shadow-glow"
          onClick={onToggleOpenPanel}
        >
          <FolderOpen className="h-4 w-4" /> Open Project
        </button>
        <button
          className="flex items-center justify-center gap-2 rounded-xl border border-obsidian-border bg-obsidian-bg px-3 py-2 text-sm font-semibold text-obsidian-primaryText transition hover:bg-obsidian-panel"
          onClick={onCreateProject}
        >
          <Plus className="h-4 w-4" /> Create Project
        </button>
      </div>

      {openPanel && (
        <div className="space-y-3 rounded-xl border border-obsidian-border bg-obsidian-bg p-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-obsidian-secondaryText">
            Projects
            <button
              className="flex items-center gap-1 text-obsidian-secondaryText hover:text-obsidian-primaryText"
              onClick={onRefreshProjects}
              type="button"
            >
              <RefreshCcw className="h-3 w-3" /> Refresh
            </button>
          </div>
          {loadingProjects && <div className="text-xs text-status-processing">Loading projects...</div>}
          <div className="space-y-2">
            {projects.length === 0 && <div className="text-xs text-obsidian-secondaryText">No projects</div>}
            {projects.map(project => (
              <button
                key={project.id}
                className={`flex w-full items-center justify-between rounded-lg border px-2 py-2 text-left text-sm transition ${
                  project.id === activeProject?.id
                    ? 'border-status-processing/50 bg-status-processing/10'
                    : 'border-obsidian-border hover:bg-obsidian-panel'
                }`}
                onClick={() => onSelectProject(project.id)}
              >
                <div>
                  <div className="font-semibold text-obsidian-primaryText">{project.name}</div>
                  <div className="text-xs text-obsidian-secondaryText">{project.id}</div>
                </div>
                <div className="text-right text-xs text-obsidian-secondaryText">
                  <div>{new Date(project.updatedAt).toLocaleString()}</div>
                  <div>{project.hasCapture ? 'Has capture' : 'Empty'}</div>
                </div>
              </button>
            ))}
          </div>
          <label className="block rounded-lg border border-obsidian-border bg-obsidian-panel px-3 py-2 text-xs text-obsidian-secondaryText">
            <div className="mb-2 flex items-center gap-2 font-semibold text-obsidian-primaryText">
              <UploadCloud className="h-4 w-4" /> Import project (folder or files)
            </div>
            {/* @ts-expect-error webkitdirectory is supported in Chromium-based browsers */}
            <input
              type="file"
              className="w-full text-obsidian-secondaryText"
              onChange={e => {
                const files = e.target.files;
                if (files && files.length > 0) onImportProject(files);
              }}
              multiple
              webkitdirectory="true"
              disabled={importing}
            />
            {importing && <div className="mt-1 text-xs text-status-processing">Importing...</div>}
          </label>
        </div>
      )}

      <div className="rounded-xl border border-obsidian-border bg-obsidian-bg p-3">
        <div className="mb-2 text-xs font-semibold uppercase text-obsidian-secondaryText">Active Project</div>
        <div className="text-sm text-obsidian-primaryText">{projectLabel}</div>
        {activeProject && (
          <div className="mt-2 text-xs text-obsidian-secondaryText">
            <div>ID: {activeProject.id}</div>
            <div>Updated: {new Date(activeProject.updatedAt).toLocaleString()}</div>
          </div>
        )}
      </div>

      {projectMode === 'create' && activeProject && (
        <label className="block rounded-xl border border-obsidian-border bg-obsidian-bg p-3 text-sm text-obsidian-primaryText">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-obsidian-secondaryText">
            Upload File (.rdc)
            {capturePath ? <span className="text-status-success">Uploaded</span> : <span>Needs .rdc</span>}
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
          {uploading && <div className="mt-2 text-xs text-status-processing">Uploading...</div>}
          {capturePath && <div className="mt-2 text-xs text-obsidian-secondaryText break-all">{capturePath}</div>}
        </label>
      )}

      <div className="rounded-xl border border-obsidian-border bg-obsidian-bg p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-obsidian-secondaryText">
          Resources
          {loadingResources && <span className="text-status-processing">Loading...</span>}
        </div>
        {resources.length === 0 && !loadingResources && (
          <div className="text-xs text-obsidian-secondaryText">No resources</div>
        )}
        <div className="space-y-3 text-sm text-obsidian-primaryText">
          {[
            { key: 'captures', label: 'Captures', items: groupedResources.captures },
            { key: 'exports', label: 'Exports', items: groupedResources.exports },
            { key: 'logs', label: 'Logs', items: groupedResources.logs },
            { key: 'meta', label: 'Meta', items: groupedResources.meta },
            { key: 'other', label: 'Other', items: groupedResources.other },
          ].map(group =>
            group.items.length > 0 ? (
              <div key={group.key}>
                <div className="mb-1 text-xs font-semibold uppercase text-obsidian-secondaryText">{group.label}</div>
                <div className="space-y-1">
                  {group.items.map(item => {
                    const icon =
                      item.type === 'image'
                        ? ImageIcon
                        : item.type === 'rdc'
                        ? PlugZap
                        : item.type === 'json' || item.type === 'log'
                        ? FileText
                        : FolderOpen;
                    const Icon = icon;
                    return (
                      <button
                        key={item.path}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-obsidian-panel"
                        onClick={() => onPreviewResource(item)}
                      >
                        <Icon className="h-4 w-4 text-obsidian-secondaryText" />
                        <span className="truncate">{item.path}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null
          )}
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
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              connection.state === 'connected' ? 'bg-status-success' : 'bg-status-critical'
            }`}
          />
        </div>
        {connection.message && <p className="text-xs text-obsidian-secondaryText">{connection.message}</p>}
      </div>
    </div>
  );
}

function SettingsModal({
  open,
  apiKey,
  hasSavedKey,
  plannerModel,
  actionModel,
  models,
  onClose,
  onApply,
  status,
}: {
  open: boolean;
  apiKey: string;
  hasSavedKey: boolean;
  plannerModel: string;
  actionModel: string;
  models: ModelOption[];
  onClose: () => void;
  onApply: (next: { apiKey: string; plannerModel: string; actionModel: string }) => Promise<void>;
  status: { state: 'idle' | 'loading' | 'ok' | 'error'; message?: string };
}) {
  const [form, setForm] = useState({ apiKey, plannerModel, actionModel });

  useEffect(() => {
    setForm({ apiKey, plannerModel, actionModel });
  }, [apiKey, plannerModel, actionModel]);

  const plannerOptions = models.filter(model => model.role === 'planner' || model.role === 'both');
  const actionOptions = models.filter(model => model.role === 'action' || model.role === 'both');
  const resolvedPlannerOptions =
    plannerOptions.length > 0
      ? plannerOptions
      : models.length > 0
      ? models
      : [{ id: form.plannerModel || 'default', label: form.plannerModel || 'default', role: 'planner' }];
  const resolvedActionOptions =
    actionOptions.length > 0
      ? actionOptions
      : models.length > 0
      ? models
      : [{ id: form.actionModel || 'default', label: form.actionModel || 'default', role: 'action' }];

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
            <div className="flex items-center justify-between">
              <span>OpenRouter API Key</span>
              <span className="text-xs text-obsidian-secondaryText">
                {hasSavedKey ? '已在后端保存' : '未保存'}
              </span>
            </div>
            <input
              className="w-full rounded-lg border border-obsidian-border bg-obsidian-bg px-3 py-2 text-sm text-obsidian-primaryText"
              type="password"
              value={form.apiKey}
              placeholder={hasSavedKey ? '留空表示不修改' : '未保存'}
              onChange={e => setForm(prev => ({ ...prev, apiKey: e.target.value }))}
            />
          </label>

          <label className="block space-y-2 text-sm text-obsidian-primaryText">
            <span>Planner Model</span>
            <select
              className="w-full rounded-lg border border-obsidian-border bg-obsidian-bg px-3 py-2 text-sm text-obsidian-primaryText"
              value={form.plannerModel}
              onChange={e => setForm(prev => ({ ...prev, plannerModel: e.target.value }))}
            >
              {resolvedPlannerOptions.map(model => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm text-obsidian-primaryText">
            <span>Action Model</span>
            <select
              className="w-full rounded-lg border border-obsidian-border bg-obsidian-bg px-3 py-2 text-sm text-obsidian-primaryText"
              value={form.actionModel}
              onChange={e => setForm(prev => ({ ...prev, actionModel: e.target.value }))}
            >
              {resolvedActionOptions.map(model => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [mode, setMode] = useState<CanvasMode>('single');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [plannerModel, setPlannerModel] = useState('');
  const [actionModel, setActionModel] = useState('');
  const [models, setModels] = useState<ModelOption[]>([]);
  const [connection, setConnection] = useState<{ state: 'connected' | 'disconnected' | 'unknown'; message?: string }>(
    { state: 'unknown' }
  );
  const [testStatus, setTestStatus] = useState<{ state: 'idle' | 'loading' | 'ok' | 'error'; message?: string }>(
    { state: 'idle' }
  );
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectMeta | null>(null);
  const [projectMode, setProjectMode] = useState<'open' | 'create' | null>(null);
  const [projectPanelOpen, setProjectPanelOpen] = useState(false);
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [importingProject, setImportingProject] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [capturePath, setCapturePath] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resourcePreview, setResourcePreview] = useState<
    | { item: ProjectResource; content?: string; url?: string; error?: string; loading: boolean }
    | null
  >(null);
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
    const savedProjectId = window.localStorage.getItem(STORAGE_KEYS.activeProjectId);
    if (savedProjectId) setActiveProjectId(savedProjectId);
  }, []);

  useEffect(() => {
    if (!submissions.length) {
      setSelectedSubmissionId(null);
      return;
    }
    const stillExists = submissions.some(item => item.id === selectedSubmissionId);
    if (!stillExists) {
      const fallback = submissions.find(item => item.status !== 'processing')?.id ?? submissions[0]?.id ?? null;
      setSelectedSubmissionId(fallback);
    }
  }, [selectedSubmissionId, submissions]);

  const refreshProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch(`${BASE_URL}/projects`);
      const data = await res.json();
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch (e) {
      setConnection({ state: 'disconnected', message: String(e) });
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const loadProject = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setLoadingResources(true);
    try {
      const [projectRes, historyRes, resourcesRes] = await Promise.all([
        fetch(`${BASE_URL}/projects/${projectId}`),
        fetch(`${BASE_URL}/projects/${projectId}/history`),
        fetch(`${BASE_URL}/projects/${projectId}/resources`),
      ]);

      if (projectRes.ok) {
        const data = await projectRes.json();
        setActiveProject(data.project || null);
        const capture = data.project?.captures?.[0];
        setCapturePath(capture?.path || '');
      }

      if (historyRes.ok) {
        const history = (await historyRes.json()) as HistoryPayload;
        setMessages(Array.isArray(history.messages) ? history.messages : []);
        setSubmissions(Array.isArray(history.submissions) ? history.submissions : []);
      }

      if (resourcesRes.ok) {
        const resourcesPayload = await resourcesRes.json();
        setResources(Array.isArray(resourcesPayload.resources) ? resourcesPayload.resources : []);
      }
    } catch (e) {
      setConnection({ state: 'disconnected', message: String(e) });
    } finally {
      setLoadingResources(false);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (!activeProjectId) {
      setActiveProject(null);
      setResources([]);
      setMessages([]);
      setSubmissions([]);
      setCapturePath('');
      return;
    }
    window.localStorage.setItem(STORAGE_KEYS.activeProjectId, activeProjectId);
    loadProject(activeProjectId);
  }, [activeProjectId, loadProject]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/settings`);
      const data = (await res.json()) as SettingsResponse;
      if (!res.ok) {
        throw new Error(data?.error || 'Settings request failed');
      }
      setHasSavedKey(Boolean(data.hasApiKey));
      if (data.plannerModel) {
        setPlannerModel(prev => prev || data.plannerModel || '');
      }
      if (data.actionModel) {
        setActionModel(prev => prev || data.actionModel || '');
      }
    } catch (e) {
      setConnection({ state: 'disconnected', message: String(e) });
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const loadModels = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/models`);
      const data = (await res.json()) as ModelsResponse;
      const nextModels = Array.isArray(data.models) ? data.models : [];
      setModels(nextModels);
      if (!plannerModel) setPlannerModel(data.defaultPlanner || nextModels[0]?.id || '');
      if (!actionModel) setActionModel(data.defaultAction || nextModels[0]?.id || '');
    } catch (e) {
      setConnection({ state: 'disconnected', message: String(e) });
    }
  }, [actionModel, plannerModel]);

  useEffect(() => {
    if (settingsOpen) {
      loadModels();
      loadSettings();
    }
  }, [loadModels, loadSettings, settingsOpen]);

  const handleInspect = (submissionId?: string) => {
    if (!submissionId) return;
    setMode('single');
    setSelectedSubmissionId(submissionId);
  };

  const applySettings = async (next: { apiKey: string; plannerModel: string; actionModel: string }) => {
    setTestStatus({ state: 'loading', message: 'Saving settings...' });
    setApiKey(next.apiKey);
    setPlannerModel(next.plannerModel);
    setActionModel(next.actionModel);

    try {
      const payload: SettingsPayload = {
        plannerModel: next.plannerModel.trim(),
        actionModel: next.actionModel.trim(),
      };
      if (next.apiKey.trim()) {
        payload.apiKey = next.apiKey.trim();
      }

      const saveRes = await fetch(`${BASE_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const saveData = (await saveRes.json()) as SettingsResponse;
      if (!saveRes.ok) {
        throw new Error(saveData?.error || 'Settings update failed');
      }

      setHasSavedKey(Boolean(saveData.hasApiKey));
      if (saveData.plannerModel) setPlannerModel(saveData.plannerModel);
      if (saveData.actionModel) setActionModel(saveData.actionModel);
      setApiKey('');

      setTestStatus({ state: 'loading', message: 'Testing connectivity...' });
      const res = await fetch(`${BASE_URL}/health`);
      const data = await res.json();
      if (data && data.status === 'ok') {
        setConnection({ state: 'connected', message: data.version || 'ready' });
        setTestStatus({ state: 'ok', message: 'Connected' });
      } else {
        setConnection({ state: 'disconnected', message: 'Health check failed' });
        setTestStatus({ state: 'error', message: 'Health check failed' });
      }
    } catch (e) {
      setConnection({ state: 'disconnected', message: 'Orchestrator unreachable' });
      setTestStatus({ state: 'error', message: String(e) });
    }
  };

  const handleCreateProject = async () => {
    const name = window.prompt('Project name (optional)');
    if (name === null) return;
    setProjectMode('create');
    try {
      const res = await fetch(`${BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (data?.projectId) {
        setActiveProjectId(data.projectId);
        setProjectPanelOpen(false);
        refreshProjects();
      }
    } catch (e) {
      setConnection({ state: 'disconnected', message: String(e) });
    }
  };

  const handleSelectProject = (projectId: string) => {
    setProjectMode('open');
    setActiveProjectId(projectId);
    setProjectPanelOpen(false);
  };

  const handleImportProject = async (files: FileList) => {
    if (!files || files.length === 0) return;
    setImportingProject(true);
    try {
      const form = new FormData();
      Array.from(files).forEach(file => {
        const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        form.append('files', file, relativePath);
      });
      const res = await fetch(`${BASE_URL}/projects/import`, { method: 'POST', body: form });
      const data = await res.json();
      if (data?.projectId) {
        setProjectMode('open');
        setActiveProjectId(data.projectId);
        setProjectPanelOpen(false);
        refreshProjects();
      }
    } catch (e) {
      setConnection({ state: 'disconnected', message: String(e) });
    } finally {
      setImportingProject(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!activeProjectId) {
      setConnection({ state: 'disconnected', message: 'Please select a project first.' });
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/projects/${activeProjectId}/upload-capture?name=${encodeURIComponent(file.name)}`,
        {
          method: 'POST',
          body: file,
        }
      );
      const data = await res.json();
      if (data && data.capturePath) {
        setCapturePath(data.capturePath);
        setConnection({ state: 'connected', message: 'Capture uploaded' });
        loadProject(activeProjectId);
      } else {
        setConnection({ state: 'disconnected', message: 'Upload failed' });
      }
    } catch (e) {
      setConnection({ state: 'disconnected', message: String(e) });
    } finally {
      setUploading(false);
    }
  };

  const handlePreviewResource = async (resource: ProjectResource) => {
    if (!activeProjectId) return;
    if (resourcePreview?.url) {
      URL.revokeObjectURL(resourcePreview.url);
    }
    setResourcePreview({ item: resource, loading: true });
    try {
      const res = await fetch(
        `${BASE_URL}/projects/${activeProjectId}/resource?path=${encodeURIComponent(resource.path)}`
      );
      if (!res.ok) throw new Error('Failed to load resource');
      if (resource.type === 'image') {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setResourcePreview({ item: resource, loading: false, url });
      } else {
        const text = await res.text();
        let formatted = text;
        if (resource.type === 'json') {
          try {
            formatted = JSON.stringify(JSON.parse(text), null, 2);
          } catch (err) {
            formatted = text;
          }
        }
        setResourcePreview({ item: resource, loading: false, content: formatted });
      }
    } catch (e) {
      setResourcePreview({ item: resource, loading: false, error: String(e) });
    }
  };

  const closePreview = () => {
    if (resourcePreview?.url) {
      URL.revokeObjectURL(resourcePreview.url);
    }
    setResourcePreview(null);
  };

  const handleSend = async () => {
    const question = userInput.trim();
    if (!question) return;

    if (!activeProjectId) {
      const warnMsg: Message = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        status: 'warning',
        summary: {
          title: 'No active project',
          description: 'Please open or create a project first.',
          tag: 'warning',
        },
      };
      setMessages(prev => [...prev, warnMsg]);
      return;
    }

    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');

    if (!capturePath) {
      const warnMsg: Message = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        status: 'warning',
        summary: {
          title: 'Capture missing',
          description: 'Upload a .rdc capture before sending a request.',
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
          logs: [{ type: 'info', content: 'Waiting for orchestrator response...' }],
        },
      ],
    };
    setMessages(prev => [...prev, pending]);
    setSending(true);

    try {
      const payload: {
        question: string;
        capturePath: string;
        plannerModel: string;
        actionModel: string;
        projectId: string | null;
        openrouterKey?: string;
      } = {
        question,
        capturePath,
        plannerModel,
        actionModel,
        projectId: activeProjectId,
      };
      if (apiKey.trim()) {
        payload.openrouterKey = apiKey.trim();
      }

      const res = await fetch(`${BASE_URL}/nl-debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      setConnection({ state: 'connected', message: 'Analysis complete' });
    } catch (e) {
      const failMsg: Message = {
        id: pendingId,
        role: 'agent',
        status: 'warning',
        summary: {
          title: 'Request failed',
          description: String(e),
          tag: 'critical',
        },
      };
      setMessages(prev => prev.map(m => (m.id === pendingId ? failMsg : m)));
      setConnection({ state: 'disconnected', message: 'Request failed' });
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
            onCreateProject={handleCreateProject}
            onToggleOpenPanel={() => setProjectPanelOpen(prev => !prev)}
            openPanel={projectPanelOpen}
            onSelectProject={handleSelectProject}
            onRefreshProjects={refreshProjects}
            loadingProjects={loadingProjects}
            onImportProject={handleImportProject}
            importing={importingProject}
            projects={projects}
            activeProject={activeProject}
            projectMode={projectMode}
            onUpload={handleUpload}
            capturePath={capturePath}
            uploading={uploading}
            resources={resources}
            onPreviewResource={handlePreviewResource}
            loadingResources={loadingResources}
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
              {messages.length === 0 && (
                <div className="rounded-xl border border-obsidian-border bg-obsidian-bg px-3 py-4 text-sm text-obsidian-secondaryText">
                  No history yet. Create a project and upload a capture to start.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-obsidian-border bg-obsidian-bg px-3 py-2">
              <input
                className="flex-1 rounded-lg bg-transparent px-2 py-2 text-sm text-obsidian-primaryText outline-none"
                placeholder="Type a debugging question, press Enter to send"
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
                Send
              </button>
            </div>

            <div className="rounded-xl border border-obsidian-border bg-obsidian-bg px-3 py-2 text-sm text-obsidian-secondaryText">
              Submissions in processing status will not appear in the right-hand history dropdown.
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
        apiKey={apiKey}
        hasSavedKey={hasSavedKey}
        plannerModel={plannerModel}
        actionModel={actionModel}
        models={models}
        onClose={() => setSettingsOpen(false)}
        onApply={applySettings}
        status={testStatus}
      />

      {resourcePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-4xl rounded-2xl border border-obsidian-border bg-obsidian-panel p-6 shadow-glow">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-lg font-semibold text-obsidian-primaryText">Resource Preview</div>
              <button className="text-obsidian-secondaryText hover:text-obsidian-primaryText" onClick={closePreview}>
                Close
              </button>
            </div>
            <div className="text-sm text-obsidian-secondaryText">{resourcePreview.item.path}</div>
            {resourcePreview.loading && (
              <div className="mt-4 text-sm text-obsidian-secondaryText">Loading resource...</div>
            )}
            {resourcePreview.error && (
              <div className="mt-4 rounded-lg border border-status-critical/40 bg-status-critical/10 px-3 py-2 text-sm text-status-critical">
                {resourcePreview.error}
              </div>
            )}
            {!resourcePreview.loading && !resourcePreview.error && resourcePreview.url && (
              <img src={resourcePreview.url} alt={resourcePreview.item.path} className="mt-4 max-h-[60vh] w-full object-contain" />
            )}
            {!resourcePreview.loading && !resourcePreview.error && resourcePreview.content && (
              <pre className="mt-4 max-h-[60vh] overflow-auto rounded-lg bg-obsidian-bg p-4 text-xs text-obsidian-primaryText">
                {resourcePreview.content}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;

