from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status

from Content.services import clear_user_cache, clear_user_profile_cache


@api_view(["POST"])
def limpiar_cache_usuario(request, user_alumni_id):
    try:
        user_alumni_id = int(user_alumni_id)
    except (TypeError, ValueError):
        return Response(
            {"detail": "El user_alumni_id debe ser un entero válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    clear_user_cache(user_alumni_id)
    clear_user_profile_cache(user_alumni_id)

    return Response(
        {"status": "cache eliminado", "user_alumni_id": user_alumni_id},
        status=status.HTTP_200_OK,
    )