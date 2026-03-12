from django.db import models


class Documento(models.Model):
    class TipoDocumento(models.TextChoices):
        TESIS = 'TESIS', 'Tesis'
        CERTIFICADO = 'CERTIFICADO', 'Certificado'
        INVESTIGACION = 'INVESTIGACION', 'Investigación'
        INFORME = 'INFORME', 'Informe'
        OTRO = 'OTRO', 'Otro'

    nombre = models.CharField(max_length=255)
    tipo = models.CharField(max_length=50, choices=TipoDocumento.choices)

    carrera = models.IntegerField(null=True, blank=True)

    descripcion = models.TextField(blank=True, null=True)
    autor = models.CharField(max_length=255)

    archivo_documento = models.FileField(upload_to='documentos/')
    imagen_portada = models.ImageField(upload_to='portadas/', null=True, blank=True)

    fecha_subida = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'documento'
        verbose_name = 'Documento'
        verbose_name_plural = 'Documentos'
        ordering = ['-fecha_subida']

    def __str__(self):
        return self.nombre