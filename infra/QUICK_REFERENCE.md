# REFERENCIA RÁPIDA - Alumni Portal en Azure

## 🚀 Inicio Rápido (5 minutos)

### 1. Conectarse a Azure
```powershell
az login
az account set --subscription "<SUBSCRIPTION_ID>"
```

### 2. Crear Resource Group
```powershell
$rg = "rg-alumni-portal"
$loc = "eastus"
az group create -n $rg -l $loc
```

### 3. Desplegar Infraestructura
```powershell
cd infra
./scripts/deploy.ps1 -ProjectName "alumni" -EnvironmentName "dev" `
  -PostgresqlAdminPassword (Read-Host -AsSecureString "PostgreSQL Password")

# Modo AZD recomendado (incluye preview y refresh de env)
./scripts/deploy.ps1 -ProjectName "alumni" -EnvironmentName "prod" `
  -ResourceGroupName "rg-alumni-prod" `
  -Location "eastus" -PostgresqlLocation "centralus" `
  -PostgresqlAdminPassword (Read-Host -AsSecureString "PostgreSQL Password") `
  -UseAzd -ShowAzdEnvValues
```

### 4. Construir y Pushear Imágenes
```powershell
./scripts/build-and-push-images.ps1 `
  -ResourceGroupName "rg-alumni-portal" `
  -AcrName "acralumnidev12345"

# Resolver ACR automáticamente desde azd env
./scripts/build-and-push-images.ps1 `
  -ResourceGroupName "rg-alumni-prod" `
  -AzdEnvironment "prod"
```

### 5. Ver y Gestionar Variables con AZD
```powershell
# Listar entornos azd
./scripts/azd-env.ps1 -Action list

# Ver todas las variables del entorno
./scripts/azd-env.ps1 -Action show -Environment prod

# Leer una variable puntual
./scripts/azd-env.ps1 -Action get -Environment prod -Key containerRegistryName

# Actualizar una variable
./scripts/azd-env.ps1 -Action set -Environment prod -Key postgresqlLocation -Value centralus
```

---

## 📋 Comandos Frecuentes

### Información de Despliegue
```powershell
# Listar recursos en RG
az resource list -g rg-alumni-portal -o table

# Ver outputs del despliegue
az deployment group show -g rg-alumni-portal -n <deployment-name> `
  --query properties.outputs

# Obtener URLs de servicios
az webapp show -g rg-alumni-portal -n app-alumni-api-dev-XXXXX `
  --query defaultHostName -o tsv
```

### Monitoreo
```powershell
# Ver logs de App Service (últimas 100 líneas)
az webapp log tail -g rg-alumni-portal -n app-alumni-api-dev-XXXXX

# Ver logs en tiempo real
az webapp log tail -g rg-alumni-portal -n app-alumni-api-dev-XXXXX --provider application

# Ver estado de despliegue
az deployment group show -g rg-alumni-portal -n alumni-deploy-XXXX `
  --query properties.provisioningState
```

### Gestión de Aplicaciones
```powershell
# Reiniciar App Service
az webapp restart -g rg-alumni-portal -n app-alumni-api-dev-XXXXX

# Ver variables de entorno
az webapp config appsettings list -g rg-alumni-portal -n app-alumni-api-dev-XXXXX

# Actualizar variable de entorno
az webapp config appsettings set -g rg-alumni-portal -n app-alumni-api-dev-XXXXX `
  --settings DEBUG=False LOG_LEVEL=INFO

# Ver configuración de contenedor
az webapp config container show -g rg-alumni-portal -n app-alumni-api-dev-XXXXX
```

### Base de Datos PostgreSQL
```powershell
# Listar servidores PostgreSQL
az postgres flexible-server list -g rg-alumni-portal -o table

# Ver detalles del servidor
az postgres flexible-server show -g rg-alumni-portal -n psql-alumni-dev-XXXXX

# Ver bases de datos
az postgres flexible-server db list -g rg-alumni-portal -n psql-alumni-dev-XXXXX

# Crear regla de firewall
az postgres flexible-server firewall-rule create -g rg-alumni-portal `
  -n psql-alumni-dev-XXXXX -r AllowAllIps `
  --start-ip-address 0.0.0.0 --end-ip-address 255.255.255.255

# Conectarse localmente (si psql está instalado)
# psql -h psql-alumni-dev-XXXXX.postgres.database.azure.com -U adminuser -d alumni_db
```

### Redis Cache
```powershell
# Ver detalles de Redis
az redis show -g rg-alumni-portal -n redis-alumni-dev-XXXXX

