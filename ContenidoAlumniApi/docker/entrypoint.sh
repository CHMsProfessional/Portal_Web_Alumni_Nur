#!/bin/sh
set -e

python manage.py migrate --noinput
exec daphne -b 0.0.0.0 -p ${PORT:-8001} ContenidoAlumniApi.asgi:application
