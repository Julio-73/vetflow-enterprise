# Guía de Respaldo y Recuperación Multi-Tenant (Backup & Recovery)

Esta guía documenta la estrategia de respaldo y recuperación ante desastres de **VetFlow SaaS**. Debido a la arquitectura de aislamiento por **Row Level Security (RLS)** en una base de datos PostgreSQL unificada, la estrategia de backup opera en dos niveles:

1. **Respaldos de Infraestructura (Desastre Total):** Copia física/lógica completa del cluster.
2. **Respaldos Semánticos / Exportación por Tenant (Cumplimiento Regulatorio / Portabilidad):** Copia selectiva de datos de un tenant específico.

---

## 1. Copia de Seguridad Completa (Cluster Completo)

Para realizar un respaldo completo de la base de datos de producción (esquemas, RLS, triggers, catálogos y datos transaccionales de todos los tenants), utilice `pg_dump` con formato de archivo personalizado (`-Fc`) y aplique cifrado asimétrico/simétrico para proteger la información en tránsito y reposo.

### Script de Respaldo Automatizado (`backup.sh`)

```bash
#!/bin/bash
# ==============================================================================
# Script de Respaldo y Cifrado AES-256 de VetFlow SaaS (Production Hardening)
# ==============================================================================
set -e

# Variables de Configuración
DB_URL=${DATABASE_URL} # Inyectada desde variables de entorno seguras
BACKUP_DIR="/var/backups/vetflow"
TIMESTAMP=$(date +%F_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/vetflow_full_${TIMESTAMP}.dump"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"
PASSPHRASE_FILE="/etc/vetflow/backup_passphrase.txt" # Llave de cifrado simétrico

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

echo "Iniciando pg_dump lógico cifrado..."
pg_dump "$DB_URL" -Fc -f "$BACKUP_FILE"

echo "Cifrando respaldo con AES-256-CBC..."
openssl enc -aes-256-cbc -salt -in "$BACKUP_FILE" -out "$ENCRYPTED_FILE" -pass "file:${PASSPHRASE_FILE}"

# Eliminar el archivo temporal sin cifrar
rm -f "$BACKUP_FILE"

echo "Respaldo generado y cifrado exitosamente en: ${ENCRYPTED_FILE}"
```

### Script de Restauración Completa (`restore.sh`)

```bash
#!/bin/bash
# ==============================================================================
# Script de Descifrado y Restauración de VetFlow SaaS
# ==============================================================================
set -e

ENCRYPTED_FILE=$1
PASSPHRASE_FILE="/etc/vetflow/backup_passphrase.txt"
DECRYPTED_FILE="${ENCRYPTED_FILE%.enc}"
DB_URL=${DATABASE_URL}

if [ -z "$ENCRYPTED_FILE" ]; then
    echo "Uso: $0 <archivo_respaldo.dump.enc>"
    exit 1
fi

echo "Descifrando respaldo..."
openssl enc -d -aes-256-cbc -in "$ENCRYPTED_FILE" -out "$DECRYPTED_FILE" -pass "file:${PASSPHRASE_FILE}"

echo "Restaurando base de datos a través de pg_restore..."
# --clean limpia tablas existentes; --no-owner ignora propietarios locales de origen
pg_restore "$DB_URL" --clean --no-owner -d postgres "$DECRYPTED_FILE"

# Eliminar temporal descifrado
rm -f "$DECRYPTED_FILE"

echo "Restauración completada con éxito."
```

---

## 2. Exportación de Datos por Tenant (Cumplimiento de Ley de Protección de Datos)

Para cumplir con regulaciones como la ley colombiana de protección de datos (Ley 1581) o el RGPD europeo, un inquilino (tenant) tiene derecho a exportar su base de datos. 

Podemos extraer selectivamente la información de un `tenant_id` específico utilizando filtros en `pg_dump` o sentencias SQL COPY:

### Consulta de Exportación JSON de Ficha de Pacientes por Tenant

```sql
-- Ejecutar en psql para exportar a un archivo local en formato JSON
\copy (SELECT json_agg(t) FROM (SELECT * FROM patients WHERE tenant_id = 'a1111111-1111-4111-a111-111111111111') t) TO '/tmp/tenant_patients_export.json';
```

---

## 3. Política de Retención y Frecuencia de Backups (RPO / RTO)

* **Frecuencia:** Backups lógicos incrementales cada 1 hora (mediante Supabase Point-in-Time Recovery - PITR) y backups lógicos completos cifrados cada 24 horas.
* **Retención:** 30 días de backups diarios en un storage Bucket Object-Locked (para protección contra ransomware).
* **RPO (Recovery Point Objective):** < 1 hora.
* **RTO (Recovery Time Objective):** < 4 horas.
