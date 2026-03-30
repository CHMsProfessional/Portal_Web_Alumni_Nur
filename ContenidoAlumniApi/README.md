# ContenidoAlumniApi (Content API)

API en Django/DRF + Channels (ASGI) para contenido, websockets y media.

## Requisitos

- Python 3.11+ (Docker usa 3.13)
- Redis (si corrés fuera de Docker)

## Variables de entorno

El proyecto lee variables desde un `.env` ubicado en:

- `ContenidoAlumniApi/.env`, o
- la raíz del repo (`../.env`), o
- dos niveles arriba.

Variables principales:

- `PORT` (default `8001`)
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG` (`True/False`)
- `DJANGO_ALLOWED_HOSTS` (CSV)
- `DJANGO_ALLOWED_ORIGINS` (CSV; CORS)
- Base de datos: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Redis: `REDIS_HOST`, `REDIS_PORT`, `REDIS_CACHE_DB`

Ejemplo: ver `.env.example`.

## Ejecutar local (sin Docker)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver 8001
```

Nota: en Docker este servicio se ejecuta con `daphne` (ASGI).

## Docker

Este servicio se levanta desde el `docker-compose.yml` en la raíz del repo e incluye:

- `redis`
- volumen `content_media` montado en `/app/media`
