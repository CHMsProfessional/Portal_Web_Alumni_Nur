from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils.text import slugify


class Comunidad(models.Model):
    nombre = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=180, unique=True, blank=True)

    carreras = ArrayField(models.IntegerField(), blank=True, default=list)
    usuarios = ArrayField(models.IntegerField(), blank=True, default=list)

    descripcion = models.TextField(blank=True)
    imagen_portada = models.ImageField(upload_to="comunidades/", null=True, blank=True)

    activo = models.BooleanField(default=True)

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nombre

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._build_unique_slug()
        super().save(*args, **kwargs)

    def _build_unique_slug(self) -> str:
        base_slug = slugify(self.nombre or "")[:160].strip("-")
        if not base_slug:
            base_slug = "comunidad"

        slug = base_slug
        suffix = 2

        while Comunidad.objects.exclude(pk=self.pk).filter(slug=slug).exists():
            slug = f"{base_slug[:150]}-{suffix}"
            suffix += 1

        return slug

    def tiene_usuario(self, user_id: int) -> bool:
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return False

        return user_id in (self.usuarios or [])

    class Meta:
        db_table = "comunidad"
        verbose_name = "Comunidad"
        verbose_name_plural = "Comunidades"
        ordering = ["nombre"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["activo"]),
            models.Index(fields=["fecha_creacion"]),
            models.Index(fields=["fecha_actualizacion"]),
        ]