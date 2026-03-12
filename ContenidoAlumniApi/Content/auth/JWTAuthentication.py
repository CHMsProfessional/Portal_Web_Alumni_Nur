import jwt
from types import SimpleNamespace

from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


def _safe_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return None

        parts = auth_header.split()

        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise AuthenticationFailed("Authorization header must be: Bearer <token>")

        token = parts[1]

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token has expired")
        except jwt.InvalidTokenError:
            raise AuthenticationFailed("Invalid token")

        user_id = _safe_int(payload.get("user_id"))
        if user_id is None:
            raise AuthenticationFailed("Token does not contain a valid user_id")

        user = SimpleNamespace(
            is_authenticated=True,
            id=user_id,
            username=payload.get("username", ""),
            is_admin=bool(payload.get("is_admin", False)),
        )

        payload["user_id"] = user_id
        return user, payload