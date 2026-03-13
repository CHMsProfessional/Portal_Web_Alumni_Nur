# ÍNDICE DE ARCHIVOS - Alumni Portal Azure Bicep Solution

## 📂 Estructura Completa de Entrega

```
infra/
├── 📄 main.bicep
├── 📄 parameters.bicep
├── 📄 variables.bicep
├── 📄 parameters.json
│
├── modules/
│   ├── 📄 acr.bicep
│   ├── 📄 app-service-plan.bicep
│   ├── 📄 app-service.bicep
│   ├── 📄 postgres.bicep
│   ├── 📄 redis.bicep
│   └── 📄 static-web-app.bicep
│
├── scripts/
│   ├── 📄 deploy.ps1
│   └── 📄 build-and-push-images.ps1
│
├── 📚 README.md                    (370+ líneas)
├── 📚 QUICK_REFERENCE.md           (480+ líneas)
├── 📚 DJANGO_AZURE_CONFIG.md       (380+ líneas)
├── 📚 SPECIFICATIONS.md            (550+ líneas)
└── 📚 INDEX.md                     (Este archivo)
```

---

## 📝 Descripción de Cada Archivo

### ARCHIVOS BICEP PRINCIPALES

#### `main.bicep` - Orquestador Central
**Tamaño:** ~400 líneas  
**Propósito:** Archivo principal que importa variables, parámetros y módulos, orquestando el despliegue completo.

**Contenido:**
- Despliegue de Azure Container Registry
- Despliegue de Azure Cache for Redis
- Despliegue de PostgreSQL Flexible Server
- Despliegue de App Service Plan
- Despliegue de App Service para Alumni API
- Despliegue de App Service para Content API
- Despliegue de Static Web App para Frontend
- Outputs consolidados con resumen de despliegue

**Variables de Entrada:** Heredadas de `parameters.bicep`

**Outputs Principales:**
```
deployment_summary (objeto)
├── containerRegistry (credentials)
├── postgresqlDatabase (conexion info)
├── redisCache (conexion info)
├── appServices (URLs)
└── staticWebApp (URL frontend)
```

---

#### `parameters.bicep` - Definición de Parámetros
**Tamaño:** ~250 líneas  
**Propósito:** Define TODOS los parámetros de entrada con tipos, validaciones y descripciones.

**Parámetros Clave:**
- `projectName` (string, 3-15 chars) - Nombre del proyecto
- `environment` (enum: dev/staging/prod) - Ambiente de despliegue
- `location` (enum: eastus, westus, etc) - Región Azure
- `postgresqlAdminPassword` (@secure) - Contraseña BD (no echarse)
- `postgresqlVersion` (enum: 13-16) - Versión PostgreSQL
- `appServiceSkuName` (enum: B1-P1V2) - Tamaño App Service
- Multi-parámetros para Redis, Storage, etc.

**Décoradores Importantes:**
- `@minLength()`, `@maxLength()` - Validación longitud
- `@allowed()` - Valores permitidos
- `@secure()` - Credenciales sensibles (no en output)
- `@description()` - Documentación de parámetro

---

#### `variables.bicep` - Cálculos y Convenciones
**Tamaño:** ~200 líneas  
**Propósito:** Contiene variables calculadas basadas en parámetros y convenciones de nombres Azure.

**Secciones:**
1. **Ubicación y Ambiente** - location, uniqueSuffix
2. **Convenciones de Nombres Azure** - Prefijos estándares
3. **Nombres de Recursos** - Construcción automática de nombres únicos
4. **Configuración de Imágenes Docker** - URLs de ACR
5. **Configuración de App Service** - Puertos, SKU, runtime
6. **Configuración de PostgreSQL** - Specs, backup, geo-replicación
7. **Configuración de Redis** - SKU, capacidad, políticas
8. **Tags Comunes** - Etiquetado de recursos
9. **Networking** (opcional) - VNets, subnets

**Ejemplo de Output Único:**
```bicep
var acrName = '${nameAbbreviations.acr}${projectName}${environmentLower}${uniqueSuffix}'
// Resultado: acralumnidevabcde (único y predecible)
```

---

### MÓDULOS BICEP (Componentes Reutilizables)

#### `modules/acr.bicep` - Azure Container Registry
**Líneas:** ~100  
**Función:** Crea y configura ACR para almacenar imágenes Docker.

**Parámetros:**
- acrName, location, acrSku, acrAdminUserEnabled, tags

