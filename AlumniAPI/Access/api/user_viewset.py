from django.contrib.auth.models import User
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class UserViewSet(viewsets.GenericViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=True, methods=['get'], url_path='me', url_name='me')
    def get_user_info(self, request, pk=None):
        user = self.get_object()
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='list', url_name='list')
    def get_all_users(self, request):
        users = self.queryset
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)
