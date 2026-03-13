from django.contrib.auth.models import User
from django.test import TestCase

from Access.models import Carrera, UserAlumni

from Access.api.user_alumni_viewset import UserAlumniSerializer


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


class UserAlumniAdminUpdateTests(TestCase):
	def test_admin_not_demoted_when_is_admin_omitted_on_put(self):
		admin_user = User.objects.create_superuser(
			username="admin-put",
			email="admin-put@example.com",
			password="StrongPassword123!",
		)
		profile = UserAlumni.objects.get(user=admin_user)

		self.assertTrue(admin_user.is_superuser)

		serializer = UserAlumniSerializer(
			instance=profile,
			data={"carrera": profile.carrera_id},
			partial=False,
		)
		self.assertTrue(serializer.is_valid(), serializer.errors)
		serializer.save()

		admin_user.refresh_from_db()
		self.assertTrue(admin_user.is_superuser)

	def test_admin_not_demoted_when_is_admin_omitted_on_patch(self):
		admin_user = User.objects.create_superuser(
			username="admin-patch",
			email="admin-patch@example.com",
			password="StrongPassword123!",
		)
		profile = UserAlumni.objects.get(user=admin_user)

		serializer = UserAlumniSerializer(
			instance=profile,
			data={},
			partial=True,
		)
		self.assertTrue(serializer.is_valid(), serializer.errors)
		serializer.save()

		admin_user.refresh_from_db()
		self.assertTrue(admin_user.is_superuser)
