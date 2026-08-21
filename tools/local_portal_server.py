"""Local-only upload and sync server for Revenue Liability Portal.

This server is intentionally bound to 127.0.0.1. It lets an admin upload IPAS
XLS/XLSX source files from a browser, runs tools/local_portal_sync.py, and serves
the refreshed static portal for local verification.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_UPLOAD = ROOT / "LOCAL-PORTAL-UPLOAD"
DEFAULT_GITHUB = Path(r"C:\Users\HP\OneDrive\Documents\GitHub\MBRLR")
GIT = Path(r"C:\Users\HP\AppData\Local\GitHubDesktop\app-3.6.2\resources\app\git\cmd\git.exe")
ALLOWED_EXT = {".xls", ".xlsx"}


def detect_upload_profile(path: Path):
    """Use the portal parser's sheet detection so local status matches sync behavior."""
    try:
        sys.path.insert(0, str(ROOT / "tools"))
        import local_portal_sync as sync  # type: ignore

        profile = sync.sheet_profile(path)
        role = profile.get("role")
        return {
            "role": role or "",
            "roleLabel": sync.ROLE_LABELS.get(role, "Not detected"),
            "score": profile.get("score", 0),
            "reason": profile.get("reason", "Not detected"),
            "storedAs": sync.TARGET_NAMES.get(role, ""),
        }
    except Exception as exc:
        return {
            "role": "",
            "roleLabel": "Not detected",
            "score": 0,
            "reason": f"Detection pending/failed: {exc}",
            "storedAs": "",
        }


def safe_filename(name: str) -> str:
    base = Path(name or "upload.xls").name
    base = re.sub(r"[^\w .()@+\-&\[\]]+", "_", base).strip(" .")
    return base or "upload.xls"


def json_bytes(payload) -> bytes:
    return json.dumps(payload, indent=2, default=str).encode("utf-8")


def list_uploads(upload_dir: Path):
    upload_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for path in sorted(upload_dir.glob("*")):
        if path.is_file() and path.suffix.lower() in ALLOWED_EXT:
            stat = path.stat()
            profile = detect_upload_profile(path)
            rows.append({
                "name": path.name,
                "size": stat.st_size,
                "modifiedAt": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
                **profile,
            })
    return rows


def git_status(github_dir: Path):
    if not GIT.exists() or not github_dir.exists():
        return {"ok": False, "text": "Git/GitHub repo path not found."}
    proc = subprocess.run(
        [str(GIT), "status", "--short", "--branch"],
        cwd=str(github_dir),
        text=True,
        capture_output=True,
        timeout=20,
    )
    return {"ok": proc.returncode == 0, "text": (proc.stdout or proc.stderr).strip()}


def parse_multipart(headers, body: bytes):
    content_type = headers.get("Content-Type", "")
    match = re.search(r"boundary=(?P<q>\"?)([^\";]+)(?P=q)", content_type)
    if not match:
        raise ValueError("Upload must be multipart/form-data.")
    boundary = ("--" + match.group(2)).encode("utf-8")
    files = []
    for chunk in body.split(boundary):
        chunk = chunk.strip()
        if not chunk or chunk == b"--":
            continue
        if chunk.endswith(b"--"):
            chunk = chunk[:-2].rstrip()
        header_blob, sep, data = chunk.partition(b"\r\n\r\n")
        if not sep:
            header_blob, sep, data = chunk.partition(b"\n\n")
        if not sep:
            continue
        header_text = header_blob.decode("utf-8", errors="replace")
        name_match = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^";\r\n]*)"?', header_text, re.IGNORECASE)
        if not name_match:
            continue
        filename = safe_filename(name_match.group(1))
        if data.endswith(b"\r\n"):
            data = data[:-2]
        files.append((filename, data))
    return files