# Obtener claves de acceso
az redis list-keys -g rg-alumni-portal -n redis-alumni-dev-XXXXX

# Regenerar claves (BE CAREFUL!)
az redis-enterprise cache update-access-keys -g rg-alumni-portal `
  -n redis-alumni-dev-XXXXX --key-type primary
```

### Container Registry
```powershell
# Listar imágenes en ACR
az acr repository list -g rg-alumni-portal -n acralumnidev12345

# Ver tags de imagen
az acr repository show-tags -g rg-alumni-portal `
  -n acralumnidev12345 -r alumni-api

# Eliminar imagen
az acr repository delete -g rg-alumni-portal `
  -n acralumnidev12345 -r alumni-api --tag old-tag

# Obtener credenciales de ACR
az acr credential show -g rg-alumni-portal -n acralumnidev12345
```

### Static Web Apps
```powershell
# Ver detalles del Static Web App
az staticwebapp show -g rg-alumni-portal -n swa-alumni-dev-XXXXX

# Ver URL del sitio
az staticwebapp show -g rg-alumni-portal -n swa-alumni-dev-XXXXX `
  --query properties.defaultHostname

# Ver entornos (staging, producción)
az staticwebapp environment list -g rg-alumni-portal -n swa-alumni-dev-XXXXX

# Desplegar archivos estáticos
az staticwebapp upload --name swa-alumni-dev-XXXXX `
  --source ./FrontendAlumni/dist
```

---

## 🔧 Troubleshooting Rápido

### App Service no inicia
```powershell
# Ver último error
az webapp log tail -g rg-alumni-portal -n app-alumni-api-dev-XXXXX --provider application -f

# Verificar que la imagen existe en ACR
az acr repository show -g rg-alumni-portal -n acralumnidev12345 -r alumni-api

# Reiniciar
az webapp restart -g rg-alumni-portal -n app-alumni-api-dev-XXXXX
```

### No hay conexión a PostgreSQL
```powershell
# Verificar firewall rules
az postgres flexible-server firewall-rule list -g rg-alumni-portal -n psql-alumni-dev-XXXXX

# Agregar IP actual (obtener IP primero)
# whoami.lol te dice tu IP pública
$myIp = (Invoke-WebRequest ifconfig.co -UseBasicParsing).Content.Trim()
az postgres flexible-server firewall-rule create -g rg-alumni-portal `
  -n psql-alumni-dev-XXXXX -r MyIP `
  --start-ip-address $myIp --end-ip-address $myIp

# Verificar cadena de conexión en App Service
az webapp config appsettings show -g rg-alumni-portal -n app-alumni-api-dev-XXXXX `
  | grep -i database
```

### No hay conexión a Redis
```powershell
# Ver estado de Redis
az redis show -g rg-alumni-portal -n redis-alumni-dev-XXXXX `
  --query provisioningState

# Obtener información de conexión
$redis = az redis show -g rg-alumni-portal -n redis-alumni-dev-XXXXX
$redis | grep -E "hostName|port" 

# Verificar contraseña
az redis list-keys -g rg-alumni-portal -n redis-alumni-dev-XXXXX
```

---

## 📊 Scaling y Performance

### Aumentar instancias de App Service
```powershell
# Cambiar a Standard plan con 2 instancias
az appservice plan update -g rg-alumni-portal -n plan-alumni-dev `
  --sku S1 --number-of-workers 2
```

### Aumentar capacidad de Redis
```powershell
# Cambiar de Basic (250MB) a Standard (1GB)
az redis update -g rg-alumni-portal -n redis-alumni-dev-XXXXX `
  --sku-capacity 1
```

### Aumentar almacenamiento PostgreSQL
```powershell
# NOTA: PostgreSQL no permite cambiar almacenamiento directamente
# Se necesita hacer un export/import o crear nuevo servidor
```

---

## 🗑️ Limpieza

### Eliminar todo el resource group
```powershell
# ¡CUIDADO! Esto elimina TODO incluyendo datos
az group delete -n rg-alumni-portal --yes --no-wait
```

### Eliminar recursos individuales
```powershell
# Eliminar App Service (pero no el plan)
az webapp delete -g rg-alumni-portal -n app-alumni-api-dev-XXXXX

# Eliminar ACR
az acr delete -g rg-alumni-portal -n acralumnidev12345 --yes

# Eliminar PostgreSQL
az postgres flexible-server delete -g rg-alumni-portal `
  -n psql-alumni-dev-XXXXX --yes

