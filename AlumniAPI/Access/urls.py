from django.urls import path, include
from rest_framework import routers
from rest_framework_simplejwt.views import TokenRefreshView

from Access.api import UserAlumniViewSet, UserViewSet, CarreraViewSet
from Access.auth import CustomTokenObtainPairView, TokenIntrospectView

router = routers.DefaultRouter()
router.register(r'userAlumni', UserAlumniViewSet)
router.register(r'carrera', CarreraViewSet)
router.register(r'user', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/introspect/', TokenIntrospectView.as_view(), name='token_introspect'),
]
