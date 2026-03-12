from django.contrib.auth.models import User
from django.test import TestCase

from Access.models import Carrera, UserAlumni


class SuperuserProfileSignalsTests(TestCase):
	def test_creates_user_alumni_for_superuser(self):
		superuser = User.objects.create_superuser(
			username="signal-admin",
			email="signal-admin@example.com",
			password="StrongPassword123!",
		)

		profile = UserAlumni.objects.get(user=superuser)

		self.assertEqual(profile.carrera.codigo, "SIN")
		self.assertEqual(profile.carrera.nombre, "Sin Especificar")


class CarreraCatalogTests(TestCase):
	def test_seeded_default_career_has_description(self):
		carrera = Carrera.objects.get(codigo="SIN")

		self.assertTrue(carrera.descripcion)
		self.assertTrue(carrera.activo)
