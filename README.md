# Revenue Liability Portal

Static GitHub-ready split build for the Moradabad Division Revenue Liability Portal.

## Main Files

- `index.html` - page structure only
- `assets/css/main.css` - styling
- `assets/js/app.js` - dashboard logic, calculations, export, tabs, and charts
- `assets/vendor/xlsx.full.min.js` - local SheetJS Excel library used for Excel export
- `backup/index-original-single-file.html` - untouched original single-file backup

## Run Locally

From this folder, run a static server and open the local URL:

```powershell
py -3 -m http.server 8000 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8000/
```

## GitHub Pages

Upload this whole folder structure to the repository root. GitHub Pages should serve `index.html` automatically.

Do not delete the `assets` folder, because `index.html` now depends on those CSS and JavaScript files.

## Local Data Sync Application

Portal-side file upload is intentionally disabled. Run `START-MBRLR-LOCAL-SYNC.bat` (or the legacy `RUN-LOCAL-DATA-SYNC.bat`) to open the separate Windows GUI.

The GUI defaults to `D:\PORTAL DATA\current year` and accepts a Current Year folder or six individual source files, plus an optional Previous Year folder or two individual PU files. Each successful sync parses and validates the inputs, reconciles the calculations, refreshes every portal dataset and export payload, mirrors the working files to the selected GitHub Desktop folder, starts the local portal if required, validates every portal tab and Excel/PDF/PPT export entry point, and always opens a cache-busted fresh view. A failed validation stops the workflow. It does not commit or push Git changes.

Month sensing is automatic. The engine uses the latest non-zero month found in the uploaded actual workbooks together with the computer's current financial-year month, so a running month is not counted as completed prematurely. If the GUI is opened in a new calendar month—or remains open across a month boundary—it automatically reruns the complete simulation, portal refresh, and export refresh workflow.
