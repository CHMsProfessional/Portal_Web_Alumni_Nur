# ESPECIFICACIONES TÉCNICAS COMPLETAS - Alumni Portal Azure

## 📋 Información General de la Solución

**Nombre del Proyecto:** Alumni Portal  
**Objetivo:** Desplegar aplicación multi-tier en Azure con Bicep  
**Fecha Creación:** Marzo 2026  
**Versión:** 1.0  
**Estado:** Producción-Ready  

---

## 🏗️ Arquitectura de la Solución

```
┌─────────────────────────────────────────────────────────────┐
│                     INTERNET / USUARIOS                       │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┴───────────┐
    │                        │
┌───▼───────────────┐  ┌─────▼──────────────┐
│  STATIC WEB APP   │  │  CONTAINER REGISTRY│
│  (React Frontend) │  │    (ACR)           │
│                   │  │                    │
│  - Frontend UI    │  │  - alumni-api      │
│  - SPA            │  │  - content-api     │
│  - Static Content │  │  - Latest tags     │
└───────────────────┘  └─────┬──────────────┘
                              │
        ┌─────────────────────┼────────────────────┐
        │                     │                    │
    ┌───▼─────────┐   ┌──────▼──────┐    ┌────────▼─────┐
    │ APP SERVICE │   │  APP SERVICE │    │   APP SERVICE │
    │   PLAN      │   │   PLAN (cont'd)   │   PLAN (cont'd)
    │ (Linux)     │   │              │    │               │
    ├─────────────┤   ├──────────────┤    ├───────────────┤
    │ AlumniAPI   │   │ ContentAPI   │    │ (Shared)      │
    │ Port: 8080  │   │ Port: 8081   │    │ SKU: B1-S1-P1 │
    │ 1 instance  │   │ 1 instance   │    │               │
    │ Linux cont. │   │ Linux cont.  │    │               │
    └───────┬─────┘   └──────┬───────┘    └──────────────┘
            │                 │
            └────────┬────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────────┐  ┌───▼──────────┐  ┌──▼─────────┐
│ PostgreSQL │  │ Redis Cache  │  │ Redis Cache │
│ Flexible   │  │ (Azure Cache)│  │ (Backup)    │
│ Server     │  │              │  │             │
│            │  │ - Sessions   │  │ - Redundancy│
│ - alumni_db│  │ - Cache      │  │ - HA ready  │
│ - Port 5432│  │ - Real-time  │  │             │
│ - TLS      │  │ - Port 6379  │  │             │
└────────────┘  └──────────────┘  └─────────────┘
```

---

## 📦 Componentes Desplegados

### 1. Azure Container Registry (ACR)

| Propiedad | Valor |
|-----------|-------|
| **Nombre** | `acr{proyecto}{ambiente}{unique}` |
| **SKU** | Basic |
| **Ubicación** | East US |
| **Función** | Almacenar imágenes Docker |
| **Repositorios** | alumni-api, content-api |
| **Admin User** | Habilitado (para Docker login) |
| **Capacidad** | Hasta 50 GB (escalable) |
| **Networking** | Público (se puede hacer privado) |

**Imágenes Almacenadas:**
```
acr-alumni-dev-xxxxx.azurecr.io/alumni/alumni-api:latest
acr-alumni-dev-xxxxx.azurecr.io/alumni/alumni-api:v1
acr-alumni-dev-xxxxx.azurecr.io/alumni/content-api:latest
acr-alumni-dev-xxxxx.azurecr.io/alumni/content-api:v1
```

### 2. Azure App Service Plan

| Propiedad | Valor |
|-----------|-------|
| **Nombre** | `plan-{proyecto}-{ambiente}` |
| **SKU** | B1 - Basic (escalable a S1, S2, P1V2) |
| **Instancias** | 1 (escalable) |
| **OS** | Linux |
| **Capacidad vCPU** | 1 vCPU (B1) |
| **RAM** | 1.75 GB (B1) |
| **Storage** | 50 GB (B1) |

**SKU Opciones:**
- **B1**: 1 vCPU, 1.75 GB RAM - Para desarrollo (recomendado)
- **B2**: 2 vCPU, 3.5 GB RAM - Para carga media
- **S1**: 1 vCPU, 1.75 GB RAM - Para producción (con SLA)
- **S2**: 2 vCPU, 3.5 GB RAM - Para producción con más carga

### 3. App Service #1 - AlumniAPI

