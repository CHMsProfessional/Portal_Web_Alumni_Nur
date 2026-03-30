# FrontendAlumni (Portal Web Alumni)

Frontend en **React + TypeScript + Vite**.

Este frontend consume:

- `AlumniAPI` (Access API) para autenticación/usuarios.
- `ContenidoAlumniApi` (Content API) para contenido, websockets y media.

## Requisitos

- Node.js 18+ (recomendado 20+)
- npm

## Variables de entorno

El proyecto usa variables `VITE_*`.

1) Crear `.env` (o `.env.local`) desde el ejemplo:

Windows (cmd):

```bat
copy .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

2) Variables principales:

- `VITE_API_BASE`: base de Content API (por defecto `http://localhost:8901/api`)
- `VITE_API_ACCESS_URL`: Access API (por defecto `http://localhost:8900/api/`)
- `VITE_API_CONTENT_URL`: Content API (por defecto `http://localhost:8901/api/`)
- `VITE_WS_CONTENT_URL`: websocket hacia Content API (por defecto `ws://localhost:8901`)
- `VITE_CONTENT_MEDIA_URL`: host base para servir `/media/...` (por defecto `http://localhost:8901`)

## Desarrollo

```bash
npm install
npm run dev
```

Por defecto Vite sirve en `http://localhost:5173`.

Si estás levantando las APIs con `docker compose` desde la raíz del repo, mantené las URLs en `.env` apuntando a `8900/8901`.

## Build (producción)

```bash
npm run build
```

En Docker, el build se sirve con Nginx (ver `Dockerfile` y `docker/nginx.conf`).
