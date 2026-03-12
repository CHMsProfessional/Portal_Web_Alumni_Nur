import json
import logging

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from Content.auth.JWTWebSocketMiddleware import JWTWebSocketMiddleware
from Content.models import (
    Comunidad,
    MensajeComunidad,
    ConversacionComunidad,
    MensajeConversacion,
)

logger = logging.getLogger(__name__)


def _safe_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


class BaseChatConsumer(AsyncWebsocketConsumer):
    resource_name = "resource"

    CLOSE_CODE_UNAUTHENTICATED = 4001
    CLOSE_CODE_FORBIDDEN = 4003
    CLOSE_CODE_NOT_FOUND = 4004
    CLOSE_CODE_EXPIRED = 4008

    def _resolve_auth_close_code(self):
        auth_status = self.scope.get("auth_status")

        if auth_status == JWTWebSocketMiddleware.AUTH_STATUS_EXPIRED:
            return self.CLOSE_CODE_EXPIRED

        if auth_status in {
            JWTWebSocketMiddleware.AUTH_STATUS_INVALID,
            JWTWebSocketMiddleware.AUTH_STATUS_INVALID_USER,
        }:
            return self.CLOSE_CODE_UNAUTHENTICATED

        if auth_status == JWTWebSocketMiddleware.AUTH_STATUS_MISSING:
            return self.CLOSE_CODE_UNAUTHENTICATED

        return self.CLOSE_CODE_UNAUTHENTICATED

    async def reject_by_auth_status(self, context: str):
        auth_status = self.scope.get("auth_status")
        auth_error = self.scope.get("auth_error")

        logger.warning(
            "%s rechazado por auth_status=%s auth_error=%s",
            context,
            auth_status,
            auth_error,
        )
        await self.close(code=self._resolve_auth_close_code())

    async def send_error(self, detail: str, code: str | None = None):
        payload = {
            "type": "error",
            "detail": detail,
        }
        if code:
            payload["code"] = code

        await self.send(text_data=json.dumps(payload))

    async def send_typing_event(self, group_name: str, user_id: int | None):
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "chat.typing",
                "user_id": user_id,
            },
        )

    async def chat_typing(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "escribiendo",
                    "user_id": event.get("user_id"),
                }
            )
        )

    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "mensaje",
                    "mensaje": event.get("mensaje"),
                }
            )
        )

    async def chat_status(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "estado_conversacion",
                    "estado": event.get("estado"),
                    "detail": event.get("detail"),
                }
            )
        )


class ComunidadChatConsumer(BaseChatConsumer):
    """
    Consumer legacy: mantiene compatibilidad mientras migramos el frontend
    al nuevo flujo por conversación.
    """

    async def connect(self):
        self.comunidad_id = _safe_int(self.scope["url_route"]["kwargs"].get("comunidad_id"))
        self.group_name = f"comunidad_{self.comunidad_id}"
        self.user = self.scope.get("user")

        if self.comunidad_id is None:
            logger.warning("WebSocket legacy rechazado: comunidad_id inválido")
            await self.close(code=self.CLOSE_CODE_NOT_FOUND)
            return

        if self.scope.get("auth_status") != JWTWebSocketMiddleware.AUTH_STATUS_OK:
            await self.reject_by_auth_status("WebSocket legacy")
            return

        if not self.user or not getattr(self.user, "is_authenticated", False):
            logger.warning("WebSocket legacy rechazado: usuario no autenticado")
            await self.close(code=self.CLOSE_CODE_UNAUTHENTICATED)
            return

        user_id = _safe_int(getattr(self.user, "id", None))
        if user_id is None:
            logger.warning("WebSocket legacy rechazado: user_id inválido")
            await self.close(code=self.CLOSE_CODE_UNAUTHENTICATED)
            return

        pertenece = await self.usuario_pertenece_a_comunidad(user_id, self.comunidad_id)
        if not pertenece:
            logger.warning(
                "WebSocket legacy rechazado: user_id=%s no pertenece a comunidad=%s",
                user_id,
                self.comunidad_id,
            )
            await self.close(code=self.CLOSE_CODE_FORBIDDEN)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        logger.info("Conectado legacy user_id=%s a grupo=%s", user_id, self.group_name)

    async def disconnect(self, close_code):
        group_name = getattr(self, "group_name", None)
        if group_name:
            await self.channel_layer.group_discard(group_name, self.channel_name)

        logger.info(
            "Desconectado legacy user_id=%s de grupo=%s code=%s",
            getattr(self.user, "id", None),
            getattr(self, "group_name", None),
            close_code,
        )

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            logger.warning("Mensaje vacío recibido en comunidad legacy=%s", self.comunidad_id)
            return

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            logger.warning("JSON inválido recibido en comunidad legacy=%s", self.comunidad_id)
            await self.send_error("JSON inválido", code="INVALID_JSON")
            return

        event_type = data.get("type")

        if event_type == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))
            return

        if event_type == "escribiendo":
            await self.send_typing_event(
                self.group_name,
                _safe_int(getattr(self.user, "id", None)),
            )
            return

        mensaje = (data.get("mensaje") or "").strip()
        if not mensaje:
            await self.send_error("El mensaje no puede estar vacío", code="EMPTY_MESSAGE")
            return

        user_id = _safe_int(getattr(self.user, "id", None))
        if user_id is None:
            await self.send_error("Usuario inválido", code="INVALID_USER")
            return

        mensaje_obj = await self.save_mensaje(
            comunidad_id=self.comunidad_id,
            autor_id=user_id,
            contenido=mensaje,
        )

        payload = {
            "id": mensaje_obj.id,
            "autor_id": mensaje_obj.autor_id,
            "contenido": mensaje_obj.contenido,
            "fecha_envio": mensaje_obj.fecha_envio.isoformat(),
            "comunidad": mensaje_obj.comunidad_id,
            "archivo": mensaje_obj.archivo.url if mensaje_obj.archivo else None,
            "imagen": mensaje_obj.imagen.url if mensaje_obj.imagen else None,
        }

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.message",
                "mensaje": payload,
            },
        )

    @sync_to_async
    def usuario_pertenece_a_comunidad(self, user_id, comunidad_id):
        comunidad = Comunidad.objects.filter(
            id=comunidad_id,
            activo=True,
        ).first()

        if not comunidad:
            return False

        return comunidad.tiene_usuario(user_id)

    @sync_to_async
    def save_mensaje(self, comunidad_id, autor_id, contenido):
        return MensajeComunidad.objects.create(
            comunidad_id=comunidad_id,
            autor_id=autor_id,
            contenido=contenido,
        )


