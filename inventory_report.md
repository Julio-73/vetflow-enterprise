# Inventory Report: VetFlow SaaS v1.0 (Production Ready)

Este informe lista y detalla cada uno de los archivos creados durante las iteraciones de desarrollo del proyecto **VetFlow SaaS v1.0**, indicando su ubicación, propósito funcional, módulo al que pertenece y sus dependencias principales.

---

## 1. Capa de Base de Datos (`/database`)

| Ruta Relativa | Propósito | Módulo | Dependencias Principales |
| :--- | :--- | :--- | :--- |
| `database/schema.sql` | Definición de las 21 tablas relacionales, llaves primarias y foráneas. | Core / DB | PostgreSQL 15 |
| `database/rls_policies.sql` | Directivas de Row Level Security (RLS) para el aislamiento estricto por inquilino. | Seguridad / DB | PostgreSQL `app.current_tenant_id` |
| `database/triggers.sql` | Disparadores PL/pgSQL para validaciones de inmutabilidad (BR-CL-001) y licencias profesionales. | Reglas de Negocio / DB | PostgreSQL Triggers |
| `database/seeds.sql` | Carga inicial de datos maestros, catálogo de diagnósticos, lotes médicos y usuarios mock. | Datos Maestros / DB | `database/schema.sql` |
| `database/performance_indexes.sql` | Índices compuestos para acelerar filtros RLS y ordenación FEFO. | Rendimiento / DB | PostgreSQL Indexes |
| `database/backup_restore_guide.md` | Guía de incidentes y scripts cifrados de respaldo completo y selectivo. | Operación / DB | `pg_dump`, OpenSSL AES-256 |
| `database/tests/test_rls_isolation.sql` | Scripts PL/pgSQL para verificar el aislamiento y restricciones multi-tenant en SQL. | QA / DB | `database/rls_policies.sql` |

---

## 2. Capa del Backend (`/backend`)

### Core y Configuración (`/backend/app/core`)
| Ruta Relativa | Propósito | Módulo | Dependencias Principales |
| :--- | :--- | :--- | :--- |
| `backend/app/core/config.py` | Carga y tipado estricto de variables de entorno del servidor. | Configuración | Pydantic Settings |
| `backend/app/core/database.py` | Creador de sesión SQLAlchemy e inyector del RLS context (`SET LOCAL`). | Base de Datos | SQLAlchemy, contextvars |
| `backend/app/core/security.py` | Validación criptográfica asimétrica JWT RS256 e inyección de identidad. | Seguridad / Auth | PyJWT, httpx (JWKS) |
| `backend/app/core/logging_config.py` | Formateador JSON structured y middleware de auditoría de logs. | Observabilidad | logging, contextvars |
| `backend/app/core/billing/billing_port.py` | Interfaz (Puerto) abstracto para facturación electrónica fiscal. | Facturación | `app/schemas.py` |
| `backend/app/core/billing/billing_service.py` | Orquestador de ventas y factory dinámico de adaptadores por país. | Facturación | `billing_port.py`, `models.py` |
| `backend/app/core/billing/adapters/sat_adapter.py` | Adaptador simulado para timbrado fiscal CFDI 4.0 en México. | Facturación | `billing_port.py` |
| `backend/app/core/billing/adapters/dian_adapter.py` | Adaptador simulado para facturación electrónica DIAN en Colombia. | Facturación | `billing_port.py` |

### Controladores y API Ruteadores (`/backend/app/api/endpoints`)
| Ruta Relativa | Propósito | Módulo | Dependencias Principales |
| :--- | :--- | :--- | :--- |
| `backend/app/api/endpoints/tenants.py` | Registro de inquilinos y perfiles de clínicas. | Multi-Tenant | `app/models.py`, `app/schemas.py` |
| `backend/app/api/endpoints/patients.py` | Rutas de registro de tutores de mascotas y expedientes base. | Pacientes | `app/models.py`, `app/schemas.py` |
| `backend/app/api/endpoints/appointments.py` | Programación y control de citas con validación de solapamiento. | Agenda | `app/models.py`, `app/schemas.py` |
| `backend/app/api/endpoints/clinical.py` | Consultas de historial clínico (EMR), diagnósticos y recetas controladas. | EMR Clínico | `app/models.py`, `app/schemas.py` |
| `backend/app/api/endpoints/inventory.py` | Control de stock físico, traslados de medicamentos y registro de mermas. | Inventario | `app/models.py`, `app/schemas.py` |
| `backend/app/api/endpoints/billing.py` | Registro de ventas, facturas fiscales y balance/arqueo de cajas registradoras. | Cajas / Facturas | `billing_service.py`, `app/models.py` |

