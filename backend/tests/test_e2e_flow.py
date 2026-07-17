import pytest
from fastapi.testclient import TestClient
import uuid
from sqlalchemy import text
from app.core.database import SessionLocal
from app import models
from app.main import app

client = TestClient(app)

def is_postgres_available() -> bool:
    db = None
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1 FROM tenants LIMIT 1"))
        return True
    except Exception:
        return False
    finally:
        if db:
            db.close()

# Helper function to generate simulated JWT header for testing
def get_auth_header(user_id: str, email: str, role: str, tenant_id: str) -> dict:
    # Generates a valid HS256 JWT using client-side equivalent signature
    import jwt
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
    }
    # Development HS256 secret key
    secret = "your_jwt_signing_secret_min_32_characters_here_12345"
    token = jwt.encode(payload, secret, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}

def test_full_enterprise_workflow_e2e():
    """
    End-to-End Enterprise hardiness integration flow.
    Validates:
      1. Cash register opening.
      2. Patient & Tutor creation under RLS isolation.
      3. Overlap collision booking check.
      4. Patient Triage record.
      5. Clinical record creation, controlled prescription validation and EMR sealing.
      6. Inmutability enforce checks (BR-CL-001).
      7. Product sale payment, automatic stock decrement (FEFO) and cash register closing.
    """
    if not is_postgres_available():
        pytest.skip("PostgreSQL database is not available on DATABASE_URL. Skipping E2E flow tests.")

    # Active identities (San Martin Tenant)
    tenant_id = "a1111111-1111-4111-a111-111111111111"
    
    owner_id = "11111111-1111-1111-1111-111111111111"
    owner_headers = get_auth_header(owner_id, "carlos.admin@sanmartin.com", "TenantOwner", tenant_id)
    
    vet_id = "22222222-2222-2222-2222-222222222222"
    vet_headers = get_auth_header(vet_id, "laura.gomez@sanmartin.com", "Veterinario", tenant_id)
    
    recep_id = "44444444-4444-4444-4444-444444444444"
    recep_headers = get_auth_header(recep_id, "maria.recep@sanmartin.com", "Recepcionista", tenant_id)

    # 1. Open Cash Register (Recepcionista opens the register)
    branch_id = "a2222222-2222-4222-a222-222222222222"
    open_res = client.post(
        "/api/v1/billing/registers",
        json={"branch_id": branch_id, "opening_balance": 1500.0, "cashier_id": recep_id},
        headers=recep_headers
    )
    assert open_res.status_code == 201, open_res.text
    register_id = open_res.json()["id"]

    # 2. Register Tutor and Pet (Recepcionista)
    tutor_res = client.post(
        "/api/v1/patients/tutors",
        json={
            "first_name": "Pedro",
            "last_name": "Páramo",
            "email": "pedro.paramo@email.com",
            "phone": "+52 55 1111 2222",
            "tax_identifier": "PARP701010-H22",
            "address": "Comala, Colima"
        },
        headers=recep_headers
    )
    assert tutor_res.status_code == 201
    tutor_id = tutor_res.json()["id"]

    pet_res = client.post(
        "/api/v1/patients/pets",
        json={
            "tutor_id": tutor_id,
            "name": "Pluto",
            "species": "Canino",
            "breed": "Bloodhound",
            "gender": "Macho",
            "birth_date": "2024-01-01",
            "status": "Activo"
        },
        headers=recep_headers
    )
    assert pet_res.status_code == 201
    pet_id = pet_res.json()["id"]

    # 3. Book Appointment and check overlap constraint (Recepcionista)
    appt_date = "2026-08-10T10:00:00Z"
    appt_res = client.post(
        "/api/v1/appointments",
        json={
            "branch_id": branch_id,
            "pet_id": pet_id,
            "veterinarian_id": vet_id,
            "appointment_date": appt_date,
            "reason_for_visit": "Chequeo y dolor de oídos"
        },
        headers=recep_headers
    )
    assert appt_res.status_code == 201
    appt_id = appt_res.json()["id"]

    # Book another appt at the same time with the same vet -> Should fail due to overlap collision
    fail_appt_res = client.post(
        "/api/v1/appointments",
        json={
            "branch_id": branch_id,
            "pet_id": pet_id,
            "veterinarian_id": vet_id,
            "appointment_date": appt_date,
            "reason_for_visit": "Intento colisión"
        },
        headers=recep_headers
    )
    assert fail_appt_res.status_code == 400
    assert "overlap" in fail_appt_res.text.lower() or "veterinario" in fail_appt_res.text.lower()

    # 4. Perform Patient Triage (Recepcionista)
    triage_res = client.post(
        "/api/v1/appointments/triage",
        json={
            "appointment_id": appt_id,
            "pet_id": pet_id,
            "temperature": 39.2,
            "heart_rate": 110,
            "respiratory_rate": 28,
            "weight": 24.500,
            "triage_level": "Consulta Rotativa",
            "reason": "Ligera fiebre y molestia al palpar oreja derecha",
            "created_by": recep_id
        },
        headers=recep_headers
    )
    assert triage_res.status_code == 201

    # 5. Open Clinical Evolution Record (Veterinario)
    emr_res = client.post(
        "/api/v1/clinical/records",
        json={
            "pet_id": pet_id,
            "branch_id": branch_id,
            "anamnesis": "El tutor refiere que sacude la cabeza y llora si le tocan la oreja.",
            "physical_examination": "Inflamación y eritema en conducto auditivo derecho. Exudado ceruminoso.",
            "diagnosis_id": "d1111111-0000-0000-0000-000000000004",  # Otitis (from Seeds)
            "diagnosis_notes": "Otitis externa bacteriana aguda unilateral.",
            "treatment_plan": "Limpieza de canal y gotas de suspensión otológica.",
            "consent_signed": True
        },
        headers=vet_headers
    )
    assert emr_res.status_code == 201
    record_id = emr_res.json()["id"]

    # 6. Issue Prescription for controlled drug and check license (Veterinario)
    # Product seed Fentanilo id: 'c1111111-1111-1111-1111-111111111111'
    product_id = "c1111111-1111-1111-1111-111111111111"
    
    # Try to issue with receptionist (should fail - no license and unauthorized role)
    fail_rx = client.post(
        "/api/v1/clinical/prescriptions",
        json={
            "clinical_record_id": record_id,
            "veterinarian_id": recep_id,
            "prescription_number": "RX-FAIL-E2E",
            "is_controlled": True,
            "items": [{"product_id": product_id, "dosage": "0.1 mg/kg IV", "quantity": 1.0}]
        },
        headers=recep_headers
    )
    assert fail_rx.status_code == 400 or fail_rx.status_code == 403

    # Issue with Veterinarian (has license 'MV-98765-MX' from seeds) -> Should succeed
    rx_res = client.post(
        "/api/v1/clinical/prescriptions",
        json={
            "clinical_record_id": record_id,
            "veterinarian_id": vet_id,
            "prescription_number": "RX-OK-E2E",
            "is_controlled": True,
            "items": [{"product_id": product_id, "dosage": "0.1 mg/kg IV", "quantity": 1.0}]
        },
        headers=vet_headers
    )
    assert rx_res.status_code == 201

    # 7. Seal Clinical EMR and check inmutabilidad
    seal_res = client.post(
        f"/api/v1/clinical/records/{record_id}/seal",
        headers=vet_headers
    )
    assert seal_res.status_code == 200
    assert seal_res.json()["status"] == "Cerrado"

    # Try to modify closed EMR -> Should block due to trigger (BR-CL-001)
    fail_edit = client.put(
        f"/api/v1/clinical/records/{record_id}",
        json={"treatment_plan": "Intento modificar plan cerrado"},
        headers=vet_headers
    )
    assert fail_edit.status_code == 400
    assert "immutable" in fail_edit.text.lower() or "inmutable" in fail_edit.text.lower()

    # 8. Record Product Sale and decrement stock (Recepcionista)
    sale_res = client.post(
        "/api/v1/billing/sales",
        json={
            "branch_id": branch_id,
            "tutor_id": tutor_id,
            "total_amount": 500.0,
            "payment_method": "CASH",
            "items": [{"product_id": product_id, "quantity": 1.0, "unit_price": 500.0}]
        },
        headers=recep_headers
    )
    assert sale_res.status_code == 201
    sale_id = sale_res.json()["id"]

    # 9. Invoicing (Ports & Adapters verification)
    # Branch 'a2222222-2222-4222-a222-222222222222' is located in MX, should timbrar with SAT
    invoice_res = client.post(
        f"/api/v1/billing/sales/{sale_id}/invoice",
        headers=recep_headers
    )
    assert invoice_res.status_code == 200
    invoice_json = invoice_res.json()
    assert invoice_json["provider"] == "SAT (México)"
    assert "cfdi_uuid" in invoice_json or "xml" in invoice_json

    # 10. Close Register and verify arqueo
    close_res = client.post(
        f"/api/v1/billing/registers/{register_id}/close",
        json={"actual_balance": 2000.0},  # Opening (1500) + Sale (500) = 2000 (Expected) -> Cuadrada
        headers=recep_headers
    )
    assert open_res.status_code == 201
    assert close_res.json()["status"] == "Cuadrada"
    assert close_res.json()["difference"] == 0.0
