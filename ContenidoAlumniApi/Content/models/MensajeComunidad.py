from django.db import models


class MensajeComunidad(models.Model):
    comunidad = models.ForeignKey("Comunidad", on_delete=models.CASCADE, related_name="mensajes")
    autor_id = models.IntegerField()
    contenido = models.TextField(blank=True)
    archivo = models.FileField(upload_to='mensajes_archivos/', null=True, blank=True)
    imagen = models.ImageField(upload_to='mensajes_imagenes/', null=True, blank=True)
    fecha_envio = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['fecha_envio']
