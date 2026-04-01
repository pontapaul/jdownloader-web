# jdownloader-web
A modern web interface for JDownloader2, inspired by the desktop UI. Self-hosted, no cloud dependencies.

## Development

```bash
cp .env.example .env
npm install
npm run dev
```

The dev server proxies nothing — set `VITE_JD_API_URL` to your JD2 instance (e.g. `http://localhost:3128`).

## Docker deployment

### Prerequisites
- Docker and Docker Compose
- A running JDownloader2 container connected to the `jdownloader_net` network

### 1. Create the shared Docker network (once)

```bash
docker network create jdownloader_net
```

If JD2 is already running, attach it to the network:

```bash
docker network connect jdownloader_net <jd2-container-name>
```

The JD2 container must be reachable as `jdownloader` on this network (or edit `nginx.conf` to use the correct hostname).

### 2. Build and start

```bash
docker compose up -d --build
```

The app is served on port **8080**. Point Nginx Proxy Manager (or any reverse proxy) at `http://<host>:8080`.

### 3. Custom nginx config (optional)

Copy the override example and uncomment the volume mount to inject a custom `nginx.conf` without rebuilding:

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
# edit docker-compose.override.yml as needed
docker compose up -d
```

### Environment variables

| Variable | Default (build arg) | Description |
|---|---|---|
| `VITE_JD_API_URL` | `/api` | JD2 API base URL baked into the frontend at build time |

To change the build arg:

```bash
docker compose build --build-arg VITE_JD_API_URL=/api
```

## Architecture

```
Browser
   │ HTTPS
   ▼
Nginx Proxy Manager — TLS termination
   │ reverse proxy → jdownloader-web:80
   ▼
[Docker] jdownloader-web — nginx serving Vue build
   │ /api/* proxied to jdownloader:3128
   ▼
[Docker] JDownloader2 — Deprecated API on port 3128
```

Both containers share the `jdownloader_net` Docker network.
