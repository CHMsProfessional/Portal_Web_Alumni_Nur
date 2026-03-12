from django.urls import path, include
from rest_framework import routers

from Content.api import ComunidadViewSet, CursoViewSet, DocumentoViewSet, EventoViewSet, TestimonioViewSet, \
    NoticiaViewSet, ServicioAlumniViewSet, MensajeComunidadViewSet
from Content.api.conversacion_comunidad_viewset import ConversacionComunidadViewSet
from Content.api.mensaje_conversacion_viewset import MensajeConversacionViewSet
from Content.views import perfil_completo, limpiar_cache_usuario

router = routers.DefaultRouter()
router.register(r'comunidad', ComunidadViewSet, basename='comunidad')
router.register(r'curso', CursoViewSet, basename='curso')
router.register(r'documento', DocumentoViewSet, basename='documento')
router.register(r'evento', EventoViewSet, basename='evento')
router.register(r'testimonios', TestimonioViewSet, basename='testimonio')
router.register(r'noticia', NoticiaViewSet, basename='noticia')
router.register(r'servicioalumni', ServicioAlumniViewSet, basename='servicioalumni')
router.register(r'mensajes', MensajeComunidadViewSet, basename='mensajes')
router.register(r'conversaciones', ConversacionComunidadViewSet, basename='conversaciones')
router.register(r'mensajes-conversacion', MensajeConversacionViewSet, basename='mensajes-conversacion')



urlpatterns = [
    path('perfil-completo/', perfil_completo, name='perfil-completo'),
    path('ping-alumni/', perfil_completo),
    path('limpiar-cache-usuario/<int:user_alumni_id>/', limpiar_cache_usuario, name='limpiar_cache_usuario'),
    path('', include(router.urls)),
]
