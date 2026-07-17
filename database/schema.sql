-- Schema DDL for VetFlow SaaS
-- Version: 1.0.0
-- Author: Database Master

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. CONFIGURACIÓN DEL TENANT Y MULTI-SUCURSAL
--------------------------------------------------------------------------------

-- Tabla: tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    plan_tier VARCHAR(50) NOT NULL CHECK (plan_tier IN ('Starter', 'Professional', 'Enterprise')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_status ON tenants(status);

-- Tabla: branches
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    country VARCHAR(2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    tax_identifier VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branches_tenant ON branches(tenant_id, is_active);

-- Tabla: users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('SuperAdmin', 'TenantOwner', 'DirectorClinico', 'Veterinario', 'Recepcionista', 'Farmaceutico')),
    professional_license VARCHAR(100) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_users_role ON users(tenant_id, role);

-- Tabla: user_branches
CREATE TABLE user_branches (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, branch_id)
);

CREATE INDEX idx_user_branches_composite ON user_branches(tenant_id, branch_id, user_id);

--------------------------------------------------------------------------------
-- 2. GESTIÓN DE PACIENTES Y TUTORES
--------------------------------------------------------------------------------

-- Tabla: tutors
CREATE TABLE tutors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(30) NOT NULL,
    tax_identifier VARCHAR(50) NULL,
    address TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tutors_search ON tutors(tenant_id, last_name, first_name);
CREATE INDEX idx_tutors_phone ON tutors(tenant_id, phone);

-- Tabla: pets
CREATE TABLE pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    species VARCHAR(50) NOT NULL,
    breed VARCHAR(100) NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Macho', 'Hembra', 'Desconocido')),
    birth_date DATE NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo', 'En Cirugia', 'Hospitalizado', 'Fallecido', 'Inactivo')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pets_tutor ON pets(tenant_id, tutor_id);
CREATE INDEX idx_pets_search ON pets(tenant_id, name);

--------------------------------------------------------------------------------
-- 3. AGENDA, CITAS Y TRIAJE
--------------------------------------------------------------------------------

-- Tabla: appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
    veterinarian_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    appointment_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Programada' CHECK (status IN ('Programada', 'Confirmada', 'Triaje', 'Atendida', 'Cancelada', 'No Presento')),
    reason_for_visit TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_branch_date ON appointments(tenant_id, branch_id, appointment_date);
CREATE UNIQUE INDEX uq_appointments_no_overlap ON appointments(tenant_id, veterinarian_id, appointment_date) 
    WHERE (status IN ('Programada', 'Confirmada', 'Triaje'));

-- Tabla: triage
CREATE TABLE triage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    appointment_id UUID NULL REFERENCES appointments(id) ON DELETE SET NULL,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
    temperature NUMERIC(4,2) NULL,
    heart_rate INTEGER NULL,
    respiratory_rate INTEGER NULL,
    weight NUMERIC(6,3) NOT NULL,
    triage_level VARCHAR(50) NOT NULL CHECK (triage_level IN ('Emergencia', 'Urgencia', 'Consulta Rotativa', 'Control')),
    reason TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_triage_pet ON triage(tenant_id, pet_id);

--------------------------------------------------------------------------------
-- 4. HISTORIAL CLÍNICO ELECTRÓNICO (EMR)
--------------------------------------------------------------------------------

-- Tabla: diagnosis_catalog
CREATE TABLE diagnosis_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: clinical_records
CREATE TABLE clinical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    veterinarian_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    triage_id UUID NULL REFERENCES triage(id) ON DELETE SET NULL,
    anamnesis TEXT NOT NULL,
    physical_examination TEXT NOT NULL,
    diagnosis_id UUID NOT NULL REFERENCES diagnosis_catalog(id) ON DELETE RESTRICT,
    diagnosis_notes TEXT NULL,
    treatment_plan TEXT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Abierto' CHECK (status IN ('Abierto', 'Cerrado')),
    consent_signed BOOLEAN NOT NULL DEFAULT FALSE,
    closed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clinical_records_pet ON clinical_records(tenant_id, pet_id, created_at DESC);

