#!/usr/bin/env python3
"""
notion_extract.py - Extract a Notion export zip on Windows without the
"Destination Path Too Long" error.

What it does
  1. Opens the Notion export zip (and any zips nested inside it, which Notion
     creates for big exports: "Export-...-Part-1.zip").
  2. Shortens every file/folder name:
       - removes Notion's 32-character IDs  ("My Page 1a2b3c...f9.md" -> "My Page.md")
       - trims any single name longer than MAX_NAME characters
       - adds " (2)", " (3)" ... if two names collide after shortening
  3. Writes using Windows long-path syntax (\\\\?\\C:\\...) so even deep folders work.
  4. Rewrites the links inside .md / .html / .csv files so they still point to
     the renamed files (keeps Obsidian links and images working).

Usage (PowerShell or CMD):
  python notion_extract.py "C:\\Users\\you\\Downloads\\Export-abc123.zip"
  python notion_extract.py "C:\\Users\\you\\Downloads\\Export-abc123.zip" "C:\\Users\\you\\second-brain\\raw\\notion"

If you leave out the output folder, it extracts to raw\\notion in the vault
(the folder above this scripts\\ folder).

Needs only standard Python 3.8+ - nothing to pip install.
"""

import io
import os
import re
import sys
import zipfile
import posixpath
from urllib.parse import unquote, quote

MAX_NAME = 80  # max characters for any single file/folder name (before extension)

# Notion IDs: 32 hex chars, usually preceded by a space, e.g. "Page a1b2...e9f0"
ID_RE = re.compile(r"\s+[0-9a-f]{32}(?=\.|$)", re.IGNORECASE)
ID_RE_BARE = re.compile(r"[ _-]?[0-9a-f]{32}", re.IGNORECASE)
BAD_CHARS = re.compile(r'[<>:"|?*\x00-\x1f]')
TEXT_EXTS = {".md", ".html", ".htm", ".csv"}


def long_path(p: str) -> str:
    """Return a path Windows will accept even when it is longer than 260 chars."""
    p = os.path.abspath(p)
    if os.name == "nt" and not p.startswith("\\\\?\\"):
        if p.startswith("\\\\"):  # network share
            return "\\\\?\\UNC\\" + p[2:]
        return "\\\\?\\" + p
    return p


def clean_name(name: str) -> str:
    """Shorten one path component."""
    stem, ext = os.path.splitext(name)
    if len(ext) > 10 or " " in ext:  # not a real extension
        stem, ext = name, ""
    new = ID_RE.sub("", stem)
    if not new.strip():  # name was only an ID
        new = stem
    elif new == stem:
        new = ID_RE_BARE.sub("", stem) or stem
    new = BAD_CHARS.sub("_", new).strip().rstrip(".")
    if len(new) > MAX_NAME:
        new = new[:MAX_NAME].rstrip(" .")
    return (new or "untitled") + ext


class Renamer:
    """Maps original zip paths to short, collision-free paths."""

    def __init__(self):
        self.map = {}       # original posix path -> new posix path
        self.taken = {}     # new parent dir -> set of lowercased child names

    def get(self, original: str) -> str:
        original = original.strip("/")
        if original in self.map:
            return self.map[original]
        parent_orig, name = posixpath.split(original)
        parent_new = self.get(parent_orig) if parent_orig else ""
        cleaned = clean_name(name)
        siblings = self.taken.setdefault(parent_new, set())
        stem, ext = os.path.splitext(cleaned)
        candidate, n = cleaned, 2
        while candidate.lower() in siblings:
            candidate = f"{stem} ({n}){ext}"
            n += 1
        siblings.add(candidate.lower())
        new = posixpath.join(parent_new, candidate) if parent_new else candidate
        self.map[original] = new
        return new


def iter_entries(zf: zipfile.ZipFile, prefix: str = ""):
    """Yield (path, bytes) for every file, descending into nested zips."""
    for info in zf.infolist():
        if info.is_dir():
            continue
        name = info.filename.replace("\\", "/")
        data = zf.read(info)
        # Only unpack Notion's own split-export zips; zips attached to pages stay as files
        if re.search(r"(^|/)Export-[^/]*\.zip$|Part-\d+\.zip$", name, re.I):
            try:
                with zipfile.ZipFile(io.BytesIO(data)) as inner:
                    # Nested Notion part-zips: flatten them into the same tree
                    yield from iter_entries(inner, prefix)
                continue
            except zipfile.BadZipFile:
                pass  # not really a zip, save it as a file
        yield prefix + name, data


# Markdown links may contain balanced brackets: (Page%20(draft)%20abc.md)
LINK_RE = re.compile(r'(\]\(|href="|src=")((?:[^()"\s]|\([^()"\s]*\))+)')


def fix_links(text: str, old_file: str, renamer: Renamer) -> str:
    """Rewrite relative links in a file so they point at the renamed targets."""
    old_dir = posixpath.dirname(old_file)
    new_dir = posixpath.dirname(renamer.map[old_file])

    def repl(m):
        lead, url = m.group(1), m.group(2)
        if re.match(r"^[a-z]+:", url, re.I) or url.startswith("#"):
            return m.group(0)
        path, frag = (url.split("#", 1) + [""])[:2]
        target_old = posixpath.normpath(posixpath.join(old_dir, unquote(path)))
        target_new = renamer.map.get(target_old)
        if not target_new:
            return m.group(0)
        rel = posixpath.relpath(target_new, new_dir or ".")
        new_url = quote(rel) + ("#" + frag if frag else "")
        return lead + new_url

    out = LINK_RE.sub(repl, text)
    # CSV database exports list page names with their IDs - strip those too
    if old_file.lower().endswith(".csv"):
        out = re.sub(r"\s[0-9a-f]{32}", "", out, flags=re.I)
    return out


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    zip_path = sys.argv[1].strip('"')
    if len(sys.argv) >= 3:
        out_dir = sys.argv[2].strip('"')
    else:
        vault = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        out_dir = os.path.join(vault, "raw", "notion")

    if not os.path.isfile(zip_path):
        sys.exit(f"Zip not found: {zip_path}")

    print(f"Reading  {zip_path}")
    print(f"Writing  {out_dir}\n")

    with zipfile.ZipFile(zip_path) as zf:
        entries = list(iter_entries(zf))

    renamer = Renamer()
    for name, _ in entries:
        renamer.get(name)

    written = errors = 0
    longest = 0
    for name, data in entries:
        new_rel = renamer.map[name.strip("/")]
        dest = os.path.join(out_dir, *new_rel.split("/"))
        longest = max(longest, len(os.path.abspath(dest)))
        try:
            if os.path.splitext(name)[1].lower() in TEXT_EXTS:
                try:
                    text = data.decode("utf-8")
                    data = fix_links(text, name.strip("/"), renamer).encode("utf-8")
                except UnicodeDecodeError:
                    pass
            os.makedirs(long_path(os.path.dirname(dest)), exist_ok=True)
            with open(long_path(dest), "wb") as f:
                f.write(data)
            written += 1
        except OSError as e:
            errors += 1
            print(f"  ! failed: {new_rel}  ({e})")

    print(f"Done. {written} files extracted, {errors} errors.")
    print(f"Longest path: {longest} characters"
          + ("  (over 260 - enable Windows long paths to open these in Explorer)"
             if longest > 260 else "  (under Windows' 260 limit)"))


if __name__ == "__main__":
    main()
