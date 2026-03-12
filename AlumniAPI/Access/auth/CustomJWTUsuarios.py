from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from Access.models import UserAlumni


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @staticmethod
    def _build_carrera_payload(user):
        try:
            alumni = user.useralumni
        except UserAlumni.DoesNotExist:
            return {
                "carrera_id": None,
                "carrera_codigo": None,
                "carrera_nombre": None,
            }

        carrera = alumni.carrera
        if not carrera:
            return {
                "carrera_id": None,
                "carrera_codigo": None,
                "carrera_nombre": None,
            }

        return {
            "carrera_id": carrera.id,
            "carrera_codigo": carrera.codigo,
            "carrera_nombre": carrera.nombre,
        }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        carrera_payload = cls._build_carrera_payload(user)
        for key, value in carrera_payload.items():
            token[key] = value

        token["is_admin"] = bool(getattr(user, "is_superuser", False))

        try:
            token["user_alumni_id"] = user.useralumni.id
        except UserAlumni.DoesNotExist:
            token["user_alumni_id"] = None

        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        carrera_payload = self._build_carrera_payload(self.user)
        data.update(carrera_payload)

        data["is_admin"] = bool(getattr(self.user, "is_superuser", False))
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer