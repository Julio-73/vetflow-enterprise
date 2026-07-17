-- Regression Tests for VetFlow SaaS Database Layer
-- Version: 1.0.0
-- Author: Database Master
-- Purpose: Automate tests for RLS isolation, clinical record immutability, 
--          veterinary prescription licenses, and stock adjustment rules.

-- Wrap everything in a transaction to rollback changes and keep seeds pristine.
BEGIN;

CREATE OR REPLACE FUNCTION run_regression_tests()
RETURNS void AS $$
DECLARE
    v_test_record_id UUID := gen_random_uuid();
    v_test_prescription_id UUID := gen_random_uuid();
    v_temp_count INTEGER;
    v_error_occurred BOOLEAN;
BEGIN
    RAISE NOTICE '================================================================================';
    RAISE NOTICE 'INICIANDO PRUEBAS DE REGRESIÓN DE BASE DE DATOS PARA VETFLOW SAAS...';
    RAISE NOTICE '================================================================================';

    ----------------------------------------------------------------------------
    -- PRUEBA 1: AISLAMIENTO RLS (Tenant A vs Tenant B)
    ----------------------------------------------------------------------------
    RAISE NOTICE 'Prueba 1: Verificando aislamiento multi-tenant RLS...';

    -- 1.1 Establecer sesión como Tenant A
    PERFORM set_config('app.current_tenant_id', 'a1111111-1111-4111-a111-111111111111', true);

    -- Verificar que solo se ven usuarios del Tenant A
    SELECT count(*) INTO v_temp_count FROM users;
    IF v_temp_count != 4 THEN
        RAISE EXCEPTION 'Fallo de Aserción RLS: Tenant A debería ver exactamente 4 usuarios. Encontrados: %', v_temp_count;
    END IF;

    -- Verificar que no se ven productos del Tenant B
    SELECT count(*) INTO v_temp_count FROM products WHERE tenant_id = 'b2222222-2222-4222-b222-222222222222';
    IF v_temp_count > 0 THEN
        RAISE EXCEPTION 'Fallo de Aserción RLS: El Tenant A puede ver productos del Tenant B!';
    END IF;

    -- 1.2 Intentar insertar un usuario para el Tenant B estando en la sesión del Tenant A (debe fallar por RLS check)
    v_error_occurred := FALSE;
    BEGIN
        INSERT INTO users (id, tenant_id, email, name, role, is_active)
        VALUES (gen_random_uuid(), 'b2222222-2222-4222-b222-222222222222', 'infiltrado@delbosque.com', 'Usuario Infiltrado', 'Veterinario', TRUE);
    EXCEPTION WHEN OTHERS THEN
        v_error_occurred := TRUE;
        RAISE NOTICE '  - OK: RLS bloqueó inserción cruzada exitosamente (%).', SQLERRM;
    END;
    
    IF NOT v_error_occurred THEN
        RAISE EXCEPTION 'Fallo de Aserción RLS: Se permitió insertar un registro cruzado con tenant_id del Tenant B en sesión de Tenant A!';
    END IF;

    -- 1.3 Establecer sesión como Tenant B
    PERFORM set_config('app.current_tenant_id', 'b2222222-2222-4222-b222-222222222222', true);

    -- Verificar que solo se ven usuarios del Tenant B
    SELECT count(*) INTO v_temp_count FROM users;
    IF v_temp_count != 2 THEN
        RAISE EXCEPTION 'Fallo de Aserción RLS: Tenant B debería ver exactamente 2 usuarios. Encontrados: %', v_temp_count;
    END IF;

    -- Restablecer sesión como Tenant A para continuar las pruebas de su flujo clínico/inventario
    PERFORM set_config('app.current_tenant_id', 'a1111111-1111-4111-a111-111111111111', true);
    RAISE NOTICE '  - OK: Aislamiento RLS validado correctamente para ambos Tenants.';


    ----------------------------------------------------------------------------
    -- PRUEBA 2: INMUTABILIDAD DE HISTORIAL CLÍNICO (EMR)
    ----------------------------------------------------------------------------
    RAISE NOTICE 'Prueba 2: Verificando inmutabilidad de clinical_records (BR-CL-001)...';

    -- 2.1 Insertar un registro clínico en estado Abierto (Laura Gómez atiende a Toby en Sede Principal)
    INSERT INTO clinical_records (id, tenant_id, pet_id, branch_id, veterinarian_id, anamnesis, physical_examination, diagnosis, status)
    VALUES (v_test_record_id, 'a1111111-1111-4111-a111-111111111111', '99999999-9999-9999-9999-999999999999', 'a2222222-2222-4222-a222-222222222222', '22222222-2222-2222-2222-222222222222', 'Sintomas generales de apatía', 'Temperatura 38.5, FC normal', 'Deshidratación leve', 'Abierto');

    -- 2.2 Modificar registro clínico abierto (debe tener éxito)
    UPDATE clinical_records 
    SET treatment_plan = 'Administrar suero oral por 2 días y reposo' 
    WHERE id = v_test_record_id;
    RAISE NOTICE '  - OK: Edición de registro clínico abierto permitida.';

    -- 2.3 Sellar el registro (cambiar de Abierto a Cerrado, lo cual ejecuta trigger de fecha de sellado)
    UPDATE clinical_records
    SET status = 'Cerrado'
    WHERE id = v_test_record_id;

    -- Verificar que se auto-llenó closed_at
    IF (SELECT closed_at FROM clinical_records WHERE id = v_test_record_id) IS NULL THEN
        RAISE EXCEPTION 'Fallo de Aserción BR-CL-001: El campo closed_at no fue auto-llenado al sellar la consulta!';
    END IF;

    -- 2.4 Intentar modificar el registro sellado (debe lanzar error por trigger check_clinical_record_immutability)
    v_error_occurred := FALSE;
    BEGIN
        UPDATE clinical_records 
        SET diagnosis = 'Error de diagnóstico corregido' 
        WHERE id = v_test_record_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_occurred := TRUE;
        RAISE NOTICE '  - OK: Trigger bloqueó edición de consulta cerrada exitosamente (%).', SQLERRM;
    END;
    
    IF NOT v_error_occurred THEN
        RAISE EXCEPTION 'Fallo de Aserción BR-CL-001: Se permitió actualizar un registro clínico cerrado/sellado!';
    END IF;

    -- 2.5 Intentar eliminar el registro sellado (debe lanzar error por trigger check_clinical_record_immutability)
    v_error_occurred := FALSE;
    BEGIN
        DELETE FROM clinical_records WHERE id = v_test_record_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_occurred := TRUE;
        RAISE NOTICE '  - OK: Trigger bloqueó eliminación de consulta cerrada exitosamente (%).', SQLERRM;
    END;
    
    IF NOT v_error_occurred THEN
        RAISE EXCEPTION 'Fallo de Aserción BR-CL-001: Se permitió eliminar un registro clínico cerrado/sellado!';
    END IF;


    ----------------------------------------------------------------------------
    -- PRUEBA 3: RECETAS CONTROLADAS Y MATRÍCULA PROFESIONAL
    ----------------------------------------------------------------------------
    RAISE NOTICE 'Prueba 3: Verificando bloqueo de recetas controladas sin cédula (BR-CL-002)...';

    -- 3.1 Emitir receta controlada por un Veterinario CON matrícula (Dra. Laura Gómez: MV-98765-MX) -> Debe tener éxito
    INSERT INTO prescriptions (id, tenant_id, clinical_record_id, veterinarian_id, prescription_number, is_controlled)
    VALUES (v_test_prescription_id, 'a1111111-1111-4111-a111-111111111111', v_test_record_id, '22222222-2222-2222-2222-222222222222', 'REC-2026-0001', TRUE);
    RAISE NOTICE '  - OK: Receta controlada por veterinario matriculado permitida.';

    -- 3.2 Intentar emitir receta controlada por un Veterinario SIN matrícula (Dr. Juan Pérez: license='') -> Debe fallar
    v_error_occurred := FALSE;
    BEGIN
        INSERT INTO prescriptions (id, tenant_id, clinical_record_id, veterinarian_id, prescription_number, is_controlled)
        VALUES (gen_random_uuid(), 'a1111111-1111-4111-a111-111111111111', v_test_record_id, '33333333-3333-3333-3333-333333333333', 'REC-2026-0002', TRUE);
    EXCEPTION WHEN OTHERS THEN
        v_error_occurred := TRUE;
        RAISE NOTICE '  - OK: Trigger bloqueó receta controlada sin cédula profesional del emisor (%).', SQLERRM;
    END;
    
    IF NOT v_error_occurred THEN
        RAISE EXCEPTION 'Fallo de Aserción BR-CL-002: Se permitió emitir una receta controlada por un veterinario sin matrícula profesional!';
    END IF;

    -- 3.3 Intentar emitir receta por un Recepcionista (María López) -> Debe fallar por rol no facultativo
    v_error_occurred := FALSE;
    BEGIN
        INSERT INTO prescriptions (id, tenant_id, clinical_record_id, veterinarian_id, prescription_number, is_controlled)
        VALUES (gen_random_uuid(), 'a1111111-1111-4111-a111-111111111111', v_test_record_id, '44444444-4444-4444-4444-444444444444', 'REC-2026-0003', FALSE);
    EXCEPTION WHEN OTHERS THEN
        v_error_occurred := TRUE;
        RAISE NOTICE '  - OK: Trigger bloqueó receta por rol no facultativo (%).', SQLERRM;
    END;
    
    IF NOT v_error_occurred THEN
        RAISE EXCEPTION 'Fallo de Aserción BR-CL-002: Se permitió emitir una receta por parte de personal no médico!';
    END IF;


    ----------------------------------------------------------------------------
    -- PRUEBA 4: AJUSTES NEGATIVOS DE STOCK Y JUSTIFICACIÓN
    ----------------------------------------------------------------------------
    RAISE NOTICE 'Prueba 4: Verificando validaciones de mermas de inventario (BR-INV-004)...';

    -- 4.1 Intentar registrar ajuste de merma sin justificación adecuada (<15 caracteres) -> Debe fallar
    v_error_occurred := FALSE;
    BEGIN
        INSERT INTO inventory_transactions (tenant_id, branch_id, product_id, batch_id, quantity, transaction_type, notes, created_by)
        VALUES ('a1111111-1111-4111-a111-111111111111', 'a2222222-2222-4222-a222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', -2.0000, 'Ajuste Merma', 'Corto', '11111111-1111-1111-1111-111111111111');
    EXCEPTION WHEN OTHERS THEN
        v_error_occurred := TRUE;
        RAISE NOTICE '  - OK: Trigger bloqueó ajuste sin justificación adecuada (%).', SQLERRM;
    END;
    
    IF NOT v_error_occurred THEN
        RAISE EXCEPTION 'Fallo de Aserción BR-INV-004: Se permitió registrar una merma con justificación menor a 15 caracteres!';
    END IF;

    -- 4.2 Intentar registrar merma por un usuario con rol no autorizado (María López - Recepcionista) -> Debe fallar
    v_error_occurred := FALSE;
    BEGIN
        INSERT INTO inventory_transactions (tenant_id, branch_id, product_id, batch_id, quantity, transaction_type, notes, created_by)
        VALUES ('a1111111-1111-4111-a111-111111111111', 'a2222222-2222-4222-a222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', -2.0000, 'Ajuste Merma', 'Fármaco roto durante la administración en sala 3 por accidente', '44444444-4444-4444-4444-444444444444');
    EXCEPTION WHEN OTHERS THEN
        v_error_occurred := TRUE;
        RAISE NOTICE '  - OK: Trigger bloqueó ajuste por rol no autorizado (%).', SQLERRM;
    END;
    
    IF NOT v_error_occurred THEN
        RAISE EXCEPTION 'Fallo de Aserción BR-INV-004: Se permitió registrar una merma por parte de personal no autorizado!';
    END IF;

    -- 4.3 Registrar ajuste por merma con justificación amplia y usuario autorizado (Carlos Pérez - TenantOwner) -> Debe tener éxito
    INSERT INTO inventory_transactions (tenant_id, branch_id, product_id, batch_id, quantity, transaction_type, notes, created_by)
    VALUES ('a1111111-1111-4111-a111-111111111111', 'a2222222-2222-4222-a222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', -2.0000, 'Ajuste Merma', 'Fármaco roto durante la administración en sala 3 por accidente', '11111111-1111-1111-1111-111111111111');
    RAISE NOTICE '  - OK: Ajuste por merma registrado con éxito por administrador.';


    ----------------------------------------------------------------------------
    -- PRUEBA 5: CONTROL DE QUIEBRE DE STOCK (BR-INV-001)
    ----------------------------------------------------------------------------
    RAISE NOTICE 'Prueba 5: Verificando prevención de quiebres de stock...';

    -- 5.1 Intentar consumir más unidades de las disponibles en el stock consolidado (Lote 1 tiene 98 tras la merma anterior)
    v_error_occurred := FALSE;
    BEGIN
        INSERT INTO inventory_transactions (tenant_id, branch_id, product_id, batch_id, quantity, transaction_type, notes, created_by)
        VALUES ('a1111111-1111-4111-a111-111111111111', 'a2222222-2222-4222-a222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', -150.0000, 'Consumo Clinico', 'Despacho excesivo de insumos', '11111111-1111-1111-1111-111111111111');
    EXCEPTION WHEN OTHERS THEN
        v_error_occurred := TRUE;
        RAISE NOTICE '  - OK: Trigger bloqueó quiebre de stock exitosamente (%).', SQLERRM;
    END;
    
    IF NOT v_error_occurred THEN
        RAISE EXCEPTION 'Fallo de Aserción BR-INV-001: Se permitió consumir más stock del disponible en la sucursal!';
    END IF;

    ----------------------------------------------------------------------------
    -- LIMPIEZA DE CONTEXTO
    ----------------------------------------------------------------------------
    PERFORM set_config('app.current_tenant_id', '', true);
    
    RAISE NOTICE '================================================================================';
    RAISE NOTICE '>>> ¡TODAS LAS PRUEBAS DE REGRESIÓN COMPLETADAS CON ÉXITO! <<<';
    RAISE NOTICE '================================================================================';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función de pruebas
SELECT run_regression_tests();

-- Limpiar la base de datos eliminando la función temporal de pruebas
DROP FUNCTION run_regression_tests();

-- Deshacer todos los cambios realizados durante el test para dejar la semilla limpia
ROLLBACK;
