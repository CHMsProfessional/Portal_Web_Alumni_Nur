import os
import django

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from django.conf import settings
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ContenidoAlumniApi.settings")
django.setup()

import Content.routing
from Content.auth import JWTWebSocketMiddleware

allowed_websocket_origins = list(getattr(settings, "CORS_ALLOWED_ORIGINS", []))

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": OriginValidator(
        JWTWebSocketMiddleware(
            URLRouter(Content.routing.websocket_urlpatterns)
        ),
        allowed_websocket_origins,
    ),
})