LOCAL_SYNC_HTML = r"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Revenue Liability Local Sync</title>
  <style>
    *{box-sizing:border-box}body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:#eef4fa;color:#10243d}
    header{background:#0a315f;color:#fff;padding:14px 18px;border-bottom:4px solid #c9a84c}
    h1{font-size:18px;margin:0 0 3px}header p{margin:0;color:#c7d8ea;font-size:12px}
    main{max-width:1120px;margin:18px auto;padding:0 14px;display:grid;gap:14px}
    section{background:#fff;border:1px solid #cbd8e8;border-radius:10px;padding:14px;box-shadow:0 2px 12px rgba(10,22,40,.08)}
    h2{font-size:14px;margin:0 0 8px;color:#0a315f}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.full{grid-column:1/-1}
    .drop{border:2px dashed #9db8d6;background:#f7fbff;border-radius:10px;padding:18px;text-align:center}
    .drop.primary{border-color:#0e7a49;background:#eefaf3}
    input[type=file]{width:100%;padding:18px;background:#fff;border:1px solid #d4e0ee;border-radius:8px}
    button{border:0;border-radius:8px;background:#0a315f;color:#fff;padding:10px 14px;font-weight:800;cursor:pointer}
    button.green{background:#0e7a49}button.gold{background:#b88700}button:disabled{opacity:.55;cursor:not-allowed}
    .actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.note{font-size:12px;color:#52677e;line-height:1.45}
    table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:8px;border-bottom:1px solid #e4edf6;text-align:left}
    th{background:#f1f6fb;color:#48627e}.status{white-space:pre-wrap;background:#f6f8fb;border-radius:8px;padding:10px;font-family:Consolas,monospace;font-size:12px;max-height:260px;overflow:auto}
    .ok{color:#0e7a49;font-weight:800}.warn{color:#9a6500;font-weight:800}.err{color:#a30000;font-weight:800}
    .role-pill{display:inline-block;border-radius:999px;padding:2px 8px;background:#e8f3ff;color:#0a315f;font-weight:800;font-size:11px}.role-pill.ok{background:#e4f8ed;color:#0e7a49}.role-pill.err{background:#fff1f1;color:#a30000}
    .sync-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}.step{border:1px solid #d4e0ee;border-radius:8px;padding:10px;background:#f9fcff}.step strong{display:block;font-size:12px;color:#0a315f}.step span{display:block;font-size:11px;color:#52677e;margin-top:4px}
    @media(max-width:760px){.grid{grid-template-columns:1fr}.actions button{width:100%}}
  </style>
</head>
<body>
<header>
  <h1>Revenue Liability Portal - Local Upload & Sync</h1>
  <p>Runs on this computer only. Upload files, sync portal data, verify locally, then commit/push in GitHub Desktop.</p>
</header>
<main>
  <section>
    <h2>1. Choose Folder or Upload Latest XLS/XLSX Files</h2>
    <div class="grid">
      <div class="drop primary full">
        <input id="folderFiles" type="file" webkitdirectory directory multiple accept=".xls,.xlsx">
        <p class="note"><strong>Recommended:</strong> choose the folder containing latest MBRLR source files. After selection, click one button and the portal will upload, sense report types, sync local data and open the refreshed portal.</p>
        <div class="actions" style="justify-content:center">
          <button class="green" onclick="autoFolderSync()">Choose Folder Files, Sense & Refresh Portal</button>
        </div>
      </div>
      <div class="drop">
        <input id="files" type="file" multiple accept=".xls,.xlsx">
        <p class="note">Manual option: select the six current-year source files. File names can vary; parser detects report type from sheet columns.</p>
      </div>
      <div>
        <p class="note"><strong>Expected report types:</strong><br>PU Budget, PU Month Actual, DEPT-Demand Budget, DEPT-Demand Actual, Demand/SMH Budget, Demand/SMH Actual.</p>
        <div class="actions">
          <button onclick="uploadFiles()">Upload to Local Folder</button>
          <button class="gold" onclick="clearUploads()">Clear Local Upload Folder</button>
        </div>
      </div>
    </div>
    <div class="sync-steps">
      <div class="step"><strong>Select path</strong><span>Use the folder picker for PORTAL DATA or any local folder.</span></div>
      <div class="step"><strong>Auto sense</strong><span>Each Excel file is classified as PU, DEPT-Demand or Demand/SMH.</span></div>
      <div class="step"><strong>Refresh portal</strong><span>Parser updates local static data and opens the refreshed portal.</span></div>
    </div>
  </section>
  <section>
    <h2>2. Local Folder / GitHub Status</h2>
    <div class="actions">
      <button onclick="loadStatus()">Refresh Status</button>
      <button class="green" onclick="runSync()">Sync, Parse & Mirror to GitHub Desktop</button>
      <a href="/index.html?localSync=latest" target="_blank"><button type="button">Open Portal</button></a>
    </div>
    <div id="filesTable" style="margin-top:10px"></div>
  </section>
  <section>
    <h2>3. Action Log</h2>
    <div id="status" class="status">Ready.</div>
  </section>
</main>
<script>
const statusBox = document.getElementById('status');
function writeStatus(text, cls=''){ statusBox.className = 'status ' + cls; statusBox.textContent = text; }
async function api(path, opts){ const r = await fetch(path, opts); const j = await r.json(); if(!r.ok) throw new Error(j.error || r.statusText); return j; }
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function renderStatus(data){
  const files = data.uploads || [];
  document.getElementById('filesTable').innerHTML = files.length ? `<table><thead><tr><th>File</th><th>Sensed Report</th><th>Reason</th><th>GitHub Store Name</th><th>Size</th><th>Modified</th></tr></thead><tbody>${files.map(f=>`<tr><td>${esc(f.name)}</td><td><span class="role-pill ${f.role ? 'ok' : 'err'}">${esc(f.roleLabel || 'Not detected')}</span></td><td>${esc(f.reason || '-')}</td><td>${esc(f.storedAs || '-')}</td><td>${esc(f.size)}</td><td>${esc(f.modifiedAt)}</td></tr>`).join('')}</tbody></table>` : '<p class="note">No XLS/XLSX files uploaded yet.</p>';
  writeStatus(`Upload folder: ${data.uploadDir}\nGitHub repo: ${data.githubDir}\n\nGit status:\n${data.git && data.git.text ? data.git.text : '-'}`, data.git && data.git.ok ? 'ok' : 'warn');
}
async function loadStatus(){ try{ renderStatus(await api('/api/status')); }catch(e){ writeStatus(e.message, 'err'); } }
async function uploadInputFiles(inputId, autoSync=false){
  const input = document.getElementById(inputId);
  if(!input.files.length){ writeStatus('Select XLS/XLSX files first.', 'warn'); return; }
  const fd = new FormData();
  [...input.files].filter(f => /\.(xls|xlsx)$/i.test(f.name)).forEach(f => fd.append('files', f, f.webkitRelativePath || f.name));
  writeStatus('Uploading files to LOCAL-PORTAL-UPLOAD...', 'warn');
  try{
    const data = await api('/api/upload', {method:'POST', body:fd});
    renderStatus(data);
    writeStatus(`Uploaded ${data.saved.length} file(s).\n${autoSync ? 'Auto sync is starting now...' : 'Now click Sync, Parse & Mirror.'}`, 'ok');
    if (autoSync) await runSync(true);
  }
  catch(e){ writeStatus(e.message, 'err'); }
}
async function uploadFiles(){ return uploadInputFiles('files', false); }
async function autoFolderSync(){ return uploadInputFiles('folderFiles', true); }
async function runSync(){
  writeStatus('Running local parser and mirroring to GitHub Desktop. Please wait...', 'warn');
  try{ const data = await api('/api/sync', {method:'POST'}); await loadStatus(); writeStatus(`SYNC OK\n\n${data.output}\n\nOpening refreshed portal. Verify locally, then commit/push in GitHub Desktop.`, 'ok'); window.open('/index.html?localSync=' + Date.now(), '_blank'); }
  catch(e){ writeStatus(e.message, 'err'); }
}
async function clearUploads(){
  if(!confirm('Clear XLS/XLSX files from LOCAL-PORTAL-UPLOAD only?')) return;
  try{ const data = await api('/api/clear', {method:'POST'}); renderStatus(data); writeStatus('Local upload folder cleared.', 'ok'); }
  catch(e){ writeStatus(e.message, 'err'); }
}
loadStatus();
</script>
</body>
</html>"""


class LocalPortalHandler(SimpleHTTPRequestHandler):
    server_version = "RevenueLiabilityLocalSync/1.0"

    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    @property
    def upload_dir(self) -> Path:
        return self.server.upload_dir

    @property
    def github_dir(self) -> Path:
        return self.server.github_dir

    def send_json(self, payload, status=HTTPStatus.OK):
        body = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in {"/local-sync", "/local-sync/"}:
            body = LOCAL_SYNC_HTML.encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if parsed.path == "/api/status":
            self.send_json({
                "uploadDir": str(self.upload_dir),
                "githubDir": str(self.github_dir),
                "uploads": list_uploads(self.upload_dir),
                "git": git_status(self.github_dir),
            })
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/api/upload":
                self.handle_upload()
                return
            if parsed.path == "/api/sync":
                self.handle_sync()
                return
            if parsed.path == "/api/clear":
                self.handle_clear()
                return
            self.send_json({"error": "Unknown API endpoint."}, HTTPStatus.NOT_FOUND)
        except Exception as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def handle_upload(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            raise ValueError("No upload body received.")
        body = self.rfile.read(length)
        files = parse_multipart(self.headers, body)
        if not files:
            raise ValueError("No files found in upload.")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        saved = []
        for filename, data in files:
            ext = Path(filename).suffix.lower()
            if ext not in ALLOWED_EXT:
                continue
            target = self.upload_dir / filename
            target.write_bytes(data)
            saved.append({"name": filename, "size": len(data)})
        if not saved:
            raise ValueError("No .xls/.xlsx files were saved.")
        self.send_json({
            "saved": saved,
            "uploadDir": str(self.upload_dir),
            "githubDir": str(self.github_dir),
            "uploads": list_uploads(self.upload_dir),
            "git": git_status(self.github_dir),
        })

    def handle_sync(self):
        if not list_uploads(self.upload_dir):
            raise ValueError(f"No XLS/XLSX files found in {self.upload_dir}")
        cmd = [
            sys.executable,
            str(ROOT / "tools" / "local_portal_sync.py"),
            "--source",
            str(self.upload_dir),
            "--root",
            str(ROOT),
            "--github",
            str(self.github_dir),
        ]
        proc = subprocess.run(cmd, cwd=str(ROOT), text=True, capture_output=True, timeout=180)
        output = "\n".join(part for part in [proc.stdout.strip(), proc.stderr.strip()] if part)
        if proc.returncode != 0:
            raise RuntimeError(output or "Sync failed.")
        self.send_json({
            "ok": True,
            "output": output,
            "uploads": list_uploads(self.upload_dir),
            "git": git_status(self.github_dir),
        })

    def handle_clear(self):
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        for path in self.upload_dir.glob("*"):
            if path.is_file() and path.suffix.lower() in ALLOWED_EXT:
                path.unlink()
        self.send_json({
            "ok": True,
            "uploadDir": str(self.upload_dir),
            "githubDir": str(self.github_dir),
            "uploads": list_uploads(self.upload_dir),
            "git": git_status(self.github_dir),
        })


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8010)
    parser.add_argument("--upload-dir", default=str(DEFAULT_UPLOAD))
    parser.add_argument("--github", default=str(DEFAULT_GITHUB))
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), LocalPortalHandler)
    server.upload_dir = Path(args.upload_dir)
    server.github_dir = Path(args.github)
    print(f"Revenue Liability local server: http://{args.host}:{args.port}/")
    print(f"Local upload and sync page: http://{args.host}:{args.port}/local-sync")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
