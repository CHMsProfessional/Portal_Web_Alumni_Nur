from django.utils import timezone
from rest_framework import serializers, viewsets, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from Content.models import MensajeConversacion, ConversacionComunidad
from Content.auth import JWTAuthentication
from Content.permissions.Allowed import Allowed
from Content.permissions.is_admin import isAdmin
from Content.permissions.permission_mixin import PermissionPolicyMixin


class MensajeConversacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MensajeConversacion
        fields = [
            "id",
            "conversacion",
            "autor_id",
            "contenido",
            "archivo",
            "imagen",
            "estado",
            "fecha_envio",
            "fecha_actualizacion",
            "editado",
        ]
        read_only_fields = [
            "autor_id",
            "fecha_envio",
            "fecha_actualizacion",
            "editado",
        ]

    def _get_request_user_id(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        user_id = getattr(user, "id", None)
        try:
            return int(user_id)
        except (TypeError, ValueError):
            return None

    def _is_admin(self):
        request = self.context.get("request")
        if not request:
            return False

        user = getattr(request, "user", None)
        auth = getattr(request, "auth", None)

        if user and getattr(user, "is_authenticated", False) and getattr(user, "is_admin", False):
            return True

        if isinstance(auth, dict):
            return bool(auth.get("is_admin", False))

        return False

    def validate_conversacion(self, value):
        if not value.activa:
            raise serializers.ValidationError("No se puede enviar mensajes a una conversación inactiva.")
        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        conversacion = attrs.get("conversacion", getattr(instance, "conversacion", None))
        contenido = (attrs.get("contenido", getattr(instance, "contenido", "")) or "").strip()
        archivo = attrs.get("archivo", getattr(instance, "archivo", None))
        imagen = attrs.get("imagen", getattr(instance, "imagen", None))

        if not contenido and not archivo and not imagen:
            raise serializers.ValidationError(
                "Debe enviar contenido, un archivo o una imagen."
            )

        if conversacion is None:
            raise serializers.ValidationError({
                "conversacion": "La conversación es obligatoria."
            })

        user_id = self._get_request_user_id()

        if instance is None:
            if user_id is None:
                raise serializers.ValidationError("No se pudo determinar el usuario autenticado.")

            if not conversacion.comunidad.tiene_usuario(user_id):
                raise serializers.ValidationError({
                    "conversacion": "Solo los miembros de la comunidad pueden enviar mensajes."
                })

            if not conversacion.esta_abierta():
                raise serializers.ValidationError({
                    "conversacion": "La conversación está cerrada y no admite nuevos mensajes."
                })

        else:
            if not self._is_admin() and user_id != instance.autor_id:
                raise serializers.ValidationError(
                    "No tienes permisos para modificar este mensaje."
                )

        return attrs


class MensajeConversacionViewSet(PermissionPolicyMixin, viewsets.ModelViewSet):
    queryset = MensajeConversacion.objects.select_related(
        "conversacion",
        "conversacion__comunidad",
    ).all()
    serializer_class = MensajeConversacionSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    authentication_classes = [JWTAuthentication]
    permission_classes_per_method = {
        "create": [Allowed],
        "update": [Allowed],
        "partial_update": [Allowed],
        "destroy": [isAdmin],
        "list": [Allowed],
        "retrieve": [Allowed],
    }

    def get_authenticators(self):
        action = getattr(self, "action", None)

        if action in ["list", "retrieve"]:
            return []

        return [auth() for auth in self.authentication_classes]

    def get_queryset(self):
        queryset = MensajeConversacion.objects.select_related(
            "conversacion",
            "conversacion__comunidad",
        ).all()

        conversacion = self.request.query_params.get("conversacion")
        estado = self.request.query_params.get("estado")

        if conversacion and conversacion.isdigit():
            queryset = queryset.filter(conversacion_id=int(conversacion))

        if estado in [
            MensajeConversacion.EstadoMensaje.ACTIVO,
            MensajeConversacion.EstadoMensaje.ELIMINADO,
        ]:
            queryset = queryset.filter(estado=estado)

        return queryset.order_by("fecha_envio")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def _request_user_id(self):
        user_id = getattr(self.request.user, "id", None)
        try:
            return int(user_id)
        except (TypeError, ValueError):
            return None

    def _is_admin(self):
        user = getattr(self.request, "user", None)
        auth = getattr(self.request, "auth", None)

        if user and getattr(user, "is_authenticated", False) and getattr(user, "is_admin", False):
            return True

        if isinstance(auth, dict):
            return bool(auth.get("is_admin", False))

        return False

    def _puede_ver_mensaje(self, mensaje: MensajeConversacion) -> bool:
        user_id = self._request_user_id()
        if self._is_admin():
            return True
        if user_id is None:
            return False
        return mensaje.conversacion.comunidad.tiene_usuario(user_id)

    def _puede_editar_mensaje(self, mensaje: MensajeConversacion) -> bool:
        user_id = self._request_user_id()
        if self._is_admin():
            return True
        if user_id is None:
            return False
        return user_id == mensaje.autor_id

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        visible = []
        for mensaje in queryset:
            if self._puede_ver_mensaje(mensaje):
                visible.append(mensaje)

        serializer = self.get_serializer(visible, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        mensaje = self.get_object()

        if not self._puede_ver_mensaje(mensaje):
            return Response(
                {"detail": "No tienes permisos para ver este mensaje."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(mensaje)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        mensaje = serializer.save(
            autor_id=self._request_user_id()
        )

        conversacion = mensaje.conversacion
        conversacion.ultimo_mensaje_at = mensaje.fecha_envio
        conversacion.save(update_fields=["ultimo_mensaje_at", "fecha_actualizacion"])

        output = self.get_serializer(mensaje)
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        if not self._puede_editar_mensaje(instance):
            return Response(
                {"detail": "No tienes permisos para modificar este mensaje."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        mensaje = serializer.save(
            editado=True,
            fecha_actualizacion=timezone.now(),
        )

        output = self.get_serializer(mensaje)
        return Response(output.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if not self._is_admin():
            return Response(
                {"detail": "Solo un administrador puede eliminar mensajes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        instance.estado = MensajeConversacion.EstadoMensaje.ELIMINADO
        instance.editado = True
        instance.fecha_actualizacion = timezone.now()
        instance.save(update_fields=["estado", "editado", "fecha_actualizacion"])

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)