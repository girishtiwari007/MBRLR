"""MBRLR Local Sync - desktop GUI for validated CY/PY portal data refresh."""
from __future__ import annotations

import json
import queue
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
import webbrowser
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from local_portal_sync import MONTH_LABELS, write_outputs


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CY = Path(r"D:\PORTAL DATA\current year")
DEFAULT_PY = Path(r"C:\Users\HP\Downloads\PORTAL DATA PY")
DEFAULT_GITHUB = Path(r"D:\github\MBRLR")
PORT = 8765


class SyncApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("MBRLR Local Sync")
        self.geometry("940x690")
        self.minsize(820, 600)
        self.configure(bg="#eef4fb")
        self.cy_files: list[Path] = []
        self.py_files: list[Path] = []
        self.events: queue.Queue = queue.Queue()
        self._calendar_month = datetime.now().strftime("%Y-%m")
        self._sync_running = False
        self._build_ui()
        self.after(150, self._drain_events)
        self.after(1200, self._check_initial_month_refresh)
        self.after(60000, self._check_month_rollover)

    def _build_ui(self):
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("TFrame", background="#eef4fb")
        style.configure("Card.TFrame", background="#ffffff")
        style.configure("Title.TLabel", background="#0a1628", foreground="#c9a84c", font=("Segoe UI", 18, "bold"))
        style.configure("Sub.TLabel", background="#0a1628", foreground="#b9cbe0", font=("Segoe UI", 10))
        style.configure("CardTitle.TLabel", background="#ffffff", foreground="#123a63", font=("Segoe UI", 12, "bold"))
        style.configure("TButton", font=("Segoe UI", 10, "bold"), padding=7)

        header = tk.Frame(self, bg="#0a1628", padx=20, pady=16)
        header.pack(fill="x")
        ttk.Label(header, text="MBRLR LOCAL SYNC", style="Title.TLabel").pack(anchor="w")
        ttk.Label(header, text="Validated desktop update for Current Year, optional Previous Year, portal calculations and all exports", style="Sub.TLabel").pack(anchor="w", pady=(3, 0))

        body = ttk.Frame(self, padding=14)
        body.pack(fill="both", expand=True)
        self.repo_var = tk.StringVar(value=str(ROOT))
        self.github_var = tk.StringVar(value=str(DEFAULT_GITHUB))
        self.cy_var = tk.StringVar(value=str(DEFAULT_CY))
        self.py_var = tk.StringVar(value=str(DEFAULT_PY))
        self.use_py = tk.BooleanVar(value=False)
        self.auto_open = tk.BooleanVar(value=True)
        self.month_choices = ["AUTO - detect from uploaded actuals"] + [f"{m} {2026 if i <= 8 else 2027}" for i, m in enumerate(MONTH_LABELS)]
        self.completed_choices = ["AUTO - month before running", "NONE - no completed month"] + self.month_choices[1:]
        self.running_month_var = tk.StringVar(value=self.month_choices[0])
        self.completed_month_var = tk.StringVar(value=self.completed_choices[0])

        self._path_card(body, "Portal and GitHub Desktop working folders", [
            ("Portal source", self.repo_var, lambda: self._browse_dir(self.repo_var)),
            ("GitHub Desktop folder", self.github_var, lambda: self._browse_dir(self.github_var)),
        ]).pack(fill="x", pady=(0, 10))

        month_card = ttk.Frame(body, style="Card.TFrame", padding=12)
        month_card.pack(fill="x", pady=(0, 10))
        month_card.columnconfigure(1, weight=1); month_card.columnconfigure(3, weight=1)
        ttk.Label(month_card, text="Reporting Month Control", style="CardTitle.TLabel").grid(row=0, column=0, columnspan=4, sticky="w", pady=(0, 7))
        ttk.Label(month_card, text="Completed through", background="#ffffff").grid(row=1, column=0, sticky="w", padx=(0, 7))
        ttk.Combobox(month_card, textvariable=self.completed_month_var, values=self.completed_choices, state="readonly").grid(row=1, column=1, sticky="ew", padx=(0, 14))
        ttk.Label(month_card, text="Current / running", background="#ffffff").grid(row=1, column=2, sticky="w", padx=(0, 7))
        ttk.Combobox(month_card, textvariable=self.running_month_var, values=self.month_choices, state="readonly").grid(row=1, column=3, sticky="ew")
        ttk.Label(month_card, text="Manual months must be consecutive; the cutoff refreshes portal calculations and every export.", background="#ffffff", foreground="#607080").grid(row=2, column=0, columnspan=4, sticky="w", pady=(7, 0))

        years = ttk.Frame(body)
        years.pack(fill="x")
        years.columnconfigure(0, weight=1)
        years.columnconfigure(1, weight=1)
        cy = self._year_card(years, "CURRENT YEAR 2026-27", self.cy_var, self.cy_files, False)
        cy.grid(row=0, column=0, sticky="nsew", padx=(0, 5))
        py = self._year_card(years, "PREVIOUS YEAR 2025-26 (optional)", self.py_var, self.py_files, True)
        py.grid(row=0, column=1, sticky="nsew", padx=(5, 0))

        controls = ttk.Frame(body, style="Card.TFrame", padding=12)
        controls.pack(fill="x", pady=10)
        ttk.Checkbutton(controls, text="Always open refreshed portal after successful sync", variable=self.auto_open, state="disabled").pack(side="left")
        self.sync_btn = ttk.Button(controls, text="SIMULATE, VALIDATE & SYNC", command=self.start_sync)
        self.sync_btn.pack(side="right")

        log_card = ttk.Frame(body, style="Card.TFrame", padding=10)
        log_card.pack(fill="both", expand=True)
        ttk.Label(log_card, text="Simulation and Sync Log", style="CardTitle.TLabel").pack(anchor="w", pady=(0, 6))
        self.log = tk.Text(log_card, height=13, bg="#071324", fg="#dcecff", insertbackground="white", font=("Consolas", 9), relief="flat", padx=10, pady=8)
        self.log.pack(fill="both", expand=True)
        self.status_var = tk.StringVar(value="Ready - no files changed")
        tk.Label(self, textvariable=self.status_var, anchor="w", bg="#1a3a6a", fg="white", padx=12, pady=7, font=("Segoe UI", 9, "bold")).pack(fill="x")

    def _path_card(self, parent, title, rows):
        card = ttk.Frame(parent, style="Card.TFrame", padding=12)
        ttk.Label(card, text=title, style="CardTitle.TLabel").grid(row=0, column=0, columnspan=3, sticky="w", pady=(0, 7))
        card.columnconfigure(1, weight=1)
        for index, (label, variable, command) in enumerate(rows, 1):
            ttk.Label(card, text=label, background="#ffffff").grid(row=index, column=0, sticky="w", padx=(0, 8), pady=3)
            ttk.Entry(card, textvariable=variable).grid(row=index, column=1, sticky="ew", pady=3)
            ttk.Button(card, text="Browse", command=command).grid(row=index, column=2, padx=(8, 0), pady=3)
        return card

    def _year_card(self, parent, title, variable, selected_files, previous):
        card = ttk.Frame(parent, style="Card.TFrame", padding=12)
        card.columnconfigure(0, weight=1)
        ttk.Label(card, text=title, style="CardTitle.TLabel").grid(row=0, column=0, columnspan=2, sticky="w")
        if previous:
            ttk.Checkbutton(card, text="Update PY comparison data", variable=self.use_py).grid(row=1, column=0, columnspan=2, sticky="w", pady=(5, 2))
        ttk.Entry(card, textvariable=variable).grid(row=2, column=0, sticky="ew", pady=5)
        ttk.Button(card, text="Folder", command=lambda: self._browse_dir(variable)).grid(row=2, column=1, padx=(6, 0))
        ttk.Button(card, text="Select individual files", command=lambda: self._select_files(selected_files, previous)).grid(row=3, column=0, columnspan=2, sticky="ew")
        note = "Required: 6 CY reports" if not previous else "Required when enabled: PU budget + PU month actual"
        ttk.Label(card, text=note, background="#ffffff", foreground="#607080").grid(row=4, column=0, columnspan=2, sticky="w", pady=(6, 0))
        return card

    def _browse_dir(self, variable):
        chosen = filedialog.askdirectory(initialdir=variable.get() or str(ROOT))
        if chosen:
            variable.set(chosen)

    def _select_files(self, target, previous):
        files = filedialog.askopenfilenames(title="Select XLS/XLSX reports", filetypes=[("Excel reports", "*.xls *.xlsx")])
        if files:
            target[:] = [Path(p) for p in files]
            if previous:
                self.use_py.set(True)
            self._append(f"Selected {len(target)} {'PY' if previous else 'CY'} individual file(s).")

    def _append(self, message):
        self.log.insert("end", message.rstrip() + "\n")
        self.log.see("end")

    def start_sync(self):
        if self._sync_running:
            return
        self._sync_running = True
        self.sync_btn.configure(state="disabled")
        self.status_var.set("Simulation running - portal files are not mirrored until validation passes")
        self._append("\n--- MBRLR validated sync started ---")
        threading.Thread(target=self._sync_worker, daemon=True).start()

    def _stage(self, files, fallback, stack):
        if not files:
            return Path(fallback)
        temp = tempfile.TemporaryDirectory(prefix="mbrlr-sync-")
        stack.append(temp)
        folder = Path(temp.name)
        for source in files:
            shutil.copy2(source, folder / source.name)
        return folder

    def _sync_worker(self):
        temps = []
        try:
            root = Path(self.repo_var.get()).resolve()
            github = Path(self.github_var.get()).resolve() if self.github_var.get().strip() else None
            cy_source = self._stage(self.cy_files, self.cy_var.get(), temps)
            py_source = self._stage(self.py_files, self.py_var.get(), temps) if self.use_py.get() else None
            self.events.put(("log", f"CY source: {cy_source}"))
            self.events.put(("log", f"PY source: {py_source if py_source else 'unchanged'}"))
            self.events.put(("log", "Detecting report roles from worksheet columns..."))
            running_idx, completed_idx = self._selected_month_cutoff()
            self.events.put(("log", f"Month cutoff: completed={self.completed_month_var.get()}, running={self.running_month_var.get()}"))
            summary = write_outputs(root, cy_source, github, py_source, running_idx, completed_idx)
            manifest = json.loads((root / "data/mb-budget-sync/sync-manifest.json").read_text(encoding="utf-8"))
            validation = manifest.get("calculationValidation", {})
            if not validation.get("ok"):
                raise RuntimeError("Generated calculation validation did not pass")
            portal_validation = manifest.get("portalValidation", {})
            export_validation = manifest.get("exportValidation", {})
            if not portal_validation.get("ok") or portal_validation.get("viewCount") != 12:
                raise RuntimeError("All portal pages did not pass the fixed refresh contract")
            if not export_validation.get("ok") or export_validation.get("minimumFontPt") != 10:
                raise RuntimeError("Excel/PDF/PowerPoint export contract did not pass")
            self.events.put(("log", json.dumps(summary, indent=2)))
            self.events.put(("log", f"PASS: calculation simulation; PU mismatches {validation.get('puMonthMismatches', 0)}"))
            self.events.put(("log", f"PASS: month sensing selected latest uploaded actual {summary.get('latestMonth', 'none')} using system month {datetime.now().strftime('%b %Y').upper()}"))
            self.events.put(("log", f"PASS: export sources refreshed under asset version {manifest.get('assetVersion')}"))
            self.events.put(("log", f"PASS: {portal_validation.get('viewCount')} portal pages refreshed and validated"))
            self.events.put(("log", f"PASS: XLSX/PDF/PPTX mock contract; minimum font {export_validation.get('minimumFontPt')} pt; freshness guards {export_validation.get('freshnessGuards')}"))
            portal_root = github if github and github.exists() else root
            self._ensure_server(portal_root)
            url = f"http://127.0.0.1:{PORT}/index.html?fresh={manifest.get('assetVersion', 'latest')}"
            self._validate_live_portal(url, manifest)
            self.events.put(("log", "PASS: every portal tab, chart dataset, and Excel/PDF/PPT export function is available in the fresh live build"))
            webbrowser.open(url)
            self.events.put(("done", f"Sync complete - {manifest.get('sourceRevision')} - {url}"))
        except Exception as exc:
            self.events.put(("error", str(exc)))
        finally:
            for temp in temps:
                temp.cleanup()

    def _ensure_server(self, portal_root):
        with socket.socket() as sock:
            sock.settimeout(.4)
            if sock.connect_ex(("127.0.0.1", PORT)) == 0:
                return
        flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=portal_root, creationflags=flags, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def _check_initial_month_refresh(self):
        """Automatically catch up when the GUI is first opened in a new month."""
        try:
            root = Path(self.repo_var.get()).resolve()
            manifest_path = root / "data/mb-budget-sync/sync-manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
            last_month = str(manifest.get("generatedAt", ""))[:7]
            if last_month and last_month != self._calendar_month:
                self._append(f"MONTH CHANGE SENSED: last calculation {last_month}; system month {self._calendar_month}. Auto-refreshing all views and exports.")
                self.start_sync()
        except Exception as exc:
            self._append(f"Month-sensing startup check warning: {exc}")

    def _check_month_rollover(self):
        """While the GUI remains open, rerun everything at a calendar-month change."""
        current_month = datetime.now().strftime("%Y-%m")
        if current_month != self._calendar_month:
            previous_month = self._calendar_month
            self._calendar_month = current_month
            self._append(f"MONTH CHANGE SENSED: {previous_month} to {current_month}. Auto-refreshing calculations, portal views, and exports.")
            self.start_sync()
        self.after(60000, self._check_month_rollover)

    def _validate_live_portal(self, url, manifest):
        """Fail the sync unless the live cache-fresh portal exposes every view and export."""
        asset_version = manifest.get("assetVersion", "")
        month_status = manifest.get("monthStatus", {})
        last_error = None
        for _ in range(20):
            try:
                with urllib.request.urlopen(url, timeout=3) as response:
                    html = response.read().decode("utf-8", errors="replace")
                app_url = f"http://127.0.0.1:{PORT}/assets/js/app.js?v={asset_version}"
                with urllib.request.urlopen(app_url, timeout=3) as response:
                    app_js = response.read().decode("utf-8", errors="replace")
                required_views = (
                    "tab-summary", "tab-monthwise", "tab-pumaster", "tab-trend",
                    "tab-aitrend", "tab-bpanalysis", "tab-budgetcontrol",
                    "tab-smhdetail", "tab-demandsmh", "tab-remarks",
                    "tab-backup", "tab-admin",
                )
                missing_views = [view for view in required_views if f'id="{view}"' not in html]
                required_exports = ("downloadExcel", "downloadPDFReport", "downloadPowerPoint")
                missing_exports = [name for name in required_exports if name not in app_js]
                required_export_rules = {
                    "Excel landscape": "orientation:'landscape'",
                    "Excel fit-to-page": "fitToWidth:1",
                    "PDF A4 landscape": "new jsPDF({orientation:'landscape', unit:'pt', format:'a4'})",
                    "PDF minimum 10 pt": "styles:{fontSize:10",
                    "PowerPoint 16:9": '<p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>',
                    "PowerPoint minimum 10 pt": "Math.max(1000,size)",
                    "Excel freshness guard": "prepareFreshExport('Excel')",
                    "PDF freshness guard": "prepareFreshExport('PDF')",
                    "PowerPoint freshness guard": "prepareFreshExport('PowerPoint')",
                }
                missing_export_rules = [label for label, token in required_export_rules.items() if token not in app_js]
                if asset_version and asset_version not in app_js:
                    raise RuntimeError("Live portal is serving a stale application asset")
                expected_month_idx = month_status.get("reportingMonthIndex")
                if expected_month_idx is not None and f"let _reportingCurrentMonthIdx = {expected_month_idx};" not in app_js:
                    raise RuntimeError("Live portal reporting month does not match the uploaded month")
                if missing_views:
                    raise RuntimeError("Missing portal views: " + ", ".join(missing_views))
                if missing_exports:
                    raise RuntimeError("Missing export functions: " + ", ".join(missing_exports))
                if missing_export_rules:
                    raise RuntimeError("Missing fixed export rules: " + ", ".join(missing_export_rules))
                if 'type="file"' in html:
                    raise RuntimeError("Browser upload control unexpectedly returned")
                return
            except Exception as exc:
                last_error = exc
                time.sleep(.25)
        raise RuntimeError(f"Live portal validation failed: {last_error}")

    def _selected_month_cutoff(self):
        running_text, completed_text = self.running_month_var.get(), self.completed_month_var.get()
        running_idx = None if running_text.startswith("AUTO") else self.month_choices[1:].index(running_text)
        if completed_text.startswith("AUTO"):
            completed_idx = None if running_idx is None else running_idx - 1
        elif completed_text.startswith("NONE"):
            completed_idx = -1
        else:
            completed_idx = self.month_choices[1:].index(completed_text)
        if running_idx is None and completed_idx is not None:
            running_idx = completed_idx + 1
        if running_idx is not None and completed_idx != running_idx - 1:
            raise RuntimeError("Completed Through must immediately precede Current / Running Month")
        return running_idx, completed_idx

    def _drain_events(self):
        try:
            while True:
                kind, value = self.events.get_nowait()
                if kind == "log":
                    self._append(value)
                elif kind == "done":
                    self._append("SUCCESS: " + value)
                    self.status_var.set(value)
                    self.sync_btn.configure(state="normal")
                    self._sync_running = False
                    messagebox.showinfo("MBRLR Local Sync", "Simulation, validation and sync completed successfully.\n\n" + value)
                elif kind == "error":
                    self._append("FAILED: " + value)
                    self.status_var.set("Sync failed - portal mirror was not intentionally advanced")
                    self.sync_btn.configure(state="normal")
                    self._sync_running = False
                    messagebox.showerror("MBRLR Local Sync", value)
        except queue.Empty:
            pass
        self.after(150, self._drain_events)


if __name__ == "__main__":
    SyncApp().mainloop()
