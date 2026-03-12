from django.db import models


class Noticia(models.Model):
    class TipoNoticia(models.TextChoices):
        NORMAL = "NORMAL", "Normal"
        BOTON = "BOTON", "Normal con botón"
        EVENTO = "EVENTO", "Normal con evento"
        BOTON_EVENTO = "BOTON_EVENTO", "Normal con botón y evento"

    class DestinoNoticia(models.TextChoices):
        HOME = "HOME", "Home"
        COMUNIDAD = "COMUNIDAD", "Comunidad"

    titulo = models.CharField(max_length=220)
    resumen = models.CharField(max_length=320, blank=True, default="")
    contenido = models.TextField()

    imagen = models.ImageField(upload_to="noticias/", null=True, blank=True)

    tipo = models.CharField(
        max_length=20,
        choices=TipoNoticia.choices,
        default=TipoNoticia.NORMAL
    )
    destino = models.CharField(
        max_length=20,
        choices=DestinoNoticia.choices,
        default=DestinoNoticia.HOME
    )

    comunidad = models.ForeignKey(
        "Comunidad",
        on_delete=models.CASCADE,
        related_name="noticias",
        null=True,
        blank=True
    )
    evento = models.ForeignKey(
        "Evento",
        on_delete=models.SET_NULL,
        related_name="noticias_relacionadas",
        null=True,
        blank=True
    )

    boton_texto = models.CharField(max_length=80, blank=True, default="")
    boton_url = models.URLField(blank=True, default="")

    publicado = models.BooleanField(default=True)
    destacado = models.BooleanField(default=False)
    orden = models.PositiveIntegerField(default=0)

    fecha_publicacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    fecha_inicio_publicacion = models.DateTimeField(null=True, blank=True)
    fecha_fin_publicacion = models.DateTimeField(null=True, blank=True)

    creado_por_id = models.IntegerField(null=True, blank=True)
    actualizado_por_id = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.titulo

    def requiere_boton(self) -> bool:
        return self.tipo in {
            self.TipoNoticia.BOTON,
            self.TipoNoticia.BOTON_EVENTO,
        }

    def requiere_evento(self) -> bool:
        return self.tipo in {
            self.TipoNoticia.EVENTO,
            self.TipoNoticia.BOTON_EVENTO,
        }

    def es_publicable_en_home(self) -> bool:
        return self.destino == self.DestinoNoticia.HOME

    def es_publicable_en_comunidad(self) -> bool:
        return self.destino == self.DestinoNoticia.COMUNIDAD

    class Meta:
        db_table = "noticia"
        verbose_name = "Noticia"
        verbose_name_plural = "Noticias"
        ordering = ["-destacado", "orden", "-fecha_publicacion"]
        indexes = [
            models.Index(fields=["destino"]),
            models.Index(fields=["publicado"]),
            models.Index(fields=["destacado"]),
            models.Index(fields=["fecha_publicacion"]),
            models.Index(fields=["fecha_actualizacion"]),
            models.Index(fields=["fecha_inicio_publicacion"]),
            models.Index(fields=["fecha_fin_publicacion"]),
        ]