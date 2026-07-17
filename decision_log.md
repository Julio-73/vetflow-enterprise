# BITÁCORA DE DECISIONES DE ARQUITECTURA Y NEGOCIO (Decision Log) - VetFlow SaaS

Este documento registra las decisiones clave de negocio, producto y arquitectura técnica del proyecto VetFlow SaaS, justificando su racionalidad técnica y económica.

---

## REGISTRO DE DECISIONES

### DEC-01: Estilo Arquitectónico - Monolito Modular
*   **Fecha:** 16 de Julio de 2026
*   **Estado:** **Aprobado**
*   **Decisión:** Adoptar un patrón de **Monolito Modular** en lugar de microservicios para la fase de MVP, utilizando Clean Architecture (capas desacopladas) dentro de cada módulo lógico.
*   **Justificación:** 
    *   *Costo:* Menor consumo de recursos de nube (se ejecuta en una sola instancia de cómputo inicialmente).
    *   *Mantenimiento:* Evita la complejidad de transacciones distribuidas y la orquestación de red compleja de Kubernetes, permitiendo despliegues rápidos en AWS App Runner.
    *   *Escalabilidad:* Los módulos (Pacientes, Citas, Facturación) están lógicamente aislados y se comunican a través de eventos de dominio e interfaces públicas, lo que facilitará su migración a microservicios independientes en el futuro si la carga lo justifica.

### DEC-02: Aislamiento Multi-Tenant - Row Level Security (RLS) en PostgreSQL
*   **Fecha:** 16 de Julio de 2026
*   **Estado:** **Aprobado**
*   **Decisión:** Utilizar aislamiento multi-tenant lógico a nivel de base de datos mediante **PostgreSQL Row Level Security (RLS)** en un esquema unificado, en lugar de bases de datos físicas separadas por clínica.
*   **Justificación:**
    *   *Costo:* Mantener una base de datos por tenant multiplicaría los costos del pool de conexiones e infraestructura, haciendo inviable el plan Starter de $39/mes.
    *   *Seguridad:* RLS garantiza el aislamiento directamente en la base de datos (seguridad nativa), impidiendo que un query erróneo filtre datos de otro tenant.
    *   *Mantenimiento:* Permite realizar migraciones y actualizaciones del esquema de datos de forma simultánea a todas las clínicas con un solo script.

### DEC-03: Localización Fiscal - Patrón Ports & Adapters y APIs de Terceros
*   **Fecha:** 16 de Julio de 2026
*   **Estado:** **Aprobado**
*   **Decisión:** Abstraer las reglas fiscales de facturación de cada país de Latinoamérica mediante un puerto genérico (`BillingPort`) y delegar la generación de comprobantes XML y firmas digitales a APIs de terceros locales especializadas (ej: Facturapi para México, efact para Colombia), en lugar de construir motores fiscales internos.
*   **Justificación:**
    *   *Velocidad de Desarrollo:* Evita que el equipo de desarrollo deba estudiar y actualizar constantemente los complejos y cambiantes portales tributarios de cada país.
    *   *Mantenimiento:* Si un país cambia sus leyes fiscales, solo se actualiza el adaptador correspondiente sin alterar la lógica de facturación de VetFlow.
    *   *Escalabilidad:* Permite abrir operaciones en nuevos países simplemente creando un nuevo adaptador.

### DEC-04: Infraestructura y Servidores Gestionados (Vercel, Supabase y AWS App Runner)
*   **Fecha:** 16 de Julio de 2026
*   **Estado:** **Aprobado**
*   **Decisión:** Utilizar servicios de infraestructura gestionados (Vercel, AWS App Runner y Supabase) en lugar de auto-gestionar servidores físicos o clústeres Kubernetes independientes.
*   **Justificación:**
    *   *FinOps:* Minimiza el costo inicial de infraestructura ($229 USD/mes proyectado para las primeras 100 clínicas), maximizando el margen bruto de la nube al 96%.
    *   *Rendimiento:* Vercel distribuye el frontend de forma instantánea en servidores Edge en LATAM.
    *   *Operaciones:* Reduce la carga de trabajo de DevOps para el equipo, permitiendo centrarse en valor de negocio y clínico.

### DEC-05: Estructura de Pricing Basada en Sucursales y Veterinarios
*   **Fecha:** 16 de Julio de 2026
*   **Estado:** **Aprobado**
*   **Decisión:** Establecer precios basados en planes fijos mensuales diferenciados por susucursales y la cantidad de veterinarios activos en nómina (Starter: 1 sucursal/2 vets, Professional: 3 sucursales/8 vets, Enterprise: sucursales/vets ilimitados), en lugar de facturar por cita o volumen de visitas.
*   **Justificación:**
    *   *Valor de Negocio:* El veterinario activo en consulta es el principal generador de valor de la clínica. Limitar su número incentiva a las veterinarias grandes a adquirir planes superiores (Professional/Enterprise) de forma justa y transparente.
    *   *Predecibilidad:* Ofrece a los administradores de clínicas un costo fijo predecible mes a mes, facilitando su adopción y eliminando la fricción de cobros variables imprevistos.

### DEC-06: Criptografía - Cifrado a Nivel de Columna (DLE) para PII del Tutor
*   **Fecha:** 16 de Julio de 2026
*   **Estado:** **Aprobado**
*   **Decisión:** Implementar cifrado simétrico AES-256 a nivel de columna mediante la extensión `pgcrypto` de PostgreSQL para los datos personales identificables (PII) de los tutores (`email`, `phone`, `address`), administrando las llaves criptográficas externamente mediante AWS KMS.
*   **Justificación:**
    *   *Cumplimiento Regulatorio:* Asegura que el SaaS cumpla de forma estricta con normativas como la Ley 1581 (Colombia) y la LFPDPPP (México), impidiendo que accesos no autorizados a la base de datos (ej: volcados de disco) expongan la información de los tutores.
    *   *Rendimiento:* Al encriptar selectivamente solo los campos sensibles de los tutores, se minimiza la degradación del rendimiento de CPU de la base de datos transaccional.

