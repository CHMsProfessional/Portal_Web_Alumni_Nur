from django.contrib.postgres.fields import ArrayField
from django.db import models


class Curso(models.Model):
    class Modalidad(models.TextChoices):
        PRESENCIAL = 'PRESENCIAL', 'Presencial'
        VIRTUAL = 'VIRTUAL', 'Virtual'
        MIXTO = 'MIXTO', 'Mixto'

    class Estado(models.TextChoices):
        ACTIVO = 'ACTIVO', 'Activo'
        INACTIVO = 'INACTIVO', 'Inactivo'
        FINALIZADO = 'FINALIZADO', 'Finalizado'
        CANCELADO = 'CANCELADO', 'Cancelado'

    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True, help_text="Descripción del curso")
    responsable = models.CharField(max_length=255, help_text="Nombre del encargado del curso (docente o responsable)")

    modalidad = models.CharField(max_length=20, choices=Modalidad.choices, default=Modalidad.PRESENCIAL)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVO)

    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(blank=True, null=True, help_text="Fecha de finalización del curso (opcional)")

    inscritos = ArrayField(models.IntegerField(), blank=True, default=list)

    imagen_portada = models.ImageField(upload_to='cursos/portadas/', null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.titulo} ({self.get_estado_display()})"

    class Meta:
        ordering = ['-fecha_creacion']