-- Tabla: clinical_annexes
CREATE TABLE clinical_annexes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    clinical_record_id UUID NOT NULL REFERENCES clinical_records(id) ON DELETE RESTRICT,
    veterinarian_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clinical_annexes_record ON clinical_annexes(tenant_id, clinical_record_id);

--------------------------------------------------------------------------------
-- 5. INVENTARIO Y VADEMÉCUM
--------------------------------------------------------------------------------

-- Tabla: products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Medicamento', 'Medicamento Controlado', 'Insumo', 'Servicio', 'Alimento', 'Otros')),
    is_controlled BOOLEAN NOT NULL DEFAULT FALSE,
    requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
    unit_of_measure VARCHAR(50) NOT NULL,
    minimum_stock NUMERIC(12,4) NOT NULL DEFAULT 10.0000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_products_sku ON products(tenant_id, sku);
CREATE INDEX idx_products_category ON products(tenant_id, category);

-- Tabla: product_batches
CREATE TABLE product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100) NOT NULL,
    expiration_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_product_batches_num ON product_batches(tenant_id, product_id, batch_number);
-- Índice optimizado FEFO (First Expired, First Out)
CREATE INDEX idx_product_batches_fefo ON product_batches(tenant_id, product_id, expiration_date ASC);

-- Tabla: inventory_stocks
CREATE TABLE inventory_stocks (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES product_batches(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,4) NOT NULL DEFAULT 0.0000 CHECK (quantity >= 0),
    PRIMARY KEY (branch_id, product_id, batch_id)
);

CREATE INDEX idx_inventory_stocks_tenant ON inventory_stocks(tenant_id, branch_id, product_id);

--------------------------------------------------------------------------------
-- 6. RECETAS MÉDICAS
--------------------------------------------------------------------------------

-- Tabla: prescriptions
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    clinical_record_id UUID NOT NULL REFERENCES clinical_records(id) ON DELETE RESTRICT,
    veterinarian_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    prescription_number VARCHAR(50) NOT NULL,
    is_controlled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_prescriptions_number ON prescriptions(tenant_id, prescription_number);

-- Tabla: prescription_items
CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    dosage TEXT NOT NULL,
    quantity NUMERIC(8,2) NOT NULL
);

--------------------------------------------------------------------------------
-- 7. MOVIMIENTOS DE INVENTARIO Y TRASLADOS
--------------------------------------------------------------------------------

-- Tabla: inventory_transactions
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_id UUID NULL REFERENCES product_batches(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,4) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('Compra', 'Consumo Clinico', 'Traslado Entrada', 'Traslado Salida', 'Ajuste Merma', 'Ajuste Faltante')),
    reference_id UUID NULL,
    notes TEXT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inv_transactions_ref ON inventory_transactions(tenant_id, reference_id);

-- Tabla: inventory_transfers
CREATE TABLE inventory_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    destination_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES product_batches(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,4) NOT NULL CHECK (quantity > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'En Transito' CHECK (status IN ('En Transito', 'Completado', 'Cancelado')),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    received_by UUID NULL REFERENCES users(id) ON DELETE RESTRICT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_inv_transfers_status ON inventory_transfers(tenant_id, status);

--------------------------------------------------------------------------------
-- 8. VENTAS, FACTURACIÓN Y CAJA
--------------------------------------------------------------------------------

-- Tabla: sales
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE RESTRICT,
    cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'Pagada', 'Anulada')),
    invoice_number VARCHAR(100) NULL,
    invoice_status VARCHAR(50) NOT NULL DEFAULT 'No Facturado' CHECK (invoice_status IN ('No Facturado', 'Emitido', 'Error', 'Rechazado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_branch_date ON sales(tenant_id, branch_id, created_at);
CREATE INDEX idx_sales_invoice ON sales(tenant_id, invoice_number) WHERE (invoice_number IS NOT NULL);

-- Tabla: sale_items
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    transaction_reference VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_sale ON payments(tenant_id, sale_id);

-- Tabla: cash_registers
CREATE TABLE cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ NULL,
    opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    expected_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    actual_balance NUMERIC(12,2) NULL,
    difference NUMERIC(12,2) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Abierta' CHECK (status IN ('Abierta', 'Cuadrada', 'Descuadrada')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cash_registers_unclosed ON cash_registers(tenant_id, cashier_id) WHERE (closed_at IS NULL);
