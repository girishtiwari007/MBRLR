Drop the latest six IPAS/MB source files in this folder, then run:

  RUN-LOCAL-DATA-SYNC.bat

File names do not need to match exactly. The local sync reads the sheet columns
and detects:

- PU-wise Budget Available
- PU-wise Month-wise Actual
- DEPT-Demand/SMH PU-wise Budget
- DEPT-Demand/SMH PU-wise Month-wise Actual
- Demand/SMH Budget Summary
- Demand/SMH Month-wise Actual Summary

After successful sync, the portal data files are updated locally and mirrored to
the GitHub Desktop repo folder.
