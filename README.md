# jdownloader-web

A modern, self-hosted web interface for [JDownloader2](https://jdownloader.org/), closely replicating the desktop UI. No cloud dependencies — runs entirely on your own infrastructure.

> **Screenshot**: *(will be added once the MVP UI is complete)*

---

## Features

- Download queue with package/link expand-collapse
- Real-time progress bars, speed, ETA, and file size display
- Pause, resume, force-start, and remove downloads
- Link Grabber tab to add and confirm new URLs
- Destination picker (movie, TV show + season, other): downloads and extraction happen on a fast
  staging disk, then `jdownloader-mover` moves the extracted content to the library
- Archive passwords: set one when adding links, retry a failed extraction with a password, answer
  JD2's password requests, manage the global password list in Settings
- Bottom status bar: package/link counts, total speed, remaining bytes, active connections
- Auto-polling every 2 seconds (pauses when browser tab is hidden)
- Color-coded states: green = downloading, gray = paused, red = error, blue = complete
- Responsive layout — mobile-friendly with bottom tab bar on small screens
- Italian UI strings (mirrors the JD2 desktop interface)

---

## Architecture

```
Browser (VPN only)
   │ HTTPS
   ▼
Reverse proxy (Caddy) — TLS termination
   │ reverse proxy → jdownloader-web:80
   ▼
[Docker] jdownloader-web — nginx:alpine serving Vue 3 build
   │ /api/* proxied to jdownloader:3128
   ▼
[Docker] JDownloader2 — Deprecated API on port 3128
   ▲ polls the API
[Docker] jdownloader-mover — moves finished, extracted packages to the library
```

All containers share the `proxy` Docker network. There is no backend server — the Vue app calls the JDownloader Deprecated API directly through the Nginx proxy.

### Download flow

JD2 downloads and extracts into the staging folder `DOWNLOADS_DIR` (mounted as `/output`; use a fast
disk). The first folder below it says where the content goes:

| Staging (JD2 path) | Library | Chosen in the "Add links" dialog as |
|---|---|---|
| `/output/movies/<Title>` | `MOVIES_DIR/<Title>` | Film |
| `/output/shows/<Show>/Stagione <N>` | `SHOWS_DIR/<Show>/Stagione <N>` | Serie TV + season |
| `/output/downloads/<Package>` | `OTHER_DIR/<Package>` | Altro (also the JD2 default folder) |

`jdownloader-mover` (`mover/mover.py`) polls JD2 every 15 s. When a package is finished and every
archive in it has been extracted, it copies the files to the library under a hidden name, renames
them (the library never sees partial files), deletes the staging folder and removes the package
from the list. It never overwrites: on a conflict or an extraction error the package stays in
staging and the reason appears in its comment (status "Non spostato" in the web UI).

At startup the mover also sets the JD2 options it relies on: extract next to the archive, delete
archive files after a successful extraction, default download folder `/output/downloads`.

### Archive passwords

- **Add links**: the optional password goes to JD2 as the package's `extractPassword`.
- **Failed extraction** (status "Non spostato", "Password" button or context menu on the package):
  the password is set on the package's archives and the extraction restarts.
- **JD2 asks for a password** (a retry with a wrong one): the web UI shows the request; "Rinuncia"
  makes the extraction fail. Without an answer JD2's extraction queue waits up to 10 minutes.
- **Global list** (Settings → "Password archivi"): JD2 tries it on every archive. Every password
  typed in the UI is added to it, and JD2 adds the ones that worked by itself.

The mover disables JD2's own password dialog for automatic extractions
(`AskForUnknownPasswordsEnabled = false`), so an archive with an unknown password fails at once
instead of holding the queue.

The web container mounts `MOVIES_DIR` and `SHOWS_DIR` read-only: nginx lists folder names under
`/library/` (never files) so the dialog can suggest existing titles and the latest season.

---

## Prerequisites

### 1. JDownloader2 with Deprecated API enabled

In JD2, open **Advanced Settings**, search for `RemoteAPI`, and enable:

- `deprecatedapienabled` → `true`

The API will listen on `http://localhost:3128` by default.

### 2. Docker and Docker Compose

- [Docker Engine](https://docs.docker.com/engine/install/) v20+
- Docker Compose v2 (`docker compose` command)

---

## Quick Start (Docker Compose)

### Step 1 — Create the shared Docker network (once)

```bash
docker network create proxy
```

If your JD2 container is already running, connect it to the network:

```bash
docker network connect proxy <jd2-container-name>
```

The JD2 container must be reachable as `jdownloader` on this network. If your container has a different name, update the upstream in `nginx.conf`.

### Step 2 — Clone and start

```bash
git clone https://github.com/pontapaul/jdownloader-web.git
cd jdownloader-web
docker compose up -d --build
```

The app is served on port **8080**. Open `http://<host>:8080` or point a reverse proxy at it.

---

## Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `VITE_JD_API_URL` | `/api` | JD2 API base URL baked into the frontend at build time. Use `/api` for Docker (Nginx handles the proxy). Use `http://localhost:3128` for local dev without Docker. |
| `DOWNLOADS_DIR` | `./downloads` | Staging folder where JD2 downloads and extracts (`.env`) |
| `MOVIES_DIR`, `SHOWS_DIR`, `OTHER_DIR` | `./library/…` | Library folders the mover delivers to (`.env`) |

To override the build arg:

```bash
docker compose build --build-arg VITE_JD_API_URL=/api
```

---

## Nginx Proxy Manager Setup

1. In NPM, add a **Proxy Host** pointing to `http://<docker-host>:8080`.
2. Enable **SSL** (Let's Encrypt or custom certificate) on the proxy host.
3. Recommended: restrict access via **Access Lists** or VPN so the interface is not public.

No additional NPM configuration is needed — the Nginx inside the container handles `/api/*` proxying to JD2.

---

## Custom Nginx Config (optional)

To inject a custom `nginx.conf` without rebuilding the image:

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
# Edit docker-compose.override.yml to uncomment the volume mount and point to your config
docker compose up -d
```

---

## Development Setup (without Docker)

### Prerequisites

- Node.js 20+
- A running JDownloader2 instance with the Deprecated API enabled (see [Prerequisites](#prerequisites))

### Steps

```bash
git clone https://github.com/pontapaul/jdownloader-web.git
cd jdownloader-web
npm install
```

Create a `.env` file (copy from example if available):

```bash
cp .env.example .env
```

Set `VITE_JD_API_URL` to your JD2 instance:

```env
VITE_JD_API_URL=http://localhost:3128
```

Start the dev server:

```bash
npm run dev
```

The Vite dev server does not proxy API calls — your browser must be able to reach the JD2 API URL directly (CORS is not needed for same-origin proxied deployments, but may need to be handled in local dev depending on your setup).

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Type-check + build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Lint and auto-fix `.vue` and `.ts` files |
| `npm run format` | Format source files with Prettier |

---

## Tech Stack

- **Framework**: Vue 3 + TypeScript (Composition API, `<script setup>`)
- **Build tool**: Vite
- **State**: Pinia
- **Routing**: Vue Router
- **Styling**: TailwindCSS v3
- **Container**: Docker multi-stage build (Node → nginx:alpine)

---

## Contributing

Contributions are welcome. Please:

1. Fork the repository and create a branch from `main`.
2. Keep changes focused — one feature or fix per PR.
3. Run linting before submitting: `npm run lint && npm run format`
4. Describe what you changed and why in the PR description.

Bug reports and feature requests go in [GitHub Issues](https://github.com/pontapaul/jdownloader-web/issues).

---

## License

[MIT](LICENSE) — Copyright © 2026 Paolo Pontarollo
