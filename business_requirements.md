# REQUISITOS DE NEGOCIO: VetFlow SaaS
**Versión:** 1.0.0  
**Fecha:** 16 de Julio de 2026  
**Autor:** Enterprise Business Analyst

---

## 1. INTRODUCCIÓN Y CONTEXTO DEL NEGOCIO

**VetFlow SaaS** es una plataforma tecnológica multi-tenant diseñada específicamente para la gestión operativa, clínica, comercial y financiera de clínicas veterinarias en Latinoamérica. La región presenta un mercado en acelerado crecimiento debido a la humanización de las mascotas, pero enfrenta barreras críticas como la informalidad, la ineficiencia operativa, el uso de herramientas fragmentadas (hojas de cálculo, libretas, software local obsoleto) y una compleja y fragmentada regulación fiscal y sanitaria en cada país.

VetFlow SaaS consolida en una sola solución en la nube la gestión de la agenda de citas, el Historial Clínico Electrónico (EMR), el control de inventario de medicamentos controlados e insumos, y la facturación integrada con las normativas tributarias de cada país latinoamericano.

---

## 2. DESCUBRIMIENTO DEL NEGOCIO (BUSINESS DISCOVERY)

### 2.1. Análisis del Sector Veterinario en Latinoamérica
El mercado veterinario en LATAM se caracteriza por:
*   **Diversidad de escala:** Conviven desde consultorios independientes (1 solo veterinario) hasta cadenas hospitalarias multi-sucursal con servicios de urgencias 24/7, laboratorios propios e internamiento.
*   **Falta de digitalización integrada:** El 70% de las clínicas veterinarias en la región utilizan sistemas aislados para cobrar y agendas manuales o físicas, lo que genera pérdida de datos clínicos e inconsistencias financieras.
*   **Dependencia de canales informales de comunicación:** WhatsApp es el canal predominante para citas y seguimiento, por lo que la integración con esta plataforma es un factor crítico de conversión y retención para los negocios veterinarios.
*   **Regulación de Medicamentos de Uso Veterinario:** Entidades estatales exigen un estricto control de libros de medicamentos controlados (ej. anestésicos, psicotrópicos).

### 2.2. Principales Puntos de Dolor (Pain Points) del Cliente
1.  **Fuga de Ingresos:** Servicios prestados, insumos aplicados en cirugías o medicamentos administrados en hospitalización que no se registran en la cuenta final del tutor.
2.  **Inconsistencia en EMR (Historial Clínico):** Fichas clínicas incompletas, letra ilegible (en papel) o pérdida de antecedentes médicos que incrementan el riesgo de mala praxis y disminuyen la confianza del tutor.
3.  **Quiebres de Stock y Merma:** Medicamentos vencidos en estantería por falta de control de lotes y desabastecimiento de insumos críticos durante procedimientos de emergencia.
4.  **Complejidad en Operaciones Multi-Sucursal:** Imposibilidad de ver consolidados los ingresos, transferir inventarios de forma segura o conocer el rendimiento de los veterinarios que rotan entre sucursales.
5.  **Dificultad de Cumplimiento Tributario:** La emisión de boletas, facturas y notas de crédito electrónicas varía por país (SAT en México, DIAN en Colombia, SII en Chile, AFIP en Argentina) y su falta de automatización ralentiza la atención diaria.

### 2.3. Propuesta de Valor de VetFlow SaaS
VetFlow SaaS unifica las operaciones clínicas y comerciales en un flujo de trabajo continuo (de ahí *VetFlow*): la cita alimenta al triaje, el triaje a la consulta, la consulta genera cargos y recetas automáticas, los cargos actualizan el inventario y se liquidan en una caja integrada que cumple con las regulaciones locales del país.

### 2.4. Modelo de Suscripción y Monetización
El software opera bajo un modelo SaaS multi-tenant basado en tres niveles (Tiers) definidos por sucursales, features y usuarios (veterinarios activos):

| Característica / Plan | Starter | Professional | Enterprise |
| :--- | :--- | :--- | :--- |
| **Público Objetivo** | Consultorios independientes. | Clínicas medianas con crecimiento. | Hospitales multi-sucursal y franquicias. |
| **Sucursales** | Máximo 1 sucursal. | Hasta 3 sucursales. | Ilimitadas. |
| **Veterinarios Activos**| Hasta 2 veterinarios. | Hasta 8 veterinarios. | Ilimitados. |
| **Historial Clínico (EMR)**| Sí (Core). | Sí (Avanzado + Archivos multimedia). | Sí (Historial ilimitado + Integración Lab). |
| **Gestión de Inventario** | Básico (Stock general). | Avanzado (Multi-bodega, Lotes y Vencimiento). | Avanzado + Traslados automáticos con aprobación. |
| **Módulo de Hospitalización**| No. | Sí (Monitoreo básico). | Sí (Monitoreo avanzado, flujogramas y alertas). |
| **Facturación y Caja** | Caja simple (Reporte Excel). | Facturación electrónica integrada + Caja multi-usuario. | Facturación local multi-emisor + Conciliación automática. |
| **Integración WhatsApp** | No (Solo email básico). | Sí (Plantillas de recordatorios automáticas). | Sí (Bot conversacional de citas + canal dedicado). |

