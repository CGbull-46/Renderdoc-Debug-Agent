// Minimal Cloud Orchestrator: bridges MCP RenderDoc tools and OpenRouter.
// - Accepts WebSocket connections from the local Python Agent (future use)
// - Exposes a simple HTTP endpoint /nl-debug that:
//     * takes { question, capturePath? }
//     * calls OpenRouter planner+explainer models
//     * talks to local MCP server (python -m agent) for tool execution

const WebSocket = require('ws');
const axios = require('axios');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const MCP_HOST = process.env.MCP_HOST || '127.0.0.1';
const MCP_PORT = Number(process.env.MCP_PORT || 8765);
const ORCH_PORT = Number(process.env.ORCH_PORT || 8080);

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
  const request = { id: '1', tool, arguments: args };
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
  if (!question) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'question is required' }));
    return;
  }
  if (!capturePath) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'capturePath is required' }));
    return;
  }

  const plannerSystem = `
You are a RenderDoc planning model.
Given a user question and a capture path, choose exactly one MCP tool to call
from this set: iterate_actions, enumerate_counters, analyze_nan_inf, geometry_anomalies.
Return a JSON object: { "tool": "<name>", "arguments": { ... } }.
The arguments object must be directly usable for the tool.
`;

  const plannerUser = JSON.stringify({ question, capture_path: capturePath });
  let planned;
  try {
    const content = await callOpenRouter(CONFIG.plannerModel, plannerSystem, plannerUser, true, openrouterKey);
    planned = JSON.parse(content);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'planner_failed', detail: String(e) }));
    return;
  }

  if (!planned.tool || !planned.arguments) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'planner_invalid_output', planned }));
    return;
  }

  const mcpResponse = await callMcpTool(planned.tool, planned.arguments);

  const explainerSystem = `
You are a graphics debugging explainer.
Based on the user's question, the chosen tool call, and its JSON result,
explain what you see and what the user should look at next.
Return concise Chinese analysis.
`;

  const explainerUser = JSON.stringify({
    question,
    tool_call: planned,
    mcp_response: mcpResponse,
  });

  let explanation;
  try {
    explanation = await callOpenRouter(CONFIG.explainerModel, explainerSystem, explainerUser, false, openrouterKey);
  } catch (e) {
    explanation = `Explainer failed: ${String(e)}`;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify(
      {
        planned,
        mcp: mcpResponse,
        explanation,
      },
      null,
      2,
    ),
  );
}

const uploadDir = path.join(__dirname, '..', 'captures');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/nl-debug')) {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        const body = JSON.parse(data || '{}');
        handleNlDebug(body, res);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_json', detail: String(e) }));
      }
    });
  } else if (req.method === 'POST' && req.url.startsWith('/upload-capture')) {
    const url = new URL(req.url, `http://localhost:${ORCH_PORT}`);
    const name = url.searchParams.get('name') || `capture_${Date.now()}.rdc`;
    const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const destPath = path.join(uploadDir, safeName);

    const writeStream = fs.createWriteStream(destPath);
    req.pipe(writeStream);
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ capturePath: destPath }));
    });
    req.on('error', e => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'upload_failed', detail: String(e) }));
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  }
});

server.listen(ORCH_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Orchestrator listening on http://localhost:${ORCH_PORT}`);
});
