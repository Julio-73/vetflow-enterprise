# REGISTRO DE RIESGOS VIVO (Live Risk Register) - VetFlow SaaS

Este documento contiene el inventario consolidado de riesgos de negocio, tecnológicos y operativos identificados para el desarrollo de VetFlow SaaS, junto con sus respectivos planes de mitigación, propietarios y estado actual.

---

## 1. MATRIZ DE RIESGOS

| ID | Categoría | Descripción del Riesgo | Prob. (1-5) | Imp. (1-5) | Prioridad | Plan de Mitigación | Responsable | Estado |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| **R-01** | Seguridad | **Fuga de datos inter-tenant** (Acceso no autorizado de un inquilino a datos de otro). | 1 | 5 | **MEDIO** | **Mitigado:** Implementadas políticas de Row Level Security (RLS) en PostgreSQL (`data_schema.md`) y validación estricta de `tenant_id` en JWT. | Enterprise Data Architect | **Mitigado** |
| **R-02** | Negocio | **Feature Creep en el MVP** (Añadir funcionalidades complejas antes de validar el núcleo clínico). | 2 | 3 | **BAJO** | **Mitigado:** Alcance delimitado estrictamente a 6 Historias de Usuario bajo marco MoSCoW (`functional_requirements.md`). | Product Strategy Master | **Mitigado** |
| **R-03** | Técnico | **Complejidad regulatoria fiscal multi-país** (Boletas y facturas localizadas en LATAM). | 2 | 4 | **MEDIO** | **Mitigado:** Aislamiento de lógica fiscal mediante el puerto `BillingPort` y uso de APIs externas localizadas (`architecture_design.md`). | CTO Architect | **Mitigado** |
| **R-04** | Operativo | **Inconsistencia de datos en modo offline** (Conflictos en zonas con mala cobertura de red). | 3 | 3 | **MEDIO** | **Mitigado:** Uso de UUIDv4 en PK, base local IndexedDB con Service Workers y estrategia Last-Write-Wins (LWW) en la sincronización. | Architecture Master | **Abierto** |
| **R-05** | Financiero | **Sobrecosto operativo por WhatsApp** (Envío descontrolado de recordatorios). | 3 | 3 | **MEDIO** | **Mitigado:** Configuración de topes mensuales en plan Professional y cobro por "bolsa de créditos" si se excede. | Product Strategy Master | **Abierto** |
| **R-06** | Legal | **Incumplimiento de recetas controladas** (Clínicas sancionadas por recetas inválidas). | 1 | 4 | **BAJO** | **Mitigado:** El trigger `trg_validate_veterinarian_prescription` bloquea recetas de estupefacientes si el veterinario carece de cédula vigente (`data_schema.md`). | Enterprise Compliance Expert | **Mitigado** |
| **R-07** | Seguridad | **Fuga de PII en logs de auditoría** (Acceso no autorizado a datos personales de tutores). | 2 | 4 | **MEDIO** | **Abierto:** Encriptación de datos sensibles a nivel de columna con la extensión `pgcrypto` (`security_compliance.md`) y almacenamiento inmutable de logs en buckets con WORM. | Security Expert | **Abierto** |

---

## 2. SEGUIMIENTO DE MITIGACIONES

*   **R-01 (Aislamiento Multi-tenant):** Diseño de base de datos finalizado y aprobado. Se implementarán las directrices del DDL de RLS y `SET LOCAL` en la fase de desarrollo.
*   **R-02 (Feature Creep):** Criterios de aceptación Gherkin aprobados para evitar el desarrollo de funcionalidades no priorizadas.
*   **R-03 (Facturación Localizada):** Capa de adaptadores diseñada con interfaces limpias en la capa de infraestructura del software.
*   **R-06 (Medicamentos Controlados):** Implementado control por software en el motor PostgreSQL, garantizando cumplimiento de ICA/SENASICA de forma automática.
*   **R-07 (Fuga de PII):** Plan de cifrado a nivel de base de datos con AWS KMS y pgcrypto especificado e integrado en la estrategia de seguridad.
