import json

from django.core.cache import cache
from django.db.models import Q
from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import ValidationError

from Content.models import Evento
from Content.auth import JWTAuthentication
from Content.permissions.Allowed import Allowed
from Content.permissions.is_admin import isAdmin
from Content.permissions.permission_mixin import PermissionPolicyMixin
from Content.services import (
    validate_user_ids,
    validate_carrera_ids,
    get_users_batch,
    get_carreras_batch,
    clear_user_profile_cache,
    clear_evento_members_cache,
    cache_key_evento_miembros,
)


def _to_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "t", "yes", "y", "si", "sí"}
    return False


class EventoSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)

    # Campos derivados para que el frontend deje de depender del array crudo.
    inscritos_count = serializers.SerializerMethodField(read_only=True)
    esta_inscrito = serializers.SerializerMethodField(read_only=True)
    alcance = serializers.SerializerMethodField(read_only=True)
    carreras_detalle = serializers.SerializerMethodField(read_only=True)
    puede_gestionar = serializers.SerializerMethodField(read_only=True)
    es_visible_para_mi = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Evento
        fields = [
            "id",
            "titulo",
            "descripcion",
            "fecha_inicio",
            "fecha_fin",
            "carreras",
            "usuarios",
            "requiere_registro",
            "estado",
            "estado_display",
            "imagen_portada",
            "fecha_creacion",
            "inscritos_count",
            "esta_inscrito",
            "alcance",
            "carreras_detalle",
            "puede_gestionar",
            "es_visible_para_mi",
        ]
        read_only_fields = [
            "fecha_creacion",
            "estado_display",
            "inscritos_count",
            "esta_inscrito",
            "alcance",
            "carreras_detalle",
            "puede_gestionar",
            "es_visible_para_mi",
        ]

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        fecha_inicio = attrs.get(
            "fecha_inicio",
            getattr(instance, "fecha_inicio", None),
        )
        fecha_fin = attrs.get(
            "fecha_fin",
            getattr(instance, "fecha_fin", None),
        )

        if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
            raise serializers.ValidationError({
                "fecha_fin": ["La fecha de fin no puede ser menor que la fecha de inicio."]
            })

        return attrs

    def validate_carreras(self, value):
        if value in [None, ""]:
            return []

        if not isinstance(value, list):
            raise serializers.ValidationError("Debe enviar una lista de IDs de carreras.")

        try:
            carreras = [int(cid) for cid in value]
        except (TypeError, ValueError):
            raise serializers.ValidationError("Todos los IDs de carreras deben ser enteros válidos.")

        if len(carreras) != len(set(carreras)):
            raise serializers.ValidationError("La lista de carreras contiene duplicados.")

        faltantes = validate_carrera_ids(carreras, request=self.context.get("request"))
        if faltantes:
            raise serializers.ValidationError({
                "carreras": [f"IDs inválidos: {', '.join(map(str, faltantes))}"]
            })

        return carreras

    def validate_estado(self, value):
        opciones_validas = [choice[0] for choice in Evento.EstadoEvento.choices]
        if value not in opciones_validas:
            raise serializers.ValidationError(
                f"Estado '{value}' no es válido. Debe ser uno de: {', '.join(opciones_validas)}"
            )
        return value

    def validate_usuarios(self, value):
        if value in [None, ""]:
            return []

        if not isinstance(value, list):
            raise serializers.ValidationError("Debe enviar una lista de IDs de usuarios.")

        try:
            usuarios = [int(uid) for uid in value]
        except (TypeError, ValueError):
            raise serializers.ValidationError("Todos los IDs de usuarios deben ser enteros válidos.")

        if len(usuarios) != len(set(usuarios)):
            raise serializers.ValidationError("La lista de usuarios contiene duplicados.")

        faltantes = validate_user_ids(usuarios, request=self.context.get("request"))
        if faltantes:
            raise serializers.ValidationError({
                "usuarios": [f"IDs inválidos: {', '.join(map(str, faltantes))}"]
            })

        return usuarios

    def get_inscritos_count(self, obj):
        return len(obj.usuarios or [])

    def get_esta_inscrito(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not getattr(user, "is_authenticated", False):
            return False

        return int(getattr(user, "id", 0)) in (obj.usuarios or [])

    def get_alcance(self, obj):
        return "GLOBAL" if not (obj.carreras or []) else "CARRERAS"

    def get_carreras_detalle(self, obj):
        carreras_ids = obj.carreras or []
        if not carreras_ids:
            return []

        carreras = get_carreras_batch(carreras_ids, request=self.context.get("request"))
        return carreras or []

    def get_puede_gestionar(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False) and getattr(user, "is_admin", False))

    def get_es_visible_para_mi(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        carreras_evento = obj.carreras or []
        if not carreras_evento:
            return True

        if user and getattr(user, "is_authenticated", False) and getattr(user, "is_admin", False):
            return True

        payload = getattr(request, "auth", None) or {}
        carrera_id = payload.get("carrera_id")

        try:
            carrera_id = int(carrera_id) if carrera_id is not None else None
        except (TypeError, ValueError):
            carrera_id = None

        if carrera_id is None:
            return False

        return carrera_id in carreras_evento


class EventoViewSet(PermissionPolicyMixin, viewsets.ModelViewSet):
    queryset = Evento.objects.all().order_by("-fecha_inicio")
    serializer_class = EventoSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    authentication_classes = [JWTAuthentication]
    permission_classes_per_method = {
        "create": [isAdmin],
        "update": [isAdmin],
        "partial_update": [isAdmin],
        "destroy": [isAdmin],
        "list": [Allowed],
        "retrieve": [Allowed],
        "inscribir_usuario": [Allowed],
        "desinscribir_usuario": [Allowed],
        "usuarios_detalle": [Allowed],
    }

    # OJO:
    # No anulamos get_authenticators para GET.
    # Queremos autenticación opcional en list/retrieve:
    # - si viene JWT, aprovechamos contexto del usuario
    # - si no viene JWT, sigue siendo público por Allowed

    def get_queryset(self):
        queryset = Evento.objects.all().order_by("-fecha_inicio")

        estado = self.request.query_params.get("estado")
        if estado:
            queryset = queryset.filter(estado=estado)

        requiere_registro = self.request.query_params.get("requiere_registro")
        if requiere_registro is not None:
            queryset = queryset.filter(requiere_registro=_to_bool(requiere_registro))

        carrera = self.request.query_params.get("carrera")
        if carrera and str(carrera).isdigit():
            queryset = queryset.filter(carreras__contains=[int(carrera)])

        para_mi = self.request.query_params.get("para_mi")
        if _to_bool(para_mi):
            user = getattr(self.request, "user", None)
            payload = getattr(self.request, "auth", None) or {}

            es_admin = bool(
                user and getattr(user, "is_authenticated", False) and getattr(user, "is_admin", False)
            )

            if not es_admin:
                carrera_id = payload.get("carrera_id")
                try:
                    carrera_id = int(carrera_id) if carrera_id is not None else None
                except (TypeError, ValueError):
                    carrera_id = None

                if carrera_id is None:
                    queryset = queryset.filter(carreras=[])
                else:
                    queryset = queryset.filter(
                        Q(carreras=[]) | Q(carreras__contains=[carrera_id])
                    )

        return queryset

    def _sanitizar_campo_lista(self, data, campo, *, default_if_missing=None):
        valor = data.get(campo)

        if valor is None:
            return [] if default_if_missing is None else default_if_missing

        if isinstance(valor, list):
            return valor

        if isinstance(valor, str):
            valor = valor.strip()
            if valor == "":
                return []

            try:
                parsed = json.loads(valor)
            except json.JSONDecodeError:
                raise ValidationError({campo: f"El campo '{campo}' debe ser una lista JSON válida."})

            if not isinstance(parsed, list):
                raise ValidationError({campo: f"El campo '{campo}' debe ser una lista."})

            return parsed

        return valor

    def _require_authenticated_user(self, request):
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False))

    def _resolve_target_user_id(self, request):
        if not self._require_authenticated_user(request):
            return None, Response(
                {"error": "Debe iniciar sesión para gestionar inscripciones."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        raw_user_id = request.data.get("user_id", getattr(request.user, "id", None))

        try:
            user_id = int(raw_user_id)
        except (TypeError, ValueError):
            return None, Response(
                {"error": "Debe proporcionar 'user_id' entero válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        es_admin = bool(getattr(request.user, "is_admin", False))
        if not es_admin and user_id != int(getattr(request.user, "id")):
            return None, Response(
                {"error": "No tiene permisos para gestionar la inscripción de otro usuario."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return user_id, None

    def create(self, request, *args, **kwargs):
        mutable_data = request.data.copy()

        if "carreras" in request.data:
            mutable_data.setlist("carreras", self._sanitizar_campo_lista(request.data, "carreras"))
        if "usuarios" in request.data:
            mutable_data.setlist("usuarios", self._sanitizar_campo_lista(request.data, "usuarios"))

        serializer = self.get_serializer(data=mutable_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        output_serializer = self.get_serializer(serializer.instance)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        mutable_data = request.data.copy()

        if "carreras" in request.data:
            mutable_data.setlist("carreras", self._sanitizar_campo_lista(request.data, "carreras"))
        if "usuarios" in request.data:
            mutable_data.setlist("usuarios", self._sanitizar_campo_lista(request.data, "usuarios"))

        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(instance, data=mutable_data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        clear_evento_members_cache(instance.id)

        output_serializer = self.get_serializer(serializer.instance)
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def inscribir_usuario(self, request, pk=None):
        evento = self.get_object()

        user_id, error_response = self._resolve_target_user_id(request)
        if error_response is not None:
            return error_response

        if not evento.requiere_registro:
            return Response(
                {"error": "Este evento no requiere registro."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if evento.estado != Evento.EstadoEvento.ACTIVO:
            return Response(
                {"error": "Solo es posible inscribirse en eventos activos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        faltantes = validate_user_ids([user_id], request=request)
        if faltantes:
            return Response(
                {"error": f"Usuario con ID {user_id} no existe."},
                status=status.HTTP_404_NOT_FOUND,
            )

        usuarios = evento.usuarios or []
        if user_id in usuarios:
            return Response(
                {"message": "El usuario ya está inscrito."},
                status=status.HTTP_200_OK,
            )

        evento.usuarios = usuarios + [user_id]
        evento.save(update_fields=["usuarios"])

        clear_user_profile_cache(user_id)
        clear_evento_members_cache(evento.id)

        output_serializer = self.get_serializer(evento)
        return Response(
            {
                "message": f"Usuario {user_id} inscrito exitosamente al evento.",
                "evento": output_serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def desinscribir_usuario(self, request, pk=None):
        evento = self.get_object()

        user_id, error_response = self._resolve_target_user_id(request)
        if error_response is not None:
            return error_response

        usuarios = evento.usuarios or []
        if user_id not in usuarios:
            return Response(
                {"error": f"El usuario {user_id} no está inscrito en este evento."},
                status=status.HTTP_404_NOT_FOUND,
            )

        evento.usuarios = [uid for uid in usuarios if uid != user_id]
        evento.save(update_fields=["usuarios"])

        clear_user_profile_cache(user_id)
        clear_evento_members_cache(evento.id)

        output_serializer = self.get_serializer(evento)
        return Response(
            {
                "message": f"Usuario {user_id} desinscrito exitosamente del evento.",
                "evento": output_serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def usuarios_detalle(self, request, pk=None):
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return Response(
                {"error": "Debe iniciar sesión para consultar el detalle de inscritos."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not getattr(user, "is_admin", False):
            return Response(
                {"error": "Solo los administradores pueden ver el detalle de inscritos."},
                status=status.HTTP_403_FORBIDDEN,
            )

        evento = self.get_object()
        ids = evento.usuarios or []

        if not ids:
            return Response({"usuarios": []}, status=status.HTTP_200_OK)

        cache_key = cache_key_evento_miembros(evento.id)
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response({"usuarios": cached_data}, status=status.HTTP_200_OK)

        usuarios = get_users_batch(ids, request=request)
        if usuarios is None:
            return Response(
                {"error": "No se pudo obtener usuarios desde Access."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        cache.set(cache_key, usuarios, timeout=60)
        return Response({"usuarios": usuarios}, status=status.HTTP_200_OK)