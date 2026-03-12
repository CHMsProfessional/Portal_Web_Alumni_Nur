from django.db import models


class Carrera(models.Model):
    class CodigoCarrera(models.TextChoices):
        INGENIERIA_SISTEMAS = 'INGSIS', 'Ingeniería de Sistemas'
        INGENIERIA_COMERCIAL = 'INGCOM', 'Ingeniería Comercial'
        DERECHO = 'DER', 'Derecho'
        PSICOLOGIA = 'PSI', 'Psicología'
        ENFERMERIA = 'ENF', 'Enfermería'
        MEDICINA = 'MED', 'Medicina'
        CONTADURIA_PUBLICA = 'CP', 'Contaduría Pública'
        ADMINISTRACION_EMPRESAS = 'ADM', 'Administración de Empresas'
        ING_ELECTRONICA = 'INGELEC', 'Ingeniería Electrónica'
        ARQUITECTURA = 'ARQ', 'Arquitectura'
        SIN_ESPECIFICAR = 'SIN', 'Sin Especificar'

    codigo = models.CharField(
        max_length=20,
        choices=CodigoCarrera.choices,
        unique=True,
    )
    nombre = models.CharField(
        max_length=150,
        unique=True
    )
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    class Meta:
        db_table = 'carrera'
        verbose_name = "Carrera"
        verbose_name_plural = "Carreras"
        ordering = ['nombre']