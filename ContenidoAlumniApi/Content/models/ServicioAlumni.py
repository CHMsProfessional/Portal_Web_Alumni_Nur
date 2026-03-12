from django.db import models


class ServicioAlumni(models.Model):
    TIPO_CHOICES = [
        ('educacion', 'Educación Continua'),
        ('biblioteca', 'Biblioteca'),
        ('deporte', 'Club Deportivo'),
        ('otros', 'Otros Beneficios'),
    ]

    nombre = models.CharField(max_length=150)
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES)
    descripcion = models.TextField()
    icono = models.CharField(max_length=100, blank=True, null=True)
    link = models.URLField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre

    class Meta:
        db_table = 'servicio_alumni'
        verbose_name = 'Servicio Alumni'
        verbose_name_plural = 'Servicios Alumni'
        ordering = ['-fecha_creacion']
