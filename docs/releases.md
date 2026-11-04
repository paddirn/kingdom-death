# Packaging and releases

## v0.1.0

The merged foundation is published at https://github.com/paddirn/kingdom-death/releases/tag/v0.1.0 with `system.json` and `kingdom-death-0.1.0.zip` assets.

Install/update manifest: https://github.com/paddirn/kingdom-death/releases/latest/download/system.json

Version-specific manifest: https://github.com/paddirn/kingdom-death/releases/download/v0.1.0/system.json

The release remains runtime-unverified and targets exactly Foundry 14.365. Publication was explicitly requested before Forge smoke testing; `compatibility.verified` remains omitted.

## Build and publish

Run `npm ci` then `npm run build` with Node 22+ and Python 3. The allowlisted ZIP excludes dependencies, tests, git metadata, credentials and source books.

`.github/workflows/release-v0.1.0.yml` runs when that workflow is pushed to main or manually dispatched from main. It requires version 0.1.0, runs validation/tests, builds the package, creates tag v0.1.0 at the exact workflow commit, attaches both assets to a draft release, then publishes it. It will not overwrite an existing release. A failed draft upload can be inspected and repaired manually; do not blindly replace published assets.

For future releases, update system/package versions together, set the versioned download URL, complete the runtime checklist, and use a separately reviewed release workflow or manual `gh release` commands. Keep the latest manifest URL stable. The validation workflow alone never publishes. Neither GitHub release publication nor source pushes deploy or modify a Forge world.
