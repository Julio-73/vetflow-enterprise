-- Seed Data for VetFlow SaaS
-- Version: 1.0.0
-- Author: Database Master

-- Ensure we clean tables in case of re-run (order matters due to FK constraints)
-- Since this is for dev seeding, we can run truncate.
TRUNCATE TABLE cash_registers, payments, sale_items, sales, inventory_transfers, 
               inventory_transactions, inventory_stocks, prescription_items, prescriptions,
               product_batches, products, clinical_annexes, clinical_records, triage, 
               appointments, pets, tutors, user_branches, users, branches, tenants, diagnosis_catalog CASCADE;

--------------------------------------------------------------------------------
-- 0. REGISTRO DE DIAGNÓSTICOS GLOBALES (CATÁLOGO)
--------------------------------------------------------------------------------

INSERT INTO diagnosis_catalog (id, code, name, category, description, is_active) VALUES
('d1111111-0000-0000-0000-000000000001', 'DIAG-001', 'Control sano', 'Preventivo', 'Consulta rutinaria de control clínico y peso', TRUE),
('d1111111-0000-0000-0000-000000000002', 'DIAG-002', 'Vacunación', 'Preventivo', 'Aplicación de vacunas del esquema anual', TRUE),
('d1111111-0000-0000-0000-000000000003', 'DIAG-003', 'Gastroenteritis', 'Digestivo', 'Inflamación del tracto gastrointestinal', TRUE),
('d1111111-0000-0000-0000-000000000004', 'DIAG-004', 'Otitis', 'Otorrinolaringología', 'Infección o inflamación del conducto auditivo', TRUE),
('d1111111-0000-0000-0000-000000000005', 'DIAG-005', 'Dermatitis', 'Dermatología', 'Inflamación o infección de la piel', TRUE),
('d1111111-0000-0000-0000-000000000006', 'DIAG-006', 'Parasitismo', 'Infeccioso', 'Presencia de parásitos internos o externos', TRUE),
('d1111111-0000-0000-0000-000000000007', 'DIAG-007', 'Infección respiratoria', 'Respiratorio', 'Infección de vías respiratorias altas o bajas', TRUE),
('d1111111-0000-0000-0000-000000000008', 'DIAG-008', 'Traumatismo', 'Urgencias', 'Lesiones por golpes, caídas o accidentes', TRUE),
('d1111111-0000-0000-0000-000000000009', 'DIAG-009', 'Alergia', 'Inmunología', 'Reacción alérgica alimentaria o ambiental', TRUE),
('d1111111-0000-0000-0000-000000000010', 'DIAG-010', 'Enfermedad dental', 'Odontología', 'Sarro, gingivitis o problemas periodontales', TRUE);

--------------------------------------------------------------------------------
-- 1. REGISTRO DE TENANTS (CLÍNICAS VETERINARIAS DE PRUEBA)
--------------------------------------------------------------------------------

INSERT INTO tenants (id, name, plan_tier, status) VALUES
('a1111111-1111-4111-a111-111111111111', 'Clínica Veterinaria San Martín', 'Professional', 'active'),
('b2222222-2222-4222-b222-222222222222', 'Clínica Veterinaria Del Bosque', 'Starter', 'active');

--------------------------------------------------------------------------------
-- 2. SEMILLA PARA EL TENANT A: Clínica Veterinaria San Martín
--------------------------------------------------------------------------------

-- Establecer el contexto del Tenant A para habilitar inserciones bajo RLS
SET app.current_tenant_id = 'a1111111-1111-4111-a111-111111111111';

-- Sucursales
INSERT INTO branches (id, tenant_id, name, address, country, currency, tax_identifier, is_active) VALUES
('a2222222-2222-4222-a222-222222222222', 'a1111111-1111-4111-a111-111111111111', 'Sede Principal San Martín', 'Av. San Martín 1500, CDMX', 'MX', 'MXN', 'CVS950101-SM1', TRUE),
('a3333333-3333-4333-a333-333333333333', 'a1111111-1111-4111-a111-111111111111', 'Sede Norte San Martín', 'Calzada del Norte 405, CDMX', 'MX', 'MXN', 'CVS950101-SM1', TRUE);

-- Personal (Users)
INSERT INTO users (id, tenant_id, email, name, role, professional_license, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'a1111111-1111-4111-a111-111111111111', 'carlos.admin@sanmartin.com', 'Carlos Pérez', 'TenantOwner', NULL, TRUE),
('22222222-2222-2222-2222-222222222222', 'a1111111-1111-4111-a111-111111111111', 'laura.gomez@sanmartin.com', 'Dra. Laura Gómez', 'Veterinario', 'MV-98765-MX', TRUE),
('33333333-3333-3333-3333-333333333333', 'a1111111-1111-4111-a111-111111111111', 'juan.perez@sanmartin.com', 'Dr. Juan Pérez (Sin Matrícula)', 'Veterinario', '', TRUE),
('44444444-4444-4444-4444-444444444444', 'a1111111-1111-4111-a111-111111111111', 'maria.lopez@sanmartin.com', 'María López', 'Recepcionista', NULL, TRUE);

