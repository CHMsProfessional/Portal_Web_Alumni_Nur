from django.db.models.signals import post_migrate
from django.dispatch import receiver
from Access.models import Carrera


CARRERAS_BASE = [
    {"codigo": "INGSIS", "nombre": "Ingeniería de Sistemas"},
    {"codigo": "INGCOM", "nombre": "Ingeniería Comercial"},
    {"codigo": "DER", "nombre": "Derecho"},
    {"codigo": "PSI", "nombre": "Psicología"},
    {"codigo": "ENF", "nombre": "Enfermería"},
    {"codigo": "MED", "nombre": "Medicina"},
    {"codigo": "CP", "nombre": "Contaduría Pública"},
    {"codigo": "ADM", "nombre": "Administración de Empresas"},
    {"codigo": "INGELEC", "nombre": "Ingeniería Electrónica"},
    {"codigo": "ARQ", "nombre": "Arquitectura"},
    {"codigo": "SIN", "nombre": "Sin Especificar"},
]


@receiver(post_migrate)
def seed_carreras(sender, **kwargs):
    if sender.name != 'Access':
        return

    for carrera in CARRERAS_BASE:
        Carrera.objects.update_or_create(
            codigo=carrera["codigo"],
            defaults={
                "nombre": carrera["nombre"],
                "activo": True
            }
        )