# PRODUCT STRATEGY BLUEPRINT: VetFlow SaaS

Estrategia de producto, definición de MVP, roadmap de desarrollo y plan de monetización para el proyecto VetFlow SaaS.

---

## PARTE 1: VALIDACIÓN DE MERCADO Y USUARIO

### 1. VISIÓN DEL PRODUCTO
*   **Visión General (El Norte):** Convertirse en el sistema operativo clínico y operativo indispensable para las clínicas veterinarias en Latinoamérica, permitiendo que los profesionales de la salud animal eliminen el trabajo administrativo manual y optimicen sus ingresos a través de flujos de trabajo inteligentes, telemetría clínica y comunicación omnicanal con los tutores de mascotas.
*   **El Problema Real del Usuario:** Las clínicas veterinarias de LATAM sufren de una severa ineficiencia operativa por el uso de herramientas fragmentadas (fichas clínicas en papel o archivos Word locales, agendamiento por WhatsApp no estructurado, inventarios manuales en Excel y falta de visibilidad en las finanzas multi-sucursal). Esto resulta en pérdida de registros médicos críticos, caducidad inadvertida de medicamentos controlados, fugas financieras de hasta un 20% por insumos no facturados y una alta tasa de inasistencia a citas de seguimiento médico. Adicionalmente, enfrentan la complejidad de cumplir con regulaciones locales cambiantes para recetas de medicamentos controlados.
*   **La Propuesta de Valor:** VetFlow SaaS es una plataforma de gestión clínica y operativa multi-tenant, multi-sucursal y mobile-first que consolida el expediente clínico digital (EMR) adaptado a normativas locales de salud animal, la agenda interactiva inteligente con recordatorios automáticos integrados (WhatsApp y Email) y el control de caja e inventario en tiempo real. Todo ello bajo una interfaz de alta gama rápida e intuitiva que reduce el trabajo administrativo a la mitad, evita las fugas de ingresos y potencia la retención de clientes mediante una experiencia digital sin fricciones.

### 2. CLIENTE IDEAL Y BUYER PERSONAS
*   **ICP (Ideal Customer Profile):** Clínicas y hospitales veterinarios medianos y grandes en Latinoamérica (México, Colombia, Chile, Perú y Argentina) que cuentan con 2 a 15 veterinarios activos, operan entre 1 y 5 sucursales (o prestan servicios clínicos a domicilio) y buscan digitalizar al 100% su historial clínico y control operativo para asegurar el cumplimiento legal, simplificar las comisiones del personal y erradicar el desperdicio de stock.
*   **Buyer Persona(s):**
    *   **Nombre/Rol:** Dra. Valentina, Propietaria y Veterinaria Principal
        *   **Dolores Clave (Pains):** Dedica más de 2 horas al final del día a transcribir historiales clínicos a mano o archivos de texto locales. Registra pérdidas recurrentes de medicamentos costosos y vacunas vencidas en almacén. Siente que los clientes faltan a los refuerzos de vacunas porque no tiene cómo recordarles de forma masiva y automática.
        *   **Jobs To Be Done (JTBD):** Quiere digitalizar de forma rápida e intuitiva el historial clínico de los pacientes en consulta directa, emitir recetas digitales que cumplan la normativa local (ej. número de cédula/matrícula profesional) y automatizar el seguimiento de citas de prevención para aumentar los ingresos recurrentes de la clínica.
        *   **Ganancias Esperadas (Gains):** Reducción de un 50% en el tiempo dedicado a tareas administrativas de registro médico, incremento de un 20% en las visitas de retorno de vacunas y desparasitación, y tranquilidad de cumplir con el ente regulador de salud de su país sin procesos burocráticos.
    *   **Nombre/Rol:** Santiago, Administrador General de Red de Clínicas
        *   **Dolores Clave (Pains):** Dificultad extrema para conciliar las ventas y los inventarios físicos de múltiples sucursales. Pérdidas financieras por medicamentos e insumos aplicados en cirugías que el personal olvida registrar en la cuenta final del tutor. Tarda días en calcular manualmente las comisiones de los veterinarios (que cobran por porcentaje de consulta o procedimiento realizado).
        *   **Jobs To Be Done (JTBD):** Desea unificar la administración, el inventario y las cuentas de todas las sucursales bajo una misma cuenta maestra, restringiendo el acceso del personal con roles claros (RBAC) y automatizando el cálculo de comisiones e inventario por sede.
        *   **Ganancias Esperadas (Gains):** Consolidación en tiempo real del flujo de caja de todas las sucursales, cálculo de comisiones automatizado en 5 minutos al cierre de mes, y disminución de pérdidas de stock gracias a las alertas inteligentes de stock mínimo.

