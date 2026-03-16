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

### Key endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/jd/version` | JD2 version + connectivity check |
| GET | `/downloadsV2/queryLinks` | Full download list with status/progress |
| POST | `/downloadsV2/setEnabled` | Pause or resume links |
| POST | `/downloadsV2/removeLinks` | Remove links |
| POST | `/downloadsV2/cleanup` | Clean finished/failed |
| POST | `/downloadsV2/forcedDownload` | Force start |
| GET | `/linkgrabberv2/queryLinks` | Links in grabber queue |
| POST | `/linkgrabberv2/addLinks` | Add new URLs |
| POST | `/linkgrabberv2/confirmLinks` | Move grabber links to download queue |
| POST | `/linkgrabberv2/removeLinks` | Remove from grabber |

All requests are plain JSON over HTTP. No authentication required.

## Project structure
```
src/
  api/
    client.ts          # base jdFetch() with error handling
    downloads.ts       # typed wrappers for downloadsV2 endpoints
    linkgrabber.ts     # typed wrappers for linkgrabberV2 endpoints
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
    SettingsView.vue
  stores/
    downloads.ts       # useDownloadsStore
    linkgrabber.ts     # useLinkGrabberStore
    app.ts             # useAppStore (connection status, settings)
  composables/
    usePolling.ts      # polling logic with Page Visibility API
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

