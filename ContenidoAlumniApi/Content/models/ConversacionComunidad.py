from django.db import models
from django.utils.text import slugify
from django.utils import timezone


class ConversacionComunidad(models.Model):
    class EstadoConversacion(models.TextChoices):
        ABIERTA = "ABIERTA", "Abierta"
        CERRADA = "CERRADA", "Cerrada"

    comunidad = models.ForeignKey(
        "Comunidad",
        on_delete=models.CASCADE,
        related_name="conversaciones"
    )

    titulo = models.CharField(max_length=180)
    slug = models.SlugField(max_length=220, blank=True)

    descripcion = models.TextField(blank=True, default="")
    imagen = models.ImageField(upload_to="conversaciones/", null=True, blank=True)

    creador_id = models.IntegerField()

    estado = models.CharField(
        max_length=20,
        choices=EstadoConversacion.choices,
        default=EstadoConversacion.ABIERTA
    )
    activa = models.BooleanField(default=True)

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    cerrado_por_id = models.IntegerField(null=True, blank=True)

    ultimo_mensaje_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.titulo} - {self.comunidad.nombre}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._build_unique_slug()
        super().save(*args, **kwargs)

    def _build_unique_slug(self) -> str:
        base_slug = slugify(self.titulo or "")[:190].strip("-")
        if not base_slug:
            base_slug = "conversacion"

        slug = base_slug
        suffix = 2

        while ConversacionComunidad.objects.exclude(pk=self.pk).filter(
            comunidad=self.comunidad,
            slug=slug
        ).exists():
            slug = f"{base_slug[:180]}-{suffix}"
            suffix += 1

        return slug

    def esta_abierta(self) -> bool:
        return self.estado == self.EstadoConversacion.ABIERTA and self.activa

    def cerrar(self, user_id: int | None = None, save: bool = True):
        self.estado = self.EstadoConversacion.CERRADA
        self.fecha_cierre = timezone.now()
        self.cerrado_por_id = user_id

        if save:
            self.save(update_fields=[
                "estado",
                "fecha_cierre",
                "cerrado_por_id",
                "fecha_actualizacion",
            ])

    def reabrir(self, save: bool = True):
        self.estado = self.EstadoConversacion.ABIERTA
        self.fecha_cierre = None
        self.cerrado_por_id = None

        if save:
            self.save(update_fields=[
                "estado",
                "fecha_cierre",
                "cerrado_por_id",
                "fecha_actualizacion",
            ])

    class Meta:
        db_table = "conversacion_comunidad"
        verbose_name = "Conversación de comunidad"
        verbose_name_plural = "Conversaciones de comunidad"
        ordering = ["-ultimo_mensaje_at", "-fecha_creacion"]
        constraints = [
            models.UniqueConstraint(
                fields=["comunidad", "slug"],
                name="uq_conversacion_comunidad_slug"
            )
        ]
        indexes = [
            models.Index(fields=["comunidad"]),
            models.Index(fields=["estado"]),
            models.Index(fields=["activa"]),
            models.Index(fields=["fecha_creacion"]),
            models.Index(fields=["ultimo_mensaje_at"]),
        ]