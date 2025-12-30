// Minimal Cloud Orchestrator: bridges MCP RenderDoc tools and OpenRouter.
// Expanded to serve health/models endpoints and return structured Message/Submission payloads.

const WebSocket = require('ws');
const axios = require('axios');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const MCP_HOST = process.env.MCP_HOST || '127.0.0.1';
const MCP_PORT = Number(process.env.MCP_PORT || 8765);
const ORCH_PORT = Number(process.env.ORCH_PORT || 8080);
const VERSION = '0.2.0';

function loadConfig() {
  const configPath = path.join(__dirname, '..', 'config', 'openrouter.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const cfg = JSON.parse(raw);
    return {
      apiKey: cfg.apiKey || '',
      plannerModel: cfg.plannerModel || 'gpt-4o-mini',
      explainerModel: cfg.explainerModel || 'gpt-4o',
    };
  }
  return {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    plannerModel: process.env.PLANNER_MODEL || 'gpt-4o-mini',
    explainerModel: process.env.EXPLAINER_MODEL || 'gpt-4o',
  };
}

const CONFIG = loadConfig();

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload, null, 2));
}

async function callOpenRouter(model, systemPrompt, userContent, asJson = false, overrideKey) {
  const apiKey = overrideKey || CONFIG.apiKey;
  if (!apiKey) {
    throw new Error('OpenRouter API key missing; please provide one in request or configure orchestrator/config/openrouter.json');
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

async function handleNlDebug(body, res) {
  const { question, capturePath, openrouterKey } = body;
  if (!question) return json(res, 400, { error: 'question is required' });
  if (!capturePath) return json(res, 400, { error: 'capturePath is required' });

  const plannerSystem = `
You are a RenderDoc planning model.
Given a user question and a capture path, choose exactly one MCP tool to call
from this set: iterate_actions, enumerate_counters, analyze_nan_inf, geometry_anomalies, get_pipeline_state.
Return a JSON object: { "tool": "<name>", "arguments": { ... } }.
The arguments object must be directly usable for the tool.
`;

  const plannerUser = JSON.stringify({ question, capture_path: capturePath });
  let planned;
  try {
    const content = await callOpenRouter(CONFIG.plannerModel, plannerSystem, plannerUser, true, openrouterKey);
    planned = JSON.parse(content);
  } catch (e) {
    return json(res, 500, { error: 'planner_failed', detail: String(e) });
  }

  if (!planned.tool || !planned.arguments) {
    return json(res, 500, { error: 'planner_invalid_output', planned });
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
    explanation = await callOpenRouter(CONFIG.explainerModel, explainerSystem, explainerUser, false, openrouterKey);
  } catch (e) {
    explanation = `Explainer failed: ${String(e)}`;
  }

  // Attempt to fetch pipeline attachments for Canvas
  let pipelineState = null;
  const probeEvent = planned.arguments.event_id || planned.arguments.eventId || planned.arguments.eventID || 1;
  try {
    const pipelineResp = await callMcpTool('get_pipeline_state', { capture_path: capturePath, event_id: probeEvent });
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

  return json(res, 200, {
    planned,
    mcp: mcpResponse,
    explanation,
    submission,
    message,
  });
}

const uploadDir = path.join(__dirname, '..', 'captures');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function handleUpload(req, res, url) {
  const name = url.searchParams.get('name') || `capture_${Date.now()}.rdc`;
  const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const destPath = path.join(uploadDir, safeName);

  const writeStream = fs.createWriteStream(destPath);
  req.pipe(writeStream);
  req.on('end', () => json(res, 200, { capturePath: destPath }));
  req.on('error', e => json(res, 500, { error: 'upload_failed', detail: String(e) }));
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
  return json(res, 200, {
    models: [
      { id: CONFIG.plannerModel, role: 'planner' },
      { id: CONFIG.explainerModel, role: 'explainer' },
    ],
    default: CONFIG.explainerModel,
  });
}

function serveCaptureAsset(res, url) {
  const decoded = decodeURIComponent(url.pathname.replace('/captures/', ''));
  const safePath = path.normalize(path.join(uploadDir, decoded));
  if (!safePath.startsWith(uploadDir) || !fs.existsSync(safePath)) {
    return json(res, 404, { error: 'not_found' });
  }
  const stream = fs.createReadStream(safePath);
  res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
  stream.pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${ORCH_PORT}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return handleHealth(res);
  }
  if (req.method === 'GET' && url.pathname === '/models') {
    return handleModels(res);
  }
  if (req.method === 'GET' && url.pathname.startsWith('/captures/')) {
    return serveCaptureAsset(res, url);
  }

  if (req.method === 'POST' && url.pathname === '/nl-debug') {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        const body = JSON.parse(data || '{}');
        handleNlDebug(body, res);
      } catch (e) {
        json(res, 400, { error: 'invalid_json', detail: String(e) });
      }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/upload-capture') {
    return handleUpload(req, res, url);
  }

  return json(res, 404, { error: 'not_found' });
});

server.listen(ORCH_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Orchestrator listening on http://localhost:${ORCH_PORT}`);
});
