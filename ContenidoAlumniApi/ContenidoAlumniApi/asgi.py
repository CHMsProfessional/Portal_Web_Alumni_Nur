import os
import django

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ContenidoAlumniApi.settings")
django.setup()

import Content.routing
from Content.auth import JWTWebSocketMiddleware

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        JWTWebSocketMiddleware(
            URLRouter(Content.routing.websocket_urlpatterns)
        )
    ),
})