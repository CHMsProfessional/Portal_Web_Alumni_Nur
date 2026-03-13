import os
from typing import Iterable, Any

import requests
from django.conf import settings
from django.core.cache import cache


DEFAULT_TIMEOUT = 5


def get_access_api_base() -> str:
    return getattr(
        settings,
        "ACCESS_API_URL",
        os.getenv("ACCESS_API_URL", "http://access-api:8000/api/")
    ).rstrip("/") + "/"


def build_auth_headers(request=None) -> dict:
    if request is None:
        return {}

    auth_header = request.headers.get("Authorization", "").strip()
    return {"Authorization": auth_header} if auth_header else {}


def _normalize_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_ids(ids: Iterable) -> list[int]:
    normalized = []
    for value in ids or []:
        parsed = _normalize_int(value)
        if parsed is not None:
            normalized.append(parsed)
    return list(dict.fromkeys(normalized))


def _cache_get(key):
    return cache.get(key)


def _cache_set(key, value, timeout=600):
    cache.set(key, value, timeout=timeout)


def cache_key_user(user_id: int) -> str:
    return f"user_alumni_{int(user_id)}"


def cache_key_carrera(carrera_id: int) -> str:
    return f"carrera_{int(carrera_id)}"


def cache_key_profile(user_id: int) -> str:
    return f"perfil_completo_{int(user_id)}"


def cache_key_comunidad_miembros(comunidad_id: int) -> str:
    return f"comunidad_{int(comunidad_id)}_miembros"


def cache_key_evento_miembros(evento_id: int) -> str:
    return f"evento_{int(evento_id)}_miembros"


def clear_user_cache(user_id: int) -> None:
    cache.delete(cache_key_user(user_id))


def clear_user_profile_cache(user_id: int) -> None:
    cache.delete(cache_key_profile(user_id))


def clear_comunidad_members_cache(comunidad_id: int) -> None:
    cache.delete(cache_key_comunidad_miembros(comunidad_id))


def clear_evento_members_cache(evento_id: int) -> None:
    cache.delete(cache_key_evento_miembros(evento_id))


def _request_access(method: str, path: str, *, request=None, params=None, json=None, timeout=DEFAULT_TIMEOUT):
    url = f"{get_access_api_base()}{path.lstrip('/')}"
    return requests.request(
        method=method,
        url=url,
        headers=build_auth_headers(request),
        params=params,
        json=json,
        timeout=timeout,
    )


def get_user_by_id(user_id: int, request=None):
    user_id = _normalize_int(user_id)
    if user_id is None:
        return None

    key = cache_key_user(user_id)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    try:
        response = _request_access("GET", f"userAlumni/{user_id}/", request=request)
        if response.status_code == 200:
            payload = response.json()
            _cache_set(key, payload, timeout=600)
            return payload
    except requests.RequestException:
        return None

    return None


def get_users_batch(user_ids, request=None):
    ids = _normalize_ids(user_ids)
    if not ids:
        return []

    try:
        response = _request_access(
            "GET",
            "userAlumni/",
            request=request,
            params={"ids": ",".join(map(str, ids))},
        )
    except requests.RequestException:
        return None

    if response.status_code != 200:
        return None

    payload = response.json()
    encontrados = payload.get("encontrados", []) if isinstance(payload, dict) else payload

    for item in encontrados:
        user_id = _normalize_int(item.get("id"))
        if user_id is not None:
            _cache_set(cache_key_user(user_id), item, timeout=600)

    return encontrados


def get_authenticated_user(request):
    try:
        response = _request_access("GET", "userAlumni/me/", request=request)
    except requests.RequestException:
        return None, 503

    if response.status_code == 200:
        return response.json(), 200

    return None, response.status_code


def get_carrera_by_id(carrera_id: int, request=None):
    carrera_id = _normalize_int(carrera_id)
    if carrera_id is None:
        return None

    key = cache_key_carrera(carrera_id)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    try:
        response = _request_access("GET", f"carrera/{carrera_id}/", request=request)
        if response.status_code == 200:
            payload = response.json()
            _cache_set(key, payload, timeout=600)
            return payload
    except requests.RequestException:
        return None

    return None


def get_carreras_batch(carrera_ids, request=None):
    ids = _normalize_ids(carrera_ids)
    if not ids:
        return []

    try:
        response = _request_access(
            "GET",
            "carrera/",
            request=request,
            params={"ids": ",".join(map(str, ids))},
        )
    except requests.RequestException:
        return None

    if response.status_code != 200:
        return None

    payload = response.json()
    encontrados = payload.get("encontrados", []) if isinstance(payload, dict) else payload

    for item in encontrados:
        carrera_id = _normalize_int(item.get("id"))
        if carrera_id is not None:
            _cache_set(cache_key_carrera(carrera_id), item, timeout=600)

    return encontrados


def validate_user_ids(user_ids, request=None) -> list[int]:
    ids = _normalize_ids(user_ids)
    if not ids:
        return []

    encontrados = get_users_batch(ids, request=request)
    if encontrados is None:
        return ids

    encontrados_ids = {
        _normalize_int(item.get("id"))
        for item in encontrados
        if isinstance(item, dict)
    }

    return [uid for uid in ids if uid not in encontrados_ids]


def prune_invalid_user_ids(user_ids, request=None) -> tuple[list[int], list[int]] | None:
    """
    Retorna una tupla (ids_validos, ids_huerfanos).
    Si Access no responde, retorna None para que el caller decida el fallback.
    """
    ids = _normalize_ids(user_ids)
    if not ids:
        return [], []

    encontrados = get_users_batch(ids, request=request)
    if encontrados is None:
        return None

    encontrados_ids = {
        _normalize_int(item.get("id"))
        for item in encontrados
        if isinstance(item, dict)
    }

    validos = [uid for uid in ids if uid in encontrados_ids]
    huerfanos = [uid for uid in ids if uid not in encontrados_ids]
    return validos, huerfanos


def validate_carrera_ids(carrera_ids, request=None) -> list[int]:
    ids = _normalize_ids(carrera_ids)
    if not ids:
        return []

    encontradas = get_carreras_batch(ids, request=request)
    if encontradas is None:
        return ids

    encontradas_ids = {
        _normalize_int(item.get("id"))
        for item in encontradas
        if isinstance(item, dict)
    }

    return [cid for cid in ids if cid not in encontradas_ids]


def notify_new_news(request, *, titulo: str, contenido: str, fecha: Any):
    """
    Notifica a Access sobre una nueva noticia o actualización.
    Reenvía el Authorization del request original, porque el endpoint
    en Access exige autenticación/permisos.
    """
    try:
        response = _request_access(
            "POST",
            "userAlumni/notificar-nueva-noticia/",
            request=request,
            json={
                "titulo": titulo,
                "contenido": (contenido or "")[:300],
                "fecha": fecha,
            },
        )
        return response.status_code, response.text
    except requests.RequestException as exc:
        return None, str(exc)