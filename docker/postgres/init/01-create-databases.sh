#!/bin/sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
    CREATE DATABASE "$ACCESS_DB_NAME";
    CREATE DATABASE "$CONTENT_DB_NAME";
EOSQL
