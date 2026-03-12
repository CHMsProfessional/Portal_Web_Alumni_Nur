# Content/api/testimonio_viewset.py

from rest_framework import serializers, viewsets

from Content.models import Testimonio
from Content.auth import JWTAuthentication
from Content.permissions.Allowed import Allowed
from Content.permissions.is_admin import isAdmin
from Content.permissions.permission_mixin import PermissionPolicyMixin


class TestimonioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonio
        fields = '__all__'


class TestimonioViewSet(PermissionPolicyMixin, viewsets.ModelViewSet):
    queryset = Testimonio.objects.all().order_by('-fecha')
    serializer_class = TestimonioSerializer
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