### 3. DIFERENCIACIÓN Y ANÁLISIS COMPETITIVO
*   **Foso Defensivo (Competitive Moat):**
    *   **Localización Normativa y de Recetas por País:** Motor de recetas modular que exige y valida los campos regulatorios de cada país de LATAM (como la matrícula profesional del veterinario y formatos de recetas controladas) cumpliendo con entes gubernamentales locales (SENASICA, ICA, SAG, etc.).
    *   **Arquitectura Multi-tenant Avanzada con RLS en PostgreSQL:** Aislamiento estricto de los datos de cada cliente clínico a nivel de BD, garantizando velocidad y seguridad de grado empresarial, lo que permite pasar auditorías de protección de datos locales de forma inmediata.
    *   **Velocidad de Registro Superior (UX tipo Linear/Stripe):** Interfaz mobile-first sumamente optimizada que permite a los veterinarios documentar una consulta clínica con escasos clics en una tablet mientras atienden a la mascota, evitando la fricción de software complejo tradicional.
*   **Tabla de Competidores:**
    | Competidor | Fortalezas | Debilidades | Nuestro Ángulo / Diferencia |
    | :--- | :--- | :--- | :--- |
    | **SaaS Globales** *(ej. Idexx Neo, Covetrus)* | Alta madurez tecnológica; integraciones directas con analizadores de laboratorio de gran escala. | Costos prohibitivos para veterinarias promedio de LATAM; interfaz rígida y en inglés; nula adaptación a regulaciones de recetas locales y facturación electrónica de LATAM. | Precio localizado en la región; soporte total en español/portugués; adaptado a la legislación de recetas de LATAM; interfaz moderna y de respuesta rápida. |
    | **SaaS Regionales** *(ej. Panacea, VetPraxis)* | Tienen presencia local y funciones básicas cubiertas. | Tecnología web antigua (lenta); UX confuso y no adaptado a móviles; carecen de arquitectura multi-tenant moderna; procesos de conciliación manuales y reportes limitados. | Arquitectura modular de alta escala con PostgreSQL RLS; experiencia mobile-first premium; automatización avanzada de comisiones y stock inter-sucursal de forma nativa. |
    | **WhatsApp + Excel (Alternativa Manual)** | Costo cero de licencia; flexibilidad total e inmediata adopción inicial. | Pérdidas masivas de datos médicos; descontrol total de inventarios físicos y ventas; cero seguridad y cumplimiento de normativas de salud; alta tasa de ausentismo de tutores. | Automatización de flujos de trabajo clínicos; recordatorios automáticos por WhatsApp estructurado para eliminar la inasistencia; control financiero blindado sin fugas de caja. |

---

## PARTE 2: DEFINICIÓN DE MVP, PRIORIZACIÓN Y ROADMAP

