from rest_framework import serializers, viewsets
from Content.models import ServicioAlumni
from Content.auth import JWTAuthentication
from Content.permissions.Allowed import Allowed
from Content.permissions.is_admin import isAdmin
from Content.permissions.permission_mixin import PermissionPolicyMixin



# === SERIALIZER ===

class ServicioAlumniSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicioAlumni
        fields = '__all__'
        read_only_fields = ['fecha_creacion']


# === VIEWSET ===

class ServicioAlumniViewSet(PermissionPolicyMixin, viewsets.ModelViewSet):
    queryset = ServicioAlumni.objects.all().order_by('-fecha_creacion')
    serializer_class = ServicioAlumniSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes_per_method = {
        'create': [isAdmin],
        'update': [isAdmin],
        'partial_update': [isAdmin],
        'destroy': [isAdmin],
        'list': [Allowed],
        'retrieve': [Allowed]
    }

    
    def get_authenticators(self):
        action = getattr(self, 'action', None)

        if action in ['list', 'retrieve']:
            return []

        if action is None:
            if self.request.method == 'GET':
                lookup_url_kwarg = getattr(self, 'lookup_url_kwarg', None) or self.lookup_field
                if self.kwargs.get(lookup_url_kwarg) is None:
                    return []  # list
                return []      # retrieve

        return [auth() for auth in self.authentication_classes]