### Raíz del Backend
| Ruta Relativa | Propósito | Módulo | Dependencias Principales |
| :--- | :--- | :--- | :--- |
| `backend/app/main.py` | Punto de entrada del servidor FastAPI y orquestación de middlewares. | Core | FastAPI, CORS Middleware |
| `backend/app/models.py` | Declaración de modelos SQLAlchemy ORM de las 21 tablas. | Core | SQLAlchemy ORM |
| `backend/app/schemas.py` | Modelos Pydantic V2 de validación de entrada/salida de datos de la API. | Core | Pydantic V2 |
| `backend/requirements.txt` | Listado de librerías y dependencias Python para producción. | Configuración | pip packages |

### Pruebas Automatizadas (`/backend/tests`)
| Ruta Relativa | Propósito | Módulo | Dependencias Principales |
| :--- | :--- | :--- | :--- |
| `backend/tests/test_api_rls.py` | Validaciones unitarias de RLS mockeado y expiración/firma JWT. | QA / Auth | Pytest, unittest.mock |
| `backend/tests/test_billing.py` | Pruebas de flujo de caja y resolución de adaptadores de facturación. | QA / Facturas | Pytest, unittest.mock |
| `backend/tests/test_clinical_core.py` | Pruebas unitarias de recetas, citas solapadas y expedientes cerrados. | QA / EMR | Pytest, unittest.mock |
| `backend/tests/test_inventory.py` | Pruebas unitarias de descuento de stock FEFO y validaciones de merma. | QA / Inventario | Pytest, unittest.mock |
| `backend/tests/test_e2e_flow.py` | Test completo E2E de integración de negocio sin mocks de base de datos. | QA / E2E | Pytest, fastapi.testclient |

---

## 3. Capa del Frontend (`/frontend`)

### Páginas del App Router (`/frontend/src/app`)
| Ruta Relativa | Propósito | Módulo | Dependencias Principales |
| :--- | :--- | :--- | :--- |
| `frontend/src/app/page.tsx` | Dashboard visual principal con KPIs clínicos y financieros. | Frontend Core | React, Framer Motion |
| `frontend/src/app/patients/page.tsx` | Gestión y alta de dueños de mascotas y mascotas. | Frontend EMR | React, Lucide Icons |
| `frontend/src/app/appointments/page.tsx` | Agenda clínica y triajes rápidos de enfermería. | Frontend Agenda | React, Lucide Icons |
| `frontend/src/app/clinical/page.tsx` | Expediente EMR, recetas controladas y visor de inmutabilidad. | Frontend EMR | React, Framer Motion |
| `frontend/src/app/inventory/page.tsx` | Kardex de stock físico, traslados e inventario de seguridad. | Frontend Inventario| React, Lucide Icons |
| `frontend/src/app/billing/page.tsx` | Panel de cajas registradoras, arqueo, ventas y facturas SAT/DIAN. | Frontend Ventas | React, Lucide Icons |
| `frontend/src/app/globals.css` | CSS global y configuración de paleta de variables visuales HSL. | Frontend Core | Tailwind CSS v4 |
| `frontend/src/app/layout.tsx` | Layout general con el simulador interactivo JWT de desarrollo. | Frontend Core | `mock-auth.ts`, `api.ts` |

### Librerías Compartidas (`/frontend/src/lib`)
| Ruta Relativa | Propósito | Módulo | Dependencias Principales |
| :--- | :--- | :--- | :--- |
| `frontend/src/lib/api.ts` | Cliente Axios configurado para inyección de token JWT y control de errores. | Frontend Core | Axios, LocalStorage |
| `frontend/src/lib/mock-auth.ts` | Firmador simétrico JWT de desarrollo vía Web Crypto API en navegador. | Frontend Auth | Web Crypto API |

### Configuración del Frontend
| Ruta Relativa | Propósito | Módulo | Dependencias Principales |
| :--- | :--- | :--- | :--- |
| `frontend/vercel.json` | Cabeceras de seguridad CSP, HSTS y geolocalización para hosting. | Seguridad | Vercel Hosting |
| `frontend/package.json` | Dependencias NodeJS y scripts de compilación de producción. | Configuración | npm packages |

---

## 4. Workflows de CI/CD (`/.github`)

| Ruta Relativa | Propósito | Módulo | Dependencias Principales |
| :--- | :--- | :--- | :--- |
| `.github/workflows/ci.yml` | Pipeline de GitHub Actions para validación estática y pruebas en cada PR/Push. | CI/CD | GitHub Actions Runner |
