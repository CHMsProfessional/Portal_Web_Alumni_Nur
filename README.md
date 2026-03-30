# Proyecto de Grado Completo

Repositorio monorepo con tres componentes principales:

- `AlumniAPI`: API Django para acceso, autenticacion y usuarios.
- `ContenidoAlumniApi`: API Django para contenido, websocket y media.
- `FrontendAlumni`: frontend React + Vite.

Componente adicional (opcional):

- `AgenteFoundry/foundry-agentv2`: plantilla de agente para Microsoft Foundry (proyecto separado; no es requerido para correr el portal con `docker compose`).

## Requisitos

- Docker
- Docker Compose

## Configuracion inicial

Este repo esta preparado para que (recien clonado) puedas correr `docker compose up` sin crear archivos `.env`.

Si quieres personalizar puertos/credenciales y variables, crea un unico archivo de entorno en la raiz:

Linux/macOS:

```bash
cp .env.example .env
```

Windows (cmd):

```bat
copy .env.example .env
```

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

Notas:

- Los `.env.example` dentro de cada componente se mantienen como referencia, pero **no son obligatorios** para Docker Compose.
- No versionar `.env` (esta en `.gitignore`).

### (Opcional) Variables por componente

Si prefieres mantener `.env` por componente (por ejemplo para desarrollo fuera de Docker), puedes crearlos a partir de los ejemplos:

```bash
copy .env.example .env
copy AlumniAPI\.env.example AlumniAPI\.env
copy ContenidoAlumniApi\.env.example ContenidoAlumniApi\.env
copy FrontendAlumni\.env.example FrontendAlumni\.env
```

Si usas PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item AlumniAPI/.env.example AlumniAPI/.env
Copy-Item ContenidoAlumniApi/.env.example ContenidoAlumniApi/.env
Copy-Item FrontendAlumni/.env.example FrontendAlumni/.env
```

## Levantar el proyecto

```bash
docker compose up --build
```

Para bajar todo (incluyendo volúmenes de BD/media):

```bash
docker compose down -v
```

Servicios por defecto:

- Frontend (Nginx): `http://localhost:8980`
- Access API: `http://localhost:8900`
- Content API: `http://localhost:8901`
- PostgreSQL (host): `localhost:${POSTGRES_PUBLIC_PORT:-5432}`

Rutas típicas:

- Access API base: `http://localhost:8900/api/`
- Content API base: `http://localhost:8901/api/`
- Media (Content): `http://localhost:8901/media/`

## Desarrollo local (sin Docker)

Si prefieres correr servicios en tu máquina (útil para debug), cada API Django tiene su propio `requirements.txt`.

Access API:

```powershell
cd AlumniAPI
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver 8000
```

Content API:

```powershell
cd ContenidoAlumniApi
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver 8001
```

Frontend:

```powershell
cd FrontendAlumni
npm install
copy .env.example .env
npm run dev
```

Nota: en modo `npm run dev` el frontend corre en `http://localhost:5173`.

## Despliegue a Azure (infra)

- `infra/` contiene Bicep + scripts de despliegue.
- `azure.yaml` permite usar `azd` (Azure Developer CLI).
- Comandos frecuentes y troubleshooting en `infra/QUICK_REFERENCE.md`.

## Que se versiona

Se incluye el codigo fuente, configuracion de Docker, archivos de ejemplo `.env.example` y documentacion minima.

Se excluyen archivos locales o generados como:

- Bases SQLite
- Archivos `.env`
- `node_modules`
- `dist`
- `media`
- caches, logs y `__pycache__`
- archivos generados `estructura_src_*.txt`

Tambien se excluyen utilidades con datos personales (por ejemplo `generarVCF_para_encuestas.py`).

## Publicar en GitHub

Inicializa Git, revisa el estado y crea el primer commit:

```bash
git init
git add .
git status
git commit -m "Initial commit"
```

Luego crea el repositorio remoto en GitHub y enlazalo:

```bash
git remote add origin <URL_DEL_REPOSITORIO>
git branch -M main
git push -u origin main
```