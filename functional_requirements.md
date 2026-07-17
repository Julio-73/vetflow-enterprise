# REQUISITOS FUNCIONALES: VetFlow SaaS
**Versión:** 1.0.0  
**Fecha:** 16 de Julio de 2026  
**Autor:** Enterprise Business Analyst

---

## 1. MAPA DE CASOS DE USO (USE CASES MAP)

El sistema se compone de cinco módulos funcionales clave. A continuación se listan los casos de uso definidos por módulo:

### 1.1. Módulo: Configuración del Tenant y Multi-Sucursal
*   **UC-01:** Registro y Activación de Tenant (Suscripción).
*   **UC-02:** Configuración de Sucursal y Datos Fiscales Localizados.
*   **UC-03:** Gestión de Roles y Permisos (RBAC).

### 1.2. Módulo: Agenda y Citas
*   **UC-04:** Reserva y Programación de Citas.
*   **UC-05:** Envío de Recordatorios Automáticos (WhatsApp/Email).
*   **UC-06:** Admisión y Triaje de Paciente.

### 1.3. Módulo: Historial Clínico Electrónico (EMR)
*   **UC-07:** Registro de Consulta Médica (Anamnesis, Examen, Diagnóstico).
*   **UC-08:** Emisión de Receta Médica Controlada.
*   **UC-09:** Cierre Clínico y Sello de Evolución.
*   **UC-10:** Registro en Hoja de Monitoreo de Internamiento/Hospitalización.

### 1.4. Módulo: Inventario y Farmacia
*   **UC-11:** Recepción de Mercadería por Lote y Vencimiento.
*   **UC-12:** Solicitud y Aprobación de Traslado de Stock.
*   **UC-13:** Descuento de Insumos Médicos por Consumo Clínico.

### 1.5. Módulo: Facturación y Caja
*   **UC-14:** Liquidación de Cuenta y Procesamiento de Pagos Mixtos.
*   **UC-15:** Emisión de Factura Electrónica Localizada.
*   **UC-16:** Cierre de Caja Ciego por Sucursal.

---

## 2. HISTORIAS DE USUARIO Y CRITERIOS DE ACEPTACIÓN GHERKIN

### HU-01: Programación de Cita con Confirmación en WhatsApp
**Como** Recepcionista de la clínica veterinaria  
**Quiero** registrar una cita en la agenda de la sucursal seleccionando veterinario y especialidad  
**Para** reservar el espacio de atención y notificar automáticamente al tutor por WhatsApp reduciendo el ausentismo.

#### Criterios de Aceptación:
*   **Escenario 1: Creación exitosa de cita con notificación automática**
    *   **Given (Dado)** que la recepcionista se encuentra en el módulo de Agenda y Citas de la sucursal "Sede Norte",
    *   **And (Y)** el veterinario "Dr. Pérez" tiene disponibilidad horaria el "17 de Julio de 2026" a las "10:00",
    *   **When (Cuando)** la recepcionista ingresa los datos de la mascota "Luna", el tutor "Juan Gómez" con teléfono "+56912345678" y asocia el servicio de "Consulta General" con el "Dr. Pérez",
    *   **Then (Entonces)** el sistema debe guardar la cita en estado "Programada"
    *   **And (Y)** debe disparar un webhook al microservicio de mensajería para enviar un mensaje de confirmación por WhatsApp al número "+56912345678" con los detalles de la cita.

*   **Escenario 2: Intento de reserva de cita en horario conflictivo**
    *   **Given (Dado)** que el veterinario "Dr. Pérez" ya cuenta con una cita en estado "Programada" para el "17 de Julio de 2026" a las "10:00",
    *   **When (Cuando)** la recepcionista intenta agendar otra cita para el mismo día y hora con el "Dr. Pérez",
    *   **Then (Entonces)** el sistema debe mostrar un mensaje de alerta de conflicto de horario
    *   **And (Y)** bloquear el botón de guardar hasta que se cambie el horario o el veterinario.

