# REQUISITOS NO FUNCIONALES Y MATRIZ DE KPIs: VetFlow SaaS
**Versión:** 1.0.0  
**Fecha:** 16 de Julio de 2026  
**Autor:** Enterprise Business Analyst

---

## 1. SEGURIDAD Y CUMPLIMIENTO NORMATIVO (SECURITY & COMPLIANCE)

### 1.1. Aislamiento Estricto de Tenants (Multi-Tenant Isolation)
*   **Aislamiento a nivel de Base de Datos:** Se implementará **Row Level Security (RLS)** en PostgreSQL. Cada consulta ejecutada por la API debe incluir el `tenant_id` en el contexto de la transacción, asegurando que un usuario de la Veterinaria A no pueda, bajo ninguna circunstancia (ni siquiera por fallas de inyección de código en la API), leer o escribir datos de la Veterinaria B.
*   **Tokens JWT de Tenant:** Las sesiones de usuario emitidas por el proveedor de identidad (Auth0/Supabase Auth/Clerk) contendrán en su *payload* el `tenant_id` y el `user_role` de forma inalterable y firmada criptográficamente (HS256/RS256).

### 1.2. Encriptación de Datos
*   **En Tránsito:** Todo el tráfico de datos entre clientes y servidores se realizará bajo el protocolo HTTPS forzado mediante HSTS (HTTP Strict Transport Security), utilizando TLS 1.3 con cifrado fuerte.
*   **En Reposo:** Los discos duros de la base de datos y los buckets de almacenamiento de archivos adjuntos (imágenes de exámenes médicos, radiografías) se cifrarán utilizando el estándar AES-256.
*   **Datos Sensibles del Tutor:** Campos que contengan información sensible de contacto (nombres de tutores, correos electrónicos, teléfonos) se cifrarán a nivel de columna mediante extensiones criptográficas (como `pgcrypto`).

### 1.3. Cumplimiento Legal y de Privacidad de Datos en LATAM
La plataforma debe adherirse a las regulaciones locales sobre protección de datos personales de los países en los que opera:
*   **México:** Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
*   **Colombia:** Ley 1581 de 2012 (Régimen General de Protección de Datos Personales).
*   **Chile:** Ley 19.628 sobre protección de la vida privada.
*   **Brasil:** Lei Geral de Proteção de Dados (LGPD).
*   **Requerimientos comunes:** Módulos de consentimiento para envío de recordatorios de marketing, capacidad de anonimización o borrado de datos de contacto a solicitud del tutor (Derechos ARCO / Olvido), y logs de auditoría sobre quién accede a datos de contacto.

### 1.4. Cumplimiento de Recetas y Fármacos Regulados
*   El sistema mantendrá logs inmutables de auditoría de cada receta emitida para medicamentos clasificados como controlados.
*   Cumplimiento de las directrices de los organismos estatales agropecuarios y de salud de LATAM, tales como:
    *   **ICA** en Colombia.
    *   **SENASA** en Argentina y Perú.
    *   **SAG** en Chile.
    *   **SENASICA / COFEPRIS** en México.
*   El software permitirá generar reportes oficiales en formato PDF o CSV formateados exactamente según los requisitos del organismo de control nacional para su entrega mensual o trimestral.

---

## 2. DISPONIBILIDAD, CONFIABILIDAD Y RESILIENCIA (SLA & RTO/RPO)

### 2.1. SLA de Disponibilidad
*   El sistema tendrá un **SLA (Service Level Agreement) del 99.9%** de tiempo de actividad mensual en su núcleo (citas, EMR y caja), excluyendo ventanas de mantenimiento planificadas en horas de baja actividad (ej. Domingo de 01:00 am a 03:00 am UTC).

### 2.2. Recuperación ante Desastres (Disaster Recovery)
*   **RPO (Recovery Point Objective):** Copias de seguridad automáticas de base de datos cada 15 minutos en zonas de disponibilidad redundantes geográficamente. Pérdida máxima de datos admisible: 15 minutos.
*   **RTO (Recovery Time Objective):** Tiempo de restauración completa del sistema ante caída crítica de región cloud inferior a 2 horas (mediante despliegues automatizados de infraestructura como código - IaC).