---

## 3. ANÁLISIS DE STAKEHOLDERS (MAPA DE ACTORES)

El sistema soporta un esquema jerárquico y modular basado en control de accesos por rol (RBAC) para proteger la confidencialidad de la información médica e ingresos.

### 3.1. Roles del Sistema y Responsabilidades

1.  **Administrador Global del SaaS (SuperAdmin):** 
    *   *Responsabilidad:* Gestión del ciclo de vida de los tenants, facturación de suscripciones, configuración de módulos generales del SaaS y monitoreo técnico de la plataforma.
2.  **Dueño de Clínica / Administrador de Tenant (Tenant Owner):**
    *   *Responsabilidad:* Suscripción al SaaS, parametrización inicial de la veterinaria (sucursales, tarifas, divisas, logos, datos fiscales), y visualización de dashboards financieros consolidados de todas sus sedes.
3.  **Director Clínico / Jefe de Veterinarios:**
    *   *Responsabilidad:* Supervisar la calidad de las historias clínicas, autorizar la compra de medicamentos controlados, configurar vademécums institucionales y dar seguimiento a indicadores de salud de los pacientes.
4.  **Veterinario:**
    *   *Responsabilidad:* Registro de anamnesis, examen físico, diagnóstico, recetas médicas, órdenes de exámenes, evolución clínica y alta de pacientes.
5.  **Personal de Recepción y Atención al Cliente:**
    *   *Responsabilidad:* Gestión de la agenda de citas, cobros en caja, check-in/admisión de pacientes, facturación electrónica y comunicación externa con los tutores.
6.  **Encargado de Farmacia / Inventario:**
    *   *Responsabilidad:* Recepción de compras, registro de lotes y fechas de vencimiento, auditorías de inventario físico y procesamiento de traslados entre sucursales.
7.  **Tutor (Cliente Final / Dueño de Mascota - Actor pasivo/activo en fases futuras):**
    *   *Responsabilidad:* Recepción de recetas, recordatorios de citas y estado de cuenta de sus mascotas (en MVP es el receptor pasivo de alertas de WhatsApp e impresiones/PDFs).

### 3.2. Matriz de Asignación de Responsabilidades (RACI)

| Proceso de Negocio | Tenant Owner | Director Clínico | Veterinario | Recepcionista | Farmacéutico | Tutor |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Configuración del Tenant** | **A** / **R** | C | I | I | I | I |
| **Creación/Modificación de Citas**| I | I | C | **A** / **R** | I | C / I |
| **Admisión y Triaje** | I | I | C | **A** / **R** | I | I |
| **Atención Clínico y EMR** | I | **A** | **R** | I | I | I |
| **Receta de Medicamento Controlado**| I | **A** | **R** | I | C | I |
| **Despacho / Consumo Insumos**| I | I | C | I | **A** / **R** | I |
| **Facturación de Servicios** | **A** | I | I | **R** | I | C |
| **Traslados de Inventario** | **A** | I | I | I | **R** | I |

*Leyenda: **R**: Responsable de la ejecución; **A**: Aprobador/Responsable último (Accountable); **C**: Consultado; **I**: Informado.*

---

## 4. REGLAS GENERALES DE NEGOCIO (BUSINESS RULES)

### 4.1. Reglas Clínicas y EMR
*   **BR-CL-001 (Inmutabilidad del Historial):** Una vez que el veterinario cierra e ingresa una evolución o consulta médica en el EMR, el registro se vuelve de "Solo Lectura". No podrá ser modificado. Cualquier corrección posterior se debe realizar mediante un anexo ("Nota de Evolución Posterior") que indique la fecha, hora y el veterinario que la realiza. Esto cumple con las normativas legales de práctica médica y auditoría forense en LATAM.
*   **BR-CL-002 (Prescripción Única y Cédula):** Para emitir una receta médica (especialmente de medicamentos controlados), el veterinario emisor debe tener cargado y validado en su perfil de usuario su Cédula Profesional, Registro Nacional o Matrícula Profesional vigente del país de la sucursal.
*   **BR-CL-003 (Consentimiento Informado Obligatorio):** Todo procedimiento quirúrgico, anestesia o internamiento requiere la generación de un documento de consentimiento informado. El sistema debe bloquear el estado del paciente a "En Cirugía" si no se marca la casilla de confirmación del consentimiento firmado físicamente o digitalmente por el tutor.

