from rest_framework import viewsets, serializers, status
from rest_framework.response import Response

from Content.auth import JWTAuthentication
from Content.models import Documento
from Content.permissions.Allowed import Allowed
from Content.permissions.is_admin import isAdmin
from Content.permissions.permission_mixin import PermissionPolicyMixin
from Content.services import get_carrera_by_id


class DocumentoSerializer(serializers.ModelSerializer):
    tipo = serializers.CharField()
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    carrera_id = serializers.IntegerField(source="carrera", read_only=True)
    carrera_codigo = serializers.SerializerMethodField(read_only=True)
    carrera_nombre = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Documento
        fields = [
            "id",
            "nombre",
            "tipo",
            "tipo_display",
            "carrera",
            "carrera_id",
            "carrera_codigo",
            "carrera_nombre",
            "descripcion",
            "autor",
            "archivo_documento",
            "imagen_portada",
            "fecha_subida",
        ]

    def validate_tipo(self, value):
        tipos_permitidos = [choice[0] for choice in Documento.TipoDocumento.choices]

        if value not in tipos_permitidos:
            tipos_legibles = [f"{choice[0]} → {choice[1]}" for choice in Documento.TipoDocumento.choices]
            raise serializers.ValidationError(
                [
                    f"Tipo inválido: '{value}'",
                    f"Tipos permitidos: {', '.join(tipos_legibles)}"
                ]
            )

        return value

    def validate_carrera(self, value):
        if value in [None, ""]:
            return None

        try:
            carrera_id = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("La carrera debe ser un ID entero válido.")

        carrera = get_carrera_by_id(carrera_id, request=self.context.get("request"))
        if not carrera:
            raise serializers.ValidationError(f"No existe una carrera válida con ID '{carrera_id}'.")

        return carrera_id

    def get_carrera_codigo(self, obj):
        if not obj.carrera:
            return None

        carrera = get_carrera_by_id(obj.carrera)
        return carrera.get("codigo") if carrera else None

    def get_carrera_nombre(self, obj):
        if not obj.carrera:
            return None

        carrera = get_carrera_by_id(obj.carrera)
        return carrera.get("nombre") if carrera else None


class DocumentoViewSet(PermissionPolicyMixin, viewsets.ModelViewSet):
    queryset = Documento.objects.all()
    serializer_class = DocumentoSerializer
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
            return []

        return [auth() for auth in self.authentication_classes]

    def get_queryset(self):
        queryset = Documento.objects.all()

        carrera = self.request.query_params.get("carrera")
        tipo = self.request.query_params.get("tipo")

        if carrera and carrera.isdigit():
            queryset = queryset.filter(carrera=int(carrera))

        if tipo:
            queryset = queryset.filter(tipo=tipo)

        return queryset.order_by("-fecha_subida")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        output_serializer = self.get_serializer(serializer.instance)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        output_serializer = self.get_serializer(serializer.instance)
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    def perform_update(self, serializer):
        serializer.save()