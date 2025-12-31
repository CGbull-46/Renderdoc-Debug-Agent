// Minimal Cloud Orchestrator: bridges MCP RenderDoc tools and OpenRouter.
// Expanded to serve health/models endpoints and return structured Message/Submission payloads.

const WebSocket = require('ws');
const axios = require('axios');
const http = require('http');
const fs = require('fs');
const path = require('path');
const Busboy = require('busboy');

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const MCP_HOST = process.env.MCP_HOST || '127.0.0.1';
const MCP_PORT = Number(process.env.MCP_PORT || 8765);
const ORCH_PORT = Number(process.env.ORCH_PORT || 8080);
const VERSION = '0.2.0';
const REPO_ROOT = path.join(__dirname, '..', '..');
const CONFIG_ROOT = path.join(REPO_ROOT, 'runtime', 'config');
const LEGACY_CONFIG_ROOT = path.join(REPO_ROOT, 'config');
const CONFIG_ENV_PATH = path.join(CONFIG_ROOT, '.env');
const MODELS_CONFIG_PATH = path.join(CONFIG_ROOT, 'models.json');
const LEGACY_MODELS_CONFIG_PATH = path.join(LEGACY_CONFIG_ROOT, 'models.json');
const LEGACY_OPENROUTER_PATH = path.join(LEGACY_CONFIG_ROOT, 'openrouter.json');
const PROJECTS_ROOT = path.join(REPO_ROOT, 'projects');

function parseEnvFile(content) {
  const parsed = {};
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index === -1) return;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  });
  return parsed;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return parseEnvFile(raw);
  } catch (e) {
    return {};
  }
}

function serializeEnvValue(value) {
  if (value === undefined || value === null) return '';
  const text = String(value);
  if (!text) return '';
  if (/[\s"'=]/.test(text)) {
    const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return text;
}

function writeEnvFile(filePath, envMap) {
  ensureDir(path.dirname(filePath));
  const entries = Object.entries(envMap)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => `${key}=${serializeEnvValue(value)}`);
  fs.writeFileSync(filePath, `${entries.join('\n')}${entries.length ? '\n' : ''}`, 'utf-8');
}

function loadLegacyOpenRouter() {
  if (!fs.existsSync(LEGACY_OPENROUTER_PATH)) return {};
  try {
    const raw = fs.readFileSync(LEGACY_OPENROUTER_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    return {
      apiKey: typeof cfg.apiKey === 'string' ? cfg.apiKey : '',
      plannerModel: typeof cfg.plannerModel === 'string' ? cfg.plannerModel : '',
      explainerModel: typeof cfg.explainerModel === 'string' ? cfg.explainerModel : '',
    };
  } catch (e) {
    return {};
  }
}

function pickValue(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return '';
}

function loadConfig() {
  const envFile = loadEnvFile(CONFIG_ENV_PATH);
  const legacy = loadLegacyOpenRouter();
  return {
    apiKey: pickValue(envFile.OPENROUTER_API_KEY, process.env.OPENROUTER_API_KEY, legacy.apiKey, ''),
    plannerModel: pickValue(
      envFile.PLANNER_MODEL,
      process.env.PLANNER_MODEL,
      legacy.plannerModel,
      'gpt-4o-mini'
    ),
    explainerModel: pickValue(
      envFile.EXPLAINER_MODEL,
      process.env.EXPLAINER_MODEL,
      legacy.explainerModel,
      'gpt-4o'
    ),
  };
}

let CONFIG = loadConfig();

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function writeJsonFile(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
}

function nowIso() {
  return new Date().toISOString();
}

let projectSeq = 0;
function nextProjectId() {
  projectSeq += 1;
  return `proj_${Date.now()}_${projectSeq}`;
}

function isValidProjectId(projectId) {
  return /^[a-zA-Z0-9_-]+$/.test(projectId);
}

function normalizeRelativePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return null;
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.includes('..')) return null;
  return normalized;
}

function isAllowedProjectPath(relPath) {
  if (!relPath) return false;
  if (relPath === 'project.json' || relPath === 'history.json') return true;
  if (relPath.startsWith('captures/')) return relPath.toLowerCase().endsWith('.rdc');
  if (relPath.startsWith('exports/')) return true;
  if (relPath.startsWith('logs/')) return true;
  return false;
}

