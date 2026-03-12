from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db import IntegrityError, transaction

import requests

from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from Access.api import SimpleUserSerializer
from Access.models import UserAlumni
from Access.permissions import isAdmin, PermissionPolicyMixin

import os

CONTENT_API_BASE_URL = os.getenv("CONTENT_API_BASE_URL", "http://content-api:8001/")


def notify_cache_clear(user_alumni_id):
    try:
        requests.post(
            f"{CONTENT_API_BASE_URL}api/limpiar-cache-usuario/{user_alumni_id}/",
            timeout=3,
        )
    except requests.RequestException:
        pass


class UserAlumniSerializer(serializers.ModelSerializer):
    user = SimpleUserSerializer(read_only=True)

    username = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False)
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(write_only=True, required=False)

    carrera_id = serializers.IntegerField(source="carrera.id", read_only=True)
    carrera_codigo = serializers.CharField(source="carrera.codigo", read_only=True)
    carrera_nombre = serializers.CharField(source="carrera.nombre", read_only=True)

    is_admin = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = UserAlumni
        fields = [
            "id",
            "user",
            "username",
            "password",
            "first_name",
            "last_name",
            "email",
            "carrera",
            "carrera_id",
            "carrera_codigo",
            "carrera_nombre",
            "is_admin",
        ]

    def validate(self, attrs):
        is_create = self.instance is None

        if is_create:
            required_fields = ["username", "password", "carrera"]
            missing_fields = [field for field in required_fields if not attrs.get(field)]

            if missing_fields:
                raise serializers.ValidationError({
                    field: [f"El campo '{field}' es obligatorio."]
                    for field in missing_fields
                })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        username = validated_data.pop("username")
        password = validated_data.pop("password")
        first_name = validated_data.pop("first_name", "")
        last_name = validated_data.pop("last_name", "")
        email = validated_data.pop("email", "")
        is_admin = validated_data.pop("is_admin", False)

        carrera = validated_data.pop("carrera", None)

        if carrera is None:
            raise serializers.ValidationError({
                "carrera": ["La carrera es obligatoria."]
            })

        try:
            if is_admin:
                user = User.objects.create_superuser(
                    username=username,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                )
            else:
                user = User.objects.create_user(
                    username=username,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                )
        except IntegrityError:
            raise serializers.ValidationError({
                "username": ["Este nombre de usuario ya está en uso."]
            })

        user_alumni = UserAlumni.objects.create(
            user=user,
            carrera=carrera,
            **validated_data,
        )

        notify_cache_clear(user_alumni.id)
        return user_alumni

    @transaction.atomic
    def update(self, instance, validated_data):
        is_admin = validated_data.pop("is_admin", None)
        carrera = validated_data.pop("carrera", None)

        if carrera is not None:
            instance.carrera = carrera

        if is_admin is not None:
            instance.user.is_superuser = is_admin
            instance.user.is_staff = is_admin
            instance.user.save(update_fields=["is_superuser", "is_staff"])

        instance = super().update(instance, validated_data)
        notify_cache_clear(instance.id)
        return instance