### 1. ALCANCE DEL MVP (Minimum Viable Product)
*   **Objetivo del MVP:** Validar que una interfaz clínica y operativa moderna (EMR + Agenda) reduce las horas dedicadas al registro administrativo en clínicas piloto de México y Colombia, logrando que los veterinarios adopten el sistema diariamente y se disminuya el ausentismo a consultas iniciales.
*   **Funcionalidades del MVP (MoSCoW):**
    *   **Must Have (Esencial para el lanzamiento):**
        *   *Aislamiento Multi-Tenant (RLS):* Seguridad estricta a nivel de base de datos para garantizar la total privacidad de datos de cada clínica veterinaria.
        *   *Gestión del Historial Clínico (EMR V0.1):* Ficha del paciente (datos de mascota y tutor), registro de constantes fisiológicas, diagnóstico en texto enriquecido y emisión de recetas parametrizadas con matrícula profesional del veterinario.
        *   *Agenda Inteligente de Citas:* Calendario interactivo multi-veterinario que soporte creación, edición e historial de estados de citas médicas (Agendada, En Sala, Atendida, Cancelada).
        *   *Ventas Básicas y Caja:* Registro de ventas de servicios y consultas, control de arqueo de caja (apertura y cierre de caja diario) y soporte multimoneda básico.
        *   *Control de Acceso basado en Roles (RBAC):* Definición de roles (Administrador, Veterinario, Recepcionista) con permisos estrictos de visualización y modificación.
        *   *Gestión Básica de Inventario:* Alta de catálogo de productos/fármacos y ajuste de stock manual por transacciones básicas de venta.
    *   **Should Have (Debería estar si es viable):**
        *   *Recordatorios de Citas Automáticos:* Notificaciones por correo electrónico y plantillas automáticas preparadas para envío manual rápido por WhatsApp para reconfirmar citas.
        *   *Múltiples Sucursales:* Capacidad de cambiar de sede de manera lógica dentro del mismo panel de administración, aislando inventarios y flujos financieros.
        *   *Cálculo de Comisiones a Veterinarios:* Módulo básico para definir porcentajes de ganancia de los veterinarios y generar un reporte de nómina automática.
    *   **Could Have (Podría esperar, de bajo impacto inmediato):**
        *   *Subida de Archivos Médicos (AWS S3):* Adjuntar PDFs, ecografías o radiografías a la ficha clínica del paciente.
        *   *Facturación Electrónica Localizada:* Integración con un proveedor fiscal de terceros para facturar electrónicamente las ventas desde la plataforma.
        *   *Portal Web del Tutor:* Acceso web limitado para que el tutor consulte las próximas vacunas y recetas de su mascota.
    *   **Won't Have (Descartado para esta fase):**
        *   *Prescripción Médica con Firma Criptográfica Avanzada:* Firma digital certificada gubernamentalmente para fármacos altamente regulados.
        *   *Copiloto de IA para Notas Médicas:* Transcripción y estructuración de historias clínicas por voz mediante IA.
        *   *Marketplace B2B de Proveedores:* Módulo para ordenar insumos a distribuidoras veterinarias directamente dentro del sistema.

### 2. PRIORIZACIÓN DETALLADA (Scorecard RICE)
*Basado en un alcance piloto de 100 clínicas activas y 500 usuarios mensuales recurrentes (veterinarios, administradores, recepcionistas).*