| Propiedad | Valor |
|-----------|-------|
| **Nombre** | `app-alumni-api-{ambiente}-{unique}` |
| **URL** | `https://app-alumni-api-dev-xxxxx.azurewebsites.net` |
| **Runtime** | Docker (Linux Container) |
| **Puerto Interno** | 8080 |
| **Imagen** | `acr.azurecr.io/alumni/alumni-api:latest` |
| **Always On** | Enabled (prod), Disabled (dev) |
| **HTTPS Only** | True |
| **Min TLS** | 1.2 |

**Variables de Entorno Críticas:**
```
WEBSITES_PORT=8080
DATABASE_URL=<postgresql-connection-string>
POSTGRES_HOST=psql-alumni-dev-xxxxx.postgres.database.azure.com
POSTGRES_PORT=5432
POSTGRES_DB=alumni_db
POSTGRES_USER=adminuser
POSTGRES_PASSWORD=<secured>
REDIS_HOST=redis-alumni-dev-xxxxx.redis.cache.windows.net
REDIS_PORT=6379
REDIS_PASSWORD=<secured>
REDIS_URL=redis://:pass@host:6379/0
DEBUG=False
ENVIRONMENT=dev
ALLOWED_HOSTS=*.azurewebsites.net,localhost
```

### 4. App Service #2 - ContentAPI

| Propiedad | Valor |
|-----------|-------|
| **Nombre** | `app-content-api-{ambiente}-{unique}` |
| **URL** | `https://app-content-api-dev-xxxxx.azurewebsites.net` |
| **Runtime** | Docker (Linux Container) |
| **Puerto Interno** | 8081 |
| **Imagen** | `acr.azurecr.io/alumni/content-api:latest` |
| **Always On** | Enabled (prod), Disabled (dev) |
| **HTTPS Only** | True |
| **Min TLS** | 1.2 |

**Variables de Entorno:** Igual a AlumniAPI

### 5. Azure Database for PostgreSQL - Flexible Server

| Propiedad | Valor |
|-----------|-------|
| **Nombre** | `psql-{proyecto}-{ambiente}-{unique}` |
| **Hosting** | Flexible Server |
| **Versión** | 15 (puede ser 13, 14, 15, 16) |
| **SKU** | Standard_B1ms (Burstable) |
| **vCPU** | 1 vCPU |
| **RAM** | 2 GB |
| **Storage** | 32 GB (escalable hasta 1 TB) |
| **Connection Pooling** | No (usar en aplicación) |
| **IOPS** | 3,000 (auto-escalable) |
| **High Availability** | Disabled (dev) |
| **Backup Retention** | 7 días (escalable a 35) |
| **Geo-Redundant Backup** | Disabled (dev) |
| **Server Admin** | adminuser |
| **Database** | alumni_db |
| **Port** | 5432 (standard) |
| **TLS Required** | Yes (enforced en prod) |

**Connection String (Formato):**
```
postgresql://adminuser:password@psql-alumni-dev-xxxxx.postgres.database.azure.com:5432/alumni_db?sslmode=require
```

**Configuraciones Automáticas:**
- `log_connections = on` (registra conexiones)
- `log_statement = all` (registra todas las consultas)
- `pgaudit` módulo cargado (auditoría)

### 6. Azure Cache for Redis

| Propiedad | Valor |
|-----------|-------|
| **Nombre** | `redis-{proyecto}-{ambiente}-{unique}` |
| **SKU** | Basic |
| **Capacidad** | 0 (250 MB) - escalable |
| **Family** | C (Burstable) |
| **Version** | 7.0 |
| **Tier** | Basic |
| **Maxmemory Policy** | allkeys-lru |
| **Cluster** | Disabled |
| **TLS/SSL** | Enforced |
| **Min TLS** | 1.2 |
| **Port** | 6379 (SSL) |
| **Non-SSL Port** | Disabled |
| **Zone Redundancy** | Disabled (dev) |
| **Persistence** | Disabled (bgsave off) |

**Connection Info:**
```
Hostname: redis-alumni-dev-xxxxx.redis.cache.windows.net
Port: 6379 (SSL)
Access Key: <primary-key>
Connection String: redis://:key@host:6379/0?ssl=true
```

**Capacidades Disponibles:**
- **0**: 250 MB (Basic)
- **1**: 1 GB (Standard/Premium)
- **2**: 2.5 GB (Standard/Premium)
- **3**: 6 GB (Standard/Premium)
- **4**: 13 GB (Standard/Premium)
- **5**: 26 GB (Standard/Premium)
- **6**: 53 GB (Standard/Premium)