---

### HU-02: Cierre Clínico e Inmutabilidad del EMR
**Como** Veterinario Clínico  
**Quiero** finalizar el registro de una consulta veterinaria  
**Para** asegurar que el historial médico de la mascota quede sellado, cumpliendo con la legislación de inmutabilidad clínica y previniendo alteraciones posteriores.

#### Criterios de Aceptación:
*   **Escenario 1: Cierre exitoso del registro médico**
    *   **Given (Dado)** que el "Dr. Pérez" está editando la consulta abierta de la mascota "Luna",
    *   **And (Y)** ha completado los campos obligatorios: Anamnesis, Examen Físico y Diagnóstico Principal,
    *   **When (Cuando)** hace clic en el botón "Finalizar Consulta y Sellar EMR",
    *   **Then (Entonces)** el sistema debe cambiar el estado del registro a "Cerrado"
    *   **And (Y)** deshabilitar los campos de edición de esta consulta en la interfaz de usuario,
    *   **And (Y)** registrar una marca de tiempo inalterable y la firma del veterinario autor en la base de datos.

*   **Escenario 2: Intentar modificar una consulta ya sellada**
    *   **Given (Dado)** que una consulta médica anterior de la mascota "Luna" se encuentra en estado "Cerrada",
    *   **When (Cuando)** cualquier usuario intente enviar una solicitud POST/PUT para editar sus campos,
    *   **Then (Entonces)** el servidor debe responder con un error de acceso denegado "403 Forbidden"
    *   **And (Y)** el sistema web debe mostrar un mensaje informando que el registro clínico es inmutable y requiere una nota de evolución anexa para adiciones.

---

### HU-03: Emisión de Receta Médica de Uso Controlado
**Como** Veterinario Clínico matriculado  
**Quiero** prescribir un fármaco de tipo controlado a un paciente  
**Para** emitir una receta con folio único legal que me permita registrar la trazabilidad de los medicamentos psicotrópicos o anestésicos.

#### Criterios de Aceptación:
*   **Escenario 1: Emisión exitosa de receta para medicamento controlado**
    *   **Given (Dado)** que el "Dr. Pérez" tiene cargado en su perfil el registro médico/cédula profesional número "MP-98765-CL",
    *   **And (Y)** está atendiendo al paciente "Luna" en una consulta médica,
    *   **When (Cuando)** prescribe el medicamento "Tramadol 50mg" (marcado como "Controlado" en el vademécum) e ingresa la dosis de "1 tableta cada 8 horas por 5 días",
    *   **Then (Entonces)** el sistema debe generar una receta médica digital con un Folio Único Correlativo Nacional,
    *   **And (Y)** colocar en la receta los datos del veterinario, su matrícula, fecha de emisión y dosis,
    *   **And (Y)** vincular el folio de la receta al descuento del medicamento en el inventario.

*   **Escenario 2: Bloqueo de receta controlada si el veterinario no posee matrícula cargada**
    *   **Given (Dado)** que el veterinario "Dr. Novato" no tiene registrada su matrícula profesional en su perfil de usuario,
    *   **When (Cuando)** intenta prescribir "Ketamina 10%" (Medicamento Controlado),
    *   **Then (Entonces)** el sistema debe impedir la acción
    *   **And (Y)** mostrar una alerta que indique: "Debe registrar su matrícula profesional en su perfil para poder recetar medicamentos controlados".

---

### HU-04: Control de Inventario FEFO (First Expired, First Out)
**Como** Encargado de Farmacia de la clínica  
**Quiero** que el sistema seleccione automáticamente los lotes de medicamentos de acuerdo a su fecha de vencimiento más próxima al realizar un despacho clínico  
**Para** reducir la cantidad de pérdidas por medicamentos caducados.

