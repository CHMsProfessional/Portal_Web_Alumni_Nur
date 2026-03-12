# Content/models/Testimonio.py
from django.db import models


class Testimonio(models.Model):
    titulo = models.CharField(max_length=255)
    contenido = models.TextField()
    autor = models.CharField(max_length=255, default='Anónimo')
    fecha = models.DateField(auto_now_add=True)
    imagen = models.ImageField(upload_to='testimonios/', null=True, blank=True)

    class Meta:
        db_table = 'testimonio'
        verbose_name = 'Testimonio'
        verbose_name_plural = 'Testimonios'
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.titulo} - {self.autor}"