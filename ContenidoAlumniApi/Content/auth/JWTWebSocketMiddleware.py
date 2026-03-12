import jwt
from urllib.parse import parse_qs
from types import SimpleNamespace

from django.conf import settings
from channels.db import database_sync_to_async


def _safe_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


@database_sync_to_async
def build_user_from_payload(payload):
    user_id = _safe_int(payload.get("user_id"))

    return SimpleNamespace(
        is_authenticated=user_id is not None,
        id=user_id,
        username=payload.get("username", ""),
        is_admin=bool(payload.get("is_admin", False)),
    )


def _build_anonymous_user():
    return SimpleNamespace(
        is_authenticated=False,
        id=None,
        username="",
        is_admin=False,
    )


class JWTWebSocketMiddleware:
    """
    Middleware WS para JWT simple.

    Objetivos:
    - resolver scope["user"] y scope["auth"]
    - exponer scope["auth_status"] para que el consumer tome decisiones claras
    - diferenciar token ausente / expirado / inválido / user_id inválido
    """

    AUTH_STATUS_OK = "ok"
    AUTH_STATUS_MISSING = "missing_token"
    AUTH_STATUS_EXPIRED = "expired_token"
    AUTH_STATUS_INVALID = "invalid_token"
    AUTH_STATUS_INVALID_USER = "invalid_user"

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)

        token = query_params.get("token", [None])[0]

        scope["auth"] = None
        scope["auth_error"] = None
        scope["auth_status"] = self.AUTH_STATUS_MISSING
        scope["user"] = _build_anonymous_user()

        if not token:
            return await self.inner(scope, receive, send)

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            payload["user_id"] = _safe_int(payload.get("user_id"))

            if payload["user_id"] is None:
                scope["auth_error"] = "Token does not contain a valid user_id"
                scope["auth_status"] = self.AUTH_STATUS_INVALID_USER
                return await self.inner(scope, receive, send)

            scope["auth"] = payload
            scope["user"] = await build_user_from_payload(payload)
            scope["auth_status"] = self.AUTH_STATUS_OK

        except jwt.ExpiredSignatureError:
            scope["auth_error"] = "Token has expired"
            scope["auth_status"] = self.AUTH_STATUS_EXPIRED

        except jwt.InvalidTokenError:
            scope["auth_error"] = "Invalid token"
            scope["auth_status"] = self.AUTH_STATUS_INVALID

        return await self.inner(scope, receive, send)