| Feature | Reach (Alcance) | Impact (Impacto) | Confidence (Confianza) | Effort (Esfuerzo - Person/Weeks) | RICE Score | Decisión |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Aislamiento Multi-Tenant (RLS)** | 500 | 3 (Masivo) | 100% | 3.0 | **500.0** | **Must Have (MVP)** - Seguridad y legalidad no negociables. |
| **Historial Clínico (EMR V0.1) & Recetas** | 500 | 3 (Masivo) | 100% | 4.0 | **375.0** | **Must Have (MVP)** - Centro de la propuesta de valor. |
| **Agenda de Citas Inteligente** | 500 | 2 (Alto) | 100% | 3.0 | **333.3** | **Must Have (MVP)** - Flujo de entrada de pacientes de la clínica. |
| **Ventas de Caja e Inventario Básico** | 500 | 2 (Alto) | 90% | 4.0 | **225.0** | **Must Have (MVP)** - Control de dinero y stock básico inicial. |
| **Roles y Permisos (RBAC)** | 500 | 1 (Medio) | 100% | 2.0 | **250.0** | **Must Have (MVP)** - Operación de personal requerida. |
| **Recordatorios Automáticos (WhatsApp/Email)** | 400 | 2 (Alto) | 80% | 3.0 | **213.3** | **Should Have** - Reduce el ausentismo, valor inmediato. |
| **Cálculo de Comisiones a Veterinarios** | 100 | 2 (Alto) | 80% | 2.0 | **80.0** | **Should Have** - Dolor de negocio administrativo recurrente. |
| **Gestión Multi-sucursal Lógica** | 150 | 2 (Alto) | 80% | 3.5 | **68.5** | **Should Have** - Clave para la conversión de clínicas medianas. |
| **Facturación Electrónica Integrada (API)** | 300 | 2 (Alto) | 70% | 6.0 | **70.0** | **Could Have** - Complejo por regulaciones del SAT/DIAN. |
| **Subida de Archivos Médicos (S3)** | 200 | 1 (Medio) | 80% | 2.5 | **64.0** | **Could Have** - Puede reemplazarse por links externos en el MVP. |
| **Portal Web del Tutor** | 500 | 1 (Medio) | 50% | 6.0 | **41.6** | **Could Have** - Gran esfuerzo con bajo impacto de lanzamiento. |
| **IA de Diagnóstico / Notas de Voz** | 500 | 2 (Alto) | 50% | 10.0 | **50.0** | **Won't Have** - Feature creep de alta complejidad y costo. |

### 3. ROADMAP DEL PRODUCTO
*   **Fase 1: MVP (Lanzamiento y Validación de Núcleo) - Meses 1 a 4:**
    *   *Objetivo:* Lanzar y consolidar la herramienta clínica básica en México y Colombia. Validar la usabilidad diaria del expediente y la agenda.
    *   *Entregables:* Multi-tenant RLS, Ficha clínica (EMR), Agenda interactiva de citas, Control de ventas básicas en caja, Catálogo de inventario básico, Control de accesos RBAC y recordatorios manuales rápidos de citas.
*   **Fase 2: Automatización Administrativa y Retención - Meses 5 a 8:**
    *   *Objetivo:* Reducir el Churn y aumentar el valor de vida del cliente (LTV) liberando de tareas de cálculo e inventario a los dueños y administradores.
    *   *Entregables:* Envío automatizado de alertas de citas por WhatsApp (integración API oficial), Multi-sucursal lógico (movimiento de stock inter-sedes y reporte unificado), Módulo de cálculo automático de comisiones de personal, Almacenamiento de exámenes médicos digitales en AWS S3.
*   **Fase 3: Expansión Regional, Fiscal e Integraciones - Meses 9 a 12:**
    *   *Objetivo:* Acelerar la conversión de clientes Enterprise en México, Colombia y abrir mercados en Chile y Perú mediante localizaciones complejas.
    *   *Entregables:* Facturación electrónica nativa (vía API de terceros unificada), Portal Web del Tutor de Mascotas con agendamiento propio y descarga de recetas, Integraciones con analizadores de laboratorio veterinarios y módulo de telemedicina.

---

## PARTE 3: MODELO DE NEGOCIO, MONETIZACIÓN Y CRECIMIENTO

