# Packaging and releases

v0.1.0 is the existing public release. v0.1.1 is the installation-metadata correction prepared for review; it is not published merely by merging its PR. Do not replace the existing v0.1.0 assets in place.

## Publish the corrected release after merge

1. Open GitHub Actions → **Publish reviewed release** → **Run workflow**. Choose `main`, version `0.1.1`.
2. The workflow runs all checks, builds the ZIP and creates a draft/tag at its exact checkout commit. It downloads the staged assets again and validates bytes and manifest agreement before publishing. Existing releases/drafts are never silently overwritten.
3. The final step downloads the public version-specific manifest and follows its exact `download` URL. A failure here means public delivery needs investigation even if the release was published. Do not report successful deployment from a successful build alone.
4. After the workflow succeeds, install https://github.com/paddirn/kingdom-death/releases/download/v0.1.1/system.json or use the stable https://github.com/paddirn/kingdom-death/releases/latest/download/system.json . Before publication, `/latest/` still serves v0.1.0.
5. Complete the Forge world-selection/runtime checklist. Release publication does not deploy a Forge world or certify runtime compatibility.

## Local validation

`npm ci && npm run build` uses Node 22+ and Python 3. `tools/check_release.py dist/system.json --zip dist/kingdom-death-0.1.1.zip` checks the actual archive. `python3 tools/check_release.py https://github.com/paddirn/kingdom-death/releases/download/v0.1.1/system.json` checks public distribution after publication.

The ZIP contains one `kingdom-death/` folder. All three compatibility fields must remain exactly 14.365. Update package/system/lockfile versions together and the download URL for each future release. Preserve explicit runtime-test status in release notes; do not widen the target or add dependencies on newer APIs.
