from django.db import migrations, models


def copiar_nombre_a_codigo(apps, schema_editor):
    Carrera = apps.get_model('Access', 'Carrera')
    for carrera in Carrera.objects.all():
        carrera.codigo = carrera.nombre
        carrera.save(update_fields=['codigo'])


class Migration(migrations.Migration):

    dependencies = [
        ('Access', '0002_alter_carrera_nombre'),
    ]

    operations = [
        migrations.AddField(
            model_name='carrera',
            name='activo',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='carrera',
            name='codigo',
            field=models.CharField(
                choices=[
                    ('INGSIS', 'Ingeniería de Sistemas'),
                    ('INGCOM', 'Ingeniería Comercial'),
                    ('DER', 'Derecho'),
                    ('PSI', 'Psicología'),
                    ('ENF', 'Enfermería'),
                    ('MED', 'Medicina'),
                    ('CP', 'Contaduría Pública'),
                    ('ADM', 'Administración de Empresas'),
                    ('INGELEC', 'Ingeniería Electrónica'),
                    ('ARQ', 'Arquitectura'),
                    ('SIN', 'Sin Especificar'),
                ],
                max_length=20,
                null=True,
                blank=True,
            ),
        ),
        migrations.RunPython(copiar_nombre_a_codigo, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='carrera',
            name='codigo',
            field=models.CharField(
                choices=[
                    ('INGSIS', 'Ingeniería de Sistemas'),
                    ('INGCOM', 'Ingeniería Comercial'),
                    ('DER', 'Derecho'),
                    ('PSI', 'Psicología'),
                    ('ENF', 'Enfermería'),
                    ('MED', 'Medicina'),
                    ('CP', 'Contaduría Pública'),
                    ('ADM', 'Administración de Empresas'),
                    ('INGELEC', 'Ingeniería Electrónica'),
                    ('ARQ', 'Arquitectura'),
                    ('SIN', 'Sin Especificar'),
                ],
                max_length=20,
                unique=True,
            ),
        ),
        migrations.AlterField(
            model_name='carrera',
            name='nombre',
            field=models.CharField(max_length=150, unique=True),
        ),
    ]