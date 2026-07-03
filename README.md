# Revenue Liability Portal

Static GitHub-ready split build for the Moradabad Division Revenue Liability Portal.

## Main Files

- `index.html` - page structure only
- `assets/css/main.css` - styling
- `assets/js/app.js` - dashboard logic, calculations, upload, export, tabs, charts
- `assets/vendor/xlsx.full.min.js` - local SheetJS Excel library used for upload/export
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