function resolveProjectPath(projectDir, relPath) {
  const normalized = normalizeRelativePath(relPath);
  if (!normalized || !isAllowedProjectPath(normalized)) return null;
  const root = path.resolve(projectDir);
  const absPath = path.resolve(root, normalized);
  if (!(absPath === root || absPath.startsWith(`${root}${path.sep}`))) return null;
  return absPath;
}

function ensureProjectStructure(projectDir, projectMeta) {
  ensureDir(projectDir);
  ensureDir(path.join(projectDir, 'captures'));
  ensureDir(path.join(projectDir, 'exports'));
  ensureDir(path.join(projectDir, 'logs'));
  const projectPath = path.join(projectDir, 'project.json');
  if (!fs.existsSync(projectPath)) {
    writeJsonFile(projectPath, projectMeta);
  }
  const historyPath = path.join(projectDir, 'history.json');
  if (!fs.existsSync(historyPath)) {
    writeJsonFile(historyPath, { version: 1, submissions: [], messages: [] });
  }
}

function loadProjectMeta(projectDir) {
  const projectPath = path.join(projectDir, 'project.json');
  return readJsonFile(projectPath, null);
}

function updateProjectMeta(projectDir, updater) {
  const projectPath = path.join(projectDir, 'project.json');
  const current = readJsonFile(projectPath, null);
  if (!current) return null;
  const next = updater(current);
  if (!next) return null;
  writeJsonFile(projectPath, next);
  return next;
}

function readHistory(projectDir) {
  const historyPath = path.join(projectDir, 'history.json');
  return readJsonFile(historyPath, { version: 1, submissions: [], messages: [] });
}

function writeHistory(projectDir, history) {
  const historyPath = path.join(projectDir, 'history.json');
  writeJsonFile(historyPath, history);
}

function appendHistory(projectDir, submission, message) {
  const history = readHistory(projectDir);
  history.submissions = Array.isArray(history.submissions) ? history.submissions : [];
  history.messages = Array.isArray(history.messages) ? history.messages : [];
  history.submissions.unshift(submission);
  history.messages.unshift(message);
  writeHistory(projectDir, history);
  return history;
}

function listProjects() {
  ensureDir(PROJECTS_ROOT);
  const entries = fs.readdirSync(PROJECTS_ROOT, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const projectDir = path.join(PROJECTS_ROOT, entry.name);
      const project = loadProjectMeta(projectDir);
      const stats = fs.existsSync(projectDir) ? fs.statSync(projectDir) : null;
      return {
        id: entry.name,
        name: project?.name || entry.name,
        updatedAt: project?.updatedAt || stats?.mtime?.toISOString?.() || nowIso(),
        hasCapture: Array.isArray(project?.captures) && project.captures.length > 0,
      };
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

function listResources(projectDir) {
  const resources = [];
  const pushFile = (absPath, relPath) => {
    if (!fs.existsSync(absPath)) return;
    const stat = fs.statSync(absPath);
    if (!stat.isFile()) return;
    const ext = path.extname(absPath).toLowerCase();
    let type = 'other';
    if (ext === '.rdc') type = 'rdc';
    else if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) type = 'image';
    else if (ext === '.json') type = 'json';
    else if (ext === '.log' || ext === '.txt') type = 'log';
    resources.push({
      path: relPath.replace(/\\/g, '/'),
      type,
      size: stat.size,
      updatedAt: new Date(stat.mtimeMs).toISOString(),
    });
  };

  const walk = (dirPath, relBase) => {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    entries.forEach(entry => {
      const absPath = path.join(dirPath, entry.name);
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(absPath, relPath);
      } else {
        pushFile(absPath, relPath);
      }
    });
  };

  pushFile(path.join(projectDir, 'project.json'), 'project.json');
  pushFile(path.join(projectDir, 'history.json'), 'history.json');
  walk(path.join(projectDir, 'captures'), 'captures');
  walk(path.join(projectDir, 'exports'), 'exports');
  walk(path.join(projectDir, 'logs'), 'logs');
  return resources;
}

function loadModelsConfig() {
  const configPath = fs.existsSync(MODELS_CONFIG_PATH) ? MODELS_CONFIG_PATH : LEGACY_MODELS_CONFIG_PATH;
  const fallback = {
    models: [
      { id: CONFIG.plannerModel, label: CONFIG.plannerModel, role: 'planner' },
      { id: CONFIG.explainerModel, label: CONFIG.explainerModel, role: 'action' },
    ],
    defaultPlanner: CONFIG.plannerModel,
    defaultAction: CONFIG.explainerModel,
  };
  if (!fs.existsSync(configPath)) {
    return fallback;
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      models: Array.isArray(parsed.models) ? parsed.models : fallback.models,
      defaultPlanner: parsed.defaultPlanner || fallback.defaultPlanner,
      defaultAction: parsed.defaultAction || fallback.defaultAction,
    };
  } catch (e) {
    return fallback;
  }
}

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload, null, 2));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

