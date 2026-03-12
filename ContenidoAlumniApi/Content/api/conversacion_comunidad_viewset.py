from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from Content.models import Comunidad, ConversacionComunidad
from Content.auth import JWTAuthentication
from Content.permissions.Allowed import Allowed
from Content.permissions.is_admin import isAdmin
from Content.permissions.permission_mixin import PermissionPolicyMixin


class ConversacionComunidadSerializer(serializers.ModelSerializer):
    comunidad_nombre = serializers.CharField(source="comunidad.nombre", read_only=True)
    total_mensajes = serializers.SerializerMethodField()
    es_miembro_comunidad = serializers.SerializerMethodField()
    puede_escribir = serializers.SerializerMethodField()
    puede_cerrar = serializers.SerializerMethodField()
    puede_reabrir = serializers.SerializerMethodField()
    activa = serializers.BooleanField(required=False, default=True)
    estado = serializers.ChoiceField(
        choices=ConversacionComunidad.EstadoConversacion.choices,
        required=False,
        default=ConversacionComunidad.EstadoConversacion.ABIERTA,
    )

    class Meta:
        model = ConversacionComunidad
        fields = [
            "id",
            "comunidad",
            "comunidad_nombre",
            "titulo",
            "slug",
            "descripcion",
            "imagen",
            "creador_id",
            "estado",
            "activa",
            "fecha_creacion",
            "fecha_actualizacion",
            "fecha_cierre",
            "cerrado_por_id",
            "ultimo_mensaje_at",
            "total_mensajes",
            "es_miembro_comunidad",
            "puede_escribir",
            "puede_cerrar",
            "puede_reabrir",
        ]
        read_only_fields = [
            "slug",
            "creador_id",
            "fecha_creacion",
            "fecha_actualizacion",
            "fecha_cierre",
            "cerrado_por_id",
            "ultimo_mensaje_at",
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

    def get_total_mensajes(self, obj):
        return obj.mensajes.filter(
            estado="ACTIVO"
        ).count()

    def get_es_miembro_comunidad(self, obj):
        user_id = self._get_request_user_id()
        if user_id is None:
            return False
        return obj.comunidad.tiene_usuario(user_id)

    def get_puede_escribir(self, obj):
        user_id = self._get_request_user_id()
        if user_id is None:
            return False
        return obj.comunidad.tiene_usuario(user_id) and obj.esta_abierta()

    def get_puede_cerrar(self, obj):
        user_id = self._get_request_user_id()
        if user_id is None:
            return False
        return user_id == obj.creador_id or self._is_admin()

    def get_puede_reabrir(self, obj):
        user_id = self._get_request_user_id()
        if user_id is None:
            return False
        return user_id == obj.creador_id or self._is_admin()

    def validate_comunidad(self, value):
        if not value.activo:
            raise serializers.ValidationError("No se puede crear una conversación en una comunidad inactiva.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        user_id = getattr(user, "id", None)

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            user_id = None

        instance = getattr(self, "instance", None)

        comunidad = attrs.get("comunidad", getattr(instance, "comunidad", None))
        titulo = (attrs.get("titulo", getattr(instance, "titulo", "")) or "").strip()

        if not titulo:
            raise serializers.ValidationError({
                "titulo": "El título es obligatorio."
            })

        if comunidad is None:
            raise serializers.ValidationError({
                "comunidad": "La comunidad es obligatoria."
            })

        if instance is None:
            if user_id is None:
                raise serializers.ValidationError("No se pudo determinar el usuario autenticado.")
            if not comunidad.tiene_usuario(user_id):
                raise serializers.ValidationError({
                    "comunidad": "Solo los miembros de la comunidad pueden crear conversaciones."
                })

        return attrs


class ConversacionComunidadViewSet(PermissionPolicyMixin, viewsets.ModelViewSet):
    queryset = ConversacionComunidad.objects.select_related("comunidad").all()
    serializer_class = ConversacionComunidadSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    authentication_classes = [JWTAuthentication]
    permission_classes_per_method = {
        "create": [Allowed],
        "update": [Allowed],
        "partial_update": [Allowed],
        "destroy": [isAdmin],
        "list": [Allowed],
        "retrieve": [Allowed],
        "cerrar": [Allowed],
        "reabrir": [Allowed],
        "mensajes": [Allowed],
    }

    def get_authenticators(self):
        action = getattr(self, "action", None)

        if action in ["list", "retrieve"]:
            return []

        return [auth() for auth in self.authentication_classes]

    def get_queryset(self):
        queryset = ConversacionComunidad.objects.select_related("comunidad").all()

        comunidad = self.request.query_params.get("comunidad")
        estado = self.request.query_params.get("estado")
        activa = self.request.query_params.get("activa")
        mine = self.request.query_params.get("mine")

        if comunidad and comunidad.isdigit():
            queryset = queryset.filter(comunidad_id=int(comunidad))

        if estado in [
            ConversacionComunidad.EstadoConversacion.ABIERTA,
            ConversacionComunidad.EstadoConversacion.CERRADA,
        ]:
            queryset = queryset.filter(estado=estado)

        if activa is not None:
            activa_bool = activa.lower() in ["true", "1", "yes", "y"]
            queryset = queryset.filter(activa=activa_bool)

        if mine is not None and mine.lower() in ["true", "1", "yes", "y"]:
            user_id = getattr(self.request.user, "id", None)
            try:
                user_id = int(user_id)
            except (TypeError, ValueError):
                user_id = None

            if user_id is None:
                return queryset.none()

            queryset = queryset.filter(comunidad__usuarios__contains=[user_id])

        return queryset.order_by("-ultimo_mensaje_at", "-fecha_creacion")

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

    def _puede_gestionar_conversacion(self, conversacion):
        user_id = self._request_user_id()
        if user_id is None:
            return False
        return user_id == conversacion.creador_id or self._is_admin()

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        if "activa" not in data or data.get("activa") in [None, ""]:
            data["activa"] = "true"

        if "estado" not in data or not data.get("estado"):
            data["estado"] = ConversacionComunidad.EstadoConversacion.ABIERTA

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        conversacion = serializer.save(creador_id=self._request_user_id())

        output = self.get_serializer(conversacion)
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        if not self._puede_gestionar_conversacion(instance):
            return Response(
                {"detail": "No tienes permisos para modificar esta conversación."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        conversacion = serializer.save()

        output = self.get_serializer(conversacion)
        return Response(output.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def cerrar(self, request, pk=None):
        conversacion = self.get_object()

        if not self._puede_gestionar_conversacion(conversacion):
            return Response(
                {"detail": "Solo el creador o un administrador pueden cerrar la conversación."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if conversacion.estado == ConversacionComunidad.EstadoConversacion.CERRADA:
            return Response(
                {
                    "message": "La conversación ya está cerrada.",
                    "conversacion": self.get_serializer(conversacion).data,
                },
                status=status.HTTP_200_OK,
            )

        conversacion.cerrar(user_id=self._request_user_id(), save=True)

        return Response(
            {
                "message": "Conversación cerrada correctamente.",
                "conversacion": self.get_serializer(conversacion).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def reabrir(self, request, pk=None):
        conversacion = self.get_object()

        if not self._puede_gestionar_conversacion(conversacion):
            return Response(
                {"detail": "Solo el creador o un administrador pueden reabrir la conversación."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if conversacion.estado == ConversacionComunidad.EstadoConversacion.ABIERTA:
            return Response(
                {
                    "message": "La conversación ya está abierta.",
                    "conversacion": self.get_serializer(conversacion).data,
                },
                status=status.HTTP_200_OK,
            )

        conversacion.reabrir(save=True)

        return Response(
            {
                "message": "Conversación reabierta correctamente.",
                "conversacion": self.get_serializer(conversacion).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def mensajes(self, request, pk=None):
        conversacion = self.get_object()

        data = []
        for mensaje in conversacion.mensajes.filter(estado="ACTIVO").order_by("fecha_envio"):
            data.append({
                "id": mensaje.id,
                "conversacion": mensaje.conversacion_id,
                "autor_id": mensaje.autor_id,
                "contenido": mensaje.contenido,
                "archivo": mensaje.archivo.url if mensaje.archivo else None,
                "imagen": mensaje.imagen.url if mensaje.imagen else None,
                "estado": mensaje.estado,
                "fecha_envio": mensaje.fecha_envio,
                "fecha_actualizacion": mensaje.fecha_actualizacion,
                "editado": mensaje.editado,
            })

        return Response({"mensajes": data}, status=status.HTTP_200_OK)