### 1. MODELO DE NEGOCIO Y PRICING
*   **Modelo de Monetización:** SaaS B2B bajo suscripción periódica (mensual/anual con descuento del 20%). Las variables de cobro (tiers) se basan en el número de sucursales autorizadas y la cantidad de veterinarios activos en nómina (los que generan consultas médicas en el sistema).
*   **Estructura de Pricing (en USD):**
    *   *Plan Starter (Consultorio Unipersonal):* `$39 USD/mes` (o `$375 USD/año` facturado anualmente).
        *   *Condiciones:* 1 sucursal, hasta 2 veterinarios activos, 1 recepcionista.
        *   *Features:* Historial clínico básico (EMR), Agenda de citas, Caja y ventas básicas, Ajuste manual de inventario, Alertas visuales de stock bajo, Recordatorios de citas por email.
    *   *Plan Professional (Clínica en Crecimiento - Plan Recomendado):* `$89 USD/mes` (o `$850 USD/año` facturado anualmente).
        *   *Condiciones:* Hasta 3 sucursales, hasta 6 veterinarios activos, recepcionistas ilimitados.
        *   *Features:* Todo lo de Starter más: Gestión de inventario avanzado, Recordatorios automatizados por WhatsApp integrados (vía API de la plataforma), Cálculo automatizado de comisiones de veterinarios, Panel multi-sucursal consolidado, Almacenamiento de archivos médicos (hasta 10GB).
    *   *Plan Enterprise (Redes de Clínicas y Hospitales):* `$199 USD/mes` (Base, incluye 3 sucursales e ilimitados recepcionistas) + `$15 USD/mes` por cada veterinario activo extra.
        *   *Condiciones:* Sucursales y veterinarios ilimitados.
        *   *Features:* Todo lo de Professional más: Facturación electrónica localizada nativa por país (con un cargo marginal de transacción por factura), API abierta de integración para ERP/CRM corporativos, Almacenamiento de archivos ilimitado, Soporte prioritario 24/7 con SLA dedicado.

### 2. GO-TO-MARKET (GTM) Y CRECIMIENTO
*   **Canales de Adquisición:**
    *   *Prueba Gratuita (Free Trial) de 14 días:* Acceso sin tarjeta de crédito a todas las funcionalidades del Plan Pro, ofreciendo plantillas precargadas con los medicamentos y vacunas estándar del país seleccionado para acortar el tiempo de configuración.
    *   *Asociaciones con Distribuidoras de Insumos Veterinarios:* Alianzas estratégicas con distribuidoras de vacunas y medicamentos en LATAM para recomendar la plataforma a sus clientes clínicos, ofreciéndoles un descuento cruzado en VetFlow a cambio de mayor fidelización de insumos.
    *   *Inbound SEO y Herramientas Gratuitas:* Creación de recursos educativos e interactivos en español (ej: calculadora automática de dosis farmacológicas veterinarias, plantillas de consentimiento de cirugías) para capturar leads orgánicos de alta calidad.
*   **Estrategia de Activación:**
    *   *El Hito "Aha! Moment":* Lograr que el veterinario registre su primer paciente y agende/complete su primera cita de prueba en menos de 5 minutos desde el registro. Para ello, un asistente inicial ("VetFlow Wizard") autoconfigurará las vacunas estándar (ej. Quíntuple, Triple Felina, Rabia) según el país de origen de la clínica.
*   **Retención & Engagement:**
    *   *El Reporte Dominical de Rendimiento:* Envío automático por correo cada domingo con el resumen del desempeño de la clínica: consultas atendidas, vacunas programadas para la semana entrante, valor de ventas realizadas y alertas de insumos que están por terminarse. Esto demuestra el valor medible del software directamente en la bandeja de entrada del propietario.

---

## PARTE 4: MÉTRICAS DE ÉXITO Y RIESGOS

### 1. MÉTRICA NORTH STAR
*   **North Star Metric:** *Expedientes Clínicos Guardados Semanalmente (Weekly Saved Clinical Records)*
    *   El volumen absoluto de consultas médicas documentadas y cerradas con éxito en el EMR en toda la plataforma por semana. Esta métrica refleja el valor real de negocio y adopción del usuario: si un veterinario documenta y guarda consultas en VetFlow de forma recurrente, significa que la plataforma se ha convertido en el núcleo operativo y operativo de su práctica médica.