async function callOpenRouter(model, systemPrompt, userContent, asJson = false, overrideKey) {
  const apiKey = overrideKey || CONFIG.apiKey;
  if (!apiKey) {
    throw new Error(
      'OpenRouter API key missing; please provide one in request or configure runtime/config/.env (OPENROUTER_API_KEY)'
    );
  }
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  };
  if (asJson) {
    body.response_format = { type: 'json_object' };
  }
  const res = await axios.post(OPENROUTER_API, body, { headers, timeout: 60000 });
  const msg = res.data.choices[0].message;
  return msg.content;
}

async function callMcpTool(tool, args) {
  const ws = new WebSocket(`ws://${MCP_HOST}:${MCP_PORT}`);
  const request = { id: String(Date.now()), tool, arguments: args };
  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify(request));
    });
    ws.on('message', data => {
      try {
        const msg = JSON.parse(data.toString());
        resolve(msg);
      } catch (e) {
        reject(e);
      } finally {
        ws.close();
      }
    });
    ws.on('error', err => reject(err));
  });
}

function resolveCapturePath(projectId, capturePath) {
  if (!capturePath || typeof capturePath !== 'string') return capturePath;
  if (path.isAbsolute(capturePath)) return capturePath;
  if (!projectId || !isValidProjectId(projectId)) return capturePath;
  const projectDir = path.resolve(PROJECTS_ROOT, projectId);
  const resolved = path.resolve(projectDir, capturePath);
  if (!(resolved === projectDir || resolved.startsWith(`${projectDir}${path.sep}`))) return capturePath;
  return resolved;
}

async function handleNlDebug(body, res) {
  const { question, capturePath, openrouterKey, plannerModel, actionModel, projectId } = body;
  if (!question) return json(res, 400, { error: 'question is required' });
  if (!capturePath) return json(res, 400, { error: 'capturePath is required' });
  const resolvedCapturePath = resolveCapturePath(projectId, capturePath);

  const plannerSystem = `
You are a RenderDoc planning model.
Given a user question and a capture path, choose exactly one MCP tool to call
from this set: iterate_actions, enumerate_counters, analyze_nan_inf, geometry_anomalies, get_pipeline_state.
Return a JSON object: { "tool": "<name>", "arguments": { ... } }.
The arguments object must be directly usable for the tool.
`;

  const plannerUser = JSON.stringify({ question, capture_path: resolvedCapturePath });
  let planned;
  try {
    const plannerId = plannerModel || CONFIG.plannerModel;
    const content = await callOpenRouter(plannerId, plannerSystem, plannerUser, true, openrouterKey);
    planned = JSON.parse(content);
  } catch (e) {
    return json(res, 500, { error: 'planner_failed', detail: String(e) });
  }

  if (!planned.tool || !planned.arguments) {
    return json(res, 500, { error: 'planner_invalid_output', planned });
  }

  if (planned.arguments && typeof planned.arguments === 'object') {
    planned.arguments.capture_path = resolvedCapturePath;
  }

  let mcpResponse;
  try {
    mcpResponse = await callMcpTool(planned.tool, planned.arguments);
  } catch (e) {
    mcpResponse = { ok: false, error: String(e) };
  }

  const explainerSystem = `
You are a graphics debugging explainer.
Based on the user's question, the chosen tool call, and its JSON result,
explain what you see and what the user should look at next.
Return concise Chinese analysis.
`;

  const explainerUser = JSON.stringify({ question, tool_call: planned, mcp_response: mcpResponse });

  let explanation;
  try {
    const actionId = actionModel || CONFIG.explainerModel;
    explanation = await callOpenRouter(actionId, explainerSystem, explainerUser, false, openrouterKey);
  } catch (e) {
    explanation = `Explainer failed: ${String(e)}`;
  }

  // Attempt to fetch pipeline attachments for Canvas
  let pipelineState = null;
  const probeEvent = planned.arguments.event_id || planned.arguments.eventId || planned.arguments.eventID || 1;
  try {
    const pipelineResp = await callMcpTool('get_pipeline_state', {
      capture_path: resolvedCapturePath,
      event_id: probeEvent,
    });
    pipelineState = pipelineResp.result || null;
  } catch (e) {
    pipelineState = null;
  }

  const submissionId = `sub-${Date.now()}`;
  const submissionStatus = mcpResponse && mcpResponse.ok === false ? 'warning' : 'resolved';
  const submission = {
    id: submissionId,
    timestamp: new Date().toISOString(),
    title: question,
    status: submissionStatus,
    pipelineState: {
      highlightStage: pipelineState?.highlightStage || null,
      warningMessage: pipelineState?.warningMessage || null,
    },
    evidence: {
      colorBuffer: null,
      depthBuffer: null,
    },
  };

  const steps = [
    {
      id: 'plan',
      title: `Planner selected ${planned.tool}`,
      status: 'completed',
      logs: [{ type: 'analysis', content: JSON.stringify(planned) }],
    },
    {
      id: 'tool',
      title: `Execute ${planned.tool}`,
      status: mcpResponse && mcpResponse.ok === false ? 'warning' : 'completed',
      logs: [{ type: 'tool', content: JSON.stringify(mcpResponse) }],
    },
  ];
  if (pipelineState) {
    steps.push({
      id: 'canvas',
      title: 'Pipeline attachments collected',
      status: 'completed',
      logs: [{ type: 'info', content: JSON.stringify(pipelineState) }],
    });
  }

  const message = {
    id: `msg-${submissionId}`,
    role: 'agent',
    submissionId,
    status: submissionStatus,
    steps,
    summary: {
      title: submissionStatus === 'resolved' ? 'RESOLVED' : 'WARNING',
      description: explanation,
      tag: submissionStatus,
    },
  };

  if (projectId && isValidProjectId(projectId)) {
    const projectDir = path.join(PROJECTS_ROOT, projectId);
    if (fs.existsSync(projectDir)) {
      appendHistory(projectDir, submission, message);
      updateProjectMeta(projectDir, project => ({
        ...project,
        updatedAt: nowIso(),
      }));
    }
  }

  return json(res, 200, {
    planned,
    mcp: mcpResponse,
    explanation,
    submission,
    message,
  });
}

