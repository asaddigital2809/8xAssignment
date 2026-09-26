#!/usr/bin/env node
// Agent capture hook for Claude Code.
// Wired to SessionStart, UserPromptSubmit and Stop in .claude/settings.json.
// Writes one markdown log per session to <project>/.agent-logs/ containing
// only the user prompt and the final assistant response for each turn.
//
// Log body is append-only. The YAML header is regenerated on every write so
// total_exchanges / last_prompt_time stay current.
//
// Self-healing: if a hook was missed (e.g. hooks installed mid-session, or a
// prompt submitted before settings reloaded), the Stop / UserPromptSubmit
// handlers backfill the missing turns from the session transcript.

'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const TOOL = 'claude-code';

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

function projectDir(input) {
  return process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
}

function loadConfig(root) {
  const cfg = { author: 'unknown', project: path.basename(root) };
  try {
    Object.assign(cfg, JSON.parse(fs.readFileSync(path.join(root, '.claude', 'hooks', 'capture.config.json'), 'utf8')));
  } catch {}
  return cfg;
}

// ---------- model tracking ----------
const stateDir = path.join(os.tmpdir(), 'claude-agent-capture');
function modelCachePath(sid) { return path.join(stateDir, `${sid}.model`); }
function cacheModel(sid, model) {
  if (!model) return;
  try { fs.mkdirSync(stateDir, { recursive: true }); fs.writeFileSync(modelCachePath(sid), String(model)); } catch {}
}
function cachedModel(sid) {
  try { return fs.readFileSync(modelCachePath(sid), 'utf8').trim() || null; } catch { return null; }
}
function normModel(m) {
  if (!m) return null;
  if (typeof m === 'object') m = m.id || m.model || m.display_name || null;
  return m ? String(m) : null;
}

// ---------- transcript parsing ----------
function readTranscript(p) {
  if (!p) return [];
  let raw;
  try { raw = fs.readFileSync(p, 'utf8'); } catch { return []; }
  const out = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch {}
  }
  return out;
}

function isRealPrompt(rec) {
  if (rec.type !== 'user' || rec.isMeta || rec.isCompactSummary) return false;
  if (rec.isSidechain) return false;
  const c = rec.message && rec.message.content;
  if (typeof c === 'string') return true;
  if (Array.isArray(c)) {
    if (c.some(b => b && b.type === 'tool_result')) return false;
    return c.some(b => b && b.type === 'text');
  }
  return false;
}

function promptText(rec) {
  const c = rec.message.content;
  if (typeof c === 'string') return c;
  return c.filter(b => b.type === 'text').map(b => b.text).join('\n');
}

// Split transcript into turns: {prompt, promptTime, response, responseTime, model}
function parseTurns(records) {
  const turns = [];
  let cur = null;
  for (const rec of records) {
    if (rec.isSidechain) continue;
    if (isRealPrompt(rec)) {
      cur = { prompt: promptText(rec), promptTime: rec.timestamp, finalBlocks: [], responseTime: null, model: null };
      turns.push(cur);
      continue;
    }
    if (!cur || rec.type !== 'assistant' || !rec.message) continue;
    const content = Array.isArray(rec.message.content) ? rec.message.content : [];
    if (rec.message.model && rec.message.model !== '<synthetic>') cur.model = rec.message.model;
    for (const b of content) {
      if (b.type === 'tool_use') { cur.finalBlocks = []; }
      else if (b.type === 'text' && b.text) { cur.finalBlocks.push(b.text); cur.responseTime = rec.timestamp; }
    }
  }
  for (const t of turns) t.response = t.finalBlocks.join('\n\n');
  return turns;
}

function lastModelInTranscript(records) {
  for (let i = records.length - 1; i >= 0; i--) {
    const m = records[i].type === 'assistant' && records[i].message && records[i].message.model;
    if (m && m !== '<synthetic>') return m;
  }
  return null;
}

// ---------- log file ----------
function logDir(root) { return path.join(root, '.agent-logs'); }

