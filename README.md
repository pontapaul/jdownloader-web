# jdownloader-web

A modern, self-hosted web interface for [JDownloader2](https://jdownloader.org/), closely replicating the desktop UI. No cloud dependencies — runs entirely on your own infrastructure.

> **Screenshot**: *(will be added once the MVP UI is complete)*

---

## Features

- Download queue with package/link expand-collapse
- Real-time progress bars, speed, ETA, and file size display
- Pause, resume, force-start, and remove downloads
- Link Grabber tab to add and confirm new URLs
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
Nginx Proxy Manager — TLS termination
   │ reverse proxy → jdownloader-web:80
   ▼
[Docker] jdownloader-web — nginx:alpine serving Vue 3 build
   │ /api/* proxied to jdownloader:3128
   ▼
[Docker] JDownloader2 — Deprecated API on port 3128
```

Both containers share the `jdownloader_net` Docker network. There is no backend server — the Vue app calls the JDownloader Deprecated API directly through the Nginx proxy.

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
docker network create jdownloader_net
```

If your JD2 container is already running, connect it to the network:

```bash
docker network connect jdownloader_net <jd2-container-name>
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