### 7. Azure Static Web Apps

| Propiedad | Valor |
|-----------|-------|
| **Nombre** | `swa-{proyecto}-{ambiente}-{unique}` |
| **SKU** | Free (o Standard para prod) |
| **Ubicación** | Central US (requerido) |
| **Origen Contenido** | FrontendAlumni/dist (compilado) |
| **Build Command** | npm run build |
| **App Location** | FrontendAlumni |
| **Output Location** | dist |
| **Deployment** | Manual o GitHub Actions |
| **CDN** | Incluido |
| **SSL/TLS** | Automático (gratuito) |
| **Staging** | Habilitado |

**URL Estándar:**
```
https://[unique-id].centralus.azurestaticapps.net
```

---

## 🔐 Seguridad y Networking

### Modelos de Acceso

```
┌─────────────────────────────────────────────────────┐
│           ACCESO PÚBLICO (RECOMENDADO PARA DEV)    │
├─────────────────────────────────────────────────────┤
│ • App Services: Público                             │
│ • PostgreSQL: Sin Firewall (dev) o AllowAllIps      │
│ • Redis: Público                                    │
│ • ACR: Público                                      │
│ • Static Web App: Público                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│         SEGURO (RECOMENDADO PARA PROD)             │
├─────────────────────────────────────────────────────┤
│ • App Services: Público con HTTPS obligatorio       │
│ • PostgreSQL: Solo desde App Services (regla FW)   │
│ • Redis: Solo desde App Services (Private Endpoint)│
│ • ACR: Privado (Private Endpoint)                   │
│ • Storage: Privado (si se usa)                      │
│ • VNet: Opcional pero recomendado                   │
└─────────────────────────────────────────────────────┘
```

### SSL/TLS Configuration

- **Protocol Minimum**: TLS 1.2
- **Certificates**: Azure Managed (gratuito)
- **HTTPS Redirect**: Enabled (prod), Optional (dev)
- **HSTS**: Recommended (prod)

### Firewall Rules

**PostgreSQL (Desarrollo):**
```
AllowAllIps: 0.0.0.0 - 255.255.255.255 (solo desarrollo)
```

**PostgreSQL (Producción - Recomendado):**
```
AllowAzureServices: 0.0.0.0 (interno Azure)
SpecificIp: x.x.x.x - x.x.x.x (si es necesario acceso externo)
```

**Redis:**
- Privado (no implementado en template basic)
- TLS: Requerido
- Puerto: 6379

---

## 📊 Capacidades, Límites y Escalado

### App Service Limits

| Límite | Valor |
|--------|-------|
| **Solicitudes/segundo** | ~50-100 (B1), escalable |
| **Conexiones TCP** | 1024 (Linux) |
| **Timeout (HTTP)** | 230 segundos |
| **Max Upload Size** | 1.5 GB (configurable) |
| **Discos (temp)** | 50 GB (local) |
| **Persistent Storage** | No incluido (usar Blob Storage) |

### Database Limits

| Límite | Valor |
|--------|-------|
| **Max Storage** | 1 TB (escalable) |
| **Max Connections** | 400+ (dependiente del SKU) |
| **Max Memory** | 2 GB (B1ms) |
| **Max Query Time** | Sin límite (configurable) |
| **Backup Retention** | 35 días máximo |
| **Point-in-Time Recovery** | 35 días |

### Redis Limits

| Límite | Descripción |
|--------|-------------|
| **Max Memory** | 250 MB (Basic-0) |
| **Max Clients** | 10,000 |
| **Max Keys** | Sin límite (limitado por memoria) |
| **Key Expiration** | Soportado |
| **Persistence** | Deshabilitado (dev) |

### Escalado Horizontal

```
Escenario              Acción                      Impacto
──────────────────────────────────────────────────────────
Bajo tráfico (dev)     1 instancia B1             $10-15/mes
Tráfico medio          Cambiar a S1 + 2 instancias ~$40/mes
Alto tráfico           Premium plan P1V2 + 3+    $100+/mes
```

---

## 🌐 Connectivity y Networking

### Puertos Utilizados

| Servicio | Puerto | Protocolo | Interno | Externo |
|----------|--------|-----------|---------|---------|
| AlumniAPI | 8080 | HTTP → HTTPS | Sí | Sí |
| ContentAPI | 8081 | HTTP → HTTPS | Sí | Sí |
| PostgreSQL | 5432 | SSL (TLS 1.2+) | Internal Azure | Variable |
| Redis | 6379 | SSL (TLS 1.2+) | Internal Azure | Internal Azure |
| ACR | 443 | HTTPS | Internal | Public (read/push) |
| Static Web App | 443 | HTTPS | N/A | Yes |