function findLog(root, sid) {
  const dir = logDir(root);
  try {
    const f = fs.readdirSync(dir).find(n => n.endsWith(`_${sid}.md`));
    return f ? path.join(dir, f) : null;
  } catch { return null; }
}

function newLogPath(root, sid, isoTime) {
  const d = new Date(isoTime);
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}_${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}-${pad(d.getUTCSeconds())}`;
  return path.join(logDir(root), `${stamp}_${sid}.md`);
}

const ENTRY_RE = /^\[LOG_ENTRY type=(PROMPT|RESPONSE) num=(\d+) session=[^\]]+\]\r?\ntimestamp: (\S+)\r?\nmodel: (.*)$/gm;

function readBody(file) {
  if (!file || !fs.existsSync(file)) return '';
  const txt = fs.readFileSync(file, 'utf8');
  // Body starts at the first LOG_ENTRY marker; everything before is regenerated header.
  const i = txt.indexOf('\n[LOG_ENTRY ');
  return i === -1 ? '' : txt.slice(i + 1);
}

// Only accept markers that continue the exact PROMPT 1, RESPONSE 1, PROMPT 2 ...
// sequence for this session, so log-entry text pasted *inside* a prompt or
// response (e.g. quoting an earlier canary) can never be mistaken for a real entry.
function scanEntries(body) {
  const entries = [];
  const tag = scanEntries.sid ? scanEntries.sid.slice(0, 8) : null;
  let m;
  ENTRY_RE.lastIndex = 0;
  while ((m = ENTRY_RE.exec(body))) {
    const prev = entries[entries.length - 1];
    const wantType = !prev || prev.type === 'RESPONSE' ? 'PROMPT' : 'RESPONSE';
    const wantNum = !prev ? 1 : prev.type === 'RESPONSE' ? prev.num + 1 : prev.num;
    if (m[1] !== wantType || +m[2] !== wantNum) continue;
    if (tag && !m[0].includes(`session=${tag}]`)) continue;
    entries.push({ type: m[1], num: +m[2], ts: m[3], model: m[4].trim() });
  }
  return entries;
}

function header(cfg, sid, entries, fallbackDate) {
  const prompts = entries.filter(e => e.type === 'PROMPT');
  const models = [...new Set(entries.map(e => e.model).filter(Boolean))];
  const first = prompts[0] ? prompts[0].ts : fallbackDate;
  const last = prompts.length ? prompts[prompts.length - 1].ts : fallbackDate;
  const date = first.slice(0, 10);
  return [
    '---',
    `session_id: ${sid}`,
    `date: ${date}`,
    `author: ${cfg.author}`,
    `model: ${models.join(', ') || 'unknown'}`,
    `tool: ${TOOL}`,
    `project: ${cfg.project}`,
    `total_exchanges: ${prompts.length}`,
    `first_prompt_time: ${first}`,
    `last_prompt_time: ${last}`,
    '---',
    '',
    `# Session Log - ${date}`,
    '',
    `Session: \`${sid.slice(0, 8)}\` | Project: \`${cfg.project}\` | Author: \`${cfg.author}\``,
    '',
    '---',
    '',
    '',
  ].join('\n');
}

function entry(type, num, sid, ts, model, text) {
  return `[LOG_ENTRY type=${type} num=${num} session=${sid.slice(0, 8)}]\ntimestamp: ${ts}\nmodel: ${model || 'unknown'}\n\n${text}\n\n\n`;
}

function writeLog(root, cfg, sid, file, body, firstTs) {
  fs.mkdirSync(logDir(root), { recursive: true });
  const target = file || newLogPath(root, sid, firstTs);
  const entries = scanEntries(body);
  const tmp = target + '.tmp';
  fs.writeFileSync(tmp, header(cfg, sid, entries, firstTs) + body);
  fs.renameSync(tmp, target);
}

