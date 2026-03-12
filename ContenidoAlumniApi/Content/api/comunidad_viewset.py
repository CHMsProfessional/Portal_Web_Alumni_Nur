import json

from django.core.cache import cache
from rest_framework import request, serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from Content.models import Comunidad, ConversacionComunidad, Noticia
from Content.auth import JWTAuthentication
from Content.permissions.Allowed import Allowed
from Content.permissions.is_admin import isAdmin
from Content.permissions.permission_mixin import PermissionPolicyMixin
from Content.services import (
    validate_carrera_ids,
    validate_user_ids,
    get_users_batch,
    clear_user_profile_cache,
    clear_comunidad_members_cache,
    cache_key_comunidad_miembros,
    get_carreras_batch,
)


def _normalizar_ids(value, field_name: str):
    if value is None:
        return []

    if isinstance(value, list):
        ids = value
    elif isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            raise serializers.ValidationError(
                {field_name: [f"El campo '{field_name}' debe ser una lista JSON válida."]}
            )
        if not isinstance(parsed, list):
            raise serializers.ValidationError(
                {field_name: [f"El campo '{field_name}' debe ser una lista."]}
            )
        ids = parsed
    else:
        raise serializers.ValidationError(
            {field_name: [f"El campo '{field_name}' debe ser una lista."]}
        )

    normalizados = []
    for item in ids:
        try:
            normalizados.append(int(item))
        except (TypeError, ValueError):
            raise serializers.ValidationError(
                {field_name: [f"Todos los elementos de '{field_name}' deben ser IDs enteros válidos."]}
            )

    if len(normalizados) != len(set(normalizados)):
        raise serializers.ValidationError(
            {field_name: [f"La lista '{field_name}' contiene duplicados."]}
        )

    return normalizados


def _get_request_list(data, field_name: str):
    if hasattr(data, "getlist"):
        values = data.getlist(field_name)
        if values:
            return values

    return data.get(field_name)


