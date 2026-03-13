# Configuración de Django para Azure

## 📝 settings.py - Cambios Necesarios para Azure

```python
# settings.py

# ============================================================================
# CAMBIOS PARA ENTORNO AZURE
# ============================================================================

import os
from pathlib import Path
from urllib.parse import urlparse

# Detectar ambiente
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
IS_AZURE = os.getenv('WEBSITE_INSTANCE_ID') is not None  # Azure App Service
IS_PRODUCTION = ENVIRONMENT in ['production', 'prod']

# ============================================================================
# SEGURIDAD - Actualizar para Azure
# ============================================================================

# 1. SECRET_KEY - IMPORTANTE: Usar variable de entorno en producción
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'DEV-INSECURE-KEY-CHANGE-IN-PRODUCTION')

# 2. DEBUG - Debe ser False en producción
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

# 3. ALLOWED_HOSTS - Actualizar para Azure
ALLOWED_HOSTS = os.getenv(
    'ALLOWED_HOSTS',
    'localhost,127.0.0.1'
).split(',')

# En Azure, permitir dominios Azure App Service
ALLOWED_HOSTS.extend([
    '*.azurewebsites.net',
    '*.azureedge.net',
])

# 4. CORS
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://localhost:3000'
).split(',')

# HTTPS
SECURE_SSL_REDIRECT = IS_PRODUCTION
SESSION_COOKIE_SECURE = IS_PRODUCTION
CSRF_COOKIE_SECURE = IS_PRODUCTION

# ============================================================================
# DATABASE - Configuración PostgreSQL Flexible Server
# ============================================================================

# Opción 1: Usar DATABASE_URL (recomendado)
DATABASE_URL = os.getenv('DATABASE_URL', '')

if DATABASE_URL:
    # Usar dj-database-url para parsear
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Opción 2: Usar variables individuales (fallback)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB', 'alumni_db'),
            'USER': os.getenv('POSTGRES_USER', 'adminuser'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD', ''),
            'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
            'PORT': os.getenv('POSTGRES_PORT', '5432'),
            'CONN_MAX_AGE': 600,
            'ATOMIC_REQUESTS': True,
            # Opciones para Azure PostgreSQL Flexible Server
            'OPTIONS': {
                'sslmode': 'require' if IS_PRODUCTION else 'prefer',
                'application_name': 'alumni_api',
            }
        }
    }

# ============================================================================
# CACHE (Redis) - Configuración Azure Cache for Redis
# ============================================================================

CACHE_LOCATION = os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1')

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': CACHE_LOCATION,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'ssl_cert_reqs': 'required' if IS_PRODUCTION else 'none',
                'ssl_ca_certs': '/etc/ssl/certs/ca-certificates.crt',
            },
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'IGNORE_EXCEPTIONS': True,  # No fallar si Redis no está disponible
        }
    }
}

# Session usando Redis
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 86400 * 7  # 7 días

# ============================================================================
# LOGGING - Para Azure Monitor/Application Insights
# ============================================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json' if IS_PRODUCTION else 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.getenv('LOG_LEVEL', 'INFO' if IS_PRODUCTION else 'DEBUG'),
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
    },
}

# ============================================================================
# STATIC FILES - Para Azure App Service
# ============================================================================

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# En Azure, collect static files antes de desplegar
# python manage.py collectstatic --noinput

STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'

# ============================================================================
# MEDIA FILES - Para almacenamiento persistente
# ============================================================================

# Opción 1: Usar filesystem (temporary, se pierde al reiniciar)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Opción 2: Usar Azure Blob Storage (recomendado para producción)
# Ver instrucciones en comentario abajo

# ============================================================================
# INSTALLED_APPS - Agregar para Azure
# ============================================================================

INSTALLED_APPS = [
    # Django apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party
    'rest_framework',
    'corsheaders',
    'django_redis',
    'django_extensions',
    
    # Local apps
    # 'your_app',
]

# ============================================================================
# MIDDLEWARE
# ============================================================================

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # CORS debe estar cerca del inicio
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ============================================================================
# AZURE-SPECIFIC CONFIGURATION
# ============================================================================

# 1. App Service HTTP Logging
if IS_AZURE:
    # Logs se guardan en /home/LogFiles/
    LOG_ROOT = '/home/LogFiles/'
    os.makedirs(LOG_ROOT, exist_ok=True)

# 2. Azure App Service Health Check
# Health check endpoint
HEALTHCHECK_URL = os.getenv('HEALTHCHECK_URL', '/health/')

# 3. Azure App Service Warm-up
WARMUP_PATHS = ['/health/', '/api/']

# ============================================================================
# PERFORMANCE OPTIMIZATIONS FOR AZURE
# ============================================================================

# Connection pooling
CONN_MAX_AGE = 600

# Compress HTTP responses
MIDDLEWARE.append('django.middleware.gzip.GZipMiddleware')

# Cache templates
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
            'loaders': [
                ('django.template.loaders.cached.Loader', [
                    'django.template.loaders.filesystem.Loader',
                    'django.template.loaders.app_directories.Loader',
                ]),
            ] if IS_PRODUCTION else None,
        },
    },
]

# ============================================================================
# REST FRAMEWORK CONFIGURATION
# ============================================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    }
}

# ============================================================================
# WSGI CONFIGURATION para Azure App Service
# ============================================================================

# El archivo wsgi.py debe estar configurado correctamente
# Ver ejemplo en wsgi.py.example.md
```

