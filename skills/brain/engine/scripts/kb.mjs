#!/usr/bin/env node
// kb.mjs: maintenance CLI for a Karpathy-style LLM knowledge base.
// Zero dependencies. Runs with `bun scripts/kb.mjs <cmd>` or `node scripts/kb.mjs <cmd>`.
//
//   index   Rebuild wiki/index.md, every folder's agent.md map, and the auto section of wiki/gaps.md
//   lint    Health check: broken links, orphans, stale pages, missing sources/sections, uncompiled raw files
//           flags: --json (machine-readable)  --log (append summary to wiki/log.md)
//   bundle  Concatenate agents.md + the whole wiki into .kb/wiki-bundle.md for full-context Q&A in any LLM
//   stats   Page, raw and token counts and context-window fit
//
//   --root <dir>  run against another vault (default: the folder above scripts/; or set KB_ROOT)
//
// Conventions (see agents.md):
//   raw/            immutable sources (any format). Never edited after capture.
//   wiki/           compiled pages. Topic pages need frontmatter: type, summary, sources, tags, up, updated
//                   and sections: ## Open questions, ## Conflicts, ## Sources, ## Related
//   wiki/<folder>/agent.md   generated folder map (frontmatter title/description/tags are preserved)
//   wiki/index.md            generated topic hierarchy
//   wiki/gaps.md             manual priorities + generated list between kb:auto markers
//   wiki/log.md              append-only history of compile / query / file / lint passes

import fs from "node:fs";
import path from "node:path";

// Vault root: --root <dir>, else $KB_ROOT, else the folder above scripts/.
const argv = process.argv.slice(2);
const rootFlag = argv.indexOf("--root");
const ROOT = path.resolve(
  rootFlag !== -1 && argv[rootFlag + 1] ? argv[rootFlag + 1]
  : process.env.KB_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), ".."),
);
if (rootFlag !== -1) argv.splice(rootFlag, 2);
const WIKI = path.join(ROOT, "wiki");
const RAW = path.join(ROOT, "raw");
const TODAY = new Date().toISOString().slice(0, 10);
const STALE_DAYS = 30;
const REQUIRED_FM = ["type", "summary", "sources", "tags", "up", "updated"];
const REQUIRED_SECTIONS = ["Open questions", "Conflicts", "Sources", "Related"];
const GENERATED_TYPES = new Set(["map", "index"]);
const AUTO_START = "<!-- kb:auto:start -->";
const AUTO_END = "<!-- kb:auto:end -->";

// ---------- helpers ----------
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const noExt = (p) => p.replace(/\.md$/, "");
const tokens = (s) => Math.round(s.length / 4);

function walk(dir, filter = () => true) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith(".")) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, filter) : filter(p) ? [p] : [];
  });
}

