from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers, viewsets, status
from rest_framework.response import Response

from Content.models import Noticia
from Content.auth import JWTAuthentication
from Content.permissions.Allowed import Allowed
from Content.permissions.is_admin import isAdmin
from Content.permissions.permission_mixin import PermissionPolicyMixin
from Content.services import notify_new_news


def _should_notify_registered(data) -> bool:
    raw_value = data.get("notify_registered", False)

    if isinstance(raw_value, bool):
        return raw_value

    if raw_value is None:
        return False

    return str(raw_value).strip().lower() in {"true", "1", "yes", "y", "on"}


class NoticiaSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    destino_display = serializers.CharField(source="get_destino_display", read_only=True)
    comunidad_nombre = serializers.CharField(source="comunidad.nombre", read_only=True)
    evento_titulo = serializers.CharField(source="evento.titulo", read_only=True)

    class Meta:
        model = Noticia
        fields = [
            "id",
            "titulo",
            "resumen",
            "contenido",
            "imagen",
            "tipo",
            "tipo_display",
            "destino",
            "destino_display",
            "comunidad",
            "comunidad_nombre",
            "evento",
            "evento_titulo",
            "boton_texto",
            "boton_url",
            "publicado",
            "destacado",
            "orden",
            "fecha_publicacion",
            "fecha_actualizacion",
            "fecha_inicio_publicacion",
            "fecha_fin_publicacion",
            "creado_por_id",
            "actualizado_por_id",
        ]
        read_only_fields = [
            "fecha_publicacion",
            "fecha_actualizacion",
            "creado_por_id",
            "actualizado_por_id",
        ]

    def validate_tipo(self, value):
        tipos_validos = [choice[0] for choice in Noticia.TipoNoticia.choices]
        if value not in tipos_validos:
            raise serializers.ValidationError(
                f"Tipo inválido. Debe ser uno de: {', '.join(tipos_validos)}"
            )
        return value

    def validate_destino(self, value):
        destinos_validos = [choice[0] for choice in Noticia.DestinoNoticia.choices]
        if value not in destinos_validos:
            raise serializers.ValidationError(
                f"Destino inválido. Debe ser uno de: {', '.join(destinos_validos)}"
            )
        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        tipo = attrs.get("tipo", getattr(instance, "tipo", Noticia.TipoNoticia.NORMAL))
        destino = attrs.get("destino", getattr(instance, "destino", Noticia.DestinoNoticia.HOME))
        comunidad = attrs.get("comunidad", getattr(instance, "comunidad", None))
        evento = attrs.get("evento", getattr(instance, "evento", None))
        boton_texto = (attrs.get("boton_texto", getattr(instance, "boton_texto", "")) or "").strip()
        boton_url = (attrs.get("boton_url", getattr(instance, "boton_url", "")) or "").strip()
        fecha_inicio = attrs.get(
            "fecha_inicio_publicacion",
            getattr(instance, "fecha_inicio_publicacion", None)
        )
        fecha_fin = attrs.get(
            "fecha_fin_publicacion",
            getattr(instance, "fecha_fin_publicacion", None)
        )

        if destino == Noticia.DestinoNoticia.HOME and comunidad is not None:
            raise serializers.ValidationError({
                "comunidad": "Las noticias con destino HOME no deben estar vinculadas a una comunidad."
            })

        if destino == Noticia.DestinoNoticia.COMUNIDAD and comunidad is None:
            raise serializers.ValidationError({
                "comunidad": "Las noticias con destino COMUNIDAD requieren una comunidad."
            })

        requiere_boton = tipo in {
            Noticia.TipoNoticia.BOTON,
            Noticia.TipoNoticia.BOTON_EVENTO,
        }
        requiere_evento = tipo in {
            Noticia.TipoNoticia.EVENTO,
            Noticia.TipoNoticia.BOTON_EVENTO,
        }

        if requiere_boton:
            if not boton_texto:
                raise serializers.ValidationError({
                    "boton_texto": "Este tipo de noticia requiere texto para el botón."
                })
            if not boton_url:
                raise serializers.ValidationError({
                    "boton_url": "Este tipo de noticia requiere URL para el botón."
                })
        else:
            if boton_texto:
                raise serializers.ValidationError({
                    "boton_texto": "Este tipo de noticia no admite botón."
                })
            if boton_url:
                raise serializers.ValidationError({
                    "boton_url": "Este tipo de noticia no admite URL de botón."
                })

        if requiere_evento and evento is None:
            raise serializers.ValidationError({
                "evento": "Este tipo de noticia requiere un evento relacionado."
            })

        if not requiere_evento and evento is not None:
            raise serializers.ValidationError({
                "evento": "Este tipo de noticia no admite evento relacionado."
            })

        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            raise serializers.ValidationError({
                "fecha_fin_publicacion": "La fecha fin no puede ser menor que la fecha inicio."
            })

        return attrs


