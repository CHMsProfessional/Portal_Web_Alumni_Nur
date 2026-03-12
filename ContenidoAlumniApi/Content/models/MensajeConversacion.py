from django.db import models


class MensajeConversacion(models.Model):
    class EstadoMensaje(models.TextChoices):
        ACTIVO = "ACTIVO", "Activo"
        ELIMINADO = "ELIMINADO", "Eliminado"

    conversacion = models.ForeignKey(
        "ConversacionComunidad",
        on_delete=models.CASCADE,
        related_name="mensajes"
    )

    autor_id = models.IntegerField()

    contenido = models.TextField(blank=True, default="")
    archivo = models.FileField(
        upload_to="mensajes_conversacion/archivos/",
        null=True,
        blank=True
    )
    imagen = models.ImageField(
        upload_to="mensajes_conversacion/imagenes/",
        null=True,
        blank=True
    )

    estado = models.CharField(
        max_length=20,
        choices=EstadoMensaje.choices,
        default=EstadoMensaje.ACTIVO
    )

    fecha_envio = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    editado = models.BooleanField(default=False)

    def __str__(self):
        return f"Mensaje {self.id} - Conversación {self.conversacion_id} - Autor {self.autor_id}"

    @property
    def tiene_adjuntos(self) -> bool:
        return bool(self.archivo or self.imagen)

    def contenido_legible(self) -> str:
        return (self.contenido or "").strip()

    def esta_activo(self) -> bool:
        return self.estado == self.EstadoMensaje.ACTIVO

    class Meta:
        db_table = "mensaje_conversacion"
        verbose_name = "Mensaje de conversación"
        verbose_name_plural = "Mensajes de conversación"
        ordering = ["fecha_envio"]
        indexes = [
            models.Index(fields=["conversacion"]),
            models.Index(fields=["autor_id"]),
            models.Index(fields=["estado"]),
            models.Index(fields=["fecha_envio"]),
        ]