-- Asignación de sucursales a usuarios
INSERT INTO user_branches (tenant_id, user_id, branch_id) VALUES
('a1111111-1111-4111-a111-111111111111', '11111111-1111-1111-1111-111111111111', 'a2222222-2222-4222-a222-222222222222'),
('a1111111-1111-4111-a111-111111111111', '22222222-2222-2222-2222-222222222222', 'a2222222-2222-4222-a222-222222222222'),
('a1111111-1111-4111-a111-111111111111', '22222222-2222-2222-2222-222222222222', 'a3333333-3333-4333-a333-333333333333'), -- Laura es itinerante
('a1111111-1111-4111-a111-111111111111', '33333333-3333-3333-3333-333333333333', 'a3333333-3333-4333-a333-333333333333'),
('a1111111-1111-4111-a111-111111111111', '44444444-4444-4444-4444-444444444444', 'a2222222-2222-4222-a222-222222222222');

-- Tutores
INSERT INTO tutors (id, tenant_id, first_name, last_name, email, phone, tax_identifier, address, is_active) VALUES
('77777777-7777-7777-7777-777777777777', 'a1111111-1111-4111-a111-111111111111', 'Lucía', 'Fernández', 'lucia.f@gmail.com', '+525512345678', 'FEFL890203-ABC', 'Av. Insurgentes 450, CDMX', TRUE);

-- Mascotas
INSERT INTO pets (id, tenant_id, tutor_id, name, species, breed, gender, birth_date, status, is_active) VALUES
('99999999-9999-9999-9999-999999999999', 'a1111111-1111-4111-a111-111111111111', '77777777-7777-7777-7777-777777777777', 'Toby', 'Perro', 'Golden Retriever', 'Macho', '2022-03-15', 'Activo', TRUE);

-- Productos & Vademécum
INSERT INTO products (id, tenant_id, sku, name, description, category, is_controlled, requires_prescription, unit_of_measure, is_active) VALUES
('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-4111-a111-111111111111', 'MED-CTRL-001', 'Fentanilo Inyectable 0.05mg/ml', 'Anestésico opioide potente', 'Medicamento Controlado', TRUE, TRUE, 'ampolla', TRUE),
('c2222222-2222-2222-2222-222222222222', 'a1111111-1111-4111-a111-111111111111', 'MED-AMOX-250', 'Amoxicilina Suspensión 250mg', 'Antibiótico de amplio espectro', 'Medicamento', FALSE, TRUE, 'frasco', TRUE),
('c3333333-3333-3333-3333-333333333333', 'a1111111-1111-4111-a111-111111111111', 'SERV-CONS-GEN', 'Consulta General de Control', 'Consulta clínica veterinaria general de revisión', 'Servicio', FALSE, FALSE, 'servicio', TRUE);

