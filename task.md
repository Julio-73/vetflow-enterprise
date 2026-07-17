# CHECKLIST DE PROYECTO: VetFlow SaaS

## FASE 0: PLANIFICACIÓN INICIAL
- [x] Crear el `project_charter.md` de la veterinaria en la raíz del espacio de trabajo.
- [x] Crear el `task.md` del proyecto en la raíz del espacio de trabajo.

## FASE 1: ANÁLISIS ESTRATÉGICO Y DE NEGOCIO (En Paralelo)
- [x] Invocar a `Product Strategy Master` para generar `product_strategy.md`.
- [x] Invocar a `Enterprise Business Analyst` para generar requerimientos de negocio:
  - [x] `business_requirements.md` (Stakeholders, Descubrimiento, Glosario)
  - [x] `business_processes.md` (Flujos de Trabajo, BPMN)
  - [x] `functional_requirements.md` (Casos de Uso, Requerimientos Funcionales, Historias de Usuario)
  - [x] `non_functional_requirements.md` (KPIs, Integraciones, Requerimientos No Funcionales)

## FASE 2: ARQUITECTURA Y DISEÑO TÉCNICO (En Paralelo)
- [x] Invocar a `CTO Architect` y `Architecture Master` para generar `architecture_design.md`.
- [x] Invocar a `Enterprise Data Architect` para generar `data_schema.md`.
- [x] Invocar a `Enterprise Cloud Architect` para generar `infrastructure_design.md`.

## FASE 3: SEGURIDAD Y CUMPLIMIENTO REGULATORIO
- [x] Invocar a `Security Expert` y `Enterprise Compliance Expert` para generar `security_compliance.md`.

## FASE 4: CONTROL DE CALIDAD Y QUALITY GATES
- [x] Validar los Quality Gates y generar el `quality_report.md`.
- [x] Presentar informe consolidado y solicitar autorización al usuario.

## FASE 5: DESARROLLO - ITERACIÓN 1 (BASE DE DATOS Y RLS)
- [x] Crear esquema DDL relacional (`schema.sql`) sin dependencias de Docker
- [x] Configurar políticas de Row Level Security (`rls_policies.sql`)
- [x] Configurar triggers de base de datos (`triggers.sql`)
- [x] Crear set de datos de prueba (`seeds.sql`)
- [x] Implementar script de validación de RLS e inmutabilidad (`tests/test_rls_isolation.sql`)
- [x] Generar plantilla de variables de entorno (`.env.example`)
- [x] Ejecutar auditoría de calidad de base de datos y reportar Executive Scorecard

## FASE 5: DESARROLLO - ITERACIÓN 2 (BACKEND FOUNDATION & AUTH)
- [x] Inicializar estructura de backend en FastAPI (`requirements.txt`, `config.py`)
- [x] Configurar middleware de autenticación Supabase Auth/JWT (`security.py`)
- [x] Desarrollar la inyección del contexto multi-tenant RLS en SQLAlchemy (`database.py`)
- [x] Implementar endpoints de validación RLS (`tenants.py`)
- [x] Implementar pruebas de integración de API (`test_api_rls.py`)
- [x] Ejecutar la suite de pruebas de API y reportar Executive Scorecard

## FASE 5: DESARROLLO - ITERACIÓN 3 (CORE BUSINESS LOGIC)
- [x] Crear tabla de catálogo global de diagnósticos (`diagnosis_catalog`) en base de datos
- [x] Mapear los modelos de negocio (Tutor, Paciente, Cita, Triaje, EMR, Recetas) en SQLAlchemy (`models.py`)
- [x] Crear esquemas de validación Pydantic (`schemas.py`)
- [x] Implementar enrutadores de pacientes y tutores (`patients.py`)
- [x] Implementar enrutadores de agenda y citas (`appointments.py`)
- [x] Implementar enrutadores de EMR, triaje y recetas controladas (`clinical.py`)
- [x] Crear y ejecutar pruebas automáticas del flujo clínico (`test_clinical_core.py`)
- [x] Ejecutar auditoría final de calidad de la Iteración 3 y reportar Executive Scorecard

## FASE 5: DESARROLLO - ITERACIÓN 4 (INVENTORY & PHARMACY)
- [x] Mapear los modelos de base de datos de inventario (`Product`, `ProductBatch`, etc.) en SQLAlchemy
- [x] Diseñar DTOs Pydantic incluyendo el cálculo de `requires_reorder` en backend
- [x] Desarrollar enrutadores de productos y lotes FEFO (`inventory.py`)
- [x] Implementar endpoint de transacciones de stock con triggers de control sanitarios y de mermas
- [x] Crear y ejecutar suite de pruebas de inventarios (`test_inventory.py`)
- [x] Ejecutar auditoría final de calidad de la Iteración 4 y reportar Executive Scorecard

## FASE 5: DESARROLLO - ITERACIÓN 5 (BILLING, CASH & SALES)
- [x] Actualizar restricción `CHECK` de métodos de pago en base de datos
- [x] Diseñar interfaz abstracta `BillingPort` y adaptadores mock para SAT (MX) y DIAN (CO)
- [x] Mapear los modelos financieros (`Sale`, `Payment`, `CashRegister`) en SQLAlchemy
- [x] Diseñar DTOs Pydantic para cobros, arqueos y respuestas fiscales
- [x] Desarrollar enrutadores de caja, ventas y facturación dinámica (`billing.py`)
- [x] Crear y ejecutar suite de pruebas de facturación (`test_billing.py`)
- [x] Ejecutar auditoría final de calidad de la Iteración 5 y reportar Executive Scorecard

## FASE 6: DESARROLLO - FRONTEND SAAS PREMIUM
- [x] Inicializar proyecto Next.js 16 (App Router) con TypeScript y Tailwind CSS
- [x] Diseñar variables base CSS y utilidades glassmorphism premium en `globals.css`
- [x] Configurar cliente API en `api.ts` con inyección de cabecera JWT y control de fallbacks
- [x] Desarrollar simulador de tokens JWT "development only" en `mock-auth.ts`
- [x] Construir layout principal con barra lateral, selector de tenants y estatus de API
- [x] Implementar página principal de Dashboard con widgets financieros y de existencias
- [x] Desarrollar catálogo de tutores y mascotas en `/patients`
- [x] Desarrollar agenda e interfaz de pre-triaje en `/appointments`
- [x] Desarrollar historial clínico EMR inmutable y recetas médicas en `/clinical`
- [x] Desarrollar control de almacén, lotes por FEFO y auditoría de mermas en `/inventory`
- [x] Desarrollar cajas cobradoras, arqueos de efectivo y timbrado fiscal SAT/DIAN en `/billing`
- [x] Ejecutar build de optimización de producción y verificar TypeScript y rutas sin errores

## FASE 7: PRODUCTION READINESS & ENTERPRISE HARDENING
- [ ] Configurar analizadores estáticos locales (Ruff, Black, isort, ESLint, TypeScript)
- [ ] Crear el pipeline de CI/CD automatizado en `.github/workflows/ci.yml`
- [ ] Fortalecer validación de JWT (restringir HS256 a dev/test, forzar JWKS RS256 en prod)
- [ ] Implementar middleware global de logging estructurado JSON (con request_id, tenant_id, duración)
- [ ] Diseñar y crear índices de base de datos optimizados para RLS
- [ ] Ejecutar auditoría de rendimiento SQL con EXPLAIN ANALYZE
- [ ] Crear el script de pruebas automatizadas E2E y de carga simulada
- [ ] Ejecutar auditoría de calidad final de la Fase 7 y generar Production Readiness Report


