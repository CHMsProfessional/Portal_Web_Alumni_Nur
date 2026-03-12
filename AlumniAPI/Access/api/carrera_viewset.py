from rest_framework import serializers, viewsets, status
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from Access.models import Carrera
from Access.permissions import Allowed, PermissionPolicyMixin, isAdmin


class CarreraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carrera
        fields = ['id', 'codigo', 'nombre', 'descripcion', 'activo']


class CarreraViewSet(PermissionPolicyMixin, viewsets.ModelViewSet):
    queryset = Carrera.objects.filter(activo=True).order_by('nombre')
    serializer_class = CarreraSerializer
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

        return [auth() for auth in self.authentication_classes]

    def list(self, request, *args, **kwargs):
        ids = request.query_params.get('ids')
        if ids:
            id_list = [int(i) for i in ids.split(',') if i.isdigit()]
            encontrados = Carrera.objects.filter(id__in=id_list)
            encontrados_ids = encontrados.values_list('id', flat=True)
            faltantes = list(set(id_list) - set(encontrados_ids))
            serializer = self.get_serializer(encontrados, many=True)
            return Response({
                "encontrados": serializer.data,
                "faltantes": faltantes
            }, status=status.HTTP_200_OK)

        return super().list(request, *args, **kwargs)

