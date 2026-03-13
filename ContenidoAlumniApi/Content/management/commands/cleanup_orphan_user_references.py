import os

import requests
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

from Content.models import Comunidad, Curso, Evento
from Content.services import get_users_batch, clear_user_profile_cache


def _normalize_ids(values):
    normalized = []
    for value in values or []:
        try:
            normalized.append(int(value))
        except (TypeError, ValueError):
            continue
    return list(dict.fromkeys(normalized))


class Command(BaseCommand):
    help = "Limpia IDs de usuarios huérfanos en Comunidad.usuarios, Curso.inscritos y Evento.usuarios"

    def add_arguments(self, parser):
        parser.add_argument("--access-token", dest="access_token", help="JWT access token para consultar Access API")
        parser.add_argument("--username", dest="username", help="Usuario de Access para obtener token")
        parser.add_argument("--password", dest="password", help="Password de Access para obtener token")

    def _build_request_with_token(self, token: str):
        class _RequestLike:
            headers = {"Authorization": f"Bearer {token}"}

        return _RequestLike()

    def _login_access(self, username: str, password: str) -> str | None:
        access_api_base = (
            getattr(settings, "ACCESS_API_URL", os.getenv("ACCESS_API_URL", "")).rstrip("/") + "/"
        )
        if not access_api_base:
            return None

        token_url = f"{access_api_base}token/"
        try:
            response = requests.post(
                token_url,
                json={"username": username, "password": password},
                timeout=8,
            )
            if response.status_code != 200:
                return None
            return response.json().get("access")
        except requests.RequestException:
            return None

    def handle(self, *args, **options):
        token = options.get("access_token") or os.getenv("CLEANUP_ACCESS_TOKEN")
        if not token:
            username = options.get("username") or os.getenv("CLEANUP_ACCESS_USERNAME")
            password = options.get("password") or os.getenv("CLEANUP_ACCESS_PASSWORD")
            if username and password:
                token = self._login_access(username, password)

        if not token:
            raise CommandError(
                "Debe proporcionar autenticación de Access: --access-token o --username/--password."
            )

        request_ctx = self._build_request_with_token(token)

        comunidades = list(Comunidad.objects.all())
        cursos = list(Curso.objects.all())
        eventos = list(Evento.objects.all())

        all_ids = set()

        for comunidad in comunidades:
            all_ids.update(_normalize_ids(comunidad.usuarios))

        for curso in cursos:
            all_ids.update(_normalize_ids(curso.inscritos))

        for evento in eventos:
            all_ids.update(_normalize_ids(evento.usuarios))

        if not all_ids:
            self.stdout.write(self.style.SUCCESS("No hay IDs de usuario para validar."))
            return

        users = get_users_batch(sorted(all_ids), request=request_ctx)
        if users is None:
            raise CommandError("No se pudo validar usuarios contra Access. Abortando limpieza.")

        valid_ids = {
            int(user.get("id"))
            for user in users
            if isinstance(user, dict) and user.get("id") is not None
        }

        removed_ids = set()
        updated_comunidades = 0
        updated_cursos = 0
        updated_eventos = 0

        for comunidad in comunidades:
            original = _normalize_ids(comunidad.usuarios)
            cleaned = [uid for uid in original if uid in valid_ids]
            if cleaned != original:
                removed_ids.update(set(original) - set(cleaned))
                comunidad.usuarios = cleaned
                comunidad.save(update_fields=["usuarios", "fecha_actualizacion"])
                updated_comunidades += 1

        for curso in cursos:
            original = _normalize_ids(curso.inscritos)
            cleaned = [uid for uid in original if uid in valid_ids]
            if cleaned != original:
                removed_ids.update(set(original) - set(cleaned))
                curso.inscritos = cleaned
                curso.save(update_fields=["inscritos"])
                updated_cursos += 1

        for evento in eventos:
            original = _normalize_ids(evento.usuarios)
            cleaned = [uid for uid in original if uid in valid_ids]
            if cleaned != original:
                removed_ids.update(set(original) - set(cleaned))
                evento.usuarios = cleaned
                evento.save(update_fields=["usuarios"])
                updated_eventos += 1

        for uid in removed_ids:
            clear_user_profile_cache(uid)

        self.stdout.write(self.style.SUCCESS("Limpieza de referencias huérfanas completada."))
        self.stdout.write(
            f"Comunidades actualizadas: {updated_comunidades} | "
            f"Cursos actualizados: {updated_cursos} | "
            f"Eventos actualizados: {updated_eventos}"
        )
        self.stdout.write(f"IDs huérfanos removidos: {len(removed_ids)}")