function getProjectDir(projectId) {
  if (!isValidProjectId(projectId)) return null;
  const projectDir = path.join(PROJECTS_ROOT, projectId);
  if (!fs.existsSync(projectDir)) return null;
  return projectDir;
}

function buildCaptureList(projectDir) {
  const captureDir = path.join(projectDir, 'captures');
  if (!fs.existsSync(captureDir)) return [];
  const entries = fs.readdirSync(captureDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.rdc'))
    .map(entry => {
      const absPath = path.join(captureDir, entry.name);
      const stats = fs.statSync(absPath);
      return {
        name: entry.name,
        path: `captures/${entry.name}`,
        addedAt: new Date(stats.mtimeMs).toISOString(),
      };
    });
}

function handleProjectsList(res) {
  return json(res, 200, { projects: listProjects() });
}

async function handleProjectsCreate(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    return json(res, 400, { error: 'invalid_json', detail: String(e) });
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const projectId = nextProjectId();
  const projectDir = path.join(PROJECTS_ROOT, projectId);
  const timestamp = nowIso();
  const projectMeta = {
    version: 1,
    id: projectId,
    name: name || projectId,
    createdAt: timestamp,
    updatedAt: timestamp,
    captures: [],
  };
  ensureProjectStructure(projectDir, projectMeta);
  return json(res, 200, { projectId });
}

function handleProjectsImport(req, res) {
  const projectId = nextProjectId();
  const projectDir = path.join(PROJECTS_ROOT, projectId);
  ensureDir(projectDir);
  ensureDir(path.join(projectDir, 'captures'));
  ensureDir(path.join(projectDir, 'exports'));
  ensureDir(path.join(projectDir, 'logs'));

  const busboy = Busboy({ headers: req.headers });
  busboy.on('file', (fieldname, file, info) => {
    const filename = typeof info === 'string' ? info : info?.filename;
    const relPath = normalizeRelativePath(filename || fieldname);
    if (!isAllowedProjectPath(relPath)) {
      file.resume();
      return;
    }
    const destPath = resolveProjectPath(projectDir, relPath);
    if (!destPath) {
      file.resume();
      return;
    }
    ensureDir(path.dirname(destPath));
    const stream = fs.createWriteStream(destPath);
    file.pipe(stream);
  });
  busboy.on('error', err => {
    json(res, 500, { error: 'import_failed', detail: String(err) });
  });

  busboy.on('finish', () => {
    const projectPath = path.join(projectDir, 'project.json');
    let projectMeta = readJsonFile(projectPath, null);
    const timestamp = nowIso();
    if (!projectMeta) {
      projectMeta = {
        version: 1,
        id: projectId,
        name: projectId,
        createdAt: timestamp,
        updatedAt: timestamp,
        captures: [],
      };
    } else {
      projectMeta.id = projectId;
      projectMeta.updatedAt = timestamp;
      projectMeta.name = projectMeta.name || projectId;
    }
    if (!Array.isArray(projectMeta.captures) || projectMeta.captures.length === 0) {
      projectMeta.captures = buildCaptureList(projectDir);
    }
    writeJsonFile(projectPath, projectMeta);
    const historyPath = path.join(projectDir, 'history.json');
    if (!fs.existsSync(historyPath)) {
      writeJsonFile(historyPath, { version: 1, submissions: [], messages: [] });
    }
    return json(res, 200, { projectId });
  });

  req.on('error', err => {
    json(res, 500, { error: 'import_failed', detail: String(err) });
  });
  req.pipe(busboy);
}

function handleProjectDetail(res, projectId) {
  const projectDir = getProjectDir(projectId);
  if (!projectDir) return json(res, 404, { error: 'project_not_found' });
  const project = loadProjectMeta(projectDir);
  if (!project) return json(res, 404, { error: 'project_invalid' });
  return json(res, 200, { project });
}

function handleProjectUpload(req, res, url, projectId) {
  const projectDir = getProjectDir(projectId);
  if (!projectDir) return json(res, 404, { error: 'project_not_found' });
  const name = url.searchParams.get('name') || `capture_${Date.now()}.rdc`;
  const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  if (!safeName.toLowerCase().endsWith('.rdc')) {
    return json(res, 400, { error: 'invalid_capture_name' });
  }
  const capturesDir = path.join(projectDir, 'captures');
  ensureDir(capturesDir);
  const destPath = path.join(capturesDir, safeName);
  const relativePath = `captures/${safeName}`;

  const writeStream = fs.createWriteStream(destPath);
  req.pipe(writeStream);
  req.on('end', () => {
    const timestamp = nowIso();
    updateProjectMeta(projectDir, project => {
      const captures = Array.isArray(project.captures) ? project.captures : [];
      return {
        ...project,
        updatedAt: timestamp,
        captures: [{ name: safeName, path: relativePath, addedAt: timestamp }, ...captures],
      };
    });
    json(res, 200, { capturePath: relativePath });
  });
  req.on('error', e => json(res, 500, { error: 'upload_failed', detail: String(e) }));
}

function handleProjectHistoryGet(res, projectId) {
  const projectDir = getProjectDir(projectId);
  if (!projectDir) return json(res, 404, { error: 'project_not_found' });
  return json(res, 200, readHistory(projectDir));
}

async function handleProjectHistoryPut(req, res, projectId) {
  const projectDir = getProjectDir(projectId);
  if (!projectDir) return json(res, 404, { error: 'project_not_found' });
  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    return json(res, 400, { error: 'invalid_json', detail: String(e) });
  }
  const submissions = Array.isArray(body.submissions) ? body.submissions : [];
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const payload = { version: 1, submissions, messages };
  writeHistory(projectDir, payload);
  updateProjectMeta(projectDir, project => ({
    ...project,
    updatedAt: nowIso(),
  }));
  return json(res, 200, { ok: true });
}

