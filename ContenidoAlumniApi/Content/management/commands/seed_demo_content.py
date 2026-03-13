from datetime import timedelta
import random

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from Content.models import (
    Comunidad,
    ConversacionComunidad,
    Curso,
    Documento,
    Evento,
    MensajeComunidad,
    MensajeConversacion,
    Noticia,
    ServicioAlumni,
    Testimonio,
)


class Command(BaseCommand):
    help = "Carga contenido mock para demo del portal Alumni"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Elimina el contenido mock existente antes de volver a cargar",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        do_reset = options["reset"]

        if do_reset:
            self._reset_content()

        random.seed(42)

        carrera_ids = list(range(1, 11))
        alumni_ids = list(range(1, 31))

        comunidades = self._seed_comunidades(carrera_ids, alumni_ids)
        eventos = self._seed_eventos(carrera_ids, alumni_ids)
        self._seed_cursos(alumni_ids)
        self._seed_servicios()
        self._seed_testimonios()
        self._seed_documentos(carrera_ids)
        self._seed_mensajes_comunidad(comunidades, alumni_ids)
        self._seed_conversaciones(comunidades, alumni_ids)
        self._seed_noticias(comunidades, eventos, alumni_ids)

        self.stdout.write(self.style.SUCCESS("Contenido mock cargado correctamente."))
        self.stdout.write(self.style.SUCCESS(f"Comunidades: {Comunidad.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"Eventos: {Evento.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"Cursos: {Curso.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"Noticias: {Noticia.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"Documentos: {Documento.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"Servicios: {ServicioAlumni.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"Testimonios: {Testimonio.objects.count()}"))

    def _reset_content(self):
        MensajeConversacion.objects.all().delete()
        ConversacionComunidad.objects.all().delete()
        MensajeComunidad.objects.all().delete()
        Noticia.objects.all().delete()
        Evento.objects.all().delete()
        Curso.objects.all().delete()
        Documento.objects.all().delete()
        ServicioAlumni.objects.all().delete()
        Testimonio.objects.all().delete()
        Comunidad.objects.all().delete()
        self.stdout.write(self.style.WARNING("Contenido previo eliminado."))

    def _seed_comunidades(self, carrera_ids, alumni_ids):
        nombres = [
            "Red de Ingenieria de Sistemas",
            "Club de Emprendimiento NUR",
            "Comunidad de Innovacion y Datos",
            "Alumni Marketing y Negocios",
            "Talento Humano y Liderazgo",
            "Alumni Arquitectura y Diseno",
            "Comunidad Fintech Alumni",
            "Red de Voluntariado NUR",
        ]

        comunidades = []
        for idx, nombre in enumerate(nombres, start=1):
            sample_carreras = random.sample(carrera_ids, k=min(3, len(carrera_ids)))
            sample_users = random.sample(alumni_ids, k=min(10, len(alumni_ids)))

            comunidad, _ = Comunidad.objects.update_or_create(
                nombre=nombre,
                defaults={
                    "descripcion": (
                        f"Espacio colaborativo para {nombre.lower()} con actividades, networking y oportunidades."
                    ),
                    "carreras": sample_carreras,
                    "usuarios": sample_users,
                    "activo": True,
                },
            )
            comunidades.append(comunidad)

        return comunidades

    def _seed_eventos(self, carrera_ids, alumni_ids):
        now = timezone.now()
        eventos_data = [
            ("Feria Laboral Alumni 2026", 3, 1),
            ("Networking con Empresas Tech", 8, 1),
            ("Taller de Marca Personal", 12, 1),
            ("Mentorias para Nuevos Egresados", 16, 1),
            ("Foro de Innovacion Empresarial", 22, 1),
            ("Hackathon Solidario Alumni", 30, 2),
            ("Conferencia de Transformacion Digital", -5, 1),
            ("Encuentro de Emprendedores NUR", -15, 1),
        ]

        created = []
        for titulo, offset_days, duration_days in eventos_data:
            fecha_inicio = now + timedelta(days=offset_days)
            fecha_fin = fecha_inicio + timedelta(days=duration_days)

            if fecha_fin < now:
                estado = Evento.EstadoEvento.FINALIZADO
            else:
                estado = Evento.EstadoEvento.ACTIVO

            evento, _ = Evento.objects.update_or_create(
                titulo=titulo,
                defaults={
                    "descripcion": f"{titulo}. Evento orientado a fortalecer la red profesional de alumni.",
                    "fecha_inicio": fecha_inicio,
                    "fecha_fin": fecha_fin,
                    "carreras": random.sample(carrera_ids, k=min(4, len(carrera_ids))),
                    "usuarios": random.sample(alumni_ids, k=min(8, len(alumni_ids))),
                    "requiere_registro": True,
                    "estado": estado,
                },
            )
            created.append(evento)

        return created

    def _seed_cursos(self, alumni_ids):
        today = timezone.localdate()
        cursos = [
            ("Power BI para Toma de Decisiones", "VIRTUAL", 5, 45),
            ("Gestion de Proyectos con Scrum", "MIXTO", 10, 35),
            ("Oratoria y Presentaciones de Alto Impacto", "PRESENCIAL", 15, 30),
            ("Analitica de Datos con Python", "VIRTUAL", -20, 40),
            ("Liderazgo para Equipos Multidisciplinarios", "MIXTO", -60, 25),
            ("Marketing Digital para Emprendedores", "VIRTUAL", 20, 30),
            ("Finanzas Personales para Profesionales", "PRESENCIAL", 25, 20),
            ("Diseno UX para Productos Digitales", "MIXTO", 30, 40),
        ]

        for titulo, modalidad, start_offset, duration in cursos:
            fecha_inicio = today + timedelta(days=start_offset)
            fecha_fin = fecha_inicio + timedelta(days=duration)

            if fecha_fin < today:
                estado = Curso.Estado.FINALIZADO
            else:
                estado = Curso.Estado.ACTIVO

            Curso.objects.update_or_create(
                titulo=titulo,
                defaults={
                    "descripcion": f"Curso practico de {titulo.lower()} con enfoque aplicado para alumni.",
                    "responsable": "Coordinacion de Educacion Continua",
                    "modalidad": modalidad,
                    "estado": estado,
                    "fecha_inicio": fecha_inicio,
                    "fecha_fin": fecha_fin,
                    "inscritos": random.sample(alumni_ids, k=min(12, len(alumni_ids))),
                },
            )

    def _seed_servicios(self):
        servicios = [
            ("Bolsa de Trabajo Alumni", "otros", "Ofertas laborales exclusivas para egresados.", "briefcase", "https://alumni.nur.edu.bo/bolsa"),
            ("Biblioteca Digital", "biblioteca", "Acceso a recursos academicos y bases de datos.", "book", "https://alumni.nur.edu.bo/biblioteca"),
            ("Programa de Mentorias", "educacion", "Mentoria entre alumni senior y nuevos profesionales.", "users", "https://alumni.nur.edu.bo/mentorias"),
            ("Club Deportivo Alumni", "deporte", "Actividades deportivas y torneos interfacultades.", "activity", "https://alumni.nur.edu.bo/deporte"),
            ("Beneficios y Convenios", "otros", "Descuentos en servicios aliados para alumni.", "gift", "https://alumni.nur.edu.bo/convenios"),
        ]

        for nombre, tipo, descripcion, icono, link in servicios:
            ServicioAlumni.objects.update_or_create(
                nombre=nombre,
                defaults={
                    "tipo": tipo,
                    "descripcion": descripcion,
                    "icono": icono,
                    "link": link,
                },
            )

    def _seed_testimonios(self):
        testimonios = [
            ("De estudiante a lider de producto", "Gracias a la red alumni consegui mentoria y hoy lidero un equipo de producto.", "Valeria Rojas"),
            ("Emprender con apoyo de la comunidad", "Los eventos de networking me ayudaron a validar mi startup.", "Luis Chavez"),
            ("Nuevas oportunidades internacionales", "Con las conexiones alumni accedi a una pasantia en el exterior.", "Andrea Flores"),
            ("Actualizacion profesional continua", "Los cursos cortos me ayudaron a mejorar mis competencias digitales.", "Daniel Perez"),
        ]

        for titulo, contenido, autor in testimonios:
            Testimonio.objects.update_or_create(
                titulo=titulo,
                defaults={
                    "contenido": contenido,
                    "autor": autor,
                },
            )

    def _seed_documentos(self, carrera_ids):
        docs = [
            ("Guia de Insercion Laboral 2026", "INFORME", "Equipo Alumni", "Material de orientacion para primer empleo."),
            ("Plantilla de CV Profesional", "OTRO", "Direccion Alumni", "Formato base para postulaciones laborales."),
            ("Investigacion de Empleabilidad", "INVESTIGACION", "Observatorio NUR", "Resultados de empleabilidad por carrera."),
            ("Manual de Entrevistas Tecnicas", "OTRO", "Comunidad Tech", "Preguntas y buenas practicas para entrevistas."),
            ("Certificacion de Competencias Digitales", "CERTIFICADO", "Academia Digital", "Ruta recomendada de certificaciones."),
        ]

        for idx, (nombre, tipo, autor, descripcion) in enumerate(docs, start=1):
            documento, _ = Documento.objects.update_or_create(
                nombre=nombre,
                defaults={
                    "tipo": tipo,
                    "carrera": random.choice(carrera_ids),
                    "descripcion": descripcion,
                    "autor": autor,
                },
            )

            if not documento.archivo_documento:
                raw = (
                    f"Documento demo: {nombre}\n"
                    f"Autor: {autor}\n"
                    f"Descripcion: {descripcion}\n"
                ).encode("utf-8")
                documento.archivo_documento.save(
                    f"documento_demo_{idx}.txt",
                    ContentFile(raw),
                    save=True,
                )

    def _seed_mensajes_comunidad(self, comunidades, alumni_ids):
        frases = [
            "Hola comunidad, comparto esta oportunidad laboral para perfil junior.",
            "Alguien recomienda cursos de analitica para actualizarse este semestre?",
            "Gracias por la invitacion al evento, fue muy util para networking.",
            "Estoy buscando cofundador para proyecto de impacto social.",
            "Comparto material de estudio para entrevistas tecnicas.",
        ]

        for comunidad in comunidades:
            for _ in range(6):
                MensajeComunidad.objects.create(
                    comunidad=comunidad,
                    autor_id=random.choice(alumni_ids),
                    contenido=random.choice(frases),
                )

    def _seed_conversaciones(self, comunidades, alumni_ids):
        temas = [
            "Tips para conseguir primer empleo",
            "Recomendaciones de certificaciones 2026",
            "Oportunidades de voluntariado profesional",
            "Tendencias del mercado laboral",
            "Como destacar en entrevistas",
        ]

        for comunidad in comunidades[:5]:
            for i in range(2):
                titulo = f"{random.choice(temas)} #{i + 1}"
                conversacion = ConversacionComunidad.objects.create(
                    comunidad=comunidad,
                    titulo=titulo,
                    descripcion="Conversacion abierta para intercambio de experiencias entre alumni.",
                    creador_id=random.choice(alumni_ids),
                    estado=ConversacionComunidad.EstadoConversacion.ABIERTA,
                    activa=True,
                )

                for _ in range(5):
                    MensajeConversacion.objects.create(
                        conversacion=conversacion,
                        autor_id=random.choice(alumni_ids),
                        contenido=(
                            "Aporte de la comunidad: compartir experiencias, recursos y recomendaciones practicas."
                        ),
                        estado=MensajeConversacion.EstadoMensaje.ACTIVO,
                    )

                conversacion.ultimo_mensaje_at = timezone.now()
                conversacion.save(update_fields=["ultimo_mensaje_at", "fecha_actualizacion"])

    def _seed_noticias(self, comunidades, eventos, alumni_ids):
        titulares = [
            "Alumni NUR fortalece su red de empleabilidad",
            "Nueva alianza para becas de especializacion",
            "Convocatoria abierta para mentores voluntarios",
            "Encuentro anual de graduados 2026",
            "Comunidad de datos lanza laboratorio colaborativo",
            "Programa de liderazgo abre nueva cohorte",
            "Portal Alumni incorpora nuevas funcionalidades",
            "Reconocimiento a proyectos de impacto social",
            "Jornada de emprendimiento con expertos invitados",
            "Seminario internacional de innovacion educativa",
        ]

        tipos = [
            Noticia.TipoNoticia.NORMAL,
            Noticia.TipoNoticia.BOTON,
            Noticia.TipoNoticia.EVENTO,
            Noticia.TipoNoticia.BOTON_EVENTO,
        ]

        for idx, titulo in enumerate(titulares, start=1):
            destino = (
                Noticia.DestinoNoticia.HOME
                if idx % 3 != 0
                else Noticia.DestinoNoticia.COMUNIDAD
            )
            tipo = random.choice(tipos)

            comunidad = None
            if destino == Noticia.DestinoNoticia.COMUNIDAD:
                comunidad = random.choice(comunidades)

            evento = None
            if tipo in [Noticia.TipoNoticia.EVENTO, Noticia.TipoNoticia.BOTON_EVENTO]:
                evento = random.choice(eventos)

            boton_texto = ""
            boton_url = ""
            if tipo in [Noticia.TipoNoticia.BOTON, Noticia.TipoNoticia.BOTON_EVENTO]:
                boton_texto = "Ver mas"
                boton_url = "https://alumni.nur.edu.bo/noticias"

            Noticia.objects.update_or_create(
                titulo=titulo,
                defaults={
                    "resumen": "Actualizacion importante para la comunidad alumni.",
                    "contenido": (
                        "Contenido demo para presentacion institucional del portal Alumni NUR. "
                        "Incluye informacion relevante para graduados, oportunidades y actividades."
                    ),
                    "tipo": tipo,
                    "destino": destino,
                    "comunidad": comunidad,
                    "evento": evento,
                    "boton_texto": boton_texto,
                    "boton_url": boton_url,
                    "publicado": True,
                    "destacado": idx <= 3,
                    "orden": idx,
                    "creado_por_id": random.choice(alumni_ids),
                    "actualizado_por_id": random.choice(alumni_ids),
                },
            )