### 2.3. Resiliencia y Funcionamiento Offline Limitado
*   Dado el estado de conectividad en zonas rurales o periféricas en Latinoamérica, la app móvil/web del veterinario mantendrá en caché local (mediante *Service Workers* y *IndexedDB*) el listado de pacientes citados para el día actual.
*   Se permitirá el ingreso de la anamnesis y examen físico en modo offline. Los registros se sincronizarán de forma asíncrona con el backend tan pronto como se recupere la conexión a internet, bloqueando temporalmente la modificación de ese EMR en otros dispositivos para evitar conflictos de sobrescritura.

---

## 3. RENDIMIENTO Y ESCALABILIDAD (PERFORMANCE & SCALABILITY)

### 3.1. Tiempos de Respuesta
*   **Carga de Agenda:** La pantalla principal de la agenda diaria de la sucursal no debe tardar más de **1.2 segundos** en renderizarse por completo con picos de hasta 50 citas visualizadas.
*   **Carga de EMR:** La apertura del historial clínico completo de un paciente (excluyendo la descarga de archivos pesados como radiografías o videos) debe tardar menos de **800 milisegundos**.
*   **Transacciones de Caja:** El guardado y cierre de transacciones financieras en la base de datos debe realizarse en un tiempo máximo de **1.5 segundos**.

### 3.2. Escalabilidad de Carga
*   La arquitectura modular permitirá que el servicio de procesamiento de alertas de WhatsApp se ejecute de forma asíncrona mediante colas de mensajes (ej. RabbitMQ/Redis Queue), evitando que el tráfico masivo de mensajes de recordatorio degrade los tiempos de respuesta de la base de datos de consulta clínica en horarios de alta afluencia.

---

## 4. ANÁLISIS DE INTEGRACIONES (INTEGRATION ARCHITECTURE)

Para no sobrecargar el core del MVP con particularidades locales, el sistema utilizará un patrón arquitectónico de **Adaptador/Puerto** para aislar las integraciones con servicios externos.

```
+--------------------------------------------------------+
|                      Core SaaS                         |
|  [Puerto Facturación]       [Puerto Pasarela de Pago]   |
+--------------------------+-----------------------------+
                           |
            +--------------+--------------+
            |  Capa de Adaptadores (APIs)  |
            +--------------+--------------+
                           |
     +---------------------+---------------------+
     |                     |                     |
+----+----+           +----+----+           +----+----+
| Facturapi |         | MercadoPago |       | Twilio  |
| (México)  |         | (LATAM)     |       | (SMS/WA)|
+---------+           +---------+           +---------+
| E-Fact  |           | Kushki  |           | Waba API|
| (Colombia)|         | (Ecuador)|          | (Meta)  |
+---------+           +---------+           +---------+
```

### 4.1. Facturación Electrónica Local Adaptable
*   El backend no programará la lógica de impuestos o firmas de XML de cada país. Se creará una interfaz estándar de facturación (`BillingPort`).
*   Para cada país de operación, se implementará un adaptador que se comunique con APIs de proveedores locales de facturación electrónica (ej. Facturapi en México, efact/Factura.co en Colombia, Facele/Tebca en Chile/Perú).
*   *Payload estándar de entrada:* Datos del cliente, ítems de venta (con código SKU de impuesto homologado) e importe total. El adaptador se encarga de convertir este JSON en el formato específico del país y retornar el estado tributario del documento.

### 4.2. Pasarelas de Pago
*   Integración para cobros en línea de planes SaaS (monetización del Tenant) y cobros de consultas (por parte del tutor) utilizando pasarelas con alta penetración en LATAM:
    *   **MercadoPago:** Cobros en México, Colombia, Chile, Argentina, Perú.
    *   **Kushki:** Procesamiento local en Ecuador, Colombia y Perú.
    *   **Stripe:** Para cobros globales de suscripción del SaaS.

### 4.3. Notificaciones y WhatsApp
*   **API Oficial de WhatsApp (Meta Cloud API / Twilio):** Uso de plantillas pre-aprobadas de WhatsApp (*Interactive Templates*) para permitir respuestas rápidas del tutor ("Confirmar", "Reagendar") e integrar bots conversacionales.

---

## 5. MATRIZ DE KPIs Y CUADRO DE MANDO

Se definen dos familias de KPIs para la toma de decisiones: KPIs del negocio veterinario (para los Tenants) y KPIs del modelo SaaS (para la administración global).

