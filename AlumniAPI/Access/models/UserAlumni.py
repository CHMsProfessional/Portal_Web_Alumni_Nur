from django.contrib.auth.models import User
from django.db import models

from Access.models import Carrera


class UserAlumni(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    carrera = models.ForeignKey(Carrera, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = "User Alumni"
        verbose_name_plural = "User Alumni"
        db_table = 'user_alumni'

    def __str__(self):
        return self.user.username

    @property
    def is_admin(self):
        return self.user.is_superuser