class NoticiaViewSet(PermissionPolicyMixin, viewsets.ModelViewSet):
    queryset = Noticia.objects.all().order_by("-destacado", "orden", "-fecha_publicacion")
    serializer_class = NoticiaSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes_per_method = {
        "create": [isAdmin],
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

        if action is None and self.request.method == "GET":
            lookup_url_kwarg = getattr(self, "lookup_url_kwarg", None) or self.lookup_field
            if self.kwargs.get(lookup_url_kwarg) is None:
                return []
            return []

        return [auth() for auth in self.authentication_classes]

    def get_queryset(self):
        queryset = Noticia.objects.all()

        destino = self.request.query_params.get("destino")
        comunidad = self.request.query_params.get("comunidad")
        publicado = self.request.query_params.get("publicado")
        destacado = self.request.query_params.get("destacado")
        vigente = self.request.query_params.get("vigente")

        if destino:
            queryset = queryset.filter(destino=destino)

        if comunidad and comunidad.isdigit():
            queryset = queryset.filter(comunidad_id=int(comunidad))

        if publicado is not None:
            publicado_bool = publicado.lower() in ["true", "1", "yes", "y"]
            queryset = queryset.filter(publicado=publicado_bool)

        if destacado is not None:
            destacado_bool = destacado.lower() in ["true", "1", "yes", "y"]
            queryset = queryset.filter(destacado=destacado_bool)

        if vigente is not None and vigente.lower() in ["true", "1", "yes", "y"]:
            ahora = timezone.now()
            queryset = queryset.filter(publicado=True).filter(
                Q(fecha_inicio_publicacion__isnull=True, fecha_fin_publicacion__isnull=True) |
                Q(fecha_inicio_publicacion__lte=ahora, fecha_fin_publicacion__isnull=True) |
                Q(fecha_inicio_publicacion__isnull=True, fecha_fin_publicacion__gte=ahora) |
                Q(fecha_inicio_publicacion__lte=ahora, fecha_fin_publicacion__gte=ahora)
            )

        return queryset.order_by("-destacado", "orden", "-fecha_publicacion")

    def _notificar_access(self, request, serializer_data):
        status_code, detail = notify_new_news(
            request,
            titulo=serializer_data.get("titulo"),
            contenido=serializer_data.get("contenido", ""),
            fecha=serializer_data.get("fecha_publicacion"),
        )

        if status_code is None or status_code >= 400:
            print(
                "[ERROR] Access rechazó notificación de noticia. "
                f"status={status_code} body={detail}"
            )

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        should_notify = _should_notify_registered(payload)
        payload.pop("notify_registered", None)

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)

        noticia = serializer.save(
            creado_por_id=getattr(request.user, "id", None),
            actualizado_por_id=getattr(request.user, "id", None),
        )

        output = self.get_serializer(noticia)
        headers = self.get_success_headers(output.data)

        if should_notify:
            self._notificar_access(request, output.data)

        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        payload = request.data.copy()
        should_notify = _should_notify_registered(payload)
        payload.pop("notify_registered", None)

        serializer = self.get_serializer(instance, data=payload, partial=partial)
        serializer.is_valid(raise_exception=True)

        noticia = serializer.save(
            actualizado_por_id=getattr(request.user, "id", None),
        )

        output = self.get_serializer(noticia)

        if should_notify:
            self._notificar_access(request, output.data)

        return Response(output.data, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()