#### Criterios de Aceptación:
*   **Escenario 1: Descuento automático de stock de lote más próximo a vencer**
    *   **Given (Dado)** que en el inventario de la "Sede Norte" existen dos lotes del producto "Meloxicam Inyectable":
        *   Lote A: Vence el "15 de Diciembre de 2026" (10 unidades en stock)
        *   Lote B: Vence el "15 de Octubre de 2026" (5 unidades en stock)
    *   **When (Cuando)** el veterinario registra el uso clínico de "2 unidades" de "Meloxicam Inyectable" durante una consulta,
    *   **Then (Entonces)** el sistema debe descontar automáticamente las "2 unidades" del Lote B (por tener vencimiento más cercano)
    *   **And (Y)** actualizar el stock lógico a: Lote B (3 unidades) y Lote A (10 unidades).

---

### HU-05: Facturación con Cierre de Caja Ciego
**Como** Recepcionista / Cajero de la clínica  
**Quiero** realizar el cierre de caja de mi turno diario ingresando el dinero en efectivo que tengo físicamente sin ver el saldo esperado por el sistema  
**Para** asegurar un proceso transparente y evitar conciliaciones manuales manipuladas.

#### Criterios de Aceptación:
*   **Escenario 1: Cierre de caja sin descuadre**
    *   **Given (Dado)** que el turno de la recepcionista "María" ha terminado,
    *   **And (Y)** el sistema ha acumulado transacciones de cobro en efectivo por un total teórico de "$150,000",
    *   **When (Cuando)** María inicia el cierre de caja e ingresa el valor de "$150,000" en el campo de conteo físico de billetes y monedas,
    *   **Then (Entonces)** el sistema debe cerrar la caja en estado "Cuadrada"
    *   **And (Y)** imprimir el reporte de cierre de caja detallando las transacciones del día.

*   **Escenario 2: Registro de descuadre (faltante) en el arqueo**
    *   **Given (Dado)** que el turno de "María" ha terminado y el sistema espera "$150,000" en efectivo,
    *   **When (Cuando)** María inicia el cierre de caja ciego e ingresa un conteo físico de "$145,000",
    *   **Then (Entonces)** el sistema debe registrar el cierre de caja con el estado "Descuadrada"
    *   **And (Y)** calcular un faltante de "$5,000"
    *   **And (Y)** enviar una alerta por correo electrónico y notificación push al Administrador de la veterinaria indicando el nombre del cajero, la fecha, la sucursal y el monto del descuadre.

---

### HU-06: Traslado de Stock Multi-Sucursal con Doble Validación
**Como** Encargado de Farmacia  
**Quiero** transferir stock de medicamentos desde la bodega principal de la clínica a una sucursal secundaria bajo un flujo de envío y recepción  
**Para** evitar pérdidas en el tránsito de mercadería y mantener los inventarios reconciliados.

#### Criterios de Aceptación:
*   **Escenario 1: Envío y Recepción exitosa de mercancía**
    *   **Given (Dado)** que el stock de "Sutura Nylon 3-0" en la Bodega Principal es de "50 unidades" y en la Bodega Sucursal B es de "10 unidades",
    *   **When (Cuando)** el encargado de la Bodega Principal registra un traslado de "20 unidades" con destino a la Sucursal B,
    *   **Then (Entonces)** el stock de la Bodega Principal debe disminuir a "30 unidades"
    *   **And (Y)** el estado del traslado debe pasar a "En Tránsito"
    *   **And (Y)** el stock de la Sucursal B no debe incrementarse todavía.

*   **Escenario 2: Confirmación de recepción en destino**
    *   **Given (Dado)** que existe un traslado de "20 unidades" de "Sutura Nylon 3-0" en estado "En Tránsito" con destino a la Sucursal B,
    *   **When (Cuando)** el encargado de la Sucursal B hace clic en "Confirmar Recepción de Traslado" en su panel,
    *   **Then (Entonces)** el estado del traslado debe cambiar a "Completado"
    *   **And (Y)** el stock de la Bodega Sucursal B debe actualizarse a "30 unidades" (10 iniciales + 20 recibidas).