-- Lotes de Productos (Medicamentos)
INSERT INTO product_batches (id, tenant_id, product_id, batch_number, expiration_date) VALUES
('e1111111-1111-1111-1111-111111111111', 'a1111111-1111-4111-a111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'LOTE-FENT-27A', '2027-01-01'),
('e2222222-2222-2222-2222-222222222222', 'a1111111-1111-4111-a111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'LOTE-FENT-26B', '2026-10-01'), -- Vence antes (FEFO)
('e3333333-3333-3333-3333-333333333333', 'a1111111-1111-4111-a111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'LOTE-AMOX-99C', '2028-05-01');

-- Transacciones iniciales de stock (Compras) que autogeneran balance en inventory_stocks
INSERT INTO inventory_transactions (tenant_id, branch_id, product_id, batch_id, quantity, transaction_type, reference_id, notes, created_by) VALUES
('a1111111-1111-4111-a111-111111111111', 'a2222222-2222-4222-a222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 100.0000, 'Compra', NULL, 'Ingreso inicial por compra a distribuidor', '11111111-1111-1111-1111-111111111111'),
('a1111111-1111-4111-a111-111111111111', 'a2222222-2222-4222-a222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'e2222222-2222-2222-2222-222222222222', 50.0000, 'Compra', NULL, 'Ingreso inicial lote de corta duración', '11111111-1111-1111-1111-111111111111'),
('a1111111-1111-4111-a111-111111111111', 'a2222222-2222-4222-a222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'e3333333-3333-3333-3333-333333333333', 200.0000, 'Compra', NULL, 'Ingreso lote antibióticos', '11111111-1111-1111-1111-111111111111');


--------------------------------------------------------------------------------
-- 3. SEMILLA PARA EL TENANT B: Clínica Veterinaria Del Bosque
--------------------------------------------------------------------------------

-- Establecer el contexto del Tenant B para habilitar inserciones bajo RLS
SET app.current_tenant_id = 'b2222222-2222-4222-b222-222222222222';

-- Sucursales
INSERT INTO branches (id, tenant_id, name, address, country, currency, tax_identifier, is_active) VALUES
('b3333333-3333-4333-b333-333333333333', 'b2222222-2222-4222-b222-222222222222', 'Sede Única Del Bosque', 'Av. El Bosque 780, Bogotá', 'CO', 'COP', '900.123.456-7', TRUE);

-- Personal (Users)
INSERT INTO users (id, tenant_id, email, name, role, professional_license, is_active) VALUES
('55555555-5555-5555-5555-555555555555', 'b2222222-2222-4222-b222-222222222222', 'roberto.silva@delbosque.com', 'Dr. Roberto Silva', 'DirectorClinico', 'MV-12345-CO', TRUE),
('66666666-6666-6666-6666-666666666666', 'b2222222-2222-4222-b222-222222222222', 'ana.gomez@delbosque.com', 'Ana Gómez', 'Recepcionista', NULL, TRUE);

-- Asignación de sucursales
INSERT INTO user_branches (tenant_id, user_id, branch_id) VALUES
('b2222222-2222-4222-b222-222222222222', '55555555-5555-5555-5555-555555555555', 'b3333333-3333-4333-b333-333333333333'),
('b2222222-2222-4222-b222-222222222222', '66666666-6666-6666-6666-666666666666', 'b3333333-3333-4333-b333-333333333333');

-- Tutores
INSERT INTO tutors (id, tenant_id, first_name, last_name, email, phone, tax_identifier, address, is_active) VALUES
('88888888-8888-8888-8888-888888888888', 'b2222222-2222-4222-b222-222222222222', 'Pedro', 'Rodríguez', 'pedro.r@hotmail.com', '+573159876543', '1014234567', 'Calle 85 #12-45, Bogotá', TRUE);

-- Mascotas
INSERT INTO pets (id, tenant_id, tutor_id, name, species, breed, gender, birth_date, status, is_active) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b2222222-2222-4222-b222-222222222222', '88888888-8888-8888-8888-888888888888', 'Luna', 'Gato', 'Siamés', 'Hembra', '2023-06-20', 'Activo', TRUE);

-- Productos & Vademécum
INSERT INTO products (id, tenant_id, sku, name, description, category, is_controlled, requires_prescription, unit_of_measure, is_active) VALUES
('d1111111-1111-1111-1111-111111111111', 'b2222222-2222-4222-b222-222222222222', 'MED-CTRL-002', 'Morfina Veterinaria 10mg/ml', 'Analgésico mayor controlado', 'Medicamento Controlado', TRUE, TRUE, 'ampolla', TRUE),
('d2222222-2222-2222-2222-222222222222', 'b2222222-2222-4222-b222-222222222222', 'MED-CEF-500', 'Cefalexina Tabletas 500mg', 'Antibiótico cefalosporina', 'Medicamento', FALSE, TRUE, 'tableta', TRUE),
('d3333333-3333-3333-3333-333333333333', 'b2222222-2222-4222-b222-222222222222', 'SERV-PEL-CAN', 'Baño y Peluquería Canina', 'Estética general canina', 'Servicio', FALSE, FALSE, 'servicio', TRUE);

-- Lotes de Productos (Medicamentos)
INSERT INTO product_batches (id, tenant_id, product_id, batch_number, expiration_date) VALUES
('f1111111-1111-1111-1111-111111111111', 'b2222222-2222-4222-b222-222222222222', 'd1111111-1111-1111-1111-111111111111', 'LOTE-MORF-99D', '2027-06-01'),
('f2222222-2222-2222-2222-222222222222', 'b2222222-2222-4222-b222-222222222222', 'd2222222-2222-2222-2222-222222222222', 'LOTE-CEFA-88E', '2027-12-01');

-- Transacciones iniciales de stock (Compras) que autogeneran balance en inventory_stocks
INSERT INTO inventory_transactions (tenant_id, branch_id, product_id, batch_id, quantity, transaction_type, reference_id, notes, created_by) VALUES
('b2222222-2222-4222-b222-222222222222', 'b3333333-3333-4333-b333-333333333333', 'd1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 120.0000, 'Compra', NULL, 'Ingreso de morfina a farmacia central', '55555555-5555-5555-5555-555555555555'),
('b2222222-2222-4222-b222-222222222222', 'b3333333-3333-4333-b333-333333333333', 'd2222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-222222222222', 300.0000, 'Compra', NULL, 'Ingreso de cefalexina por inventario inicial', '55555555-5555-5555-5555-555555555555');

-- Reset context at session level to avoid bleed
RESET app.current_tenant_id;