function handleProjectResources(res, projectId) {
  const projectDir = getProjectDir(projectId);
  if (!projectDir) return json(res, 404, { error: 'project_not_found' });
  return json(res, 200, { resources: listResources(projectDir) });
}

function handleProjectResource(res, projectId, url) {
  const projectDir = getProjectDir(projectId);
  if (!projectDir) return json(res, 404, { error: 'project_not_found' });
  const relPath = url.searchParams.get('path');
  const absPath = resolveProjectPath(projectDir, relPath);
  if (!absPath || !fs.existsSync(absPath)) {
    return json(res, 404, { error: 'resource_not_found' });
  }
  const ext = path.extname(absPath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.png') contentType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.gif') contentType = 'image/gif';
  else if (ext === '.webp') contentType = 'image/webp';
  else if (ext === '.json') contentType = 'application/json';
  else if (ext === '.txt' || ext === '.log') contentType = 'text/plain; charset=utf-8';
  const stream = fs.createReadStream(absPath);
  res.writeHead(200, { 'Content-Type': contentType });
  stream.pipe(res);
}

function handleHealth(res) {
  return json(res, 200, {
    status: 'ok',
    version: VERSION,
    mcp: { host: MCP_HOST, port: MCP_PORT },
    models: { planner: CONFIG.plannerModel, explainer: CONFIG.explainerModel },
  });
}

