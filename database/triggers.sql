-- Triggers for VetFlow SaaS
-- Version: 1.0.0
-- Author: Database Master

--------------------------------------------------------------------------------
-- 1. TRIGGER COMPONENTE: Actualización Automática de updated_at
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vinculaciones de updated_at a las tablas correspondientes
CREATE TRIGGER set_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_tutors_updated_at BEFORE UPDATE ON tutors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_pets_updated_at BEFORE UPDATE ON pets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_clinical_records_updated_at BEFORE UPDATE ON clinical_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_cash_registers_updated_at BEFORE UPDATE ON cash_registers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_diagnosis_catalog_updated_at BEFORE UPDATE ON diagnosis_catalog FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

--------------------------------------------------------------------------------
-- 2. TRIGGER COMPONENTE: BR-CL-001 (Inmutabilidad de Registros Clínicos - EMR)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_clinical_record_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Bloquear cualquier eliminación si el registro ya estaba Cerrado
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'Cerrado' THEN
            RAISE EXCEPTION 'Restricción de Negocio (BR-CL-001): El historial clínico cerrado es inmutable y no puede eliminarse.'
                USING ERRCODE = 'check_violation';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Si el registro ya estaba cerrado, impedir cualquier cambio (inmutabilidad estricta)
        IF OLD.status = 'Cerrado' THEN
            RAISE EXCEPTION 'Restricción de Negocio (BR-CL-001): El historial clínico ya se encuentra sellado y es inmutable. Cree una Nota de Evolución Anexa.'
                USING ERRCODE = 'check_violation';
        END IF;

        -- Si el registro pasa de Abierto a Cerrado, establecer la fecha de sellado
        IF NEW.status = 'Cerrado' AND OLD.status = 'Abierto' THEN
            NEW.closed_at := CURRENT_TIMESTAMP;
        END IF;

        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clinical_record_immutability
    BEFORE UPDATE OR DELETE ON clinical_records
    FOR EACH ROW
    EXECUTE FUNCTION check_clinical_record_immutability();

--------------------------------------------------------------------------------
-- 3. TRIGGER COMPONENTE: BR-CL-002 (Validación de Veterinario y Matrícula)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_veterinarian_prescription()
RETURNS TRIGGER AS $$
DECLARE
    v_license VARCHAR(100);
    v_role VARCHAR(50);
BEGIN
    -- Obtener la cédula y rol del usuario emisor
    SELECT professional_license, role INTO v_license, v_role
    FROM users
    WHERE id = NEW.veterinarian_id AND tenant_id = NEW.tenant_id;

    -- Validar que el usuario que prescribe sea médico facultativo
    IF v_role NOT IN ('Veterinario', 'DirectorClinico') THEN
        RAISE EXCEPTION 'Seguridad Médica: Solo veterinarios o directores clínicos con rol facultativo pueden recetar.'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Validar que para recetas de medicamentos controlados el veterinario cuente con cédula/matrícula profesional
    IF NEW.is_controlled = TRUE AND (v_license IS NULL OR TRIM(both ' ' from v_license) = '') THEN
        RAISE EXCEPTION 'Regulación de Salud (BR-CL-002): No se puede prescribir un medicamento controlado sin matrícula profesional vigente registrada en el perfil del veterinario.'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_veterinarian_prescription
    BEFORE INSERT OR UPDATE ON prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION validate_veterinarian_prescription();

--------------------------------------------------------------------------------
-- 4. TRIGGER COMPONENTE: BR-INV-003 (Lote y Expiración en Medicamentos)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION enforce_product_batch_rules()
RETURNS TRIGGER AS $$
DECLARE
    v_category VARCHAR(50);
