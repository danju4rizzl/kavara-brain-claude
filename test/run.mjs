#!/usr/bin/env node
// Guard tests: builds a throwaway vault from the vendored engine + a tiny fixture, then feeds hook events to guard.mjs.
// Run: node test/run.mjs   (needs git on PATH for the git-guard cases)

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = path.join(ROOT, "hooks", "guard.mjs");
const ENGINE = path.join(ROOT, "skills", "brain", "engine");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kb-test-"));
const V = path.join(tmp, "vault");
let pass = 0, fail = 0;

function copy(src, dst) { fs.cpSync(src, dst, { recursive: true }); }
function write(rel, s) { fs.mkdirSync(path.dirname(path.join(V, rel)), { recursive: true }); fs.writeFileSync(path.join(V, rel), s); }
function run(event, input) {
  const r = spawnSync(process.execPath, [GUARD, event], { input: JSON.stringify({ session_id: "test", cwd: V, ...input }), encoding: "utf8", env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT } });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
function expect(name, cond, detail = "") { cond ? pass++ : fail++; console.log(`${cond ? "✔" : "✖"} ${name}${cond ? "" : "  → " + detail}`); }
const git = (...a) => spawnSync("git", a, { cwd: V, encoding: "utf8" });

// --- fixture vault ---
for (const d of ["prompts", "scripts", "templates", "docs"]) copy(path.join(ENGINE, d), path.join(V, d));
fs.copyFileSync(path.join(ENGINE, "gitignore.template"), path.join(V, ".gitignore"));
const page = (id, extra = "", rel = []) => `---\ntype: topic\nsummary: "${id}"\nsources: ["[[raw/src]]"]\ntags: [core]\nup: "[[wiki/00-core/agent]]"\nupdated: ${new Date().toISOString().slice(0, 10)}\n---\n# ${id}\n> **Summary:** ${id}\n${extra}\n## Open questions\n- None open.\n## Conflicts\n- None known.\n## Sources\n- [[raw/src]]\n## Related\n- ↑ [[wiki/00-core/agent|map]]\n${rel.map((r) => `- [[wiki/00-core/${r}|${r}]]`).join("\n")}\n`;
write("raw/src.md", "---\ncaptured: 2026-01-01\n---\nsource text\n");
write("agents.md", "---\ntype: meta\n---\n# agents\n[[wiki/index]]\n");
write("wiki/00-core/agent.md", '---\ntype: map\ntitle: "Core"\ndescription: "x"\ntags: [map, core]\n---\n');
write("wiki/00-core/a.md", page("a", "", ["b"]));
write("wiki/00-core/b.md", page("b", "", ["a"]));
write("wiki/gaps.md", "---\ntype: meta\n---\n# Gaps\n<!-- kb:auto:start -->\n<!-- kb:auto:end -->\n");
write("wiki/log.md", `---\ntype: meta\n---\n# Log\n- 2026-01-01 · **lint**: ok\n`);
spawnSync(process.execPath, [path.join(V, "scripts", "kb.mjs"), "index"], { cwd: V });

// --- session-start ---
let r = run("session-start", {});
let ctx = ""; try { ctx = JSON.parse(r.out).hookSpecificOutput.additionalContext; } catch {}
expect("session-start injects status in a vault", r.code === 0 && /Kavara Brain vault detected/.test(ctx) && /errors/.test(ctx), r.out + r.err);
r = spawnSync(process.execPath, [GUARD, "session-start"], { input: JSON.stringify({ cwd: tmp }), encoding: "utf8" });
expect("session-start is silent outside a vault", r.status === 0 && r.stdout === "", r.stdout);

// --- pre-write: raw/ ---
r = run("pre-write", { tool_name: "Edit", tool_input: { file_path: path.join(V, "raw/src.md"), old_string: "source", new_string: "changed" } });
expect("blocks editing an existing raw/ file", r.code === 2 && /append-only/.test(r.err), r.err);
r = run("pre-write", { tool_name: "Write", tool_input: { file_path: path.join(V, "raw/src.md"), content: "overwrite" } });
expect("blocks overwriting an existing raw/ file", r.code === 2, r.err);
r = run("pre-write", { tool_name: "Write", tool_input: { file_path: path.join(V, "raw/2026-new.md"), content: "new source" } });
expect("allows adding a NEW raw/ file", r.code === 0, r.err);

// --- pre-write: secrets ---
const secrets = ["Admin password: Hunter2024!", "OPENAI key sk-proj-abcdefghijklmnopqrstuvwx123", "db: postgres://admin:s3cretP4ss@db.example.com/app", "ghp_" + "a".repeat(36), "AKIAABCDEFGHIJKLMNOP", "PayFast merchant_key = 46f0cd694581a"];
for (const s of secrets) {
  r = run("pre-write", { tool_name: "Write", tool_input: { file_path: path.join(V, "wiki/00-core/c.md"), content: `Client notes\n${s}\n` } });
  expect(`blocks secret: ${s.slice(0, 22)}…`, r.code === 2 && /secret/.test(r.err) && !r.err.includes(s.split(/[:= ]/).pop()), r.err);
}
const safe = ["Credentials are stored in a password manager.", "password: [CONFIRM]", "password: ********", "Rotate the passwords exposed in Notion.", "API key: <your-key>", "Use a pin for the board."];
for (const s of safe) {
  r = run("pre-write", { tool_name: "Edit", tool_input: { file_path: path.join(V, "wiki/00-core/a.md"), old_string: "x", new_string: s } });
  expect(`allows safe text: "${s.slice(0, 30)}"`, r.code === 0, r.err);
}
r = run("pre-write", { tool_name: "Write", tool_input: { file_path: path.join(tmp, "elsewhere.md"), content: "password: Hunter2024!" } });
expect("ignores files outside any vault", r.code === 0, r.err);

