# Packaging and releases

The current supported distribution is the built ZIP imported as a custom Forge system. There is no published release or working public update-manifest URL yet. GitHub Actions produces artifacts, not releases. A repository source archive is different from the allowlisted distribution ZIP.

## Build

Use Node 22+ and Python 3, run `npm ci` then `npm run build`. The script validates first and packages only manifest, README, runtime scripts/templates/styles/language and docs under one `kingdom-death/` folder. It excludes node_modules, tests, git metadata, credentials and uploaded source books. `dist/system.json` is a copy for future release hosting; it is not an install URL by itself.

## Future reviewed release

1. Pass target-runtime checklist. Update package/system version together and retain exact compatibility policy until other builds are tested.
2. For a tag such as `v0.1.1`, set `download` to `https://github.com/paddirn/kingdom-death/releases/download/v0.1.1/kingdom-death-0.1.1.zip` and `manifest` to `https://github.com/paddirn/kingdom-death/releases/latest/download/system.json`. These are future examples, not currently live installation links.
3. Build again so the ZIP contains the matching manifest. Prepare a GitHub release at the reviewed commit, uploading both `dist/system.json` and the versioned ZIP. Use a version-specific manifest URL for prereleases because `/latest/` excludes prereleases.
4. Publish only after checking both assets and versions. Verify anonymously accessible manifest and ZIP URLs, ZIP layout, and a clean Forge install. At that point users can use the manifest URL in Forge's custom installation interface as available, or continue ZIP imports.
5. Document release notes and migrations. Never assume pushing a branch, merging a PR or creating a tag deploys a Forge world.