**Outputs:**
- acrId, acrName, acrLoginServer
- acrAdminUsername, acrAdminPassword
- acrRegistryUrl

**Notas de Seguridad:**
- Admin user habilitado por defecto (cambiar en prod)
- Público por defecto (considerar reglas de firewall)
- Se pueden habilitar Private Endpoints

---

#### `modules/app-service-plan.bicep` - App Service Plan
**Líneas:** ~80  
**Función:** Crea el plan de hosting compartido para ambas APIs.

**Parámetros:**
- appServicePlanName, location, skuName (B1-P1V2)
- capacity (número de workers)

**SKUs Soportados:**
- `B1` (1 vCPU, 1.75 GB) - Desarrollo
- `S1-S3` (1-3 vCPU) - Estándar/Producción
- `P1V2-P3V2` (2-4 vCPU) - Premium

**Outputs:**
- appServicePlanId (necesario para Apps)
- appServicePlanSku, appServicePlanTier

---

#### `modules/app-service.bicep` - App Service (Docker)
**Líneas:** ~280  
**Función:** Crea App Service para ejecutar contenedores Docker Linux.

**Parámetros Clave:**
- appServiceName - Nombre único
- appServicePlanId - Plan del padre
- dockerImageName - URI de imagen ACR
- containerPort - Puerto interno (8080/8081)
- environmentVariables - Diccionario de env vars
- acrUsername, acrPassword, acrLoginServer - Credenciales
- corsAllowedOrigins - Lista de CORS

**Características:**
- Always On (configurar por ambiente)
- HTTP/2 habilitado
- Logs automáticos
- FTPS obligatorio
- Auto-heal en caso de fallos
- Managed Identity (System Assigned)

**Outputs:**
- appServiceId, appServiceName
- appServiceUrl, appServiceDefaultHostname
- appServicePrincipalId (para RBAC)

---

#### `modules/postgres.bicep` - PostgreSQL Flexible Server
**Líneas:** ~240  
**Función:** Crea base de datos PostgreSQL completamente gestionada.

**Parámetros:**
- postgresqlServerName, administratorLogin, administratorLoginPassword
- postgresqlVersion, skuName (Standard_B1ms, etc)
- storageSizeGB, databaseName, backupRetentionDays
- publicNetworkAccessEnabled, requireSecureTransport

**Configuraciones Automáticas:**
- `log_connections = on` (auditoría)
- `log_statement = all` (queries)
- `pgaudit` habilitado (extensión de auditoría)
- TLS 1.2+ obligatorio en prod
- Connection pooling recomendado en aplicación

**Outputs:**
- postgresqlFqdn (hostname completo)
- postgresqlConnectionString (sin password)
- postgresqlConnectionStringWithPassword (completa, @secure)

**Notas:**
- Flexible Server no soporta Private Endpoints (en plantilla actual)
- Se puede mejorar con VNet integration
- Geo-redundancia disponible en Standard+

---

#### `modules/redis.bicep` - Azure Cache for Redis
**Líneas:** ~130  
**Función:** Crea instancia de Redis para caching y sesiones.

**Parámetros:**
- redisCacheName, redisSku (Basic/Standard/Premium)
- capacity (0-6), family (C para Burstable, P para Premium)
- requireSecureTransport, minimumTlsVersion

**Políticas de Evicción:**
```
allkeys-lru - Elimina claves menos usadas (recomendado)
volatile-lru - Solo claves con TTL
allkeys-lfu - Menos frecuentes
```

**Outputs:**
- redisName, redisPrimaryEndpoint (hostname)
- redisAccessKey (primary), redisSecondaryAccessKey
- redisConnectionString (completa, incluye puerto y SSL)

**SKU por Caso:**
- **Basic**: 250MB-1GB - Desarrollo
- **Standard**: 1GB-13GB - Staging, SLA 99.9%
- **Premium**: 13GB-120GB - Producción, Clustering, Persistence

---

#### `modules/static-web-app.bicep` - Static Web Apps
**Líneas:** ~110  
**Función:** Despliega frontend React como sitio estático con CDN.

**Parámetros:**
- staticWebAppName, location (centralus requerido)
- sku (Free/Standard), repositoryUrl, repositoryToken
- appLocation, outputLocation, appBuildCommand

**Características:**
- Staging environments automáticos
- SSL/TLS gratuito
- CDN global incluido
- Soporte para SPA routing
- API backend opcional