# Eliminar Redis
az redis delete -g rg-alumni-portal -n redis-alumni-dev-XXXXX --yes
```

---

## 🔐 Seguridad

### Obtener información sensible de forma segura
```powershell
# Obtener contraseñas (no se mostrarán en pantalla)
$pgPassword = az postgres flexible-server show ` 
  -g rg-alumni-portal -n psql-alumni-dev-XXXXX `
  --query administratorLoginPassword -o tsv

$redisKey = az redis list-keys -g rg-alumni-portal `
  -n redis-alumni-dev-XXXXX --query primaryKey -o tsv
```

### Habilitar HTTPS en App Service
```powershell
# Obtener certificado SSL gratuito (automático en Azure)
az webapp update -g rg-alumni-portal -n app-alumni-api-dev-XXXXX `
  --https-only true
```

### Configurar Access Control (firewalls)
```powershell
# Permitir solo tráfico desde Azure
az postgres flexible-server firewall-rule create -g rg-alumni-portal `
  -n psql-alumni-dev-XXXXX -r AllowAzureServices `
  --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0
```

---

## 📈 Monitoreo y Alertas

### Crear Application Insights
```powershell
az monitor app-insights component create --app alumni-insights `
  --location eastus -g rg-alumni-portal --application-type web `
  --kind web

# Obtener Instrumentation Key
$insKey = az monitor app-insights component show --app alumni-insights `
  -g rg-alumni-portal --query instrumentationKey -o tsv

# Agregar a App Service
az webapp config appsettings set -g rg-alumni-portal `
  -n app-alumni-api-dev-XXXXX `
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$insKey"
```

### Ver métricas
```powershell
# Solicitudes HTTP por minuto (últimos 60 minutos)
az monitor metrics list -g rg-alumni-portal `
  --resource app-alumni-api-dev-XXXXX --resource-type "Microsoft.Web/sites" `
  --metric "Requests" --interval PT1M --start-time $(Get-Date).AddHours(-1)
```

---

## 🌐 Dominios y SSL

### Agregar dominio personalizado
```powershell
# Para Static Web App
az staticwebapp custom-domain set -g rg-alumni-portal `
  -n swa-alumni-dev-XXXXX --domain-name alumni.tudominio.com `
  --validation-type cname

# Para App Service
az webapp config hostname add -g rg-alumni-portal `
  -n app-alumni-api-dev-XXXXX --hostname api.alumni.tudominio.com
```

---

## 📝 Variables de Entorno Comunes

```
# Base de Datos
DATABASE_URL=postgresql://user:pass@host:5432/db
POSTGRES_HOST=host
POSTGRES_PORT=5432
POSTGRES_USER=user
POSTGRES_PASSWORD=pass
POSTGRES_DB=alumni_db

# Redis
REDIS_HOST=host
REDIS_PORT=6379
REDIS_PASSWORD=pass
REDIS_URL=redis://:pass@host:6379/0

# Aplicación
DEBUG=False
ENVIRONMENT=production
ALLOWED_HOSTS=*.azurewebsites.net
SECRET_KEY=your-secret-key

# Frontend
VITE_API_URL=https://api.alumni.tudominio.com
VITE_CONTENT_API_URL=https://content-api.alumni.tudominio.com
```

---

## 🔗 Enlaces Útiles

- [Documentación Bicep](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)
- [Azure CLI Reference](https://learn.microsoft.com/cli/azure/reference-index)
- [App Service Linux Containers](https://learn.microsoft.com/azure/app-service/overview-hosting-plans)
- [PostgreSQL Flexible Server](https://learn.microsoft.com/azure/postgresql/flexible-server/)
- [Azure Cache for Redis](https://learn.microsoft.com/azure/azure-cache-for-redis/)
- [Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/)

---

## 💡 Tips and Tricks

1. **Ahorrar costos en dev**: Usar B1 plan, Basic Redis, Basic ACR
2. **Debugging rápido**: `az webapp log tail` con flag `-f` para tiempo real
3. **Backup antes de cambios**: `az group export -n <rg> -o json > backup.json`
4. **Automatizar depliegues**: Usar GitHub Actions con credenciales Azure
5. **Monitoreo**: Habilitar Application Insights desde el inicio
6. **Variables sensibles**: Usar Key Vault para contraseñas y secretos
7. **Deployments**: Nombrar con timestamp para tracking: `deploy-$(date +%s).txt`

---

**Última actualización:** 2026-03-12