function handleModels(res) {
  const catalog = loadModelsConfig();
  return json(res, 200, {
    models: catalog.models,
    defaultPlanner: catalog.defaultPlanner,
    defaultAction: catalog.defaultAction,
  });
}

function buildSettingsPayload(config) {
  return {
    hasApiKey: Boolean(config.apiKey),
    plannerModel: config.plannerModel,
    actionModel: config.explainerModel,
  };
}

function handleSettingsGet(res) {
  CONFIG = loadConfig();
  return json(res, 200, buildSettingsPayload(CONFIG));
}

async function handleSettingsPut(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    return json(res, 400, { error: 'invalid_json', detail: String(e) });
  }

  const envData = loadEnvFile(CONFIG_ENV_PATH);
  const hasApiKey = Object.prototype.hasOwnProperty.call(body, 'apiKey');
  if (hasApiKey) {
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    if (apiKey) {
      envData.OPENROUTER_API_KEY = apiKey;
    } else {
      delete envData.OPENROUTER_API_KEY;
    }
  }

  const hasPlanner = Object.prototype.hasOwnProperty.call(body, 'plannerModel');
  if (hasPlanner) {
    const plannerModel = typeof body.plannerModel === 'string' ? body.plannerModel.trim() : '';
    if (plannerModel) {
      envData.PLANNER_MODEL = plannerModel;
    }
  }

  const hasAction = Object.prototype.hasOwnProperty.call(body, 'actionModel');
  if (hasAction) {
    const actionModel = typeof body.actionModel === 'string' ? body.actionModel.trim() : '';
    if (actionModel) {
      envData.EXPLAINER_MODEL = actionModel;
    }
  }

  writeEnvFile(CONFIG_ENV_PATH, envData);
  CONFIG = loadConfig();
  return json(res, 200, { ok: true, ...buildSettingsPayload(CONFIG) });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${ORCH_PORT}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return handleHealth(res);
  }
  if (req.method === 'GET' && url.pathname === '/models') {
    return handleModels(res);
  }
  if (req.method === 'GET' && url.pathname === '/settings') {
    return handleSettingsGet(res);
  }
  if (req.method === 'PUT' && url.pathname === '/settings') {
    handleSettingsPut(req, res);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/projects') {
    return handleProjectsList(res);
  }
  if (req.method === 'POST' && url.pathname === '/projects') {
    handleProjectsCreate(req, res);
    return;
  }
  if (req.method === 'POST' && url.pathname === '/projects/import') {
    return handleProjectsImport(req, res);
  }

  if (req.method === 'POST' && url.pathname === '/nl-debug') {
    readJsonBody(req)
      .then(body => handleNlDebug(body, res))
      .catch(e => json(res, 400, { error: 'invalid_json', detail: String(e) }));
    return;
  }

  if (url.pathname.startsWith('/projects/')) {
    const segments = url.pathname.split('/').filter(Boolean);
    const projectId = segments[1];
    if (segments.length === 2 && req.method === 'GET') {
      return handleProjectDetail(res, projectId);
    }
    if (segments.length === 3 && segments[2] === 'upload-capture' && req.method === 'POST') {
      return handleProjectUpload(req, res, url, projectId);
    }
    if (segments.length === 3 && segments[2] === 'history' && req.method === 'GET') {
      return handleProjectHistoryGet(res, projectId);
    }
    if (segments.length === 3 && segments[2] === 'history' && req.method === 'PUT') {
      handleProjectHistoryPut(req, res, projectId);
      return;
    }
    if (segments.length === 3 && segments[2] === 'resources' && req.method === 'GET') {
      return handleProjectResources(res, projectId);
    }
    if (segments.length === 3 && segments[2] === 'resource' && req.method === 'GET') {
      return handleProjectResource(res, projectId, url);
    }
  }

  return json(res, 404, { error: 'not_found' });
});

server.listen(ORCH_PORT, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`Orchestrator listening on http://localhost:${ORCH_PORT}`);
});