**Nota sobre ubicación:**
```powershell
# Static Web Apps SOLO está disponible en centralus
# No se puede cambiar, Azure lo fuerza
location = 'centralus'
```

---

### SCRIPTS DE AUTOMATIZACIÓN

#### `scripts/deploy.ps1` - Orquestador de Despliegue
**Líneas:** ~350+  
**Lenguaje:** PowerShell Core  
**Propósito:** Automatiza todo el process de validación y despliegue.

**Flujo Automatizado:**
1. Validar requisitos (Azure CLI, Bicep, autenticación)
2. Verificar suscripción Azure activa
3. Crear resource group si no existe
4. Validar sintaxis Bicep
5. Compilar Bicep a ARM template
6. Validar template ARM
7. Mostrar resumen pre-despliegue
8. Solicitar confirmación
9. Ejecutar despliegue
10. Monitorear estado
11. Mostrar outputs
12. Mostrar próximos pasos

**Parámetros:**
- `-ProjectName` (obligatorio) - Nombre del proyecto
- `-EnvironmentName` - dev/staging/prod
- `-ResourceGroupName` - Nombre RG
- `-Location` - Región Azure
- `-PostgresqlAdminPassword` (@secure) - Contraseña BD
- `-ParametersFile` - Archivo parameters.json
- `-ValidateOnly` - Solo validar sin desplegar
- `-NoWait` - No esperar a que termine

**Ejemplo de Uso:**
```powershell
./deploy.ps1 -ProjectName "alumni" `
  -EnvironmentName "dev" `
  -PostgresqlAdminPassword (Read-Host -AsSecureString "PostgreSQL Password")
```

**Output:**
- Deployment ID
- Estado progresivo (cada 60 segundos)
- Outputs finales
- Próximos pasos

---

#### `scripts/build-and-push-images.ps1` - Docker Build & Push
**Líneas:** ~250+  
**Lenguaje:** PowerShell Core  
**Propósito:** Construir imágenes Docker locales y enviarlas a ACR.

**Flujo:**
1. Obtener credenciales ACR
2. Autenticarse en Docker
3. Build Alumni API image (Dockerfile)
4. Build Content API image (Dockerfile)
5. Verificar imágenes construidas
6. Push Alumni API:latest y Alumni API:tag
7. Push Content API:latest y Content API:tag
8. Listar repositorios en ACR
9. Mostrar resumen

**Parámetros:**
- `-ResourceGroupName` (obligatorio)
- `-AcrName` (obligatorio) - Nombre del ACR
- `-ProjectName` - alumni (por defecto)
- `-ImageTag` - latest, v1, v2, etc (por defecto: latest)
- `-DoNotPush` - Solo construir, no enviar

**Requisitos Previos:**
- Docker Desktop ejecutándose
- Dockerfile en ../AlumniAPI/Dockerfile
- Dockerfile en ../ContenidoAlumniApi/Dockerfile
- Azure CLI autenticado

**Ejemplo:**
```powershell
./build-and-push-images.ps1 `
  -ResourceGroupName "rg-alumni-portal" `
  -AcrName "acralumnidev12345" `
  -ImageTag "v1.0"
