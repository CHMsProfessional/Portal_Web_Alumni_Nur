from django.db import migrations, models


CATALOGO_CARRERAS = [
    {
        "codigo": "CTP",
        "nombre": "Licenciatura en Contaduría Pública",
        "descripcion": "La contabilidad es la columna vertebral de cualquier organización, proporcionando información clave para la toma de decisiones financieras.",
    },
    {
        "codigo": "DER",
        "nombre": "Licenciatura en Derecho",
        "descripcion": "El estudio del derecho te capacitará para comprender y aplicar normativas legales, desempeñando un papel crucial en la justicia y la resolución de conflictos.",
    },
    {
        "codigo": "FYR",
        "nombre": "Carrera de Fisioterapia y Rehabilitación",
        "descripcion": "Contribuirás a mejorar la calidad de vida de las personas, ayudándolas a recuperarse de lesiones y a mantener una salud óptima.",
    },
    {
        "codigo": "ISI",
        "nombre": "Carrera de Ingeniería en Sistemas",
        "descripcion": "La ingeniería de sistemas te sumergirá en el mundo de la tecnología, permitiéndote desarrollar soluciones innovadoras y eficientes.",
    },
    {
        "codigo": "IFI",
        "nombre": "Carrera de Ingeniería Financiera",
        "descripcion": "Serás parte clave en la gestión y optimización de recursos financieros, influyendo directamente en el éxito empresarial.",
    },
    {
        "codigo": "MKT",
        "nombre": "Licenciatura en Marketing",
        "descripcion": "Aprenderás a comprender las necesidades del mercado y a crear estrategias efectivas para posicionar productos y servicios.",
    },
    {
        "codigo": "NUT",
        "nombre": "Carrera Ciencias de la Nutrición",
        "descripcion": "Contribuirás a promover hábitos alimenticios saludables, desempeñando un papel esencial en la salud de la sociedad.",
    },
    {
        "codigo": "PSI",
        "nombre": "Licenciatura en Psicología",
        "descripcion": "Explorarás la mente humana, ayudando a comprender y mejorar la salud mental de las personas.",
    },
    {
        "codigo": "RIN",
        "nombre": "Licenciatura en Relaciones Internacionales",
        "descripcion": "Te sumergirás en el análisis de las dinámicas globales, contribuyendo a la construcción de puentes entre naciones.",
    },
    {
        "codigo": "RRP",
        "nombre": "Carrera en Relaciones Públicas",
        "descripcion": "La Carrera en Relaciones Públicas es un campo profesional dedicado a gestionar y cultivar la imagen, reputación y comunicación de una organización, ya sea una empresa, institución gubernamental, entidad sin fines de lucro o figura pública. Los profesionales de Relaciones Públicas son responsables de establecer y mantener relaciones positivas y efectivas entre la entidad que representan y su audiencia clave, que puede incluir clientes, empleados, medios de comunicación, inversores y la comunidad en general.",
    },
    {
        "codigo": "TDS",
        "nombre": "Carrera de Turismo para el Desarrollo Sostenible",
        "descripcion": "Los profesionales en Turismo para el Desarrollo Sostenible buscan equilibrar el crecimiento económico asociado al turismo con la conservación de la cultura local, la protección del medio ambiente y la mejora de la calidad de vida de las comunidades anfitrionas. Estos expertos trabajan en la implementación de prácticas turísticas responsables, promoviendo la preservación de los recursos naturales, el respeto a las tradiciones culturales y la participación activa de la comunidad en la toma de decisiones relacionadas con el turismo.",
    },
    {
        "codigo": "CCS",
        "nombre": "Carrera en Ciencias de la Comunicación Social",
        "descripcion": "Explorarás el poder de la comunicación en diversas formas, desde medios tradicionales hasta plataformas digitales.",
    },
    {
        "codigo": "ADE",
        "nombre": "Licenciatura en Administración de Empresas",
        "descripcion": "Desarrollarás habilidades para liderar y gestionar eficientemente organizaciones, contribuyendo al éxito empresarial.",
    },
    {
        "codigo": "ICO",
        "nombre": "Licenciatura en Ingeniería Comercial",
        "descripcion": "Integrarás conocimientos de negocios y tecnología para tomar decisiones estratégicas en entornos empresariales.",
    },
    {
        "codigo": "PSP",
        "nombre": "Carrera de Psicopedagogía",
        "descripcion": "Ayudarás a desarrollar estrategias educativas efectivas para garantizar el éxito académico de los estudiantes.",
    },
    {
        "codigo": "RTM",
        "nombre": "Carrera de Redes y Telecomunicaciones",
        "descripcion": "Serás parte esencial del mundo interconectado actual, diseñando y gestionando sistemas de comunicación eficientes.",
    },
    {
        "codigo": "SIN",
        "nombre": "Sin Especificar",
        "descripcion": "Carrera no especificada o asignación temporal por defecto.",
    },
]

MAPEO_LEGACY = {
    "INGSIS": "ISI",
    "INGCOM": "ICO",
    "CP": "CTP",
    "ADM": "ADE",
}


def sync_catalogo(apps, schema_editor):
    Carrera = apps.get_model("Access", "Carrera")
    catalogo_por_codigo = {item["codigo"]: item for item in CATALOGO_CARRERAS}

    for codigo_anterior, codigo_nuevo in MAPEO_LEGACY.items():
        legacy = Carrera.objects.filter(codigo=codigo_anterior).first()
        if legacy and not Carrera.objects.filter(codigo=codigo_nuevo).exists():
            target = catalogo_por_codigo[codigo_nuevo]
            legacy.codigo = target["codigo"]
            legacy.nombre = target["nombre"]
            legacy.descripcion = target["descripcion"]
            legacy.activo = True
            legacy.save(update_fields=["codigo", "nombre", "descripcion", "activo"])

    codigos_activos = set()
    for carrera in CATALOGO_CARRERAS:
        codigos_activos.add(carrera["codigo"])
        Carrera.objects.update_or_create(
            codigo=carrera["codigo"],
            defaults={
                "nombre": carrera["nombre"],
                "descripcion": carrera["descripcion"],
                "activo": True,
            },
        )

    Carrera.objects.exclude(codigo__in=codigos_activos).update(activo=False)


class Migration(migrations.Migration):

    dependencies = [
        ("Access", "0003_carrera_activo_carrera_codigo_alter_carrera_nombre"),
    ]

    operations = [
        migrations.AddField(
            model_name="carrera",
            name="descripcion",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AlterField(
            model_name="carrera",
            name="codigo",
            field=models.CharField(max_length=20, unique=True),
        ),
        migrations.RunPython(sync_catalogo, migrations.RunPython.noop),
    ]