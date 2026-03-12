from django.contrib.postgres.fields import ArrayField
from django.db import models


class Evento(models.Model):
    class EstadoEvento(models.TextChoices):
        ACTIVO = 'ACTIVO', 'Activo'
        FINALIZADO = 'FINALIZADO', 'Finalizado'
        CANCELADO = 'CANCELADO', 'Cancelado'

    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True)

    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField(null=True, blank=True)

    carreras = ArrayField(models.IntegerField(), blank=True, default=list)
    usuarios = ArrayField(models.IntegerField(), blank=True, default=list)

    requiere_registro = models.BooleanField(default=False)
    estado = models.CharField(max_length=20, choices=EstadoEvento.choices, default=EstadoEvento.ACTIVO)

    imagen_portada = models.ImageField(upload_to='eventos/portadas/', null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.titulo} ({self.get_estado_display()})"

    class Meta:
        db_table = 'evento'
        verbose_name = "Evento"
        verbose_name_plural = "Eventos"
        ordering = ['-fecha_inicio']
