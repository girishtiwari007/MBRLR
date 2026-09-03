# MBRLR Portal Disaster Recovery and Complete Rebuild

This file explains how to restore the complete MBRLR portal after a computer failure, deleted working folder, or lost local backup. Keep a copy of this file outside the computer as well.

## What must be preserved

A rebuild requires both of the following:

1. A copy of this Git repository, normally available from GitHub through GitHub Desktop.
2. The six original Current Year Excel reports. The portal source code cannot reconstruct financial figures when the original reports are also lost.

The normal Current Year source location is:

```text
D:\PORTAL DATA\current year
```

The folder must contain one valid report for each role:

- PU budget
- PU month-wise actual
- PU/department demand-SMH budget
- PU/department demand-SMH actual
- Demand-SMH budget
- Demand-SMH actual

Files may be `.xls` or `.xlsx`. The rebuild script identifies their roles from workbook content rather than relying only on filenames.

## Software required

- Windows 10 or Windows 11
- Python 3.11 or a compatible Python 3 installation available as `python`
- GitHub Desktop, for restoring and later publishing the repository
- Chrome or another modern browser

The portal is static and its browser libraries are stored in the repository. No Node.js, database, cloud service, or browser upload permission is required for normal rebuilding.

## Complete recovery procedure

### 1. Restore the repository

Use GitHub Desktop to clone the MBRLR repository into:

```text
D:\github\MBRLR
```

Confirm that these critical files exist:

```text
D:\github\MBRLR\index.html
D:\github\MBRLR\assets\css\main.css
D:\github\MBRLR\assets\js\app.js
D:\github\MBRLR\tools\local_portal_sync.py
D:\github\MBRLR\tools\mbrlr_sync_gui.py
D:\github\MBRLR\START-MBRLR-LOCAL-SYNC.bat
```

Do not restore or reconnect the retired OneDrive repository path.

### 2. Restore the source reports

Create `D:\PORTAL DATA\current year` and copy the six Current Year reports into it. Keep the source reports outside the Git repository so they remain the authoritative inputs.

Optional Previous Year comparison reports can be placed in a separate folder. Previous Year requires its PU budget and PU month-wise actual reports.

### 3. Run the visual rebuild

Double-click:

```text
D:\github\MBRLR\START-MBRLR-LOCAL-SYNC.bat
```

In the GUI:

1. Confirm **Portal source** is `D:\github\MBRLR`.
2. Confirm **GitHub Desktop folder** is `D:\github\MBRLR`.
3. Confirm **Current Year** is `D:\PORTAL DATA\current year`.
4. Choose the reporting cutoff. Completed Through must immediately precede Current / Running Month.
5. Select **SIMULATE, VALIDATE & SYNC**.

The GUI must show PASS for SOURCE, CALCULATION, PAGES, and EXPORTS. A failed gate prevents completion and restores the last-known-good generated files.

### 4. Command-line rebuild if the GUI does not open

Open PowerShell in `D:\github\MBRLR` and run:

```powershell
$env:PYTHONDONTWRITEBYTECODE = '1'
python -B tools\local_portal_sync.py --source "D:\PORTAL DATA\current year" --root "D:\github\MBRLR" --github "D:\github\MBRLR" --running-month-index 5 --completed-through-index 4
```

Financial-year month indexes are zero-based:

| Index | Month | Index | Month |
|---:|---|---:|---|
| 0 | April | 6 | October |
| 1 | May | 7 | November |
| 2 | June | 8 | December |
| 3 | July | 9 | January |
| 4 | August | 10 | February |
| 5 | September | 11 | March |

The example command therefore means August is completed and September is the running month. Update both indexes together as months advance. Alternatively, omit both month arguments to use automatic uploaded-actual detection.

### 5. Start and verify the recovered portal

From PowerShell in `D:\github\MBRLR`, run:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8765/index.html
```

Check the following before using or publishing the recovered portal:

- `data/mb-budget-sync/sync-manifest.json` reports `ok: true` for calculation, portal, export, and smoke-test validation.
- The month status shows the intended completed and running months.
- All 12 portal tabs open and show current figures.
- PU-wise Revenue shows every applicable actual month, including PU 11.
- Hover details show the same month values as their underlying tables.
- Excel, PDF, and PowerPoint export buttons work.
- Export text is at least 10 pt and content fits within its page or slide.
- Browser upload fields are absent.

The generated smoke-test result is stored in:

```text
data\mb-budget-sync\smoke-test.json
```

The latest 100 validated rebuild records are stored in:

```text
data\mb-budget-sync\audit-history.json
```

## Generated files refreshed by every successful rebuild

The synchronization engine regenerates or refreshes the portal calculation payloads, application JavaScript, cache revision, manifest, smoke-test record, audit record, and export data contract. It then validates all portal pages and the Excel/PDF/PowerPoint rules before reporting success.

Never manually edit generated financial figures in `assets/js/detail-data.js`, `assets/js/demand-smh-data.js`, or `data/mb-budget-sync/processed`. Correct the source workbook or processing code and run the complete synchronization again.

## Publishing after recovery

The rebuild does not commit or push anything. Review the changed files in GitHub Desktop, commit them to the intended branch, and push them yourself. Ensure the repository contains this recovery guide, all application files, local vendor libraries, and synchronization tools before treating GitHub as the recovery copy.

## Recommended backup rule

Maintain three independent copies:

- GitHub repository: source code and generated portal files
- `D:\PORTAL DATA`: authoritative Excel inputs
- Offline or external-drive copy: repository archive, source reports, and this recovery guide

Test recovery occasionally by cloning into a temporary folder and running the four validation gates. A backup is only reliable after a successful restore test.
