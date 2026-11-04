# Living Glossary

## Source research (2026-11-04)

The official source is https://kingdomdeath.com/rules/living-glossary, owned by Adam Poots Games, LLC. Its initial rendered list exposes eight terms, but the public HTML's Next.js `__NEXT_DATA__` includes `props.pageProps.data.allGlossaryEntries`: 768 records, matching `_allGlossaryEntriesMeta.count`. Records have `id`, `title`, `content`, and `updatedAt`; all observed IDs were distinct and all records had timestamps. Thus the observed snapshot already carries the full counted collection; the visible list is not a complete export. These are implementation details of the website, not a documented public API contract or a guarantee of stable IDs across future site changes.

The page was accessible without authentication. An HTTPS GET with an example Forge Origin header returned HTTP 200 and `Access-Control-Allow-Origin: *`. This suggests a simple credential-free cross-origin request is technically possible; it is **not** an actual Forge browser/CSP test. No supported official export or documented public API was identified. We did not call private CMS endpoints, use credentials, reverse engineer site scripts, or implement pagination scraping.

The published [Terms of Service](https://kingdomdeath.com/legal/terms), section 2, limit the download license to temporary personal viewing and restrict copying and mirroring on another server. We did not establish permission for automated copying into a Forge world. **Live retrieval is consequently not implemented.** The system makes no website requests during load or sync, contains no harvested rules dataset, and installs no polling service. A source inspection copy was discarded after structural analysis. Source availability and terms may change; recheck permission and browser access before adding an adapter.

## Forge workflow

1. Install the release containing this feature through the existing system manifest workflow, restart the Forge game and open a **Foundry 14.365** world as GM. A PR/source push alone does not publish a release.
2. Open **Game Settings → Configure Settings → Kingdom Death: Monster → Open Living Glossary Manager**.
3. Choose an authorized normalized JSON file, then **Sync Now**. To test without proprietary content, download [`glossary-example.json`](glossary-example.json) from this repository. Selecting a local file reads it in the browser; no independent server is needed.
4. Read the created/updated/unchanged/skipped counts and error messages. Open **Living Glossary** from the report or Journals sidebar. The manager creates one text page per entry. Source URL and source update information appear in the page; system flags store source identity, entry identity and last content sync timestamp. The Journal flag stores the most recent overall sync summary, including unchanged pages. A reload clears the application report but preserves the Journal and its summary flag.
5. Refresh by selecting a revised authorized file with the **same source.id and entry.id values**. Titles can change without creating duplicate pages. Missing entries and manual pages are never deleted. Managed pages' text and titles are refreshed from the import; keep personal notes on separate unmanaged pages. Share the Journal with players using native ownership controls when appropriate; the default is GM-only.
6. If some writes fail, correct the reported problem and retry the same file. Successfully imported pages are matched on retry. Do not remove identity flags to repair failures: that removes matching information.

Only GMs may use this interface. With multiple active GMs, the GM with the lexically first User ID is the designated sync writer; an explanatory message names that GM. Other GMs may disconnect to transfer the role. A busy guard blocks repeated calls within the client, and browser Web Locks block concurrent tabs on the same origin/world. Chrome on Forge HTTPS supplies Web Locks; absence fails visibly instead of syncing without a lock. This is client coordination, not a server transaction: simultaneous network partitions, different host origins, or intentionally bypassing the manager are outside its guarantee. Avoid multiple sessions of the same GM on different devices during imports.

## Normalized JSON schema (version 1)

See [`glossary.schema.json`](glossary.schema.json) and the original sample. The runtime validator rejects malformed data **before any world write**, including unknown fields and duplicate entry IDs. File size is capped at 5 MiB and entries at 10,000.

| Field | Required | Meaning |
| --- | --- | --- |
| `schemaVersion` | Yes | Integer `1` |
| `source.id` | Yes | Stable collection namespace, 1–200 characters |
| `source.url` | Yes | HTTPS provenance URL, without credentials |
| `entries[].id` | Yes | Stable source ID, 1–200 characters, unique within file |
| `entries[].title` | Yes | Nonempty heading, at most 500 characters |
| `entries[].description` | Yes | Plain text, at most 200,000 characters; newlines preserved |
| `entries[].updatedAt` | No | Source-supplied timestamp/label, at most 100 characters; empty allowed |
| `entries[].sourceUrl` | No | HTTPS entry URL; defaults to source URL |

Strings are trimmed. URLs are at most 2048 characters. Descriptions are escaped, not accepted as executable HTML or Foundry commands. Convert authorized rich text exports to plain text before import. Preserve source IDs through renames; changing an ID deliberately creates a new page and leaves the old one intact. When no upstream ID exists, assign a permanent local identifier; do not regenerate it from the current title on every refresh.

## Architecture and extension

`records.mjs` validates records and builds escaped page content. `manager.mjs` is retrieval-independent and uses native `JournalEntry.implementation.create`, `createEmbeddedDocuments('JournalEntryPage', ...)`, and document updates. It first locates a Journal with `flags.kingdom-death.glossary.managed`, otherwise a uniquely named Living Glossary, otherwise creates it. Ambiguous Journals or duplicate managed identities cause a visible failure. Existing unflagged pages are never claimed by title. Managed pages are identified by `(sourceId, entryId)`, never by name.

`application.mjs` supplies the restricted ApplicationV2 settings menu and local file input. `game.kingdomDeath.glossary.sync(normalizedData)` exposes the same guarded manager to future adapters. Add a new authorized retrieval adapter separately; it must return the documented normalized structure and invoke this service, not write Journals itself. No scheduling is enabled.

Offline tests use original sample text and document doubles. They do not prove native V14 runtime compatibility. Verify create → unchanged repeat → edited description → same-ID rename → new entry, preserve a manually added page, reject malformed JSON, deny non-GM access, and prevent simultaneous syncs in two browser tabs. Refresh the browser and confirm native Journal pages and flags remain. Permission/cancellation failures must appear in the report and allow retry.