BEGIN
    SELECT category INTO v_category
    FROM products
    WHERE id = NEW.product_id AND tenant_id = NEW.tenant_id;

    IF v_category IN ('Medicamento', 'Medicamento Controlado') THEN
        IF NEW.batch_number IS NULL OR TRIM(both ' ' from NEW.batch_number) = '' THEN
            RAISE EXCEPTION 'Control de Fármacos (BR-INV-003): Los medicamentos requieren registrar obligatoriamente el número de lote.'
                USING ERRCODE = 'not_null_violation';
        END IF;
        
        IF NEW.expiration_date IS NULL THEN
            RAISE EXCEPTION 'Control de Fármacos (BR-INV-003): Los medicamentos requieren registrar obligatoriamente su fecha de vencimiento.'
                USING ERRCODE = 'not_null_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_product_batch_rules
    BEFORE INSERT OR UPDATE ON product_batches
    FOR EACH ROW
    EXECUTE FUNCTION enforce_product_batch_rules();

--------------------------------------------------------------------------------
-- 5. TRIGGER COMPONENTE: BR-INV-004 (Autorización y Justificación de Ajustes)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_inventory_adjustment()
RETURNS TRIGGER AS $$
DECLARE
    v_role VARCHAR(50);
BEGIN
    -- Aplicar solo a transacciones de tipo Ajuste Merma o Ajuste Faltante (que representan las mermas manuales)
    IF NEW.transaction_type IN ('Ajuste Merma', 'Ajuste Faltante') THEN
        -- Validar justificación escrita obligatoria con longitud mínima
        IF NEW.notes IS NULL OR length(trim(both ' ' from NEW.notes)) < 15 THEN
            RAISE EXCEPTION 'Auditoría de Stock (BR-INV-004): Justifique ampliamente el motivo del ajuste/merma (mínimo 15 caracteres).'
                USING ERRCODE = 'check_violation';
        END IF;

        -- Validar que el usuario que realiza el ajuste sea Administrador (TenantOwner/SuperAdmin) o Director Clínico
        SELECT role INTO v_role
        FROM users
        WHERE id = NEW.created_by AND tenant_id = NEW.tenant_id;

        IF v_role NOT IN ('DirectorClinico', 'TenantOwner', 'SuperAdmin') THEN
            RAISE EXCEPTION 'Permisos Insuficientes (BR-INV-004): Los ajustes manuales de stock por mermas requieren la firma autorizada de un Administrador o Director Clínico.'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_inventory_adjustment
    BEFORE INSERT ON inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION validate_inventory_adjustment();

--------------------------------------------------------------------------------
-- 6. TRIGGER COMPONENTE: BR-INV-001 (Control Automatizado de Stock e Inventario)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_inventory_stock_balances()
RETURNS TRIGGER AS $$
DECLARE
    v_category VARCHAR(50);
BEGIN
    -- Obtener la categoría del producto
    SELECT category INTO v_category
    FROM products
    WHERE id = NEW.product_id AND tenant_id = NEW.tenant_id;

    -- Si el producto es un servicio, no maneja stock físico
    IF v_category = 'Servicio' THEN
        RETURN NEW;
    END IF;

    -- Los medicamentos deben tener lote asignado
    IF NEW.batch_id IS NULL AND v_category IN ('Medicamento', 'Medicamento Controlado') THEN
        RAISE EXCEPTION 'Consumo de Stock: Se requiere especificar un lote para despachar o registrar movimientos de medicamentos.'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Si el movimiento es de salida (cantidad menor a 0), validar que exista stock suficiente en la sucursal
    IF NEW.quantity < 0 THEN
        IF NOT EXISTS (
            SELECT 1 FROM inventory_stocks
            WHERE branch_id = NEW.branch_id 
              AND product_id = NEW.product_id 
              AND batch_id = NEW.batch_id
              AND quantity >= ABS(NEW.quantity)
        ) THEN
            RAISE EXCEPTION 'Quiebre de Stock (BR-INV-001): Stock insuficiente en la sucursal para el lote seleccionado.'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    -- Insertar o actualizar stock consolidado
    INSERT INTO inventory_stocks (tenant_id, branch_id, product_id, batch_id, quantity)
    VALUES (NEW.tenant_id, NEW.branch_id, NEW.product_id, NEW.batch_id, NEW.quantity)
    ON CONFLICT (branch_id, product_id, batch_id) DO UPDATE
    SET quantity = inventory_stocks.quantity + EXCLUDED.quantity;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_inventory_stock_balances
    AFTER INSERT ON inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_stock_balances();
