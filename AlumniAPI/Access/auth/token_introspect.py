# Access/auth/token_introspect.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth.models import User

class TokenIntrospectView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw = (request.data.get("token") or "").strip()
        if not raw:
            return Response({"active": False, "error": "token_required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = AccessToken(raw)  # valida firma + exp
            user_id = token.get("user_id")
            user = User.objects.get(id=user_id)

            carrera_id = token.get("carrera_id")
            carrera_codigo = token.get("carrera_codigo")
            carrera_nombre = token.get("carrera_nombre")

            return Response({
                "active": True,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                },
                "claims": {
                    "carrera_id": carrera_id,
                    "carrera_codigo": carrera_codigo,
                    "carrera_nombre": carrera_nombre,
                    "is_admin": bool(token.get("is_admin", False)),
                },
                "exp": int(token["exp"]),
                "iat": int(token["iat"]),
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"active": False, "error": "invalid_token"}, status=status.HTTP_200_OK)