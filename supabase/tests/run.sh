#!/usr/bin/env bash
# Yerel Postgres üzerinde şemayı sıfırdan kurar ve testleri çalıştırır.
set -euo pipefail
cd "$(dirname "$0")"
PSQL="psql -h /tmp -p ${PGPORT:-5433} -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -d postgres -c "drop database if exists komsum_test" -c "create database komsum_test" >/dev/null
$PSQL -d komsum_test -f stub.sql >/dev/null
$PSQL -d komsum_test -f ../schema.sql >/dev/null
# İkinci kez çalıştırmak da hatasız olmalı
$PSQL -d komsum_test -f ../schema.sql >/dev/null
$PSQL -d komsum_test -f test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  //'