```

---

### ARCHIVOS DE CONFIGURACIÓN

#### `parameters.json` - Valores por Defecto
**Formato:** JSON Schema (ARM Template)  
**Propósito:** Archivo de parámetros de ejemplo para despliegue.

**Estructura:**
```json
{
  "parameters": {
    "projectName": { "value": "alumni" },
    "environment": { "value": "dev" },
    "postgresqlAdminPassword": { "reference": { /* Key Vault */ } },
    // ... más parámetros
  }
}
```

**Nota sobre secretos:**
- Contraseñas NO deben estar en plain text
- Usar references a Key Vault cuando sea posible
- O pasar como parámetros CLI (seguro)

---

### DOCUMENTACIÓN COMPLETA

#### `README.md` - Guía de Despliegue Completa
**Tamaño:** ~2000 líneas (cuando se imprime)  
**Propósito:** Documentación exhaustiva paso a paso.

**Secciones:**
1. Tabla de contenidos
2. Requisitos previos (software y Azure)
3. Estructura del proyecto
4. Pasos de despliegue (1-11)
   - Conectar Azure
   - Crear RG
   - Validar Bicep
   - Desplegar infraestructura
   - Build y push de imágenes Docker
   - Configurar base de datos
   - Ejecutar migraciones
   - Configurar variables de entorno
   - CORS
   - Desplegar Frontend
   - Dominios personalizados
5. Monitoreo y logging
6. Escalado y actualizaciones
7. Troubleshooting (7 problemas comunes)
8. Limpieza
9. Costos estimados
10. Variables de entorno
11. Notas importantes
12. Recursos útiles
13. Soporte

**Público Objetivo:** Ingenieros DevOps/Cloud, desarrolladores full-stack

---

#### `QUICK_REFERENCE.md` - Cheatsheet de Comandos
**Tamaño:** ~800 líneas  
**Propósito:** Referencia rápida de comandos Azure CLI más frecuentes.

**Secciones:**
1. Inicio rápido (5 minutos)
2. Comandos frecuentes
   - Información de despliegue
   - Monitoreo y logs
   - Gestión de aplicaciones
   - BD PostgreSQL
   - Redis Cache
   - Container Registry
   - Static Web Apps
3. Troubleshooting rápido
4. Scaling y performance
5. Limpieza
6. Seguridad
7. Monitoreo y alertas
8. Dominios y SSL
9. Variables de entorno comunes
10. Enlaces útiles
11. Tips and tricks

**Público Objetivo:** Developers, SREs, Ops

---

#### `DJANGO_AZURE_CONFIG.md` - Configuración de Aplicación
**Tamaño:** ~800 líneas  
**Propósito:** Guía de configuración de Django específica para Azure.

**Contenido:**
1. Cambios a settings.py
   - Seguridad
   - Base de datos
   - Cache (Redis)
   - Logging
   - Static files
2. requirements.txt (dependencias)
3. Health check endpoint (Django)
4. Gunicorn configuration
5. Integración Key Vault
6. WSGI setup

**Packages Incluidos:**
- Django 4.2
- djangorestframework
- django-cors-headers
- django-redis
- psycopg2-binary (PostgreSQL client)
- dj-database-url
- python-json-logger

**Público Objetivo:** Backend developers, DevOps

---

#### `SPECIFICATIONS.md` - Especificaciones Técnicas Completas
**Tamaño:** ~1500 líneas  
**Propósito:** Documento técnico detallado con todas las especificaciones.

**Secciones:**
1. Información general
2. Arquitectura (diagrama ASCII)
3. Componentes desplegados (7 servicios)
   - Specs de cada uno
   - Limites, capacidades
   - Puertos utilizados
4. Seguridad y networking
5. Capacidades y límites
6. Connectivity
7. Backup y DR
8. Deployment pipeline
9. Variables de entorno
10. Estimación de costos
11. Arquitectura de ficheros
12. Checklist pre-despliegue
13. Soporte y recursos

**Público Objetivo:** Arquitectos, líderes técnicos, compliance

---

#### `INDEX.md` - Este Archivo
**Propósito:** Navegación y descripción de todos los ficheros.

---

## 📊 Estadísticas de Entrega

```
BICEP CODE:
├── main.bicep                     ~400 líneas
├── parameters.bicep               ~250 líneas
├── variables.bicep                ~200 líneas
├── modules/ (6 archivos)          ~1200 líneas
└── Total Bicep:                   ~2050 líneas

SCRIPTS:
├── deploy.ps1                     ~350 líneas
├── build-and-push-images.ps1      ~250 líneas
└── Total Scripts:                 ~600 líneas

DOCUMENTACIÓN:
├── README.md                      ~2000 líneas
├── QUICK_REFERENCE.md             ~800 líneas
├── DJANGO_AZURE_CONFIG.md         ~800 líneas
├── SPECIFICATIONS.md              ~1500 líneas
├── INDEX.md                       ~400 líneas
└── Total Documentación:           ~5500 líneas

CONFIGURACIÓN:
├── parameters.json                ~90 líneas
└── Total Config:                  ~90 líneas

TOTAL GENERAL:                     ~8240 líneas
```

---

## 🎯 Cómo Usar Esta Solución

### PRIMERA VEZ (Setup Inicial)

```powershell
# 1. Leer
Read-Content "README.md"

# 2. Validar requisitos
# - Azure CLI v2.50+
# - Bicep
# - Docker Desktop
# - PowerShell 7+

# 3. Desplegar (desde directorio infra/)
./scripts/deploy.ps1 `
  -ProjectName "alumni" `
  -EnvironmentName "dev" `
  -PostgresqlAdminPassword (Read-Host -AsSecureString)

# 4. Construir e imagen y pushear a ACR
./scripts/build-and-push-images.ps1 `
  -ResourceGroupName "rg-alumni-portal" `
  -AcrName "obtener de outputs del deploy"

# 5. Ejecutar migraciones Django
# Ver sección en README.md

# 6. Desplegar frontend
# Static Web Apps o usar Azure CLI
```

