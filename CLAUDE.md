# CLAUDE.md — AI assistant context for jdownloader-web

## Project overview
A modern, self-hosted web interface for JDownloader2 that closely replicates the desktop UI.
Built with Vue 3, served via Docker + Nginx, deployed behind Nginx Proxy Manager on a home server called `moon`.

## Architecture

```
Browser (VPN only)
   │ HTTPS
   ▼
Nginx Proxy Manager (moon) — TLS termination
   │ reverse proxy /api/* → jdownloader:3128
   ▼
[Docker] jdownloader-web — Nginx serving Vue build
   │ /api/* proxied to JD2
   ▼
[Docker] JDownloader2 — Deprecated API on port 3128
```

**No backend server.** The Vue app calls the JDownloader Deprecated API directly.
CORS is handled by Nginx proxying `/api/*` to JD2 on port 3128.

The only server-side piece is `jdownloader-mover` (`mover/mover.py`, Python stdlib): it moves
finished and extracted packages from the staging folder (`/output/<movies|shows|downloads>/…`) to
the library (`/library/<same path>`), and enforces the JD2 settings it needs. See README
"Download flow". The UI picks the destination via `useDestination` and passes it to `addLinks`.

Gotchas:
- `linkgrabberv2/addLinks` always appends the package name: `destinationFolder` + `packageName`
  gives `saveTo`. `setDownloadDirectory` sets the exact folder.
- Right after a download finishes JD2 reports `finished` with no `extractionStatus` for a moment:
  the mover checks `extraction/getArchiveInfo` so it does not move unextracted archives.
- `addLinks` succeeds even when no plugin handles the URLs: they are silently dropped. The dialog
  follows the job with `queryLinkCrawlerJobs` (`crawled`, `unhandled`, …) and reports the outcome.
- Archive passwords: `addLinks` takes `extractPassword`; a retry is `extraction/setArchiveSettings`
  (`passwords`) + `extraction/startExtractionNow`. A manual extraction whose passwords are all
  wrong opens a password dialog even with `AskForUnknownPasswordsEnabled = false`, and the whole
  extraction queue waits for it: answer via `dialogs/list` / `dialogs/answer`
  (`{"closereason": "OK", "text": …}` or `{"closereason": "CANCEL"}`). JD2 adds passwords that
  worked to `PasswordList` by itself, and remembers them per archive (the archive ID comes from the
  file name). While a password is being tried the link has no `extractionStatus`.
- JD2 checks a password by the file signature of the extracted content (`PasswordFindOptimization`):
  test archives must contain real file headers, random bytes look like a wrong password.
- Right after a JD2 restart the API answers before the linkgrabber is ready: `addLinks` calls in
  the first seconds can be lost or show up late.

## Stack
- **Frontend**: Vue 3 + TypeScript + Vite
- **State**: Pinia
- **Routing**: Vue Router
- **Styling**: TailwindCSS v3
- **Container**: Docker multi-stage build (Node build → nginx:alpine serve)

## JDownloader Deprecated API
The Deprecated API is the full MyJDownloader API exposed locally without authentication.
Enable in JD2: Advanced Settings → search "RemoteAPI" → enable `deprecatedapienabled`.
Base URL: `http://localhost:3128` (configurable via `VITE_JD_API_URL`).

### Call format
Every method is called as `POST <path>` with body `{"params": [arg1, arg2, ...]}`: arguments are
**positional**, in the order listed by JD2's own documentation (`GET /help` on the API, e.g.
`docker exec jdownloader-web wget -qO- http://jdownloader:3128/help`). Named-object bodies fail with
`400 BAD_PARAMETERS`. Responses are wrapped as `{"data": ...}`; errors as `{"src","type","data"}`.
`jdCall(path, ...params)` in `src/api/client.ts` handles both.

Query methods (`queryLinks`, `listAccounts`, …) return only the fields set to `true` in the query
object, and JD2 omits fields without a value: the API wrappers fill in defaults.