function parse(file) {
  const text = fs.readFileSync(file, "utf8");
  const fm = {};
  let body = text;
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (m) {
    body = text.slice(m[0].length);
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (!kv) continue;
      let v = kv[2].trim();
      if (v.startsWith("[") && v.endsWith("]")) {
        const inner = v.slice(1, -1);
        const quoted = [...inner.matchAll(/"([^"]*)"|'([^']*)'/g)].map((q) => q[1] ?? q[2]);
        v = quoted.length ? quoted : inner.split(",").map((s) => s.trim()).filter(Boolean);
      } else v = v.replace(/^["']|["']$/g, "");
      fm[kv[1]] = v;
    }
  }
  return { file, id: noExt(rel(file)), text, fm, body };
}

function links(text) {
  const clean = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  return [...clean.matchAll(/\[\[([^\]|#^\\]+)(?:[#^][^\]|]*)?(?:\\?\|[^\]]*)?\]\]/g)].map((m) => m[1].trim());
}

function sections(body) {
  return [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
}

function load() {
  const pages = walk(WIKI, (p) => p.endsWith(".md")).map(parse);
  const raws = walk(RAW).map((p) => ({ file: p, id: noExt(rel(p)), name: path.basename(p) }));
  const all = new Set([
    ...walk(ROOT, () => true).filter((p) => !rel(p).startsWith("node_modules")).map((p) => rel(p)),
  ]);
  const byBase = new Map();
  for (const f of all) {
    const b = noExt(path.posix.basename(f));
    byBase.set(b, [...(byBase.get(b) || []), f]);
  }
  const resolve = (target) => {
    const t = target.replace(/^\//, "");
    if (all.has(t) || all.has(t + ".md")) return all.has(t) ? t : t + ".md";
    const cands = byBase.get(noExt(path.posix.basename(t))) || [];
    const hit = cands.filter((c) => noExt(c).endsWith(noExt(t)));
    if (hit.length === 1) return hit[0];
    // A folder can be cited as a source (e.g. a Notion export section): it covers every file under it.
    const dir = path.join(ROOT, t);
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory() ? t : null;
  };
  return { pages, raws, resolve };
}

// A cited source covers the file itself and, for folders or Notion pages with a same-named folder, everything beneath it.
const covers = (cited, id) => cited.has(id) || [...cited].some((c) => id.startsWith(c + "/"));

const isTopic = (p) => !GENERATED_TYPES.has(p.fm.type) && !["meta"].includes(p.fm.type);
const folderOf = (p) => {
  const parts = p.id.split("/");
  return parts.length > 2 ? parts[1] : null; // wiki/<folder>/page
};

// ---------- index ----------
function cmdIndex() {
  const { pages } = load();
  const topics = pages.filter(isTopic);
  const folders = [...new Set(topics.map(folderOf).filter(Boolean))].sort();
  const inbound = new Map();
  for (const p of topics) for (const l of links(p.text)) inbound.set(noExt(l), (inbound.get(noExt(l)) || 0) + 1);

  const meta = {};
  for (const f of folders) {
    const mapFile = path.join(WIKI, f, "agent.md");
    const old = fs.existsSync(mapFile) ? parse(mapFile) : { fm: {}, body: "" };
    const tag = (Array.isArray(old.fm.tags) ? old.fm.tags.find((t) => t !== "map") : null) || f.replace(/^\d+-/, "");
    const title = old.fm.title || f.replace(/^\d+-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const description = old.fm.description || "";
    const manual = old.body.includes("<!-- kb:manual -->") ? old.body.slice(old.body.indexOf("<!-- kb:manual -->")) : "";
    meta[f] = { title, description, tag };
    const inFolder = topics.filter((p) => folderOf(p) === f).sort((a, b) => a.id.localeCompare(b.id));
    const ext = new Map();
    for (const p of inFolder)
      for (const l of links(p.body)) {
        const id = noExt(l);
        if (id.startsWith("wiki/") && !id.startsWith(`wiki/${f}/`) && !id.endsWith("/agent")) ext.set(id, (ext.get(id) || 0) + 1);
      }
    const top = [...ext.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    let out = `---\ntype: map\ntitle: "${title}"\ndescription: "${description}"\ntags: [map, ${tag}]\nup: "[[wiki/index]]"\nupdated: ${TODAY}\n---\n\n`;
    out += `# ${title}: folder map\n\n${description}\n\n↑ [[wiki/index|Wiki index]] · [[agents|Agent instructions]]\n\n`;
    out += `> Generated by \`scripts/kb.mjs index\`. Edit \`title\`/\`description\` in the frontmatter, or add notes below a \`<!-- kb:manual -->\` line.\n\n`;
    out += `## Notes in this folder\n\n| Note | Summary |\n|---|---|\n`;
    for (const p of inFolder) out += `| [[${p.id}\\|${path.posix.basename(p.id)}]] | ${p.fm.summary || "_no summary_"} |\n`;
    if (top.length) out += `\n## Most linked notes in other folders\n\n` + top.map(([id]) => `- [[${id}|${path.posix.basename(id)}]]`).join("\n") + "\n";
    if (manual) out += `\n${manual.trim()}\n`;
    fs.writeFileSync(mapFile, out);
  }

  const wikiTokens = pages.reduce((n, p) => n + tokens(p.text), 0);
  let idx = `---\ntype: index\ntags: [map, index]\nup: "[[agents]]"\nupdated: ${TODAY}\n---\n\n# Wiki Index\n\n`;
  idx += `Topic hierarchy of the compiled wiki. Generated by \`scripts/kb.mjs index\`. Don't edit by hand.\n\n`;
  idx += `**${topics.length} topic pages** · **~${wikiTokens.toLocaleString()} tokens** (fits in a 128K context: ${wikiTokens < 120000 ? "yes ✅" : "no ⚠️"}) · see [[wiki/gaps|gaps]] · [[wiki/log|log]]\n\n`;
  for (const f of folders) {
    idx += `## [[wiki/${f}/agent|${meta[f].title}]]\n\n${meta[f].description ? meta[f].description + "\n\n" : ""}`;
    for (const p of topics.filter((p) => folderOf(p) === f).sort((a, b) => a.id.localeCompare(b.id)))
      idx += `- [[${p.id}|${path.posix.basename(p.id)}]]: ${p.fm.summary || ""}\n`;
    idx += "\n";
  }
  const loose = topics.filter((p) => !folderOf(p));
  if (loose.length) idx += `## Top level\n\n` + loose.map((p) => `- [[${p.id}|${path.posix.basename(p.id)}]]: ${p.fm.summary || ""}`).join("\n") + "\n";
  fs.writeFileSync(path.join(WIKI, "index.md"), idx);

  // gaps.md auto section
  const gapsFile = path.join(WIKI, "gaps.md");
  if (fs.existsSync(gapsFile)) {
    const g = fs.readFileSync(gapsFile, "utf8");
    let auto = `${AUTO_START}\n_Generated ${TODAY} from each page's "Open questions" and "Conflicts" sections._\n\n`;
    for (const p of topics.sort((a, b) => a.id.localeCompare(b.id))) {
      const oq = (p.body.match(/## Open questions\n([\s\S]*?)(?=\n## |$)/) || [])[1] || "";
      const cf = (p.body.match(/## Conflicts\n([\s\S]*?)(?=\n## |$)/) || [])[1] || "";
      const o = oq.split("\n").filter((l) => l.startsWith("- [ ]")).length;
      const c = cf.split("\n").filter((l) => l.startsWith("- ") && !/None known/.test(l)).length;
      if (o || c) auto += `- [[${p.id}|${path.posix.basename(p.id)}]]: ${o} open question${o === 1 ? "" : "s"}, ${c} conflict${c === 1 ? "" : "s"}\n`;
    }
    const { raws } = load();
    const cited = new Set(topics.flatMap((p) => [].concat(p.fm.sources || []).map((s) => noExt(s.replace(/^\[\[|\]\]$/g, "").split("|")[0]))));
    const unc = raws.filter((r) => !covers(cited, r.id) && !covers(cited, noExt(r.id)));
    auto += `\n### Uncompiled raw files\n\n` + (unc.length ? unc.map((r) => `- [[${r.id}]]`).join("\n") : "- None. Every raw file is cited by at least one page.") + `\n${AUTO_END}`;
    const next = g.includes(AUTO_START) ? g.replace(new RegExp(`${AUTO_START}[\\s\\S]*?${AUTO_END}`), auto) : g.trimEnd() + "\n\n## Open items by page (auto)\n\n" + auto + "\n";
    fs.writeFileSync(gapsFile, next);
  }
  console.log(`index: ${topics.length} topic pages, ${folders.length} folder maps, ~${wikiTokens} tokens`);
}

// ---------- lint ----------
function cmdLint(flags) {
  const { pages, raws, resolve } = load();
  const errors = [], warnings = [];
  const E = (page, msg) => errors.push({ page, msg });
  const W = (page, msg) => warnings.push({ page, msg });
  const topics = pages.filter(isTopic);
  const inbound = new Map();
  const extra = ["agents.md"].filter((f) => fs.existsSync(path.join(ROOT, f))).map((f) => parse(path.join(ROOT, f)));

  for (const p of [...pages, ...extra]) {
    for (const l of links(p.text)) {
      const r = resolve(l);
      if (!r) E(p.id, `broken link [[${l}]]`);
      else if (noExt(r) !== p.id) inbound.set(noExt(r), [...(inbound.get(noExt(r)) || []), p.id]);
    }
  }
  const citedRaw = new Set();
  for (const p of topics) {
    for (const k of REQUIRED_FM) if (p.fm[k] === undefined || p.fm[k] === "" || (Array.isArray(p.fm[k]) && !p.fm[k].length)) E(p.id, `missing frontmatter: ${k}`);
    const secs = sections(p.body);
    for (const s of REQUIRED_SECTIONS) if (!secs.includes(s)) E(p.id, `missing section: ## ${s}`);
    for (const s of [].concat(p.fm.sources || [])) {
      const t = s.replace(/^\[\[|\]\]$/g, "").split("|")[0];
      const r = resolve(t);
      if (!r) E(p.id, `source not found: ${t}`);
      else if (!r.startsWith("raw/") && !r.startsWith("wiki/07-outputs/")) W(p.id, `source is not in raw/ or wiki/07-outputs/: ${r}`);
      else citedRaw.add(noExt(r));
    }
    const fromOthers = (inbound.get(p.id) || []).filter((i) => !/\/agent$|^wiki\/index$/.test(i));
    if (!fromOthers.length) W(p.id, "orphan: no inbound links from other pages");
    if (p.fm.updated && (Date.parse(TODAY) - Date.parse(p.fm.updated)) / 864e5 > STALE_DAYS) W(p.id, `stale: updated ${p.fm.updated} (> ${STALE_DAYS} days)`);
    const t = tokens(p.text);
    if (t > 6000) W(p.id, `large page (~${t} tokens). Consider splitting by topic.`);
    const rels = (p.body.match(/## Related\n([\s\S]*?)(?=\n## |$)/) || [])[1] || "";
    for (const l of links(rels)) {
      const r = resolve(l);
      if (!r || !r.startsWith("wiki/") || /\/agent\.md$/.test(r)) continue;
      const other = pages.find((q) => q.id === noExt(r));
      const back = other && links(other.text).some((x) => resolve(x) === p.id + ".md");
      if (other && isTopic(other) && !back) W(p.id, `one-way relation → ${noExt(r)} doesn't link back`);
    }
  }
  for (const r of raws) {
    if (!covers(citedRaw, r.id)) W(r.id, "uncompiled: raw file not cited by any wiki page");
    const cap = r.name.endsWith(".md") ? parse(r.file).fm.captured : null;
    const citers = topics.filter((p) => [].concat(p.fm.sources || []).some((s) => s.includes(r.id)));
    if (cap && citers.length && citers.every((p) => p.fm.updated && p.fm.updated < cap)) W(r.id, `captured ${cap}, after every page that cites it was last updated. Recompile.`);
  }
  for (const d of fs.existsSync(WIKI) ? fs.readdirSync(WIKI, { withFileTypes: true }) : [])
    if (d.isDirectory() && !d.name.startsWith(".") && !fs.existsSync(path.join(WIKI, d.name, "agent.md"))) W(`wiki/${d.name}`, "folder has no agent.md map (run `kb index`)");

  const total = pages.reduce((n, p) => n + tokens(p.text), 0);
  if (total > 200000) W("wiki", `wiki is ~${total} tokens. Above 200K, consider splitting into multiple KBs or a hot/cold split.`);
  const openQs = topics.reduce((n, p) => n + (((p.body.match(/## Open questions\n([\s\S]*?)(?=\n## |$)/) || [])[1] || "").match(/^- \[ \]/gm) || []).length, 0);

  const summary = `${errors.length} errors, ${warnings.length} warnings, ${openQs} open questions, ${topics.length} topic pages, ~${total} tokens`;
  if (flags.includes("--json")) console.log(JSON.stringify({ date: TODAY, summary, errors, warnings, openQuestions: openQs, tokens: total }, null, 2));
  else {
    console.log(`\nKB lint: ${TODAY}\n${summary}\n`);
    for (const e of errors) console.log(`  ✖ ${e.page}: ${e.msg}`);
    for (const w of warnings) console.log(`  ⚠ ${w.page}: ${w.msg}`);
    if (!errors.length && !warnings.length) console.log("  ✔ clean");
  }
  if (flags.includes("--log")) appendLog(`lint`, summary);
  process.exitCode = errors.length ? 1 : 0;
}

function appendLog(kind, text) {
  fs.mkdirSync(WIKI, { recursive: true });
  const f = path.join(WIKI, "log.md");
  const base = fs.existsSync(f) ? fs.readFileSync(f, "utf8").trimEnd() : `---\ntype: meta\ntags: [meta, log]\nup: "[[wiki/index]]"\n---\n\n# Log`;
  fs.writeFileSync(f, `${base}\n- ${TODAY} · **${kind}**: ${text}\n`);
}

// ---------- bundle / stats ----------
function cmdBundle() {
  const { pages } = load();
  const head = fs.existsSync(path.join(ROOT, "agents.md")) ? fs.readFileSync(path.join(ROOT, "agents.md"), "utf8") : "";
  const order = pages.sort((a, b) => (a.id === "wiki/index" ? -1 : b.id === "wiki/index" ? 1 : a.id.localeCompare(b.id)));
  const out = [`<!-- KB bundle ${TODAY}: paste into any long-context LLM for full-context Q&A -->`, `<file path="agents.md">\n${head}\n</file>`]
    .concat(order.map((p) => `<file path="${p.id}.md">\n${p.text}\n</file>`)).join("\n\n");
  fs.mkdirSync(path.join(ROOT, ".kb"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, ".kb", "wiki-bundle.md"), out);
  console.log(`bundle: .kb/wiki-bundle.md (${pages.length} files, ~${tokens(out)} tokens)`);
}

function cmdStats() {
  const { pages, raws } = load();
  const w = pages.reduce((n, p) => n + tokens(p.text), 0);
  const r = raws.reduce((n, x) => n + (x.name.match(/\.(md|txt|html|csv|json)$/) ? tokens(fs.readFileSync(x.file, "utf8")) : 0), 0);
  console.log(`raw: ${raws.length} files (~${r} tokens text) → wiki: ${pages.filter(isTopic).length} topic pages (~${w} tokens). Wiki/raw size ratio ${r ? Math.round((w / r) * 100) : 0}%.`);
  for (const c of [128e3, 256e3, 1e6]) console.log(`  fits ${c / 1e3}K context: ${w < c * 0.9 ? "yes" : "no"}`);
}

const [cmd, ...flags] = argv;
({ index: cmdIndex, lint: () => cmdLint(flags), bundle: cmdBundle, stats: cmdStats }[cmd] ||
  (() => console.log("usage: kb.mjs <index|lint|bundle|stats> [--json] [--log] [--root <dir>]")))();