class UserAlumniViewSet(PermissionPolicyMixin, viewsets.ModelViewSet):
    queryset = UserAlumni.objects.select_related("user", "carrera").all()
    serializer_class = UserAlumniSerializer
    authentication_classes = [JWTAuthentication]

    permission_classes_per_method = {
        "create": [isAdmin],
        "list": [IsAuthenticated],
        "retrieve": [IsAuthenticated],
        "update": [IsAuthenticated],
        "partial_update": [IsAuthenticated],
        "destroy": [isAdmin],
        "me": [IsAuthenticated],
        "notificar_nueva_noticia": [isAdmin],
    }

    def get_queryset(self):
        queryset = UserAlumni.objects.select_related("user", "carrera").all()
        ids = self.request.GET.get("ids")

        if ids:
            id_list = [int(i) for i in ids.split(",") if i.isdigit()]
            queryset = queryset.filter(id__in=id_list)

        return queryset

    def _is_admin(self, request) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)

    def _get_authenticated_user_alumni(self, request):
        try:
            return UserAlumni.objects.select_related("user", "carrera").get(user=request.user)
        except UserAlumni.DoesNotExist:
            return None

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        output_serializer = self.get_serializer(serializer.instance)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()

        if not self._is_admin(request):
            current_user_alumni = self._get_authenticated_user_alumni(request)
            if current_user_alumni is None:
                return Response(
                    {"detail": "Usuario no encontrado."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if instance.id != current_user_alumni.id:
                return Response(
                    {"detail": "No tienes permiso para ver este usuario."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        is_admin = self._is_admin(request)
        current_user_alumni = self._get_authenticated_user_alumni(request)

        if current_user_alumni is None:
            return Response(
                {"detail": "Usuario no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not is_admin and instance.id != current_user_alumni.id:
            return Response(
                {"detail": "No tienes permiso para editar otro usuario."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not is_admin:
            forbidden_fields = []

            if "is_admin" in request.data:
                forbidden_fields.append("is_admin")
            if "username" in request.data:
                forbidden_fields.append("username")
            if "carrera" in request.data:
                forbidden_fields.append("carrera")

            if forbidden_fields:
                return Response(
                    {
                        "detail": (
                            "No tienes permiso para modificar los siguientes campos: "
                            + ", ".join(forbidden_fields)
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        user = instance.user

        if "username" in request.data:
            user.username = request.data.get("username", user.username)

        if "first_name" in request.data:
            user.first_name = request.data.get("first_name", user.first_name)

        if "last_name" in request.data:
            user.last_name = request.data.get("last_name", user.last_name)

        if "email" in request.data:
            user.email = request.data.get("email", user.email)

        password = request.data.get("password")
        if password is not None and str(password).strip():
            user.set_password(str(password).strip())

        try:
            user.save()
        except IntegrityError:
            return Response(
                {"username": ["Este nombre de usuario ya está en uso."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        self.perform_update(serializer)

        if getattr(instance, "_prefetched_objects_cache", None):
            instance._prefetched_objects_cache = {}

        output_serializer = self.get_serializer(serializer.instance)
        return Response(output_serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_alumni_id = instance.id
        user = instance.user

        notify_cache_clear(user_alumni_id)

        instance.delete()
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def list(self, request, *args, **kwargs):
        ids = request.GET.get("ids")

        if not ids and not self._is_admin(request):
            return Response(
                {"detail": "Solo administradores pueden listar todos los usuarios."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if ids:
            queryset = self.get_queryset()
            id_list = [int(i) for i in ids.split(",") if i.isdigit()]
            queryset = queryset.filter(id__in=id_list)

            encontrados = list(queryset.values_list("id", flat=True))
            faltantes = list(set(id_list) - set(encontrados))

            serializer = self.get_serializer(queryset, many=True)
            return Response({
                "encontrados": serializer.data,
                "faltantes": faltantes,
            })

        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="me", url_name="me")
    @permission_classes([IsAuthenticated])
    def me(self, request):
        try:
            user_alumni = UserAlumni.objects.select_related("user", "carrera").get(user=request.user)
            serializer = self.get_serializer(user_alumni)
            return Response(serializer.data)
        except UserAlumni.DoesNotExist:
            return Response(
                {"detail": "User alumni not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=False, methods=["post"], url_path="notificar-nueva-noticia")
    @permission_classes([isAdmin])
    def notificar_nueva_noticia(self, request):
        titulo = request.data.get("titulo", "").strip()
        contenido = request.data.get("contenido", "").strip()
        fecha = request.data.get("fecha", "").strip()

        if not titulo or not contenido:
            return Response(
                {"error": "Faltan datos obligatorios."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuarios = User.objects.filter(email__isnull=False).exclude(email="").values_list("email", flat=True)

        asunto = f"📢 Nueva Noticia: {titulo}"
        mensaje = f"""
¡Hola Alumni!

Tenemos una nueva noticia para ti:

📰 {titulo}
📅 Publicado el: {fecha}

{contenido}

Visítanos en el portal para más información.
        """

        enviados = 0
        no_enviados = []

        for email in usuarios:
            try:
                send_mail(
                    subject=asunto,
                    message=mensaje,
                    from_email="no-reply@alumni.nur.edu.bo",
                    recipient_list=[email],
                    fail_silently=False,
                )
                enviados += 1
            except Exception:
                no_enviados.append(email)

        return Response({
            "status": "ok",
            "enviados": enviados,
            "no_enviados": no_enviados,
        }, status=status.HTTP_200_OK)