## 🔧 requirements.txt - Dependencias Necesarias

```txt
# Core
Django==4.2.x
djangorestframework==3.14.x
django-cors-headers==4.3.x

# Database
psycopg2-binary==2.9.x
dj-database-url==2.1.x

# Cache/Redis
django-redis==5.4.x
redis==5.0.x

# Utilities
python-dotenv==1.0.x
django-extensions==3.2.x
python-json-logger==2.0.x

# Logging and Monitoring
# (Application Insights se configura vía variables de entorno)

# CORS
django-cors-headers==4.3.x

# Optional: Blob Storage (para media files en producción)
# azure-storage-blob==12.x.x
```

## 📋 Health Check Endpoint - Agregar a urls.py

```python
# health_check/views.py

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.core.cache import cache
from django.db import connection

@require_http_methods(["GET"])
def health_check(request):
    """Health check endpoint para Azure App Service"""
    try:
        # Verificar base de datos
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    try:
        # Verificar Redis
        cache.set('health_check', '1', 10)
        cache_status = "ok" if cache.get('health_check') == '1' else "error"
    except Exception as e:
        cache_status = f"error: {str(e)}"
    
    overall_status = "healthy" if db_status == "ok" and cache_status == "ok" else "degraded"
    
    return JsonResponse({
        "status": overall_status,
        "database": db_status,
        "cache": cache_status,
    })

# urls.py
urlpatterns = [
    path('health/', views.health_check, name='health-check'),
    # ... more endpoints
]
```

## 🚀 Gunicorn Configuration para Azure

Crear archivo `gunicorn_config.py`:

```python
# gunicorn_config.py

import os
import multiprocessing

# Workers
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'sync'
worker_connections = 1000

# Server
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
backlog = 2048

# Timeouts
timeout = 120
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = '-'
errorlog = '-'
loglevel = os.getenv('GUNICORN_LOG_LEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# App
max_requests = 1000
max_requests_jitter = 100
preload_app = True
```

## 📊 .az/static/profile.json - Configuración Azure CLI

```json
{
  "defaults": {
    "group": "rg-alumni-portal",
    "location": "eastus",
    "output": "json"
  },
  "cloud": {
    "name": "AzureCloud"
  }
}
```

## 🔒 Secretos en Azure Key Vault

Para producción, usar Key Vault:

```python
# settings.py - Integración con Key Vault

from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

if IS_PRODUCTION:
    key_vault_url = os.getenv("KEY_VAULT_URL")
    if key_vault_url:
        credential = DefaultAzureCredential()
        client = SecretClient(vault_url=key_vault_url, credential=credential)
        
        SECRET_KEY = client.get_secret("DjangoSecretKey").value
        DB_PASSWORD = client.get_secret("PostgresqlPassword").value
        # ... más secretos
```

---

**Nota:** Actualiza todos los valores `x.x` con las versiones actuales de los paquetes.
