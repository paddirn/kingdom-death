# v0.1.1 — Forge installation metadata correction

Adds explicit `compatibility.verified: "14.365"` alongside minimum/maximum 14.365. This declares the requested compatibility metadata for package discovery and labeling. **No successful Foundry/Forge runtime test is claimed.** A green compatibility badge is not evidence that the installation or world-creation issue has been reproduced and resolved.

The v0.1.0 public release was inspected: ZIP folder layout and embedded manifest were correct, download URL resolved to its actual asset, and there were no required/recommended package dependencies. Missing verified metadata is the confirmed metadata omission. It is not established as the sole cause of the unavailable world-system option.

Adds release-byte checks for identity, compatibility, versioned URLs, matching manifests, ZIP layout/integrity, missing entry/import/template/style files and unwanted dependencies. A manual release workflow validates downloaded draft assets before publishing and checks public URLs afterward.

After updating to 0.1.1 on Forge, stop/start the server on exactly 14.365 and confirm Kingdom Death: Monster appears in the new-world system selector. See docs/installation-investigation.md for diagnostics if it does not.