// --- post-write ---
write("wiki/00-core/broken.md", page("broken", "See [[wiki/00-core/nope]]."));
r = run("post-write", { tool_name: "Write", tool_input: { file_path: path.join(V, "wiki/00-core/broken.md") } });
expect("post-write reports broken link + orphan for the edited page", r.code === 2 && /broken link/.test(r.err) && /orphan/.test(r.err), r.err);
expect("post-write rebuilt the folder map", fs.readFileSync(path.join(V, "wiki/00-core/agent.md"), "utf8").includes("broken"), "map not rebuilt");
fs.rmSync(path.join(V, "wiki/00-core/broken.md"));
r = run("post-write", { tool_name: "Write", tool_input: { file_path: path.join(V, "wiki/00-core/a.md") } });
expect("post-write is quiet for a clean page", r.code === 0, r.err);

// --- stop ---
spawnSync(process.execPath, [GUARD, "session-start"], { input: JSON.stringify({ session_id: "stoptest", cwd: V }), encoding: "utf8", env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT } });
const later = new Date(Date.now() + 5000);
fs.utimesSync(path.join(V, "wiki/00-core/a.md"), later, later);
r = spawnSync(process.execPath, [GUARD, "stop"], { input: JSON.stringify({ session_id: "stoptest", cwd: V }), encoding: "utf8" });
expect("stop reminds to log after wiki edits", r.status === 2 && /log\.md/.test(r.stderr), r.stderr);
r = spawnSync(process.execPath, [GUARD, "stop"], { input: JSON.stringify({ session_id: "stoptest", cwd: V, stop_hook_active: true }), encoding: "utf8" });
expect("stop never loops (stop_hook_active)", r.status === 0, r.stderr);
const later2 = new Date(Date.now() + 10000);
fs.utimesSync(path.join(V, "wiki/log.md"), later2, later2);
r = spawnSync(process.execPath, [GUARD, "stop"], { input: JSON.stringify({ session_id: "stoptest", cwd: V }), encoding: "utf8" });
expect("stop is quiet once the log is updated", r.status === 0, r.stderr);

// --- git guard ---
if (git("--version").status === 0) {
  git("init", "-q"); git("config", "user.email", "t@t"); git("config", "user.name", "t");
  r = run("pre-bash", { tool_name: "Bash", tool_input: { command: "git add -A && git commit -m init" } });
  expect("git add -A is allowed (allowlist .gitignore hides private files)", r.code === 0, r.err);
  git("add", "-A"); git("commit", "-qm", "init");
  r = run("pre-bash", { tool_name: "Bash", tool_input: { command: "git add -f wiki/00-core/a.md" } });
  expect("blocks force-adding a private wiki page", r.code === 2 && /PRIVATE/.test(r.err), r.err);
  git("add", "-f", "agents.md");
  r = run("pre-bash", { tool_name: "Bash", tool_input: { command: "git commit -m oops" } });
  expect("blocks committing a staged private file", r.code === 2 && /agents\.md/.test(r.err), r.err);
  fs.writeFileSync(path.join(V, ".kavara-brain.json"), '{"privateRepo": true}');
  r = run("pre-bash", { tool_name: "Bash", tool_input: { command: "git commit -m private-ok" } });
  expect("allows private files when .kavara-brain.json says privateRepo", r.code === 0, r.err);
  fs.rmSync(path.join(V, ".kavara-brain.json")); git("restore", "--staged", "agents.md");
  write("scripts/config.local.mjs", "export const k = 'sk-proj-abcdefghijklmnopqrstuvwx123';\n"); git("add", "scripts/config.local.mjs");
  r = run("pre-bash", { tool_name: "Bash", tool_input: { command: "git commit -m cfg" } });
  expect("blocks committing a staged secret", r.code === 2 && /secret/.test(r.err), r.err);
  git("restore", "--staged", "scripts/config.local.mjs");
  r = run("pre-bash", { tool_name: "Bash", tool_input: { command: "git push -u origin main" } });
  expect("allows pushing a clean history", r.code === 0, r.err);
  git("add", "-f", "wiki/00-core/a.md"); git("commit", "-qm", "leak"); git("rm", "-q", "--cached", "wiki/00-core/a.md"); git("commit", "-qm", "untrack");
  r = run("pre-bash", { tool_name: "Bash", tool_input: { command: "git push -u origin main" } });
  expect("blocks pushing when HISTORY contains a private file (even if untracked now)", r.code === 2 && /wiki\/00-core\/a\.md/.test(r.err), r.err);
  r = run("pre-bash", { tool_name: "Bash", tool_input: { command: "ls -la" } });
  expect("ignores non-git commands", r.code === 0, r.err);
} else console.log("(git not found: git guard tests skipped)");

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
