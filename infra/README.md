# Guía de Despliegue - Alumni Portal en Azure con Bicep

## 📋 Tabla de Contenidos
1. [Requisitos Previos](#requisitos-previos)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Pasos de Despliegue](#pasos-de-despliegue)
4. [Build y Push de Imágenes Docker](#build-y-push-de-imágenes-docker)
5. [Configuración Post-Despliegue](#configuración-post-despliegue)
6. [Troubleshooting](#troubleshooting)
7. [Costos Estimados](#costos-estimados)

---

## Requisitos Previos

### Software Requerido
- **Azure CLI** 2.50+: [Descargar](https://learn.microsoft.com/es-es/cli/azure/install-azure-cli)
- **Bicep CLI** 0.16+: Se instala automáticamente con Azure CLI
- **Docker Desktop** (para build de imágenes): [Descargar](https://www.docker.com/products/docker-desktop)
- **PowerShell Core** 7+ o Bash
- **Git** (opcional, para repositorio)

### Cuenta Azure
- Suscripción activa de Azure
- Permisos de Contributor en la suscripción (para crear recursos y resource groups)
- Balance de créditos o método de pago válido

### Verificar Instalaciones
```powershell
# Verificar Azure CLI
az --version

# Verificar Bicep
az bicep version

# Verificar Docker
docker --version
```

---

## Estructura del Proyecto

```
infra/
├── main.bicep                    # Archivo principal que orquesta todos los recursos
├── parameters.bicep              # Declaración de parámetros
├── variables.bicep               # Variables calculadas y convenciones de nombres
├── parameters.json               # Valores por defecto para desarrollo
│
├── modules/                      # Módulos reutilizables
│   ├── acr.bicep                # Azure Container Registry
│   ├── redis.bicep              # Azure Cache for Redis
│   ├── postgres.bicep           # Azure Database for PostgreSQL
│   ├── app-service-plan.bicep   # App Service Plan (Linux)
│   ├── app-service.bicep        # App Service (para APIs Django)
│   └── static-web-app.bicep     # Static Web App (para Frontend)
│
├── scripts/                      # Scripts auxiliares
│   ├── build-and-push-images.sh   # Build y push de imágenes Docker
│   └── deploy.sh                  # Script de despliegue
│
└── README.md                     # Esta documentación
```

---

## Pasos de Despliegue

### Paso 1: Preparar la Suscripción Azure

```powershell
# Conectarse a Azure
az login

# Listar suscripciones disponibles
az account list -o table

# Establecer suscripción activa (reemplazar <SUBSCRIPTION_ID>)
az account set --subscription "<SUBSCRIPTION_ID>"

# Verificar suscripción activa
az account show -o table
```

### Paso 2: Crear Resource Group

```powershell
# Variables
$resourceGroupName = "rg-alumni-portal"
$location = "eastus"

# Crear resource group
az group create `
  --name $resourceGroupName `
  --location $location

# Verificar
az group show --name $resourceGroupName
```

### Paso 3: Validar Bicep (Opcional pero Recomendado)

```powershell
cd infra

# Validar sintaxis de Bicep
az bicep build --file main.bicep

# Validar parámetros
az deployment group validate `
  --resource-group "rg-alumni-portal" `
  --template-file main.bicep `
  --parameters parameters.json `
  --parameters projectName=alumni environment=dev
```

### Paso 4: Desplegar Infraestructura

```powershell
# Variables
$resourceGroupName = "rg-alumni-portal"
$deploymentName = "alumni-portal-deploy-$(Get-Date -Format 'yyyyMMddHHmmss')"

# Despliegue (modo validación + despliegue)
az deployment group create `
  --resource-group $resourceGroupName `
  --template-file main.bicep `
  --parameters parameters.json `
  --parameters projectName=alumni `
  --parameters environment=dev `
  --parameters postgresqlAdminPassword="<CONTRASEÑA_FUERTE>" `
  --name $deploymentName

# Mostrar outputs del despliegue
az deployment group show `
  --resource-group $resourceGroupName `
  --name $deploymentName `
  --query properties.outputs
```

**⏱️ Tiempo estimado:** 15-20 minutos

### Paso 5: Recuperar Información de Despliegue

```powershell
# Guardar outputs en variable
$deployment = az deployment group show `
  --resource-group "rg-alumni-portal" `
  --name $deploymentName `
  --query properties.outputs | ConvertFrom-Json

# Mostrar información importante
Write-Host "=== INFORMACIÓN DE DESPLIEGUE ===" -ForegroundColor Green
Write-Host "ACR Login Server: $($deployment.acrLoginServer.value)"
Write-Host "Alumni API URL: $($deployment.appServiceAlumniApiUrl.value)"
Write-Host "Content API URL: $($deployment.appServiceContentApiUrl.value)"
Write-Host "Static Web App URL: $($deployment.staticWebAppUrl.value)"
Write-Host "Database FQDN: $(PENDIENTE - ejecutar antes el despliegue)"
Write-Host "Redis Hostname: $(PENDIENTE - ejecutar antes el despliegue)"
```

---

## Build y Push de Imágenes Docker

### Paso 6: Preparar las Imágenes Docker

#### 6.1: Construir Imágenes Localmente

```powershell
# Navegar a raíz del proyecto
cd ..

# Guardar información del ACR
$acrLoginServer = "$(az acr show -n acr-alumni-dev-XXXXX -o tsv --query loginServer)"

# Construir Alumni API
docker build -t alumni-api:latest -f AlumniAPI/Dockerfile AlumniAPI/

# Construir Content API
docker build -t content-api:latest -f ContenidoAlumniApi/Dockerfile ContenidoAlumniApi/

# Construir Frontend (compilar a estáticos)
cd FrontendAlumni
npm install
npm run build
# El resultado estará en FrontendAlumni/dist/
cd ..

# Verificar imágenes
docker images | grep -E "alumni-api|content-api"
```

#### 6.2: Autenticarse en ACR

```powershell
# Obtener credenciales de ACR
$acrUsername = $(az acr credential show `
  --resource-group "rg-alumni-portal" `
  --name "acr-alumni-dev-XXXXX" `
  --query username -o tsv)

$acrPassword = $(az acr credential show `
  --resource-group "rg-alumni-portal" `
  --name "acr-alumni-dev-XXXXX" `
  --query "passwords[0].value" -o tsv)

# Login a Docker
docker login $acrLoginServer -u $acrUsername -p $acrPassword

# O usar Azure CLI directamente
az acr login --name "acr-alumni-dev-XXXXX"
```

#### 6.3: Etiquetar y Pushear Imágenes

```powershell
# Variables
$acrLoginServer = "<ACR_LOGIN_SERVER>"  # ej: acralmnidevXXXXX.azurecr.io

# Etiquetar Alumni API
docker tag alumni-api:latest "$acrLoginServer/alumni/alumni-api:latest"
docker tag alumni-api:latest "$acrLoginServer/alumni/alumni-api:v1"

# Etiquetar Content API
docker tag content-api:latest "$acrLoginServer/alumni/content-api:latest"
docker tag content-api:latest "$acrLoginServer/alumni/content-api:v1"

# Pushear Alumni API
docker push "$acrLoginServer/alumni/alumni-api:latest"
docker push "$acrLoginServer/alumni/alumni-api:v1"

# Pushear Content API
docker push "$acrLoginServer/alumni/content-api:latest"
docker push "$acrLoginServer/alumni/content-api:v1"

# Verificar imágenes en ACR
az acr repository list --name "acr-alumni-dev-XXXXX"
az acr repository show-tags --repository alumni-api --name "acr-alumni-dev-XXXXX"
```

---

## Configuración Post-Despliegue

### Paso 7: Configurar Base de Datos

```powershell
# Variables
$postgresHost = "<POSTGRESQL_FQDN>"      # obtenido del despliegue
$postgresUser = "adminuser"
$postgresPassword = "<PASSWORD>"
$postgresDb = "alumni_db"
$resourceGroupName = "rg-alumni-portal"

# Instalar psql (PostgreSQL client) si no está disponible
# En Windows: https://www.postgresql.org/download/windows/
# En macOS: brew install postgresql

# Conectarse y crear estructura
psql -h $postgresHost -U $postgresUser -d $postgresDb <<EOF
-- Crear esquemas si es necesario
CREATE SCHEMA IF NOT EXISTS public;

-- Ejecutar migraciones (desde la aplicación)
-- Ver siguiente sección
EOF
```

### Paso 8: Ejecutar Migraciones Django

```powershell
# Variables
$alumniApiAppName = "app-alumni-api-dev-XXXXX"
$contentApiAppName = "app-content-api-dev-XXXXX"
$resourceGroupName = "rg-alumni-portal"

# Para Alumni API - Ejecutar migraciones
az webapp remote-build-deploy `
  --resource-group $resourceGroupName `
  --name $alumniApiAppName `
  --command "python manage.py migrate"

# Para Content API - Ejecutar migraciones
az webapp remote-build-deploy `
  --resource-group $resourceGroupName `
  --name $contentApiAppName `
  --command "python manage.py migrate"

# Alternativa: Usar SSH (si está habilitado)
az webapp create-remote-connection `
  --resource-group $resourceGroupName `
  --name $alumniApiAppName

# En la conexión SSH ejecutar:
# python manage.py migrate
# python manage.py createsuperuser (opcional)
```

### Paso 9: Configurar Variables de Entorno

```powershell
# Las variables ya están configuradas en main.bicep
# Pero asegúrese de verificar en Azure Portal:

# 1. App Service > Alumni API > Configuration > Application settings
# 2. Verificar que todas las variables estén presentes:
#    - DATABASE_URL
#    - POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
#    - REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_URL
#    - DEBUG=False (para producción)
#    - ALLOWED_HOSTS

# Si necesita actualizar una variable:
az webapp config appsettings set `
  --resource-group $resourceGroupName `
  --name $alumniApiAppName `
  --settings "DEBUG=False" "LOG_LEVEL=INFO"
```

### Paso 10: Configurar CORS en APIs

```powershell
# CORS ya está configurado en main.bicep para permitir
# solicitudes desde la Static Web App

# Pero si necesita ajustar, edite en main.bicep:
corsAllowedOrigins: [
  'https://<STATIC_WEB_APP_HOSTNAME>'
  'https://yourmachine.azurewebsites.net' // si necesita SSL
]
```

### Paso 11: Desplegar Frontend

```powershell
# Opción 1: Despliegue manual usando Azure CLI
az staticwebapp upload \
  --name "swa-alumni-dev-XXXXX" \
  --source ./FrontendAlumni/dist \
  --api-location ./FrontendAlumni/api \
  --app-location .

# Opción 2: Conectar repositorio GitHub (automático)
# Ir a Azure Portal > Static Web Apps > "swa-alumni-dev-XXXXX"
# > Setup deployment source > GitHub
# > Seleccionar repositorio y rama

# Opción 3: Usar Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli
swa start ./FrontendAlumni/dist --api-location ./FrontendAlumni/api
```

---

## Configuración de Dominios Personalizados

### Agregar Dominio Personalizado a Static Web App

```powershell
$resourceGroupName = "rg-alumni-portal"
$staticWebAppName = "swa-alumni-dev-XXXXX"
$customDomain = "alumni.tudominio.com"

# Agregar dominio personalizado
az staticwebapp custom-domain set \
  --resource-group $resourceGroupName \
  --name $staticWebAppName \
  --domain-name $customDomain \
  --validation-type cname
```

### Agregar Certificado SSL a App Services

```powershell
# Usar certificados gestionados por Azure (gratuitos)
# Ya están habilitados por defecto con HTTPS

# Verificar:
az webapp show \
  --resource-group $resourceGroupName \
  --name "app-alumni-api-dev-XXXXX" \
  --query httpsOnly
```

---

## Monitoreo y Logging

### Habilitar Application Insights

```powershell
# Crear Application Insights
az monitor app-insights component create \
  --app alumni-insights \
  --location eastus \
  --resource-group $resourceGroupName \
  --application-type web \
  --kind web

# Obtener Instrumentation Key
$instrumentationKey = az monitor app-insights component show \
  --app alumni-insights \
  --resource-group $resourceGroupName \
  --query instrumentationKey -o tsv

# Agregar a App Service
az webapp config appsettings set \
  --resource-group $resourceGroupName \
  --name "app-alumni-api-dev-XXXXX" \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$instrumentationKey"
```

### Ver Logs

```powershell
# Logs de App Service
az webapp log tail \
  --resource-group $resourceGroupName \
  --name "app-alumni-api-dev-XXXXX" \
  --provider application

# Logs de Static Web App
az staticwebapp environment show \
  --name $staticWebAppName \
  --resource-group $resourceGroupName
```

---

## Escalado y Actualizaciones

### Escalar App Service (Aumentar Instancias)

```powershell
# Cambiar a Plan Standard con más instancias
az appservice plan update \
  --resource-group $resourceGroupName \
  --name "plan-alumni-dev" \
  --sku S1 \
  --number-of-workers 2
```

### Actualizar Imágenes Docker

```powershell
# Construir nueva versión
docker build -t alumni-api:v2 -f AlumniAPI/Dockerfile AlumniAPI/
docker tag alumni-api:v2 "$acrLoginServer/alumni/alumni-api:v2"
docker push "$acrLoginServer/alumni/alumni-api:v2"

# Actualizar App Service para usar nueva versión
az webapp config container set \
  --name "app-alumni-api-dev-XXXXX" \
  --resource-group $resourceGroupName \
  --docker-custom-image-name "$acrLoginServer/alumni/alumni-api:v2" \
  --docker-registry-server-url "https://$acrLoginServer" \
  --docker-registry-server-username $acrUsername \
  --docker-registry-server-password $acrPassword

# Reiniciar App Service
az webapp restart \
  --resource-group $resourceGroupName \
  --name "app-alumni-api-dev-XXXXX"
```

---

## Troubleshooting

### Problema: App Service no inicia

```powershell
# Ver logs
az webapp log tail \
  --resource-group $resourceGroupName \
  --name "app-alumni-api-dev-XXXXX" --provider application

# Verificar imagen existe en ACR
az acr repository show --name acr-alumni-dev-XXXXX --repository alumni-api

# Verificar credenciales de ACR
az webapp config container show \
  --resource-group $resourceGroupName \
  --name "app-alumni-api-dev-XXXXX"
```

### Problema: No hay conexión a PostgreSQL

```powershell
# Verificar reglas de firewall PostgreSQL
az postgres flexible-server firewall-rule list \
  --resource-group $resourceGroupName \
  --server-name psql-alumni-dev-XXXXX

# Agregar acceso desde App Service
az postgres flexible-server firewall-rule create \
  --resource-group $resourceGroupName \
  --name "AllowAppService" \
  --server-name psql-alumni-dev-XXXXX \
  --start-ip-address "0.0.0.0" \
  --end-ip-address "255.255.255.255"

# Mejor: Usar Azure Private Endpoints (seguro)
```

### Problema: No hay conexión a Redis

```powershell
# Verificar estado de Redis
az redis show \
  --resource-group $resourceGroupName \
  --name redis-alumni-dev-XXXXX

# Obtener claves de acceso
az redis list-keys \
  --resource-group $resourceGroupName \
  --name redis-alumni-dev-XXXXX

# Verificar firewall de Redis
az redis firewall-rules list \
  --resource-group $resourceGroupName \
  --name redis-alumni-dev-XXXXX
```

### Problema: Django migrate falla

```powershell
# Conectarse a App Service y ver error completo
az webapp ssh \
  --resource-group $resourceGroupName \
  --name "app-alumni-api-dev-XXXXX"

# Dentro de SSH:
python manage.py migrate --verbosity 3
```

---

## Limpieza y Eliminación

### Eliminar Todos los Recursos

```powershell
# ADVERTENCIA: Esto eliminará TODOS los recursos incluyendo datos

$resourceGroupName = "rg-alumni-portal"

# Eliminar resource group (elimina todos los recursos)
az group delete \
  --name $resourceGroupName \
  --yes \
  --no-wait

# Monitorear eliminación
az group wait --deleted --name $resourceGroupName
```

### Eliminar Recurso Individual

```powershell
# Ejemplo: Eliminar ACR
az acr delete \
  --resource-group $resourceGroupName \
  --name acr-alumni-dev-XXXXX \
  --yes
```

---

## Costos Estimados (Desarrollo - Mensual)

| Servicio | SKU | Estimado |
|----------|-----|----------|
| App Service | B1 | $10-15 |
| PostgreSQL | Standard_B1ms | $30-40 |
| Redis | Basic | $15-20 |
| Container Registry | Basic | $5-10 |
| Static Web App | Free | Gratis |
| **Total Estimado** | | **$60-85/mes** |

Para **Producción**, multiplicar por 3-5 dependiendo de tráfico.

---

## Variables de Entorno Necesarias

### Para AlumniAPI

```
DATABASE_URL=postgresql://user:password@host:5432/alumni_db
POSTGRES_HOST=host
POSTGRES_PORT=5432
POSTGRES_DB=alumni_db
POSTGRES_USER=user
POSTGRES_PASSWORD=password
REDIS_HOST=host
REDIS_PORT=6379
REDIS_PASSWORD=password
REDIS_URL=redis://:password@host:6379/0
ALLOWED_HOSTS=*.azurewebsites.net,localhost
DEBUG=False
ENVIRONMENT=dev
```

### Para ContenidoAlumniApi

Igual que AlumniAPI

### Para Frontend React

```
VITE_API_URL=https://app-alumni-api-dev-XXXXX.azurewebsites.net
VITE_CONTENT_API_URL=https://app-content-api-dev-XXXXX.azurewebsites.net
```

---

## Notas Importantes

1. **PostgreSQL Always Allow Public Access = False**: Para producción, deshabilitar acceso público
2. **Redis Secure Transport**: Habilitado por defecto (requiere TLS)
3. **App Service AlwaysOn**: Deshabilitado en dev para economizar; habilitado en prod
4. **Static Web Apps**: Free tier suficiente para demostración
5. **Backups**: Configurados automáticamente con 7-35 días de retención
6. **Logs**: Se guardan automáticamente; revisar regularmente

---

## Recursos Útiles

- [Documentación Bicep](https://learn.microsoft.com/es-es/azure/azure-resource-manager/bicep/)
- [Azure CLI Reference](https://learn.microsoft.com/es-es/cli/azure/reference-index)
- [App Service on Linux](https://learn.microsoft.com/es-es/azure/app-service/overview-hosting-plans)
- [PostgreSQL Flexible Server](https://learn.microsoft.com/es-es/azure/postgresql/flexible-server/)
- [Azure Cache for Redis](https://learn.microsoft.com/es-es/azure/azure-cache-for-redis/)
- [Static Web Apps](https://learn.microsoft.com/es-es/azure/static-web-apps/)

---

## Soporte

Para issues o preguntas:
1. Revisar [Troubleshooting](#troubleshooting)
2. Consultar logs con `az webapp log tail`
3. Verificar [Azure Status](https://status.azure.com/)
4. Contactar soporte Azure

---

**Última actualización:** 2026-03-12
**Versión:** 1.0