### 5.1. KPIs de Negocio Veterinario (Tenant Dashboard)
1.  **Tasa de Ocupación de Agenda (AOR - Agenda Occupancy Rate):**
    *   *Fórmula:* `(Horas de consulta ocupadas / Horas de consulta disponibles en agenda) * 100`
    *   *Meta:* > 75%
2.  **Tasa de Inasistencia (No-Show Rate):**
    *   *Fórmula:* `(Citas canceladas o no presentadas / Total citas programadas) * 100`
    *   *Meta:* < 8%
3.  **Ticket Promedio por Mascota (ATV - Average Ticket Value):**
    *   *Fórmula:* `Total facturado en el mes / Cantidad de mascotas atendidas únicas`
    *   *Meta:* Crecimiento del 5% intermensual.
4.  **Tasa de Rotación de Inventario (ITR - Inventory Turnover Ratio):**
    *   *Fórmula:* `Costo de mercancía vendida en el período / Valor promedio de inventario en almacén`
    *   *Meta:* Mínimo 4 rotaciones anuales de medicamentos.
5.  **Días de Caducidad Promedio (ADFE - Days to Expiry):**
    *   *Fórmula:* Promedio de días faltantes para el vencimiento de los productos en almacén.
    *   *Meta:* Mayor a 90 días para stock clínico general.

### 5.2. KPIs del SaaS (VetFlow Admin Dashboard)
1.  **MRR (Monthly Recurring Revenue - Ingreso Recurrente Mensual):** Ingreso bruto acumulado por suscripciones de planes Starter, Professional y Enterprise.
2.  **Churn Rate de Tenants (Tasa de Cancelación):** Porcentaje de clínicas veterinarias que cancelan su plan SaaS en el mes. Meta: < 2.5% anual.
3.  **CAC (Customer Acquisition Cost - Costo de Adquisición):** Costo total de marketing y ventas dividido por el número de nuevas clínicas veterinarias adquiridas.
4.  **LTV (Lifetime Value):** El valor financiero proyectado que aporta una veterinaria durante todo el ciclo que permanece suscrita a VetFlow. Meta: LTV/CAC > 3x.
5.  **Tasa de Adopción de Features (FAR - Feature Adoption Rate):** % de veterinarias activas que utilizan el módulo de hospitalización o inventario avanzado sobre el total de veterinarias suscritas en planes que los contienen.

---

## 6. MATRIZ DE TRAZABILIDAD DE REQUERIMIENTOS (TRACEABILITY MATRIX)

Para asegurar la justificación comercial y técnica de cada elemento del sistema, se asocian las reglas de negocio, los casos de uso, las historias de usuario y las métricas de éxito en la siguiente matriz:

| ID Requisito de Negocio | Caso de Uso (UC) | Historia de Usuario (HU) | Requisito No Funcional (RNF) | KPI de Éxito Asociado |
| :--- | :--- | :--- | :--- | :--- |
| **BR-CL-001** (Inmutabilidad EMR) | UC-07, UC-09 | HU-02 (Cierre Clínico) | RNF 1.3 (Cumplimiento de Privacidad de Datos) | Ticket Promedio por Mascota (ATV) (Garantiza cargos cobrados) |
| **BR-CL-002** (Matrícula Médica) | UC-08 | HU-03 (Receta Controlada) | RNF 1.4 (Cumplimiento Organismos ICA/SENASA) | Tasa de Adopción de Features (FAR) (Uso del vademécum) |
| **BR-INV-001** (Prioridad FEFO) | UC-11, UC-13 | HU-04 (Control FEFO) | RNF 2.3 (Caché local/Descuentos offline) | Tasa de Rotación de Inventario (ITR) / Días de Caducidad (ADFE) |
| **BR-FIN-002** (Cierre de Caja Ciego) | UC-16 | HU-05 (Cierre Ciego) | RNF 3.1 (Tiempos de guardado rápidos) | Conciliación financiera exacta / Prevención de fraude (Auditoría) |
| **BR-FIN-003** (Factura Localizada) | UC-15 | HU-05 (Cierre Ciego) | RNF 4.1 (Adaptadores de Facturación local) | Tiempo de Cobro en Caja / Cumplimiento Tributario |
| **Integración WhatsApp** | UC-05 | HU-01 (Cita WhatsApp) | RNF 4.3 (WhatsApp Cloud API) | Tasa de Inasistencia (No-Show Rate) |
