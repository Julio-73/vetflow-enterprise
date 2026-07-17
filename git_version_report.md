# Reporte de Archivos a Versionar: VetFlow SaaS v1.0

Este documento detalla el inventario completo de archivos listos para el control de versiones en el nuevo repositorio de GitHub `vetflow-enterprise`, comprobando la correcta exclusión de entornos locales y dependencias pesadas.

---

## 🔒 Estado de Exclusiones (.gitignore)
Se ha verificado la exclusión exitosa de los siguientes elementos críticos:
- **Secretos:** `.env`, archivos `*.pem`, `*.key` y llaves de desarrollo están 100% ignoradas.
- **Dependencias:** `node_modules/` y entornos virtuales de Python (`.venv/`, `venv/`) no están rastreados.
- **Compilaciones y Caché:** Las carpetas `.next/`, `build/`, `__pycache__/`, y `.pytest_cache/` han sido totalmente excluidas.

---

## 📂 Archivos del Proyecto a Stagerar/Versionar

### 📌 Configuración & Documentación Raíz
- `.gitignore` (Ignorados globales)
- `.env.example` (Plantilla de variables de entorno)
- `README.md` (Documentación del proyecto principal)
- `architecture_design.md` (Diseño de Arquitectura)
- `business_processes.md` (Procesos de Negocio)
- `business_requirements.md` (Requisitos de Negocio)
- `data_schema.md` (Esquema lógico/físico de Datos)
- `decision_log.md` (Registro de Decisiones - ADR)
- `functional_requirements.md` (Requisitos Funcionales)
- `infrastructure_design.md` (Diseño de Infraestructura Cloud)
- `inventory_report.md` (Auditoría de Farmacia / Lotes)
- `non_functional_requirements.md` (Requisitos No Funcionales)
- `performance_optimization_report.md` (Reporte de Optimización de Rendimiento)
- `product_strategy.md` (Estrategia de Producto / Roadmap)
- `project_charter.md` (Carta del Proyecto)
- `project_completion_report.md` (Reporte de Cierre del Proyecto)
- `quality_report.md` (Reporte de Aseguramiento de Calidad)
- `responsive_redesign_report.md` (Reporte de Rediseño Responsive)
- `risk_register.md` (Matriz de Riesgos)
- `security_compliance.md` (Estrategia de Seguridad STRIDE/JWT)
- `task.md` (Plan de Trabajo / Checklist)
- `ui_ux_audit_report.md` (Reporte de Auditoría de Diseño)

### 📌 Pipeline de CI/CD (GitHub Actions)
- `.github/workflows/ci.yml` (Pipeline de integración y tests automáticos)

### 📌 Base de Datos (/database)
- `database/schema.sql` (Esquema físico de PostgreSQL)
- `database/rls_policies.sql` (Políticas Row Level Security)
- `database/triggers.sql` (Restricciones e Inmutabilidad)
- `database/seeds.sql` (Datos Semilla de prueba)
- `database/performance_indexes.sql` (Índices de Rendimiento)
- `database/backup_restore_guide.md` (Guía de Backup y Recuperación)
- `database/tests/test_rls_isolation.sql` (Pruebas de Aislamiento RLS)

### 📌 Backend FastAPI (/backend)
- `backend/requirements.txt` (Dependencias Python)
- `backend/app/main.py` (Punto de entrada FastAPI)
- `backend/app/models.py` (Modelos SQLAlchemy ORM)
- `backend/app/schemas.py` (Validaciones Pydantic)
- `backend/app/core/config.py` (Configuraciones de BaseSettings)
- `backend/app/core/database.py` (Sesiones y RLS Context injector)
- `backend/app/core/security.py` (Validación JWT Supabase y JWKS)
- `backend/app/core/logging_config.py` (Logs estructurados por Tenant)
- `backend/app/core/billing/billing_port.py` (Puerto de Facturación)
- `backend/app/core/billing/billing_service.py` (Servicio de Lógica de Facturas)
- `backend/app/core/billing/adapters/sat_adapter.py` (Adaptador SAT México)
- `backend/app/core/billing/adapters/dian_adapter.py` (Adaptador DIAN Colombia)
- `backend/app/api/endpoints/tenants.py`
- `backend/app/api/endpoints/patients.py`
- `backend/app/api/endpoints/appointments.py`
- `backend/app/api/endpoints/clinical.py`
- `backend/app/api/endpoints/inventory.py`
- `backend/app/api/endpoints/billing.py`
- `backend/tests/test_api_rls.py` (Pruebas unitarias de RLS)
- `backend/tests/test_billing.py` (Pruebas de Facturación)
- `backend/tests/test_clinical_core.py` (Pruebas de Inmutabilidad Clínica)
- `backend/tests/test_inventory.py` (Pruebas de Inventario/Mermas)
- `backend/tests/test_e2e_flow.py` (Pruebas de integración E2E)

### 📌 Frontend Next.js (/frontend)
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/tsconfig.json`
- `frontend/next.config.ts`
- `frontend/postcss.config.mjs`
- `frontend/eslint.config.mjs`
- `frontend/vercel.json`
- `frontend/src/lib/api.ts` (Cliente de API SWR con Offline Auto-Healing)
- `frontend/src/lib/mock-auth.ts` (Simulador de roles y login local)
- `frontend/src/app/globals.css` (Estilos Tailwind v4 adaptados)
- `frontend/src/app/layout.tsx` (Estructura de la app y Sidebar)
- `frontend/src/app/loading.tsx` (Barra de progreso de navegación)
- `frontend/src/app/page.tsx` (Dashboard de Bienvenida)
- `frontend/src/app/patients/page.tsx` (Módulo de Pacientes)
- `frontend/src/app/appointments/page.tsx` (Módulo de Citas & Triaje)
- `frontend/src/app/clinical/page.tsx` (Módulo de EMR Clínico)
- `frontend/src/app/inventory/page.tsx` (Módulo de Inventario & FEFO)
- `frontend/src/app/billing/page.tsx` (Módulo de Caja & Timbrado Fiscal)