*   **KPIs de Soporte (Métricas Clave AARRR):**
    *   *Activación:* % de nuevos tenants registrados que ingresan al menos un paciente y agendan una cita en las primeras 48 horas de prueba.
    *   *Retención:* % de veterinarios que registran y guardan al menos 4 consultas a la semana de forma constante a los 30 y 90 días.
    *   *Conversión:* % de cuentas que pasan del periodo de Free Trial a una suscripción de pago (Starter, Pro, Enterprise).
    *   *Churn de Clientes:* % de clínicas de pago que cancelan su suscripción cada mes (Objetivo: < 2.5% mensual en los primeros 12 meses).

### 2. ANÁLISIS DE RIESGOS DE NEGOCIO
*   **Riesgo de Viabilidad Financiera (Costes de Integraciones y Tráfico):**
    *   *Descripción:* El envío masivo de notificaciones de WhatsApp mediante la API oficial y la carga descontrolada de imágenes médicas (radiografías/ecografías) pesadas en S3 pueden consumir el margen bruto del negocio, especialmente en el plan Starter.
    *   *Mitigación:* Se limitará el almacenamiento en planes iniciales. Las notificaciones automáticas por WhatsApp del Plan Pro tendrán un tope razonable mensual; si se excede, el cliente deberá adquirir "bolsas de créditos" de envío adicionales. Se usará compresión WebP y optimización de PDF automática en el cliente de Next.js antes de subir a AWS S3.
*   **Riesgo de Adopción (Resistencia Tecnológica del Personal Clínico):**
    *   *Descripción:* Los veterinarios y recepcionistas suelen trabajar bajo alta presión y tiempos cortos. Si consideran que el software añade pasos lentos al flujo de atención, lo abandonarán para volver al papel o WhatsApp.
    *   *Mitigación:* Diseño UI/UX minimalista y limpio con enfoque mobile-first de alto rendimiento y atajos rápidos de teclado para agendar. Desarrollo de "VetFlow Academy" con videotutoriales de menos de 1 minuto integrados en el dashboard y asistencia ágil vía chat.
*   **Riesgo Regulatorio y Fiscal Multi-país en LATAM:**
    *   *Descripción:* El desarrollo y mantenimiento manual de sistemas de facturación electrónica y cumplimiento de recetas controladas para México, Colombia, Chile, Perú, etc., puede saturar al equipo de ingeniería, deteniendo el roadmap de producto.
    *   *Mitigación:* VetFlow encapsulará las conexiones mediante APIs consolidadas de terceros especializadas en facturación en LATAM (ej: Facturapi, Alegra o similares) y mantendrá parametrizado el generador de recetas de forma lógica, delegando el cumplimiento de la receta final al veterinario responsable y su matrícula profesional.

### 3. PLAN DE EVOLUCIÓN FUTURA
*   **Hitos Post-Roadmap (Horizonte a 2-3 Años):**
    *   *Copiloto Clínico de Inteligencia Artificial (VetAI):* Transcripción de consultas en tiempo real por voz que genera y pre-rellena automáticamente el expediente médico en base a la plática del veterinario con el tutor, recomendando diagnósticos y tratamientos preestablecidos.
    *   *Marketplace de Abastecimiento B2B:* Integración de distribuidores farmacéuticos y de alimentos locales dentro de VetFlow. Cuando el inventario llegue al nivel mínimo, el sistema generará una propuesta de orden de compra automática y cotizada para su aprobación en un clic.
    *   *Módulo Financiero y Pasarela VetFlow Pay:* Procesamiento nativo de pagos digitales (ej. cobro remoto de consultas o cirugías), suscripciones a planes de salud preventiva de mascotas (planes de vacunación anuales cobrados recurrentemente) y opciones de financiamiento rápido ("Buy Now, Pay Later") para tratamientos de alta complejidad.
