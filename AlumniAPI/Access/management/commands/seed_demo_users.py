import random

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from Access.models import Carrera, UserAlumni


class Command(BaseCommand):
    help = "Crea usuarios alumni demo para presentaciones del portal"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=20,
            help="Cantidad de usuarios demo a crear (default: 20)",
        )
        parser.add_argument(
            "--password",
            type=str,
            default="Demo12345!",
            help="Contrasena para los usuarios demo",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Elimina usuarios demo existentes antes de crear nuevos",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        count = max(1, options["count"])
        default_password = options["password"]
        do_reset = options["reset"]

        carreras = list(Carrera.objects.filter(activo=True))
        if not carreras:
            self.stdout.write(self.style.ERROR("No hay carreras activas para asignar."))
            return

        if do_reset:
            demo_users = User.objects.filter(username__startswith="alumni_demo_")
            deleted_count, _ = demo_users.delete()
            self.stdout.write(self.style.WARNING(f"Reset aplicado. Registros eliminados: {deleted_count}"))

        nombres = [
            "Ana", "Luis", "Maria", "Jorge", "Carla", "Daniel", "Paula", "Diego", "Natalia", "Sergio",
            "Gabriela", "Miguel", "Adriana", "Fernando", "Lucia", "Rodrigo", "Andrea", "Matias", "Valeria", "Ivan",
        ]
        apellidos = [
            "Perez", "Lopez", "Garcia", "Rojas", "Mamani", "Torrez", "Vargas", "Flores", "Quispe", "Medina",
            "Suarez", "Chavez", "Gutierrez", "Sanchez", "Alvarez", "Mendez", "Lara", "Rivera", "Cruz", "Castro",
        ]

        created = 0
        updated = 0

        for i in range(1, count + 1):
            username = f"alumni_demo_{i:03d}"
            first_name = random.choice(nombres)
            last_name = random.choice(apellidos)
            email = f"{username}@demo.alumni.local"

            user, was_created = User.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": email,
                    "is_active": True,
                },
            )

            if was_created:
                user.set_password(default_password)
                user.save(update_fields=["password"])
                created += 1
            else:
                user.first_name = first_name
                user.last_name = last_name
                user.email = email
                user.is_active = True
                user.set_password(default_password)
                user.save(update_fields=["first_name", "last_name", "email", "is_active", "password"])
                updated += 1

            carrera = random.choice(carreras)
            UserAlumni.objects.update_or_create(
                user=user,
                defaults={"carrera": carrera},
            )

        self.stdout.write(self.style.SUCCESS(f"Usuarios demo creados: {created}"))
        self.stdout.write(self.style.SUCCESS(f"Usuarios demo actualizados: {updated}"))
        self.stdout.write(self.style.SUCCESS(f"Contrasena usada: {default_password}"))