### Bandwidth Estimado (Mensual)

```
Escenario              Ancho de Band  Costo
─────────────────────────────────────────────────
10 usuarios activos    50 GB         ~$0-5
100 usuarios activos   500 GB        ~$30-50
1000 usuarios activos  5 TB          ~$300+
```

---

## 📈 Monitoreo y Observabilidad

### Logs Disponibles

**App Service:**
- Application Logs (desde contenedor)
- Web Server Logs (IIS)
- Deployment Logs

**PostgreSQL:**
- Slow Query Logs
- General Query Logs
- Audit Logs (pgaudit)

**Redis:**
- Command Logs
- Eviction Logs
- Persistence Logs

**Ubicaciones:**
- App Service: `/home/LogFiles/`
- Portal Azure: Diagnose and Solve Problems
- Application Insights (si está habilitado)

### Métricas Importantes

**App Service:**
- CPU Percentage
- Memory Percentage
- Request Count
- Response Time
- Http 4xx/5xx Errors

**Database:**
- CPU Percentage
- Storage Used
- Active Connections
- Query Performance
- Replication Lag (si HA)

**Redis:**
- CPU Percentage
- Memory Used
- Connected Clients
- Evicted Keys
- Commands/sec

---

## 💾 Backup y Disaster Recovery

### PostgreSQL Backups

```
Automaticity      Cada 24h
Retention Dev     7 días
Retention Prod    35 días (configurable)
Geo-Redundant     Disabled (dev)
Point-in-Time     Hasta 35 días
Restore Time      15-30 minutos (típico)
```

### App Service Backups

```
Tipo              Manual (automático no disponible en B1)
Contenido         Application + Config + Database refs
Frecuencia        Bajo demanda
Retención         Configurable
Archivos Excluídos /home/site/wwwroot/.git*
```

### Estrategia Recomendada (Producción)

1. PostgreSQL: Backups automáticos diarios (35 días)
2. App Service: Backup manual semanal
3. Code: GitHub/Azure DevOps (versión control)
4. Media: Azure Blob Storage (redundancia geográfica)

---

## 🚀 Deployment Pipeline

### Flujo de Despliegue

```
1. Desarrollo Local (Docker Compose)
   ↓
2. Construir Imágenes Docker
   ↓
3. Push a Azure Container Registry
   ↓
4. Azure CLI Deploy Bicep Template
   ↓
5. Provisionar Infraestructura Azure
   ↓
6. Actualizar App Settings (variables env)
   ↓
7. Desplegar Frontend (Static Web Apps)
   ↓
8. Ejecutar Migraciones Django
   ↓
9. Pruebas Funcionales
   ↓
10. Go-Live / Monitoreo
```

### Estimado de Tiempo

| Paso | Tiempo | Notas |
|------|--------|-------|
| Build Imágenes | 5-10 min | Parallelizable |
| Push a ACR | 3-5 min | Depende de tamaño |
| Deploy Bicep | 15-20 min | Parallelizable |
| Migraciones | 2-5 min | Depende de BD |
| Frontend Deploy | 1-2 min | Estático |
| **Total** | **30-45 min** | Primera vez |

### Despliegues Subsecuentes

- Solo actualizar imágenes: 10-15 min
- Solo cambios app config: 2-5 min
- Solo cambios frontend: 1-2 min

---

## 🔍 Ambiente Variables Requeridas

### Construcción (Build-time)

```dockerfile
ARG PYTHON_VERSION=3.10
ARG BASE_IMAGE=python:${PYTHON_VERSION}-slim
```

### Runtime - Todos los Ambientes

```env
# Requerido
ENVIRONMENT=dev|staging|prod
DEBUG=True|False
POSTGRES_HOST=<hostname>
POSTGRES_PORT=5432
POSTGRES_DB=alumni_db
POSTGRES_USER=adminuser
POSTGRES_PASSWORD=<strong-password>
REDIS_HOST=<hostname>
REDIS_PORT=6379
REDIS_PASSWORD=<access-key>
ALLOWED_HOSTS=localhost,*.azurewebsites.net

# Recomendado
SECRET_KEY=<django-secret-key>
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=<strong-password>
TIME_ZONE=America/Bogota
LANGUAGE_CODE=es-co

# Logging
LOG_LEVEL=INFO|DEBUG|WARNING
DJANGO_LOG_LEVEL=INFO|DEBUG
```

