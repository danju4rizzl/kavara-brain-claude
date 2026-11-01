#!/usr/bin/env node
// guard.mjs: Kavara Brain guards for Claude Code hooks. Zero dependencies (Node 18+).
//
//   node guard.mjs session-start   status line injected as context
//   node guard.mjs pre-write       raw/ is append-only + secret scan on wiki writes
//   node guard.mjs pre-bash        git guard: no private files or secrets in commits/pushes
//   node guard.mjs post-write      rebuild index/maps + report lint errors for the edited page
//   node guard.mjs stop            remind to log when wiki pages changed this session
//
// Only acts inside a Kavara Brain vault (a folder with wiki/ plus agents.md or raw/). Everywhere else it exits 0.
// Exit 2 = block (stderr goes to Claude). Any internal error fails OPEN (exit 0) so a bug never locks you out.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { scan } from "./secrets.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(HERE, "..");
const ENGINE_KB = path.join(PLUGIN_ROOT, "skills", "kavara-brain", "engine", "scripts", "kb.mjs");
const PRIVATE = [/^raw\//, /^wiki\//, /^agents\.md$/i, /^claude\.md$/i, /^\.kb\//, /^\.obsidian\//];
const GENERATED = [/^wiki\/index\.md$/, /^wiki\/[^/]+\/agent\.md$/, /^wiki\/log\.md$/, /^wiki\/gaps\.md$/];

const posix = (p) => p.split(path.sep).join("/");
const block = (msg) => { process.stderr.write(msg.trim() + "\n"); process.exit(2); };
const ok = () => process.exit(0);

function readInput() {
  try { return JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { return {}; }
}

function findVault(start) {
  let dir = path.resolve(start || process.cwd());
  try { if (fs.existsSync(dir) && fs.statSync(dir).isFile()) dir = path.dirname(dir); } catch {}
  for (;;) {
    if (fs.existsSync(path.join(dir, "wiki")) && (fs.existsSync(path.join(dir, "agents.md")) || fs.existsSync(path.join(dir, "raw")))) return dir;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

function kb(vault, args) {
  const own = path.join(vault, "scripts", "kb.mjs");
  const script = fs.existsSync(own) ? own : ENGINE_KB;
  const r = spawnSync(process.execPath, [script, ...args, "--root", vault], { cwd: vault, encoding: "utf8", timeout: 30000 });
  return r.stdout || "";
}

function lintJson(vault) {
  try { return JSON.parse(kb(vault, ["lint", "--json"])); } catch { return null; }
}

const marker = (sid) => path.join(os.tmpdir(), `kavara-brain-${(sid || "nosession").replace(/[^\w-]/g, "")}.json`);

// ---------- events ----------
function sessionStart(input) {
  const vault = findVault(input.cwd);
  if (!vault) ok();
  try { fs.writeFileSync(marker(input.session_id), JSON.stringify({ start: Date.now(), vault })); } catch {}
  const lint = lintJson(vault);
  let lastLint = "never";
  try {
    const dates = [...fs.readFileSync(path.join(vault, "wiki", "log.md"), "utf8").matchAll(/^- (\d{4}-\d{2}-\d{2}) · \*\*lint\*\*/gm)].map((m) => m[1]);
    if (dates.length) {
      const days = Math.floor((Date.now() - Date.parse(dates.at(-1))) / 864e5);
      lastLint = days <= 0 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`;
    }
  } catch {}
  const status = lint
    ? `${lint.summary}. Last lint: ${lastLint}.`
    : `Lint could not run (is Node 18+ installed?). Last lint: ${lastLint}.`;
  const text =
    `Kavara Brain vault detected at ${vault}.\nStatus: ${status}\n` +
    `Read agents.md first and follow it. raw/ is append-only; never copy passwords or keys into the wiki. ` +
    `Use the kavara-brain skill for install/compile/ask/file-back/check/research/publish/weekly.` +
    (lint && lint.errors?.length ? `\nFix lint errors before other wiki work: ${lint.errors.slice(0, 5).map((e) => `${e.page}: ${e.msg}`).join("; ")}` : "");
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: text } }));
  ok();
}

function preWrite(input) {
  const ti = input.tool_input || {};
  const file = ti.file_path || ti.notebook_path;
  if (!file) ok();
  const abs = path.resolve(input.cwd || process.cwd(), file);
  const vault = findVault(path.dirname(abs));
  if (!vault) ok();
  const rel = posix(path.relative(vault, abs));
  if (rel.startsWith("..")) ok();

  if (rel.startsWith("raw/")) {
    if (fs.existsSync(abs)) {
      block(`Kavara Brain guard: raw/ is append-only. "${rel}" already exists and must not be edited or overwritten.\n` +
        `Put corrections in the wiki page instead and record the disagreement under "## Conflicts". To add a new source, save it under a new name in raw/.`);
    }
    ok(); // adding a new raw source is allowed
  }

  const text = [ti.content, ti.new_string, ...(Array.isArray(ti.edits) ? ti.edits.map((e) => e.new_string) : [])].filter(Boolean).join("\n");
  const hits = scan(text);
  if (hits.length) {
    block(`Kavara Brain guard: blocked writing what looks like a secret into "${rel}":\n` +
      hits.slice(0, 5).map((h) => `  • ${h.kind} (${h.preview})`).join("\n") +
      `\nNever store passwords, keys or logins in the vault. Write "stored in password manager" instead, and tell the owner which source contains it.`);
  }
  ok();
}

function git(top, args) {
  const r = spawnSync("git", args, { cwd: top, encoding: "utf8", timeout: 15000 });
  return r.status === 0 ? r.stdout : "";
}

function preBash(input) {
  const cmd = (input.tool_input || {}).command || "";
  if (!/\bgit\b[^\n;&|]*\b(add|commit|push)\b/.test(cmd)) ok();
  const cwd = input.cwd || process.cwd();
  const top = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
  if (!top) ok();
  const isBrainRepo = fs.existsSync(path.join(top, "scripts", "kb.mjs")) || findVault(top) === path.resolve(top);
  if (!isBrainRepo) ok();
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(top, ".kavara-brain.json"), "utf8")); } catch {}
  const privateAllowed = cfg.privateRepo === true;

  const files = new Set();
  const lines = (s) => s.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const f of lines(git(top, ["diff", "--cached", "--name-only"]))) files.add(f);
  if (/\bgit\s+add\b[^\n;&|]*(\s-A\b|\s--all\b|\s\.(\s|$))|\bgit\s+commit\b[^\n;&|]*\s-[a-zA-Z]*a/.test(cmd)) {
    for (const l of lines(git(top, ["status", "--porcelain", "--untracked-files=all"]))) files.add(l.slice(3).replace(/^"|"$/g, "").split(" -> ").pop());
  }
  const forced = cmd.match(/\bgit\s+add\b[^\n;&|]*(?:\s-f\b|\s--force\b)([^\n;&|]*)/);
  if (forced) for (const tok of forced[1].split(/\s+/).filter((t) => t && !t.startsWith("-"))) files.add(posix(path.relative(top, path.resolve(cwd, tok))));
  if (/\bgit\s+push\b/.test(cmd)) {
    // A push sends HISTORY, not just the current tree: check every file touched by every outgoing commit.
    const upstream = git(top, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]).trim();
    const range = upstream ? [`${upstream}..HEAD`] : ["HEAD"];
    for (const f of lines(git(top, ["log", ...range, "--name-only", "--pretty=format:"]))) files.add(f);
  }

  if (!privateAllowed) {
    const bad = [...files].filter((f) => PRIVATE.some((re) => re.test(f)));
    if (bad.length) {
      block(`Kavara Brain git guard: this would commit or push PRIVATE vault files:\n` +
        bad.slice(0, 10).map((f) => `  • ${f}`).join("\n") + (bad.length > 10 ? `\n  … and ${bad.length - 10} more` : "") +
        `\nraw/, wiki/, agents.md, CLAUDE.md, .kb/ and .obsidian/ must never reach a public repo. Unstage them (git restore --staged <path>).\n` +
        `If this repo is PRIVATE and meant to version your notes, add {"privateRepo": true} to .kavara-brain.json at the repo root.`);
    }
  }
  const added = git(top, ["diff", "--cached", "-U0"]).split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");
  const hits = scan(added);
  if (hits.length) {
    block(`Kavara Brain git guard: staged changes contain what looks like a secret:\n` +
      hits.slice(0, 5).map((h) => `  • ${h.kind} (${h.preview})`).join("\n") + `\nRemove it from the files (and rotate it if it was ever pushed) before committing.`);
  }
  ok();
}

function postWrite(input) {
  const ti = input.tool_input || {};
  const file = ti.file_path || ti.notebook_path;
  if (!file || !/\.md$/i.test(file)) ok();
  const abs = path.resolve(input.cwd || process.cwd(), file);
  const vault = findVault(path.dirname(abs));
  if (!vault) ok();
  const rel = posix(path.relative(vault, abs));
  if (!rel.startsWith("wiki/")) ok();
  kb(vault, ["index"]);
  if (GENERATED.some((re) => re.test(rel))) ok();
  const lint = lintJson(vault);
  if (!lint) ok();
  const id = rel.replace(/\.md$/i, "");
  const mine = (lint.errors || []).filter((e) => e.page === id);
  const warn = (lint.warnings || []).filter((w) => w.page === id && /orphan|one-way/.test(w.msg));
  if (mine.length || warn.length) {
    block(`Kavara Brain lint, ${rel}:\n` + [...mine.map((e) => `  ✖ ${e.msg}`), ...warn.map((w) => `  ⚠ ${w.msg}`)].join("\n") +
      `\nFix these now (page contract: agents.md). Index and folder maps were rebuilt.`);
  }
  ok();
}

function stop(input) {
  if (input.stop_hook_active) ok();
  let m;
  try { m = JSON.parse(fs.readFileSync(marker(input.session_id), "utf8")); } catch { ok(); }
  const wiki = path.join(m.vault, "wiki");
  if (!fs.existsSync(wiki)) ok();
  const changed = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md")) {
        const rel = posix(path.relative(m.vault, p));
        if (!GENERATED.some((re) => re.test(rel)) && fs.statSync(p).mtimeMs > m.start) changed.push({ rel, t: fs.statSync(p).mtimeMs });
      }
    }
  };
  walk(wiki);
  if (!changed.length) ok();
  let logT = 0;
  try { logT = fs.statSync(path.join(wiki, "log.md")).mtimeMs; } catch {}
  if (logT >= Math.max(...changed.map((c) => c.t))) ok();
  block(`Kavara Brain: you changed ${changed.length} wiki page(s) this session (${changed.slice(0, 5).map((c) => c.rel).join(", ")}${changed.length > 5 ? ", …" : ""}) ` +
    `but wiki/log.md has no newer entry. Append one line ("- YYYY-MM-DD · **compile|file|lint**: what changed"), then run the lint script.`);
}

// ---------- main ----------
try {
  const input = readInput();
  ({ "session-start": sessionStart, "pre-write": preWrite, "pre-bash": preBash, "post-write": postWrite, stop }[process.argv[2]] || ok)(input);
} catch (e) {
  if (process.env.KAVARA_BRAIN_DEBUG) process.stderr.write(String(e?.stack || e));
  ok(); // fail open
}
