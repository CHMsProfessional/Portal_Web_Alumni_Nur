from django.db import models


class Carrera(models.Model):
    codigo = models.CharField(
        max_length=20,
        unique=True,
    )
    nombre = models.CharField(
        max_length=150,
        unique=True
    )
    descripcion = models.TextField(blank=True, default="")
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    class Meta:
        db_table = 'carrera'
        verbose_name = "Carrera"
        verbose_name_plural = "Carreras"
        ordering = ['nombre']