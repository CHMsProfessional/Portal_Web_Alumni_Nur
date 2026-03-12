from django.core.cache import cache
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from Content.auth import JWTAuthentication
from Content.api import ComunidadSerializer, CursoSerializer, EventoSerializer
from Content.models import Comunidad, Curso, Evento
from Content.services import (
    get_authenticated_user,
    cache_key_profile,
)


CACHE_TIMEOUT_SECONDS = 600


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def perfil_completo(request):
    user_data, status_code = get_authenticated_user(request)

    if status_code == 503:
        return Response(
            {"detail": "No se pudo contactar con Access API."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if status_code == 404:
        return Response(
            {"detail": "El usuario autenticado no tiene perfil alumni."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if status_code != 200 or not user_data:
        return Response(
            {"detail": "No se pudo obtener el perfil alumni autenticado."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    user_alumni_id = user_data.get("id")
    if not user_alumni_id:
        return Response(
            {"detail": "No se pudo resolver el id del usuario alumni autenticado."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    cache_key = cache_key_profile(user_alumni_id)
    cached_profile = cache.get(cache_key)
    if cached_profile is not None:
        return Response(cached_profile, status=status.HTTP_200_OK)

    comunidades = Comunidad.objects.filter(usuarios__contains=[user_alumni_id]).order_by("-fecha_creacion")
    cursos = Curso.objects.filter(inscritos__contains=[user_alumni_id]).order_by("-fecha_creacion")
    eventos = Evento.objects.filter(usuarios__contains=[user_alumni_id]).order_by("-fecha_inicio")

    payload = {
        "usuario": user_data,
        "comunidades": ComunidadSerializer(comunidades, many=True).data,
        "cursos": CursoSerializer(cursos, many=True).data,
        "eventos": EventoSerializer(eventos, many=True).data,
    }

    cache.set(cache_key, payload, timeout=CACHE_TIMEOUT_SECONDS)
    return Response(payload, status=status.HTTP_200_OK)