### 4.2. Reglas de Inventario y Farmacia
*   **BR-INV-001 (Prioridad de Salida - FEFO):** El sistema debe proponer por defecto la salida de inventario bajo la metodología **FEFO** (*First Expired, First Out* - Primero en Vencer, Primero en Salir).
*   **BR-INV-002 (Medicamentos Controlados):** Los medicamentos catalogados como "Controlados" solo pueden ser descontados del stock si están vinculados directamente a una receta médica con folio emitida en la misma fecha o a una hoja de anestesia de cirugía autorizada.
*   **BR-INV-003 (Manejo de Lotes):** No se permitirá el ingreso al stock de ningún producto de tipo "Medicamento" sin especificar el número de lote y su fecha de vencimiento. Si un lote expira en menos de 30 días, el sistema emitirá una alerta visual diaria en el dashboard de inventario.
*   **BR-INV-004 (Mermas y Ajustes):** Todo ajuste de inventario negativo por concepto de merma, rotura o pérdida de cadena de frío debe ir acompañado de una justificación textual obligatoria y requiere la aprobación digital de un rol con nivel Director Clínico o Administrador.

### 4.3. Reglas de Facturación y Finanzas
*   **BR-FIN-001 (Moneda del Tenant y Transaccional):** Cada sucursal opera con una divisa base por defecto según el país de ubicación física (Ej: CLP en Chile, COP en Colombia, MXN en México, USD en Ecuador/El Salvador). Los reportes consolidados del corporativo pueden convertirse a la divisa del Tenant aplicando una tasa de cambio configurable manualmente o integrada mediante API diaria.
*   **BR-FIN-002 (Cierre de Caja Ciego):** El arqueo o cierre de caja diario se realizará bajo la modalidad de "Cierre Ciego". El recepcionista debe ingresar el monto físico en efectivo que posee al terminar su turno, sin que el sistema le muestre previamente el valor teórico esperado en base a las ventas del día. La diferencia (sobrante/faltante) se registrará automáticamente para auditoría.
*   **BR-FIN-003 (Facturación Localizada):** Una venta solo puede dar origen a un comprobante fiscal electrónico si contiene los datos mínimos obligatorios exigidos por la entidad tributaria local del país de la sucursal (RUT/RUC/RFC, régimen tributario, uso de CFDI/factura, etc.).

---

## 5. GLOSARIO DEL DOMINIO VETFLOW

Para garantizar la homogeneidad terminológica en los requerimientos, la base de datos y la interfaz de usuario, se definen los siguientes términos de negocio:

1.  **Tenant (Inquilino):** La entidad comercial jurídica (empresa de clínicas veterinarias) que se suscribe a VetFlow SaaS. Un Tenant puede tener una o varias sucursales y sus datos se aíslan lógicamente de otros Tenants.
2.  **Sucursal (Branch):** Establecimiento físico perteneciente a un Tenant donde se prestan servicios, se almacena inventario y se factura de forma independiente.
3.  **Tutor (Pet Owner / Propietario):** La persona natural responsable legal de la mascota ante la clínica, encargada de autorizar procedimientos y pagar por los servicios prestados.
4.  **Paciente (Patient / Mascota):** El animal doméstico o exótico que recibe los servicios clínicos en la clínica. Está indisolublemente asociado a uno o varios tutores.
5.  **EMR (Electronic Medical Record / Historial Clínico):** Registro digital cronológico de todas las intervenciones médicas, diagnósticos, recetas, cirugías, vacunas y desparasitaciones de un paciente.
6.  **Anamnesis:** Proceso de recopilación de información clínica proporcionada por el tutor sobre el estado actual, síntomas y antecedentes del paciente al inicio de la consulta.
7.  **Triaje (Triage):** Evaluación rápida del paciente por parte de un asistente o veterinario a su llegada a la clínica para clasificar la gravedad de su condición y priorizar el orden de atención (Urgencia, Emergencia, Consulta de Rutina).
8.  **Vademécum:** Catálogo referencial de medicamentos aprobados en la clínica con sus dosis sugeridas, principios activos y precauciones, asociado al control de inventario.
9.  **Medicamento Controlado:** Fármaco catalogado por las autoridades de salud pública que requiere almacenamiento bajo llave, libro de control oficial y prescripción estricta con receta de un veterinario matriculado (Ej: Tramadol, Ketamina, Fenobarbital).
10. **SKU (Stock Keeping Unit):** Identificador alfanumérico único para el control de inventario de cada producto o servicio ofrecido por la veterinaria.
11. **FEFO (First Expired, First Out):** Técnica de gestión de inventarios que prioriza la venta o uso de los productos que tienen una fecha de vencimiento más cercana en el tiempo.
12. **Cierre de Caja Ciego:** Proceso administrativo de conteo y entrega de dinero al final de la jornada de trabajo, en el cual el empleado no conoce la cifra que registra el sistema informático para evitar cuadres artificiales o encubrimiento de faltantes.
13. **Facturación Electrónica Localizada:** Emisión de comprobantes de pago con validez fiscal que cumplen estrictamente con los formatos XML, firmas digitales y conexiones API requeridas por el ente regulador de cada país de Latinoamérica.
