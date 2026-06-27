## Releasing a New Version

**Always build locally and upload artifacts — do NOT trigger GitHub Actions workflows.**

Steps (run in order):

1. Make your code changes and bump the version in `package.json`
2. Commit and push to `main`
3. Build the installer locally — C drive is full, so TEMP and the electron-builder cache must be redirected to S drive:
   ```powershell
   $env:TEMP = "S:\Temp"
   $env:TMP = "S:\Temp"
   $env:ELECTRON_BUILDER_CACHE = "S:\electron-builder-cache"
   npm run electron:build
   ```
4. Create the GitHub release and upload all three artifacts at once:
   ```bash
   gh release create v{VERSION} \
     --title "v{VERSION}" \
     --notes "..." \
     "dist-electron/Hoard-Lavish-ERP-Setup-{VERSION}.exe" \
     "dist-electron/Hoard-Lavish-ERP-Setup-{VERSION}.exe.blockmap" \
     "dist-electron/latest.yml"
   ```

The `latest.yml` file is **required** — electron-updater checks for it on startup. Releasing without it causes "Failed to check for updates" errors in all running clients.

---

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
