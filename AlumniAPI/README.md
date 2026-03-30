# AlumniAPI (Access API)

API en Django/DRF para autenticación, usuarios y acceso.

## Requisitos

- Python 3.11+ (Docker usa 3.13)

## Variables de entorno

El proyecto lee variables desde un `.env` ubicado en:

- `AlumniAPI/.env`, o
- la raíz del repo (`../.env`), o
- dos niveles arriba.

Variables principales:

- `PORT` (default `8000`)
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG` (`True/False`)
- `DJANGO_ALLOWED_HOSTS` (CSV)
- `DJANGO_ALLOWED_ORIGINS` (CSV; CORS)
- Base de datos: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Email (opcional): `EMAIL_*`, `DEFAULT_FROM_EMAIL`

Ejemplo: ver `.env.example`.

## Ejecutar local (sin Docker)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver 8000
```

## Docker

Este servicio se levanta desde el `docker-compose.yml` en la raíz del repo.
