# VetFlow SaaS (Enterprise Multi-Tenant Veterinary Dashboard)

VetFlow SaaS es una plataforma de software de nivel Enterprise diseñada para optimizar las operaciones clínicas, el inventario de farmacia y la facturación fiscal en centros veterinarios de Latinoamérica. Diseñada bajo una arquitectura segura de aislamiento de datos **Multi-Tenant** y alineada a las regulaciones sanitarias de recetas y timbrado de facturas.

---

## 🚀 Características Principales

*   **Aislamiento Multi-Tenant Estricto (RLS):** Seguridad a nivel de base de datos en PostgreSQL utilizando Row Level Security (RLS) basado en contextos transaccionales (`app.current_tenant_id`).
*   **Gestión Clínica e Inmutabilidad (EMR):** Expediente Clínico de Evolución bloqueado por triggers de base de datos al momento de ser sellado, garantizando cumplimiento de leyes de salud y protección de datos.
*   **Recetas de Fármacos Controlados:** Firma automática y restricción regulatoria de fármacos que exigen cédula profesional del veterinario emisor.
*   **Inventario y Farmacia por FEFO:** Control de mermas bajo auditoría obligatoria (mínimo 15 caracteres y rol administrativo) y despacho ordenado por fecha de caducidad (First Expired, First Out).
*   **Caja Registradora y Arqueo Diario:** Apertura de caja chica con saldo fijo y auditoría automatizada de discrepancias en el arqueo al cierre del turno.
*   **Facturación Electrónica Transfronteriza:** Integración dinámica con adaptadores para la DIAN (Colombia) y el SAT (México) resolviendo firmas digitales y CUFE/UUID según la sucursal de emisión.
*   **Navegación Instantánea (~0ms):** Optimización frontend utilizando Stale-While-Revalidate (SWR) en memoria con precarga inteligente y autocuración offline (tolerancia a fallos).

---

## 🏛️ Arquitectura del Sistema

El sistema sigue un patrón desacoplado y moderno:

```mermaid
graph TD
    A[Cliente Web / Next.js] -->|Peticiones HTTPS + JWT| B[API Gateway / FastAPI]
    B -->|Contexto de Tenant Transaccional| C[PostgreSQL / Supabase]
    C -->|Row Level Security| D[(Aislamiento de Datos por Tenant)]
    B -->|Firma Digital XML| E[SAT - México Adaptador]
    B -->|Firma Digital XML| F[DIAN - Colombia Adaptador]
```

### Stack Tecnológico:
1.  **Frontend:** Next.js 16 (App Router), React, Tailwind CSS v4, Lucide Icons, SWR client caching.
2.  **Backend:** FastAPI (Python 3.11), SQLAlchemy ORM, Uvicorn, PyJWT para decodificación de tokens Supabase.
3.  **Base de Datos:** PostgreSQL (con extensiones `uuid-ossp`), Row Level Security (RLS) habilitado.
4.  **CI/CD:** GitHub Actions (Validación de linting, formato y tipos en cada push/pull request).

---

## 🛠️ Instalación y Configuración Local

### 1. Base de Datos (PostgreSQL)
Crea una base de datos PostgreSQL local y carga los esquemas ubicados en el directorio `/database/`:
```bash
# 1. Crear esquema físico de tablas
psql -U postgres -d vetflow_db -f database/schema.sql

# 2. Habilitar políticas de seguridad RLS
psql -U postgres -d vetflow_db -f database/rls_policies.sql

# 3. Registrar triggers de auditoría e inmutabilidad
psql -U postgres -d vetflow_db -f database/triggers.sql

# 4. Cargar datos semilla de prueba
psql -U postgres -d vetflow_db -f database/seeds.sql
```

### 2. Configuración del Backend (FastAPI)
Navega a la carpeta `/backend/`, crea un entorno virtual e instala dependencias:
```bash
cd backend
python -m venv venv
source venv/Scripts/activate # En Windows: venv\Scripts\activate
pip install -r requirements.txt
```
Configura un archivo `.env` en la raíz de la carpeta `/backend/` tomando como referencia el archivo `.env.example` en la raíz del proyecto.
Inicia el servidor de desarrollo:
```bash
uvicorn app.main:app --port 8000 --reload
```

### 3. Configuración del Frontend (Next.js)
Navega a la carpeta `/frontend/`, instala dependencias e inicia el servidor de desarrollo:
```bash
cd frontend
npm install
npm run dev
```
La aplicación web estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 🧪 Pruebas Unitarias y de Integración

*   **Backend (Python/Pytest):**
    ```bash
    cd backend
    pytest tests/
    ```
*   **Base de Datos (Aislamiento de Tenants RLS):**
    ```bash
    psql -U postgres -d vetflow_db -f database/tests/test_rls_isolation.sql
    ```

---

## 🌐 Guía de Despliegue en Producción

### Frontend (Vercel / Netlify)
1. Conecta el repositorio de GitHub a tu cuenta de Vercel.
2. Configura el directorio raíz como `frontend`.
3. Agrega las variables de entorno necesarias (ej. `NEXT_PUBLIC_API_URL`).
4. Vercel compilará automáticamente las páginas estáticas.

### Backend (Render / Railway / AWS ECS)
1. Vincula el repositorio y define la carpeta raíz en `backend`.
2. Comando de inicio: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
3. Configura la base de datos PostgreSQL conectada a través de `DATABASE_URL` y las llaves secretas de JWT.

---

## 🔒 Variables de Entorno Requeridas

| Variable | Descripción | Valor de Ejemplo |
| :--- | :--- | :--- |
| `DATABASE_URL` | String de conexión a base de datos principal | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Llave de firma HS256 (mínimo 32 caracteres) | `mi_llave_secreta_super_segura_de_desarrollo` |
| `SUPABASE_URL` | Endpoint de Supabase para lectura de JWKS (RS256) | `https://xxxx.supabase.co` |
| `APP_ENV` | Entorno de ejecución (`production` / `development`) | `production` |

---

## 📄 Licencia
Este proyecto es propiedad exclusiva de VetFlow SaaS. Todos los derechos reservados.
