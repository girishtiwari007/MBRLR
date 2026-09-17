# Displayed report exports

MBRLR only. Data Export is visible page 12 and Portal Admin is page 13. The existing eleven reporting pages are preserved; Remarks and Backup remain accessible through Portal Admin.

Use the page list in **Data Export** for Excel/PDF/PPT. Export controls are no longer added to individual pages or the common header. Combined files contain the rendered reports. Set filters first; navigating directly to Data Export preserves filters. Chart data is also exported as editable values. No report data is intentionally changed by exporting.

Excel stores displayed numbers as editable cells, with identifiers preserved as text. It does not reconstruct source formulas from displayed values. Times New Roman is 10 pt; print scale remains 100%, wide tables are split into bands with identifying columns repeated, and headers repeat on subsequent sheets/pages.

PDF embeds Times New Roman from the local font assets. The included fonts came from this Windows installation; confirm font redistribution rights before publishing these assets publicly. PDF content is paginated instead of reducing the minimum font size. PowerPoint uses native editable tables and chart objects, larger titles and a plain official-report layout.

Downloaded files are snapshots, not live links to the portal. Units and displayed precision are retained. PowerPoint line charts are native editable charts, not interactive web views. Pages with no chart or suitable monthly columns remain table/review slides rather than inventing a trend.

The SMH matrix now has a single dual-unit PDF option: thousands at 10 pt and crores at 8 pt beneath, in the same numeric cell. This is the user-approved exception to the minimum 10 pt rule; variance colours are retained. Older downloaded single-unit reports are not automatically replaced.

Internal test: `node tools/test_display_exports.cjs`. This covers real source rows, wide-column coverage, editable numeric values, PDF font embedding and export generation. Test files in `.export-validation/display` use 30 source records and are layout samples, not complete production reports.

Live browser filter/table extraction and native Office visual opening still require manual acceptance testing. Internal generator tests are not proof of these UI behaviours.
