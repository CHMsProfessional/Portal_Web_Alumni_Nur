import json
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import serializers, viewsets, status
from rest_framework.response import Response

from Content.models import MensajeComunidad, Comunidad
from Content.auth import JWTAuthentication
from Content.permissions.Allowed import Allowed
from Content.permissions.is_admin import isAdmin
from Content.permissions.permission_mixin import PermissionPolicyMixin


class MensajeComunidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = MensajeComunidad
        fields = "__all__"
        read_only_fields = ["fecha_envio", "autor_id"]

    def validate(self, attrs):
        contenido = (attrs.get("contenido") or "").strip()
        archivo = attrs.get("archivo")
        imagen = attrs.get("imagen")

        if not contenido and not archivo and not imagen:
            raise serializers.ValidationError(
                "Debe enviar contenido, un archivo o una imagen."
            )

        return attrs


class MensajeComunidadViewSet(PermissionPolicyMixin, viewsets.ModelViewSet):
    queryset = MensajeComunidad.objects.all().order_by("fecha_envio")
    serializer_class = MensajeComunidadSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes_per_method = {
        "create": [Allowed],
        "update": [isAdmin],
        "partial_update": [isAdmin],
        "destroy": [isAdmin],
        "list": [Allowed],
        "retrieve": [Allowed],
    }

    def get_authenticators(self):
        action = getattr(self, "action", None)

        if action in ["list", "retrieve"]:
            return []

        if action is None:
            if self.request.method == "GET":
                lookup_url_kwarg = getattr(self, "lookup_url_kwarg", None) or self.lookup_field
                if self.kwargs.get(lookup_url_kwarg) is None:
                    return []
                return []

        return [auth() for auth in self.authentication_classes]

    def get_queryset(self):
        queryset = MensajeComunidad.objects.all().order_by("fecha_envio")
        comunidad_id = self.request.query_params.get("comunidad")

        if comunidad_id and comunidad_id.isdigit():
            queryset = queryset.filter(comunidad_id=int(comunidad_id))

        return queryset

    def _usuario_pertenece_a_comunidad(self, user_id: int, comunidad: Comunidad) -> bool:
        return user_id in (comunidad.usuarios or [])

    def _emitir_mensaje_ws(self, mensaje: MensajeComunidad):
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        payload = {
            "id": mensaje.id,
            "autor_id": mensaje.autor_id,
            "contenido": mensaje.contenido,
            "fecha_envio": mensaje.fecha_envio.isoformat(),
            "comunidad": mensaje.comunidad_id,
            "archivo": mensaje.archivo.url if mensaje.archivo else None,
            "imagen": mensaje.imagen.url if mensaje.imagen else None,
        }

        async_to_sync(channel_layer.group_send)(
            f"comunidad_{mensaje.comunidad_id}",
            {
                "type": "chat.message",
                "mensaje": payload,
            },
        )

    def create(self, request, *args, **kwargs):
        if not hasattr(request.user, "id") or not request.user.id:
            return Response(
                {"detail": "Usuario no autenticado."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = request.data.copy()
        data["autor_id"] = request.user.id

        comunidad_id = data.get("comunidad")
        if not comunidad_id:
            return Response(
                {"comunidad": ["Este campo es obligatorio."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            comunidad = Comunidad.objects.get(id=int(comunidad_id))
        except (Comunidad.DoesNotExist, ValueError, TypeError):
            return Response(
                {"comunidad": ["La comunidad indicada no existe."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not self._usuario_pertenece_a_comunidad(request.user.id, comunidad):
            return Response(
                {"detail": "No perteneces a esta comunidad."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        mensaje = serializer.save(autor_id=request.user.id)

        self._emitir_mensaje_ws(mensaje)

        output = self.get_serializer(mensaje)
        return Response(output.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save()