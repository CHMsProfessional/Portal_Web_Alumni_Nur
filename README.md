# Proyecto de Grado Completo

Repositorio monorepo con tres componentes principales:

- `AlumniAPI`: API Django para acceso, autenticacion y usuarios.
- `ContenidoAlumniApi`: API Django para contenido, websocket y media.
- `FrontendAlumni`: frontend React + Vite.

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

- Frontend: `http://localhost:8080`
- Access API: `http://localhost:8000`
- Content API: `http://localhost:8001`
- PostgreSQL: `localhost:5432`

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