---

## 💰 Estimación de Costos (Mensual)

### Desarrollo (SKU Mínimo)

| Servicio | SKU | Estimado USD |
|----------|-----|--------------|
| App Service Plan | B1 | $10-15 |
| PostgreSQL | Standard_B1ms | $30-40 |
| Redis | Basic | $15-20 |
| ACR | Basic | $5-10 |
| Static Web App | Free | $0 |
| Data Transfer | ~50 GB | $0-5 |
| **Subtotal** | | **$60-90/mes** |

### Staging (Small)

| Servicio | SKU | Estimado USD |
|----------|-----|--------------|
| App Service Plan | B2 | $20-25 |
| PostgreSQL | Standard_B2s | $60-70 |
| Redis | Standard | $40-50 |
| ACR | Basic | $5-10 |
| Static Web App | Standard | $10-15 |
| Data Transfer | ~200 GB | $15-25 |
| **Subtotal** | | **$150-195/mes** |

### Producción (Medium)

| Servicio | SKU | Estimado USD |
|----------|-----|--------------|
| App Service Plan | S1-S2 (2x) | $50-75 |
| PostgreSQL | Standard_D2s_v3 | $150-200 |
| Redis | Premium | $100-150 |
| ACR | Standard | $15-20 |
| Static Web App | Standard | $10-15 |
| Data Transfer | ~1 TB | $80-100 |
| App Insights | Pay-as-you-go | $20-50 |
| **Subtotal** | | **$425-610/mes** |

---

## 📋 Arquitectura de Ficheros Bicep

```
infra/
├── main.bicep                      # Orquestador principal
├── parameters.bicep                # Definición de parámetros
├── variables.bicep                 # Cálculos y convenciones
├── parameters.json                 # Valores por defecto
│
├── modules/                        # Módulos reutilizables
│   ├── acr.bicep                  # Azure Container Registry
│   ├── app-service-plan.bicep     # App Service Plan
│   ├── app-service.bicep          # App Service (contenedores)
│   ├── postgres.bicep             # PostgreSQL Flexible Server
│   ├── redis.bicep                # Redis Cache
│   └── static-web-app.bicep       # Static Web Apps
│
├── scripts/                        # Automation scripts
│   ├── deploy.ps1                 # Deploy orchestration
│   └── build-and-push-images.ps1  # Docker build & push
│
├── README.md                       # Guía completa despliegue
├── QUICK_REFERENCE.md             # Comandos frecuentes
├── DJANGO_AZURE_CONFIG.md         # Configuración Django
└── SPECIFICATIONS.md              # Este archivo
```

---

## ✅ Checklist Pre-Despliegue

### Requisitos Previos
- [ ] Suscripción Azure activa
- [ ] Azure CLI instalada (v2.50+)
- [ ] Docker Desktop instalado
- [ ] PowerShell 7+ o Bash
- [ ] Acceso de Contributor a suscripción

### Preparación de Código
- [ ] Dockerfiles actualizados (AlumniAPI & ContenidoAlumniApi)
- [ ] requirements.txt actualizado
- [ ] settings.py Django configurado para Azure
- [ ] Frontend React compilado (npm run build)
- [ ] Variables de entorno documentadas

### Validación Bicep
- [ ] Sintaxis Bicep validada
- [ ] Parámetros correctos en parameters.json
- [ ] Nombres de recursos únicos
- [ ] Región Azure validada (eastus)

### Pre-Despliegue
- [ ] Contraseña PostgreSQL generada (strong: 12+ chars, mayúsculas, números, símbolos)
- [ ] Registry de imagen Docker verificado
- [ ] Cuota de recursos verificada en suscripción
- [ ] Costos estimados revisados

### Post-Despliegue
- [ ] Imágenes Docker pusheadas a ACR
- [ ] Migraciones Django ejecutadas
- [ ] Health checks respondiendo (HTTP 200)
- [ ] Conectividad BD + Redis verificada
- [ ] Frontend accesible sin errores CORS
- [ ] Logs monitoreados (primeras 24h)
- [ ] Backups configurados (prod)

---

## 🆘 Soporte y Recursos

[Ver QUICK_REFERENCE.md para comandos frecuentes]  
[Ver README.md para guía detallada]  
[Ver DJANGO_AZURE_CONFIG.md para configuración aplicación]

---

**Documento Técnico Versión 1.0**  
**Fecha:** Marzo 2026  
**Mantenedor:** Equipo Engineering
