from django.urls import path

from Content.consumers import ComunidadChatConsumer, ConversacionChatConsumer


websocket_urlpatterns = [
    path("ws/comunidad/<int:comunidad_id>/", ComunidadChatConsumer.as_asgi()),
    path("ws/conversacion/<int:conversacion_id>/", ConversacionChatConsumer.as_asgi()),
]