class ComunidadSerializer(serializers.ModelSerializer):
    total_miembros = serializers.SerializerMethodField()
    total_conversaciones = serializers.SerializerMethodField()
    total_conversaciones_abiertas = serializers.SerializerMethodField()
    total_noticias_publicadas = serializers.SerializerMethodField()
    pertenece_usuario_actual = serializers.SerializerMethodField()
    puede_crear_conversacion = serializers.SerializerMethodField()
    puede_publicar_noticia = serializers.SerializerMethodField()

    class Meta:
        model = Comunidad
        fields = [
            "id",
            "nombre",
            "slug",
            "carreras",
            "usuarios",
            "imagen_portada",
            "fecha_creacion",
            "fecha_actualizacion",
            "descripcion",
            "activo",
            "total_miembros",
            "total_conversaciones",
            "total_conversaciones_abiertas",
            "total_noticias_publicadas",
            "pertenece_usuario_actual",
            "puede_crear_conversacion",
            "puede_publicar_noticia",
        ]
        read_only_fields = [
            "slug",
            "fecha_creacion",
            "fecha_actualizacion",
        ]

    def _get_request_user_id(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not getattr(user, "is_authenticated", False):
            return None

        user_id = getattr(user, "alumni_id", None)
        try:
            return int(user_id)
        except (TypeError, ValueError):
            return None

    def get_total_miembros(self, obj):
        return len(obj.usuarios or [])

    def get_total_conversaciones(self, obj):
        return obj.conversaciones.filter(activa=True).count()

    def get_total_conversaciones_abiertas(self, obj):
        return obj.conversaciones.filter(
            activa=True,
            estado=ConversacionComunidad.EstadoConversacion.ABIERTA
        ).count()

    def get_total_noticias_publicadas(self, obj):
        return obj.noticias.filter(publicado=True).count()

    def get_pertenece_usuario_actual(self, obj):
        user_id = self._get_request_user_id()
        if user_id is None:
            return False
        return obj.tiene_usuario(user_id)

    def get_puede_crear_conversacion(self, obj):
        user_id = self._get_request_user_id()
        if user_id is None:
            return False
        return obj.activo and obj.tiene_usuario(user_id)

    def get_puede_publicar_noticia(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        auth = getattr(request, "auth", None)

        if not user or not getattr(user, "is_authenticated", False):
            return False

        if isinstance(auth, dict):
            return bool(auth.get("is_admin", False))

        return bool(getattr(user, "is_admin", False))


class ComunidadViewSet(PermissionPolicyMixin, viewsets.ModelViewSet):
    queryset = Comunidad.objects.all().order_by("-fecha_creacion")
    serializer_class = ComunidadSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    authentication_classes = [JWTAuthentication]
    permission_classes_per_method = {
        "create": [isAdmin],
        "update": [isAdmin],
        "partial_update": [isAdmin],
        "destroy": [isAdmin],
        "list": [Allowed],
        "retrieve": [Allowed],
        "agregar_usuario": [Allowed],
        "quitar_usuario": [Allowed],
        "miembros_detalle": [Allowed],
        "get_comunidades_of_user": [Allowed],
        "hub": [Allowed],
        "conversaciones": [Allowed],
        "noticias": [Allowed],
        "carreras_detalle": [Allowed],
    }

    def get_authenticators(self):
        action = getattr(self, "action", None)
        auth_header = self.request.headers.get("Authorization")

        # Endpoints públicos con autenticación opcional:
        # si viene token, autenticamos; si no viene, se deja anónimo.
        if action in ["list", "retrieve", "hub", "noticias", "conversaciones"]:
            if auth_header:
                return [auth() for auth in self.authentication_classes]
            return []

        # En resolución temprana de DRF para GET sin action todavía definido
        if action is None and self.request.method == "GET":
            if auth_header:
                return [auth() for auth in self.authentication_classes]
            return []

        # Resto de endpoints: autenticación normal
        return [auth() for auth in self.authentication_classes]

    def get_queryset(self):
        queryset = Comunidad.objects.all()

        activo = self.request.query_params.get("activo")
        carrera = self.request.query_params.get("carrera")
        usuario = self.request.query_params.get("usuario")

        if activo is not None:
            activo_bool = activo.lower() in ["true", "1", "yes", "y"]
            queryset = queryset.filter(activo=activo_bool)

        if carrera and carrera.isdigit():
            queryset = queryset.filter(carreras__contains=[int(carrera)])

        if usuario and usuario.isdigit():
            queryset = queryset.filter(usuarios__contains=[int(usuario)])

        return queryset.order_by("-fecha_creacion")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def _parse_payload(self, request, partial=False):
        mutable_data = request.data.copy()
        carreras = []
        usuarios = []

        if "carreras" in request.data or not partial:
            carreras = _normalizar_ids(
                _get_request_list(request.data, "carreras"),
                "carreras"
            )

            if hasattr(mutable_data, "setlist"):
                mutable_data.setlist("carreras", [str(carrera_id) for carrera_id in carreras])
            else:
                mutable_data["carreras"] = carreras

        if "usuarios" in request.data or not partial:
            usuarios = _normalizar_ids(
                _get_request_list(request.data, "usuarios"),
                "usuarios"
            )

            if hasattr(mutable_data, "setlist"):
                mutable_data.setlist("usuarios", [str(usuario_id) for usuario_id in usuarios])
            else:
                mutable_data["usuarios"] = usuarios

        faltantes_carreras = validate_carrera_ids(carreras, request=request)
        if faltantes_carreras:
            raise serializers.ValidationError({
                "carreras": [f"IDs inválidos o no encontrados: {', '.join(map(str, faltantes_carreras))}"]
            })

        faltantes_usuarios = validate_user_ids(usuarios, request=request)
        if faltantes_usuarios:
            raise serializers.ValidationError({
                "usuarios": [f"IDs inválidos o no encontrados: {', '.join(map(str, faltantes_usuarios))}"]
            })

        return mutable_data

    def create(self, request, *args, **kwargs):
        mutable_data = self._parse_payload(request, partial=False)

        serializer = self.get_serializer(data=mutable_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        comunidad = serializer.instance
        clear_comunidad_members_cache(comunidad.id)

        output = self.get_serializer(comunidad)
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        mutable_data = self._parse_payload(request, partial=partial)

        serializer = self.get_serializer(instance, data=mutable_data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        clear_comunidad_members_cache(instance.id)

        output = self.get_serializer(serializer.instance)
        return Response(output.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def agregar_usuario(self, request, pk=None):
        comunidad = self.get_object()
        user_id = request.data.get("user_id")

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return Response({"error": "El 'user_id' debe ser entero."}, status=status.HTTP_400_BAD_REQUEST)

        faltantes = validate_user_ids([user_id], request=request)
        if faltantes:
            return Response({"error": "El usuario no existe en Access."}, status=status.HTTP_404_NOT_FOUND)

        usuarios = comunidad.usuarios or []
        if user_id in usuarios:
            return Response(
                {
                    "message": "El usuario ya pertenece a la comunidad.",
                    "comunidad": self.get_serializer(comunidad).data,
                },
                status=status.HTTP_200_OK,
            )

        comunidad.usuarios = usuarios + [user_id]
        comunidad.save(update_fields=["usuarios", "fecha_actualizacion"])

        clear_user_profile_cache(user_id)
        clear_comunidad_members_cache(comunidad.id)

        return Response(
            {
                "message": f"Usuario {user_id} agregado a la comunidad.",
                "comunidad": self.get_serializer(comunidad).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def quitar_usuario(self, request, pk=None):
        comunidad = self.get_object()
        user_id = request.data.get("user_id")

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return Response({"error": "El 'user_id' debe ser entero."}, status=status.HTTP_400_BAD_REQUEST)

        usuarios = comunidad.usuarios or []
        if user_id not in usuarios:
            return Response({"message": "El usuario no pertenece a la comunidad."}, status=status.HTTP_200_OK)

        comunidad.usuarios = [uid for uid in usuarios if uid != user_id]
        comunidad.save(update_fields=["usuarios", "fecha_actualizacion"])

        clear_user_profile_cache(user_id)
        clear_comunidad_members_cache(comunidad.id)

        return Response(
            {"message": f"Usuario {user_id} removido de la comunidad."},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def miembros_detalle(self, request, pk=None):
        comunidad = self.get_object()
        ids = comunidad.usuarios or []

        if not ids:
            return Response({"usuarios": []}, status=status.HTTP_200_OK)

        cache_key = cache_key_comunidad_miembros(comunidad.id)
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response({"usuarios": cached_data}, status=status.HTTP_200_OK)

        usuarios = get_users_batch(ids, request=request)
        if usuarios is None:
            return Response(
                {"error": "No se pudo obtener miembros desde Access."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        cache.set(cache_key, usuarios, timeout=60)
        return Response({"usuarios": usuarios}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def carreras_detalle(self, request, pk=None):
        comunidad = self.get_object()
        ids = comunidad.carreras or []

        if not ids:
            return Response({"carreras": []}, status=status.HTTP_200_OK)

        carreras = get_carreras_batch(ids, request=request)
        if carreras is None:
            return Response(
                {"error": "No se pudo obtener carreras desde Access."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"carreras": carreras}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="get-comunidades-of-user", url_name="get_comunidades_of_user")
    def get_comunidades_of_user(self, request):
        user_id = request.data.get("user_id")
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return Response({"detail": "El 'user_id' debe ser entero."}, status=status.HTTP_400_BAD_REQUEST)

        comunidades = Comunidad.objects.filter(
            usuarios__contains=[user_id],
            activo=True
        ).order_by("-fecha_creacion")

        serializer = self.get_serializer(comunidades, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def conversaciones(self, request, pk=None):
        comunidad = self.get_object()

        queryset = comunidad.conversaciones.filter(activa=True)

        estado = request.query_params.get("estado")
        if estado in [
            ConversacionComunidad.EstadoConversacion.ABIERTA,
            ConversacionComunidad.EstadoConversacion.CERRADA,
        ]:
            queryset = queryset.filter(estado=estado)

        data = []
        user_id = getattr(request.user, "id", None)

        for conversacion in queryset.order_by("-ultimo_mensaje_at", "-fecha_creacion"):
            es_creador = user_id is not None and int(user_id) == conversacion.creador_id
            es_admin = bool(getattr(request.user, "is_admin", False)) or bool(
                isinstance(getattr(request, "auth", None), dict) and request.auth.get("is_admin", False)
            )

            data.append({
                "id": conversacion.id,
                "comunidad": conversacion.comunidad_id,
                "titulo": conversacion.titulo,
                "slug": conversacion.slug,
                "descripcion": conversacion.descripcion,
                "imagen": conversacion.imagen.url if conversacion.imagen else None,
                "creador_id": conversacion.creador_id,
                "estado": conversacion.estado,
                "activa": conversacion.activa,
                "fecha_creacion": conversacion.fecha_creacion,
                "fecha_actualizacion": conversacion.fecha_actualizacion,
                "fecha_cierre": conversacion.fecha_cierre,
                "cerrado_por_id": conversacion.cerrado_por_id,
                "ultimo_mensaje_at": conversacion.ultimo_mensaje_at,
                "total_mensajes": conversacion.mensajes.filter(
                    estado="ACTIVO"
                ).count(),
                "puede_escribir": comunidad.tiene_usuario(user_id) and conversacion.esta_abierta() if user_id else False,
                "puede_cerrar": es_creador or es_admin,
                "puede_reabrir": es_creador or es_admin,
            })

        return Response({"conversaciones": data}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def noticias(self, request, pk=None):
        comunidad = self.get_object()

        queryset = comunidad.noticias.all()

        publicado = request.query_params.get("publicado")
        destacado = request.query_params.get("destacado")
        vigente = request.query_params.get("vigente")

        if publicado is not None:
            publicado_bool = publicado.lower() in ["true", "1", "yes", "y"]
            queryset = queryset.filter(publicado=publicado_bool)

        if destacado is not None:
            destacado_bool = destacado.lower() in ["true", "1", "yes", "y"]
            queryset = queryset.filter(destacado=destacado_bool)

        if vigente is not None and vigente.lower() in ["true", "1", "yes", "y"]:
            from django.db.models import Q
            from django.utils import timezone

            ahora = timezone.now()
            queryset = queryset.filter(publicado=True).filter(
                Q(fecha_inicio_publicacion__isnull=True, fecha_fin_publicacion__isnull=True) |
                Q(fecha_inicio_publicacion__lte=ahora, fecha_fin_publicacion__isnull=True) |
                Q(fecha_inicio_publicacion__isnull=True, fecha_fin_publicacion__gte=ahora) |
                Q(fecha_inicio_publicacion__lte=ahora, fecha_fin_publicacion__gte=ahora)
            )

        data = []
        for noticia in queryset.order_by("-destacado", "orden", "-fecha_publicacion"):
            data.append({
                "id": noticia.id,
                "titulo": noticia.titulo,
                "resumen": noticia.resumen,
                "contenido": noticia.contenido,
                "imagen": noticia.imagen.url if noticia.imagen else None,
                "tipo": noticia.tipo,
                "tipo_display": noticia.get_tipo_display(),
                "destino": noticia.destino,
                "destino_display": noticia.get_destino_display(),
                "comunidad": noticia.comunidad_id,
                "comunidad_nombre": comunidad.nombre,
                "evento": noticia.evento_id,
                "evento_titulo": noticia.evento.titulo if noticia.evento else None,
                "boton_texto": noticia.boton_texto,
                "boton_url": noticia.boton_url,
                "publicado": noticia.publicado,
                "destacado": noticia.destacado,
                "orden": noticia.orden,
                "fecha_publicacion": noticia.fecha_publicacion,
                "fecha_actualizacion": noticia.fecha_actualizacion,
                "fecha_inicio_publicacion": noticia.fecha_inicio_publicacion,
                "fecha_fin_publicacion": noticia.fecha_fin_publicacion,
            })

        return Response({"noticias": data}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def hub(self, request, pk=None):

        comunidad = self.get_object()
        comunidad_data = self.get_serializer(comunidad).data

        conversaciones_qs = comunidad.conversaciones.filter(activa=True).order_by(
            "-ultimo_mensaje_at",
            "-fecha_creacion"
        )[:10]

        noticias_qs = comunidad.noticias.filter(publicado=True).order_by(
            "-destacado",
            "orden",
            "-fecha_publicacion"
        )[:10]

        user_id = getattr(request.user, "id", None)
        es_admin = bool(getattr(request.user, "is_admin", False)) or bool(
            isinstance(getattr(request, "auth", None), dict) and request.auth.get("is_admin", False)
        )

        conversaciones = []
        for conversacion in conversaciones_qs:
            es_creador = user_id is not None and int(user_id) == conversacion.creador_id
            conversaciones.append({
                "id": conversacion.id,
                "comunidad": conversacion.comunidad_id,
                "titulo": conversacion.titulo,
                "slug": conversacion.slug,
                "descripcion": conversacion.descripcion,
                "imagen": conversacion.imagen.url if conversacion.imagen else None,
                "creador_id": conversacion.creador_id,
                "estado": conversacion.estado,
                "activa": conversacion.activa,
                "fecha_creacion": conversacion.fecha_creacion,
                "fecha_actualizacion": conversacion.fecha_actualizacion,
                "fecha_cierre": conversacion.fecha_cierre,
                "cerrado_por_id": conversacion.cerrado_por_id,
                "ultimo_mensaje_at": conversacion.ultimo_mensaje_at,
                "total_mensajes": conversacion.mensajes.filter(estado="ACTIVO").count(),
                "puede_escribir": comunidad.tiene_usuario(user_id) and conversacion.esta_abierta() if user_id else False,
                "puede_cerrar": es_creador or es_admin,
                "puede_reabrir": es_creador or es_admin,
            })

        noticias = []
        for noticia in noticias_qs:
            noticias.append({
                "id": noticia.id,
                "titulo": noticia.titulo,
                "resumen": noticia.resumen,
                "contenido": noticia.contenido,
                "imagen": noticia.imagen.url if noticia.imagen else None,
                "tipo": noticia.tipo,
                "tipo_display": noticia.get_tipo_display(),
                "destino": noticia.destino,
                "destino_display": noticia.get_destino_display(),
                "comunidad": noticia.comunidad_id,
                "comunidad_nombre": comunidad.nombre,
                "evento": noticia.evento_id,
                "evento_titulo": noticia.evento.titulo if noticia.evento else None,
                "boton_texto": noticia.boton_texto,
                "boton_url": noticia.boton_url,
                "publicado": noticia.publicado,
                "destacado": noticia.destacado,
                "orden": noticia.orden,
                "fecha_publicacion": noticia.fecha_publicacion,
                "fecha_actualizacion": noticia.fecha_actualizacion,
                "fecha_inicio_publicacion": noticia.fecha_inicio_publicacion,
                "fecha_fin_publicacion": noticia.fecha_fin_publicacion,
            })

        return Response(
            {
                "comunidad": comunidad_data,
                "conversaciones": conversaciones,
                "noticias": noticias,
            },
            status=status.HTTP_200_OK,
        )