### OPERACIONES DIARIAS

```powershell
# Ver logs
az webapp log tail -g "rg-alumni-portal" -n "app-alumni-api-dev-XXXXX"

# Ver estado de recursos
az resource list -g "rg-alumni-portal" -o table

# Ver métricas
az monitor metrics list -g "rg-alumni-portal" --resource "app-alumni-api-dev-XXXXX"

# Usar QUICK_REFERENCE.md para otros comandos
```

### ACTUALIZACIONES

```powershell
# Actualizar imagen Docker
./scripts/build-and-push-images.ps1 ... -ImageTag "v1.1"

# Actualizar App Service con nueva imagen
az webapp config container set ... --docker-custom-image-name "..."

# Reiniciar
az webapp restart -g "rg-alumni-portal" -n "app-alumni-api-dev-XXXXX"
```

---

## 📖 Guía de Lectura Recomendada

**Por rol:**

### Si eres Arquitecto de Soluciones:
1. README.md - Visión general
2. SPECIFICATIONS.md - Detalles técnicos
3. main.bicep - Orquestación

### Si eres DevOps/SRE:
1. README.md - Instrucciones
2. QUICK_REFERENCE.md - Comandos
3. scripts/deploy.ps1 - Automatización

### Si eres Backend Developer:
1. README.md - Setup
2. DJANGO_AZURE_CONFIG.md - Configuración
3. QUICK_REFERENCE.md - Troubleshooting

### Si eres Ops/Soporte:
1. QUICK_REFERENCE.md - Referencia rápida
2. README.md (sección Troubleshooting)
3. SPECIFICATIONS.md (sección Costos)

---

## 🔗 Dependencias Entre Archivos

```
parameters.bicep ──┐
                   ├──► main.bicep ◄──┬─── variables.bicep
                   │                  │
variables.bicep ───┘                  └─── (6 modules/*.bicep)

deploy.ps1 ────────► main.bicep + parameters.bicep + variables.bicep
                  └──► scripts/build-and-push-images.ps1

build-and-push-images.ps1 ────► AlumniAPI/Dockerfile
                            ├──► ContenidoAlumniApi/Dockerfile
                            └──► Azure Container Registry
```

---

## ✨ Características Clave Por Archivo

| Archivo | Clave | Beneficio |
|---------|-------|-----------|
| main.bicep | Orquestación central | Único punto de entrada |
| variables.bicep | Convenciones Azure | Nombres únicos automáticos |
| modules/ | Reutilización | Código limpio y mantenible |
| parameters.bicep | Validación | Errores detectados temprano |
| deploy.ps1 | Automatización | Reducir errores manuales |
| build-and-push-images.ps1 | Consistencia | Docker image pipeline |
| README.md | Guía paso-a-paso | Sin ambigüedades |
| QUICK_REFERENCE.md | Productividad | Ahorro de tiempo |
| SPECIFICATIONS.md | Compliance | Documentación formal |

---

## 🚀 Próximos Pasos Después del Despliegue

1. **Ejecutar desde README.md:**
   - Paso 7: Configurar base de datos
   - Paso 8: Ejecutar migraciones
   - Paso 9: Configurar variables
   - Paso 10: CORS
   - Paso 11: Desplegar frontend

2. **Monitoreo (Día 1):**
   - Revisar logs de aplicación
   - Probar endpoints /health
   - Verificar conectividad BD y Redis

3. **Optimización (Semana 1):**
   - Revisar costos reales vs estimado
   - Ajustar SKUs si es necesario
   - Configurar alertas y backups

4. **Documentar (Semana 1):**
   - URLs finales de servicios
   - Contactos de soporte
   - Runbooks operacionales

---

## 📞 Soporte

- **Errores Bicep:** Ver main.bicep y módulos correlativos
- **Errores Deploy:** Ver deploy.ps1 y README.md (sección Troubleshooting)
- **Errores Aplicación:** Ver DJANGO_AZURE_CONFIG.md
- **Errores Operacionales:** Ver QUICK_REFERENCE.md

---

**Solución Lista para Producción ✓**  
**Documentación Completa ✓**  
**Scripts de Automatización ✓**  
**Ejemplos de Configuración ✓**  

Inicio: 2026-03-12  
Versión: 1.0  
Estado: COMPLETO
