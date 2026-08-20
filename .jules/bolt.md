## 2026-08-19 - Avoid Intl Formatting in Interactive Component Render Loops
**Learning:** Calling `toLocaleDateString` inside JSX render loops (e.g. 364 heatmap cells during tooltip tracking) invokes ICU/Intl date formatting on every frame, taking ~32ms per frame and causing severe UI thread blockage during mouse movements.
**Action:** Pre-format date strings once with `useMemo` and `Intl.DateTimeFormat` into a `Map<string, string>` lookup table when dataset or locale changes.