### Key endpoints (arguments in order)
| Path | Arguments | Description |
|------|-----------|-------------|
| `/jd/version` | — | JD2 build number, connectivity check |
| `/downloadsV2/queryLinks` | `LinkQuery` | Download list with status/progress |
| `/downloadsV2/setEnabled` | `enabled, linkIds, packageIds` | Pause or resume |
| `/downloadsV2/removeLinks` | `linkIds, packageIds` | Remove links |
| `/downloadsV2/cleanup` | `linkIds, packageIds, action, mode, selectionType` | e.g. `DELETE_FINISHED`, `REMOVE_LINKS_ONLY`, `ALL` |
| `/downloadsV2/forceDownload` | `linkIds, packageIds` | Force start |
| `/linkgrabberv2/queryLinks` | `CrawledLinkQuery` | Links in grabber queue |
| `/linkgrabberv2/addLinks` | `AddLinksQuery` (`{links, packageName, destinationFolder, …}`) | Add new URLs |
| `/linkgrabberv2/moveToDownloadlist` | `linkIds, packageIds` | Move grabber links to download queue |
| `/linkgrabberv2/removeLinks` | `linkIds, packageIds` | Remove from grabber |
| `/accountsV2/listAccounts` | `AccountQuery` | Premium accounts with status/traffic |
| `/accountsV2/addAccount` | `premiumHoster, username, password` | Add account |
| `/accountsV2/removeAccounts` | `ids` | Remove accounts |
| `/accountsV2/enableAccounts` / `disableAccounts` | `ids` | Enable / disable accounts |
| `/accountsV2/refreshAccounts` | `ids` | Force validity re-check |
| `/config/get` | `interfaceName, storage (null), key` | e.g. `GeneralSettings` / `DownloadSpeedLimit` |
| `/config/set` | `interfaceName, storage (null), key, value` | Speed limit also needs `DownloadSpeedLimitEnabled` |

No authentication is required.

> **Security note**: Premium account credentials (username + password) are sent in plain text to
> `localhost:3128`. This is acceptable because access is restricted to the VPN only, but be aware
> that credentials are visible in browser DevTools network traffic.

## Project structure
```
src/
  api/
    client.ts          # base jdFetch() with error handling
    downloads.ts       # typed wrappers for downloadsV2 endpoints
    linkgrabber.ts     # typed wrappers for linkgrabberV2 endpoints
    accounts.ts        # typed wrappers for accountsV2 endpoints
    library.ts         # folder listing of the library (nginx /library/)
  components/
    layout/
      AppToolbar.vue
      AppTabs.vue
      AppStatusBar.vue
    downloads/
      PackageRow.vue
      LinkRow.vue
      ProgressBar.vue
    linkgrabber/
      GrabberRow.vue
    modals/
      AddLinksModal.vue
    ui/                # generic reusable components
  views/
    DownloadsView.vue
    LinkGrabberView.vue
    AccountsView.vue
    SettingsView.vue
  stores/
    downloads.ts       # useDownloadsStore
    linkgrabber.ts     # useLinkGrabberStore
    accounts.ts        # useAccountsStore
    app.ts             # useAppStore (connection status, settings)
  composables/
    usePolling.ts      # polling logic with Page Visibility API
    useDestination.ts  # destination picker: movie / show + season / other
    useFormatters.ts   # speed, size, ETA formatters
  router/
    index.ts
  App.vue
  main.ts
```

## UI design principles
- Closely mirror the JDownloader2 desktop interface
- Compact, information-dense layout
- Top toolbar with icon buttons (no text labels)
- Two main tabs: Download and Cattura collegamenti (Link Grabber)
- Bottom status bar with: packages/links count, speed, remaining bytes, active connections
- Table layout with expand/collapse for packages
- Color coding: green = downloading, gray = paused, red = error, blue = complete
- Progress bar inline in each row
- Mobile-friendly: responsive columns, bottom tab bar on small screens

## State and polling
- `useDownloadsStore` polls `/downloadsV2/queryLinks` every 2 seconds
- Polling pauses when the browser tab is hidden (Page Visibility API)
- `useAppStore` holds connection status and user settings (persisted to localStorage)

## Environment variables
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_JD_API_URL` | `http://localhost:3128` | JD2 Deprecated API base URL |

At runtime in Docker, Nginx proxies `/api/*` → `jdownloader:3128`, so `VITE_JD_API_URL` should be set to `/api` at build time for production.

## Docker
- Multi-stage Dockerfile: Node (build) → nginx:alpine (serve)
- `docker-compose.yml` includes the web container and shared network with JD2
- Nginx config handles SPA routing and `/api/*` proxy
- Deployed on `moon` behind Nginx Proxy Manager (NPM handles TLS)

## Code conventions
- TypeScript strict mode
- Composition API only (no Options API)
- `<script setup>` syntax
- Explicit types for all API responses (no `any`)
- Composables for reusable logic
- Pinia stores for all shared state
- No direct API calls from components — always go through stores or composables
- Tailwind utility classes only, no custom CSS unless strictly necessary
- All user-facing strings in Italian (to match JD2 desktop UI language)

