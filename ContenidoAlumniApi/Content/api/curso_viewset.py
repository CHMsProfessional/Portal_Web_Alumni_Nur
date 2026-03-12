from rest_framework import serializers, viewsets, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response

from Content.models import Curso
from Content.auth import JWTAuthentication
from Content.permissions.Allowed import Allowed
from Content.permissions.is_admin import isAdmin
from Content.permissions.permission_mixin import PermissionPolicyMixin
from Content.services import (
    validate_user_ids,
    get_users_batch,
    clear_user_profile_cache,
)


class CursoSerializer(serializers.ModelSerializer):
    modalidad_display = serializers.CharField(source="get_modalidad_display", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model = Curso
        fields = "__all__"
        read_only_fields = ["fecha_creacion"]

    def validate_inscritos(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Debe enviar una lista de IDs de usuarios.")

        try:
            inscritos = [int(user_id) for user_id in value]
        except (TypeError, ValueError):
            raise serializers.ValidationError("Todos los IDs de inscritos deben ser enteros válidos.")

        if len(inscritos) != len(set(inscritos)):
            raise serializers.ValidationError("La lista de usuarios contiene duplicados.")

        faltantes = validate_user_ids(inscritos, request=self.context.get("request"))
        if faltantes:
            raise serializers.ValidationError({
                "inscritos": [f"IDs inválidos o no encontrados: {', '.join(map(str, faltantes))}"]
            })

        return inscritos


class CursoViewSet(PermissionPolicyMixin, viewsets.ModelViewSet):
    queryset = Curso.objects.all().order_by("-fecha_creacion")
    serializer_class = CursoSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    authentication_classes = [JWTAuthentication]
    permission_classes_per_method = {
        "create": [isAdmin],
        "update": [isAdmin],
        "partial_update": [isAdmin],
        "destroy": [isAdmin],
        "list": [Allowed],
        "retrieve": [Allowed],
        "usuarios_detalle": [Allowed],
        "inscribir_usuario": [Allowed],
        "desinscribir_usuario": [Allowed],
    }

    def get_authenticators(self):
        action = getattr(self, "action", None)

        if action in ["list", "retrieve"]:
            return []

        if action is None and self.request.method == "GET":
            return []

        return [auth() for auth in self.authentication_classes]

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=True, methods=["get"])
    def usuarios_detalle(self, request, pk=None):
        curso = self.get_object()
        ids = curso.inscritos or []

        if not ids:
            return Response({"usuarios": []}, status=status.HTTP_200_OK)

        usuarios = get_users_batch(ids, request=request)
        if usuarios is None:
            return Response(
                {"error": "No se pudo obtener el detalle de usuarios desde Access."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"usuarios": usuarios}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def inscribir_usuario(self, request, pk=None):
        curso = self.get_object()
        user_id = request.data.get("user_id")

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return Response(
                {"error": "Debe proporcionar un 'user_id' entero válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        faltantes = validate_user_ids([user_id], request=request)
        if faltantes:
            return Response(
                {"error": f"Usuario con ID {user_id} no existe o no pudo validarse."},
                status=status.HTTP_404_NOT_FOUND,
            )

        inscritos = curso.inscritos or []
        if user_id in inscritos:
            return Response(
                {"message": "El usuario ya está inscrito."},
                status=status.HTTP_200_OK,
            )

        curso.inscritos = inscritos + [user_id]
        curso.save(update_fields=["inscritos"])

        clear_user_profile_cache(user_id)

        return Response(
            {"message": f"Usuario {user_id} inscrito exitosamente."},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def desinscribir_usuario(self, request, pk=None):
        curso = self.get_object()
        user_id = request.data.get("user_id")

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return Response(
                {"error": "Debe proporcionar un 'user_id' entero válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        inscritos = curso.inscritos or []
        if user_id not in inscritos:
            return Response(
                {"message": "El usuario no está inscrito en este curso."},
                status=status.HTTP_404_NOT_FOUND,
            )

        curso.inscritos = [uid for uid in inscritos if uid != user_id]
        curso.save(update_fields=["inscritos"])

        clear_user_profile_cache(user_id)

        return Response(
            {"message": f"Usuario {user_id} fue desinscrito del curso."},
            status=status.HTTP_200_OK,
        )