// Append any completed transcript turns the log doesn't have yet.
// `upTo` limits how many transcript turns are considered.
function backfill(sid, body, turns, upTo, fallbackModel) {
  const entries = scanEntries(body);
  let p = entries.filter(e => e.type === 'PROMPT').length;
  let r = entries.filter(e => e.type === 'RESPONSE').length;
  if (p !== r) return body; // a prompt is awaiting its response; don't reorder
  for (let i = p; i < Math.min(upTo, turns.length); i++) {
    const t = turns[i];
    const model = t.model || fallbackModel;
    body += entry('PROMPT', i + 1, sid, t.promptTime || new Date().toISOString(), model, t.prompt);
    body += entry('RESPONSE', i + 1, sid, t.responseTime || new Date().toISOString(), model, t.response);
  }
  return body;
}

function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

// ---------- handlers ----------
function onSessionStart(input) {
  cacheModel(input.session_id, normModel(input.model));
}

function onPrompt(input, root, cfg) {
  const sid = input.session_id;
  const now = new Date().toISOString();
  const records = readTranscript(input.transcript_path);
  const model = normModel(input.model) || lastModelInTranscript(records) || cachedModel(sid) || process.env.ANTHROPIC_MODEL || 'unknown';
  const file = findLog(root, sid);
  let body = readBody(file);

  // Backfill earlier turns if the log is behind (only turns that have a response,
  // so the prompt being submitted right now is never double-logged).
  const turns = parseTurns(records).filter(t => t.response);
  body = backfill(sid, body, turns, turns.length, model);

  const n = scanEntries(body).filter(e => e.type === 'PROMPT').length + 1;
  body += entry('PROMPT', n, sid, now, model, input.prompt != null ? input.prompt : '');
  writeLog(root, cfg, sid, file, body, now);
}

function onStop(input, root, cfg) {
  const sid = input.session_id;
  if (input.stop_hook_active) return;
  const now = new Date().toISOString();

  // The transcript may lag the Stop event slightly; wait for the final text to land.
  let records = [], turns = [];
  for (let i = 0; i < 10; i++) {
    records = readTranscript(input.transcript_path);
    turns = parseTurns(records);
    const last = turns[turns.length - 1];
    if (last && last.response) break;
    sleep(300);
  }
  const model = lastModelInTranscript(records) || cachedModel(sid) || 'unknown';
  cacheModel(sid, model);

  const file = findLog(root, sid);
  let body = readBody(file);
  const entries = scanEntries(body);
  const p = entries.filter(e => e.type === 'PROMPT').length;
  const r = entries.filter(e => e.type === 'RESPONSE').length;
  const last = turns[turns.length - 1];
  let response = last ? last.response : '';
  if (!response && typeof input.last_assistant_message === 'string') response = input.last_assistant_message;

  if (p === r + 1) {
    body += entry('RESPONSE', p, sid, now, (last && last.model) || model, response);
  } else {
    // Prompt hook didn't fire for this turn: backfill every missing turn from the transcript.
    body = backfill(sid, body, turns, turns.length, model);
  }
  writeLog(root, cfg, sid, file, body, (entries[0] && entries[0].ts) || (turns[0] && turns[0].promptTime) || now);
}

function main() {
  const raw = readStdin();
  let input = {};
  try { input = JSON.parse(raw || '{}'); } catch { return; }
  if (!input.session_id) return;
  scanEntries.sid = input.session_id;
  const root = projectDir(input);
  const cfg = loadConfig(root);
  const ev = input.hook_event_name || process.argv[2];
  try {
    if (ev === 'SessionStart') onSessionStart(input);
    else if (ev === 'UserPromptSubmit') onPrompt(input, root, cfg);
    else if (ev === 'Stop') onStop(input, root, cfg);
  } catch (e) {
    // Never block the session; record the failure next to the logs for debugging.
    try {
      fs.mkdirSync(logDir(root), { recursive: true });
      fs.appendFileSync(path.join(logDir(root), 'capture-errors.log'), `${new Date().toISOString()} ${ev}: ${e && e.stack || e}\n`);
    } catch {}
  }
}

main();