### DEC-07: Auditoría - Logs de Auditoría en Almacenamiento Inmutable (WORM)
*   **Fecha:** 16 de Julio de 2026
*   **Estado:** **Aprobado**
*   **Decisión:** Transferir de forma asíncrona todos los logs de auditoría técnica y de negocio hacia un bucket de almacenamiento Cloudflare R2/AWS S3 configurado con políticas WORM (Write Once Read Many / Object Lock) por un período de 5 años.
*   **Justificación:**
    *   *Seguridad y Cumplimiento:* Garantiza la inmutabilidad absoluta de la trazabilidad operativa ante auditorías oficiales (como investigaciones de medicamentos controlados de la SENASICA/ICA). Evita que atacantes o administradores maliciosos puedan borrar sus registros de acceso.
    *   *Trade-off Financiero:* Mantener logs históricos extensos en la base de datos relacional aumentaría exponencialmente los costos de almacenamiento rápido SSD. El almacenamiento en buckets fríos reduce el costo a fracciones de centavo por gigabyte.

### DEC-08: RLS Middleware - Inyección Automática de Contexto Multi-Tenant en SQLAlchemy
*   **Fecha:** 16 de Julio de 2026
*   **Estado:** **Aprobado**
*   **Decisión:** Implementar la inyección automática de la variable de sesión transaccional `app.current_tenant_id` directamente en la función de dependencia `get_db` de FastAPI mediante SQLAlchemy.
*   **Justificación:**
    *   *Seguridad:* Automatiza la inyección del contexto multi-tenant en cada transacción HTTP, evitando que un desarrollador deba recordar configurar manualmente el tenant en el código al ejecutar consultas, eliminando el riesgo de fuga de información accidental.
    *   *Acoplamiento:* El middleware intercepta el JWT autenticado, valida la firma, y pasa el contexto del usuario a la sesión, manteniendo aislada la capa de persistencia bajo las directrices de RLS.

### DEC-09: Configuración Externa - Abstracción de Variables en Archivo .env
*   **Fecha:** 16 de Julio de 2026
*   **Estado:** **Aprobado**
*   **Decisión:** Utilizar Pydantic-settings para cargar las variables del backend desde un archivo `.env` local, abstrayendo credenciales reales de base de datos y llaves públicas/privadas de Supabase.
*   **Justificación:**
    *   *DevEx & Cost vs Value:* Permite que el backend pueda ejecutarse de forma aislada y mockeada en desarrollo local sin requerir credenciales de producción de Supabase ni conectores de red activos obligatorios.
    *   *Portabilidad:* Facilita el despliegue del mismo código a través de diferentes entornos (Dev, Staging, Prod) inyectando únicamente las variables de entorno en el host.

### DEC-10: Catálogo de Diagnósticos - Estructura Híbrida (Global Precargado + Notas Clínicas Libres)
*   **Fecha:** 16 de Julio de 2026
*   **Estado:** **Aprobado**
*   **Decisión:** Crear la tabla `diagnosis_catalog` en base de datos para almacenar diagnósticos globales precargados y clasificados por categoría, vinculándola a la consulta clínica (`clinical_records.diagnosis_id`), y agregando simultáneamente una columna `diagnosis_notes` para que el veterinario registre observaciones médicas libres específicas.
*   **Justificación:**
    *   *Consistencia y Analítica:* Permite que el SaaS agrupe y reporte los KPIs de salud y diagnóstico de forma estandarizada en los dashboards del Tenant (ej. tasa de incidencia de dermatitis o control sano).
    *   *Adopción UX:* Respeta la flexibilidad de la práctica veterinaria diaria al permitir que el médico describa sintomatología compleja sin estar limitado por un listado cerrado.
    *   *RLS Global:* Se habilita RLS en la tabla del catálogo con una política de lectura global para todos los usuarios autenticados de cualquier tenant, optimizando el uso de recursos y previniendo la duplicidad de semillas de catálogo.

### DEC-11: Localización Fiscal - Patrón Ports & Adapters para Facturación Electrónica (SAT / DIAN)
*   **Fecha:** 16 de Julio de 2026
*   **Estado:** **Aprobado**
*   **Decisión:** Diseñar la interfaz `BillingPort` e implementar adaptadores de facturación mock (`SatAdapter` para México y `DianAdapter` para Colombia), resueltos dinámicamente mediante una factoría (`BillingService`) en tiempo de ejecución de acuerdo al país de la sucursal de la venta.
*   **Justificación:**
    *   *Clean Architecture:* Mantiene el núcleo de la aplicación de ventas y cobros completamente aislado de los esquemas fiscales y librerías externas de cada país.
    *   *Extensibilidad:* Permite agregar soporte para la facturación electrónica de nuevos países de Latinoamérica (ej. SUNAT en Perú o SII en Chile) simplemente creando un nuevo adaptador que implemente `BillingPort`, sin modificar los endpoints de ventas o cobros existentes.
    *   *DevEx & Testability:* Los adaptadores mock permiten certificar el flujo financiero y de conciliación extremo a extremo en pruebas unitarias locales sin incurrir en dependencias de red o de certificados reales.