class ConversacionChatConsumer(BaseChatConsumer):
    """
    Consumer nuevo: el chat real vive en una conversación específica.
    Mantenerlo en paralelo al legacy permite migración gradual del frontend.
    """

    async def connect(self):
        self.conversacion_id = _safe_int(self.scope["url_route"]["kwargs"].get("conversacion_id"))
        self.group_name = f"conversacion_{self.conversacion_id}"
        self.user = self.scope.get("user")

        if self.conversacion_id is None:
            logger.warning("WebSocket conversación rechazado: conversacion_id inválido")
            await self.close(code=self.CLOSE_CODE_NOT_FOUND)
            return

        if self.scope.get("auth_status") != JWTWebSocketMiddleware.AUTH_STATUS_OK:
            await self.reject_by_auth_status("WebSocket conversación")
            return

        if not self.user or not getattr(self.user, "is_authenticated", False):
            logger.warning("WebSocket conversación rechazado: usuario no autenticado")
            await self.close(code=self.CLOSE_CODE_UNAUTHENTICATED)
            return

        user_id = _safe_int(getattr(self.user, "id", None))
        if user_id is None:
            logger.warning("WebSocket conversación rechazado: user_id inválido")
            await self.close(code=self.CLOSE_CODE_UNAUTHENTICATED)
            return

        conversacion = await self.get_conversacion(self.conversacion_id)
        if conversacion is None:
            logger.warning(
                "WebSocket conversación rechazado: conversacion_id=%s no existe",
                self.conversacion_id,
            )
            await self.close(code=self.CLOSE_CODE_NOT_FOUND)
            return

        self.comunidad_id = conversacion["comunidad_id"]
        self.estado_conversacion = conversacion["estado"]
        self.conversacion_activa = conversacion["activa"]

        pertenece = await self.usuario_pertenece_a_conversacion(user_id, self.conversacion_id)
        if not pertenece:
            logger.warning(
                "WebSocket conversación rechazado: user_id=%s no pertenece a conversacion=%s comunidad_id=%s usuarios=%s activa=%s estado=%s",
                user_id,
                self.conversacion_id,
                conversacion["comunidad_id"],
                conversacion["comunidad_usuarios"],
                conversacion["activa"],
                conversacion["estado"],
            )
            await self.close(code=self.CLOSE_CODE_FORBIDDEN)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        logger.info(
            "Conectado conversación user_id=%s a grupo=%s comunidad_id=%s",
            user_id,
            self.group_name,
            self.comunidad_id,
        )

    async def disconnect(self, close_code):
        group_name = getattr(self, "group_name", None)
        if group_name:
            await self.channel_layer.group_discard(group_name, self.channel_name)

        logger.info(
            "Desconectado conversación user_id=%s de grupo=%s code=%s",
            getattr(self.user, "id", None),
            getattr(self, "group_name", None),
            close_code,
        )

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            logger.warning("Mensaje vacío recibido en conversacion=%s", self.conversacion_id)
            return

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            logger.warning("JSON inválido recibido en conversacion=%s", self.conversacion_id)
            await self.send_error("JSON inválido", code="INVALID_JSON")
            return

        event_type = data.get("type")
        user_id = _safe_int(getattr(self.user, "id", None))

        if event_type == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))
            return

        if event_type == "escribiendo":
            if user_id is None:
                await self.send_error("Usuario inválido", code="INVALID_USER")
                return

            puede_escribir = await self.usuario_puede_escribir_en_conversacion(
                user_id,
                self.conversacion_id,
            )
            if not puede_escribir:
                await self.send_error(
                    "No tienes permisos para escribir en esta conversación.",
                    code="WRITE_FORBIDDEN",
                )
                return

            await self.send_typing_event(self.group_name, user_id)
            return

        mensaje = (data.get("mensaje") or "").strip()
        if not mensaje:
            await self.send_error("El mensaje no puede estar vacío", code="EMPTY_MESSAGE")
            return

        if user_id is None:
            await self.send_error("Usuario inválido", code="INVALID_USER")
            return

        puede_escribir = await self.usuario_puede_escribir_en_conversacion(
            user_id,
            self.conversacion_id,
        )
        if not puede_escribir:
            conversacion = await self.get_conversacion(self.conversacion_id)

            if conversacion and (
                conversacion["estado"] == ConversacionComunidad.EstadoConversacion.CERRADA
                or not conversacion["activa"]
            ):
                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "estado_conversacion",
                            "estado": conversacion["estado"],
                            "detail": "La conversación está cerrada y no admite nuevos mensajes.",
                        }
                    )
                )
                return

            await self.send_error(
                "No tienes permisos para escribir en esta conversación.",
                code="WRITE_FORBIDDEN",
            )
            return

        mensaje_obj = await self.save_mensaje_conversacion(
            conversacion_id=self.conversacion_id,
            autor_id=user_id,
            contenido=mensaje,
        )

        payload = {
            "id": mensaje_obj["id"],
            "conversacion": mensaje_obj["conversacion_id"],
            "autor_id": mensaje_obj["autor_id"],
            "contenido": mensaje_obj["contenido"],
            "fecha_envio": mensaje_obj["fecha_envio"],
            "fecha_actualizacion": mensaje_obj["fecha_actualizacion"],
            "estado": mensaje_obj["estado"],
            "editado": mensaje_obj["editado"],
            "archivo": mensaje_obj["archivo"],
            "imagen": mensaje_obj["imagen"],
        }

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.message",
                "mensaje": payload,
            },
        )

    @sync_to_async
    def get_conversacion(self, conversacion_id):
        conversacion = (
            ConversacionComunidad.objects.select_related("comunidad")
            .filter(id=conversacion_id)
            .first()
        )
        if not conversacion:
            return None

        return {
            "id": conversacion.id,
            "comunidad_id": conversacion.comunidad_id,
            "estado": conversacion.estado,
            "activa": conversacion.activa,
            "comunidad_usuarios": list(conversacion.comunidad.usuarios or []),
            "comunidad_activa": conversacion.comunidad.activo,
        }

    @sync_to_async
    def usuario_pertenece_a_conversacion(self, user_id, conversacion_id):
        conversacion = (
            ConversacionComunidad.objects.select_related("comunidad")
            .filter(id=conversacion_id)
            .first()
        )
        if not conversacion:
            return False

        if not conversacion.activa:
            return False

        if not conversacion.comunidad or not conversacion.comunidad.activo:
            return False

        pertenece = conversacion.comunidad.tiene_usuario(user_id)

        logger.info(
            "Validación membresía conversación: conversacion_id=%s user_id=%s comunidad_id=%s usuarios=%s pertenece=%s",
            conversacion_id,
            user_id,
            conversacion.comunidad_id,
            conversacion.comunidad.usuarios,
            pertenece,
        )

        return pertenece

    @sync_to_async
    def usuario_puede_escribir_en_conversacion(self, user_id, conversacion_id):
        conversacion = (
            ConversacionComunidad.objects.select_related("comunidad")
            .filter(id=conversacion_id)
            .first()
        )
        if not conversacion:
            return False

        if not conversacion.activa:
            return False

        if conversacion.estado != ConversacionComunidad.EstadoConversacion.ABIERTA:
            return False

        return conversacion.comunidad.tiene_usuario(user_id) and conversacion.comunidad.activo

    @sync_to_async
    def save_mensaje_conversacion(self, conversacion_id, autor_id, contenido):
        mensaje = MensajeConversacion.objects.create(
            conversacion_id=conversacion_id,
            autor_id=autor_id,
            contenido=contenido,
        )

        ConversacionComunidad.objects.filter(id=conversacion_id).update(
            ultimo_mensaje_at=mensaje.fecha_envio
        )

        return {
            "id": mensaje.id,
            "conversacion_id": mensaje.conversacion_id,
            "autor_id": mensaje.autor_id,
            "contenido": mensaje.contenido,
            "fecha_envio": mensaje.fecha_envio.isoformat(),
            "fecha_actualizacion": mensaje.fecha_actualizacion.isoformat(),
            "estado": mensaje.estado,
            "editado": mensaje.editado,
            "archivo": mensaje.archivo.url if mensaje.archivo else None,
            "imagen": mensaje.imagen.url if mensaje.imagen else None,
        }