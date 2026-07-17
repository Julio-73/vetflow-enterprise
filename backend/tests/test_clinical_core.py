import unittest
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
import jwt
import datetime
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import base64
import uuid
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.main import app
from app.core.config import settings
from app.core.database import SessionLocal, get_db

# --- RSA Mocking for RS256 ---
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)
public_key = private_key.public_key()

def int_to_base64url(val: int) -> str:
    val_bytes = val.to_bytes((val.bit_length() + 7) // 8, byteorder='big')
    return base64.urlsafe_b64encode(val_bytes).decode('utf-8').rstrip('=')

numbers = public_key.public_numbers()
jwk_mock = {
    "kty": "RSA",
    "kid": "test-key-id",
    "use": "sig",
    "alg": "RS256",
    "n": int_to_base64url(numbers.n),
    "e": int_to_base64url(numbers.e)
}

# --- Database Seeds References ---
TENANT_A_ID = "a1111111-1111-4111-a111-111111111111"
TENANT_B_ID = "b2222222-2222-4222-b222-222222222222"

# Users (Attending Veterinarians / Recepcionists)
USER_VET_OK_ID = "22222222-2222-2222-2222-222222222222"     # Dra. Laura Gómez (Vet with license)
USER_VET_NO_LIC_ID = "33333333-3333-3333-3333-333333333333" # Dr. Juan Pérez (Vet without license)
USER_RECEPCIONIST_ID = "44444444-4444-4444-4444-444444444444" # María López (Recepcionist)
USER_VET_B_ID = "55555555-5555-5555-5555-555555555555"      # Dr. Roberto Silva (Tenant B Director)

# Branch
BRANCH_A_ID = "a2222222-2222-4222-a222-222222222222" # Sede Principal San Martín

# Global Diagnosis Seeds IDs
DIAG_CONTROL_SANO = "d1111111-0000-0000-0000-000000000001"
DIAG_GASTROENTERITIS = "d1111111-0000-0000-0000-000000000003"

# Controlled Product ID from seeds
PRODUCT_FENTANYL = "c1111111-1111-1111-1111-111111111111"

def generate_token(tenant_id: str, user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

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

@pytest.fixture(autouse=True)
def mock_jwks():
    with patch("app.core.security.get_jwk_by_kid", return_value=jwk_mock) as mock:
        yield mock

client = TestClient(app)

# --- Unit Mock Tests ---

def test_clinical_flow_with_mocks():
    """
    Simulates database behavior using mocks to verify logic in FastAPI endpoints.
    Ensures correct response codes and data models are utilized.
    """
    token = generate_token(TENANT_A_ID, USER_VET_OK_ID, "laura.gomez@sanmartin.com", "Veterinario")
    
    mock_db = MagicMock()
    mock_db.execute.return_value = None
    
    def mock_refresh(obj):
        import datetime
        obj.created_at = datetime.datetime.utcnow()
        obj.updated_at = datetime.datetime.utcnow()
        
    mock_db.refresh.side_effect = mock_refresh
    
    # 1. Mock Tutor
    mock_tutor = MagicMock(
        id=uuid.uuid4(), tenant_id=TENANT_A_ID, first_name="Juan", last_name="Pérez"
    )
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_tutor, # Verify tutor exists
        MagicMock(id=DIAG_CONTROL_SANO) # Verify diagnosis exists
    ]
    
    def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    
    try:
        # Create Tutor
        tutor_data = {
            "first_name": "Juan",
            "last_name": "Pérez",
            "email": "juan.perez@example.com",
            "phone": "+525511223344"
        }
        res_tutor = client.post("/api/v1/patients/tutors", json=tutor_data, headers={"Authorization": f"Bearer {token}"})
        assert res_tutor.status_code == 201
        
    finally:
        app.dependency_overrides.clear()


# --- E2E PostgreSQL Database Integration Tests ---

def test_rls_and_triggers_e2e_clinical_flow():
    """
    Full clinical flow E2E Integration test against PostgreSQL.
    Covers:
      1. Creating Tutors & Pets (within RLS boundaries).
      2. Booking Appointments (with conflicts check).
      3. Registering Triage.
      4. Opening Clinical Record & editing it.
      5. Sealing Clinical Record (forcing BR-CL-001 database immutability).
      6. Attempting post-seal edits (verifying 400 Bad Request capture).
      7. Prescribing controlled drugs (verifying BR-CL-002 license trigger).
      8. Verifying RLS cross-tenant isolation (Tenant B cannot read Tenant A records).
    """
    if not is_postgres_available():
        pytest.skip("PostgreSQL database is not available on DATABASE_URL. Skipping clinical core integration tests.")

    # 1. Tokens Setup
    token_vet_a_ok = generate_token(TENANT_A_ID, USER_VET_OK_ID, "laura.gomez@sanmartin.com", "Veterinario")
    token_vet_a_no_lic = generate_token(TENANT_A_ID, USER_VET_NO_LIC_ID, "juan.perez@sanmartin.com", "Veterinario")
    token_recep_a = generate_token(TENANT_A_ID, USER_RECEPCIONIST_ID, "maria.lopez@sanmartin.com", "Recepcionista")
    token_vet_b = generate_token(TENANT_B_ID, USER_VET_B_ID, "roberto.silva@delbosque.com", "DirectorClinico")

    # 2. Register Tutor (Tenant A)
    tutor_data = {
        "first_name": "Rodrigo",
        "last_name": "Sanz",
        "email": "rodrigo.sanz@gmail.com",
        "phone": "+525544332211",
        "tax_identifier": "SAZR850101-XYZ",
        "address": "Calle Falsa 123, CDMX",
        "is_active": True
    }
    res_tutor = client.post("/api/v1/patients/tutors", json=tutor_data, headers={"Authorization": f"Bearer {token_vet_a_ok}"})
    assert res_tutor.status_code == 201
    tutor_id = res_tutor.json()["id"]

    # 3. Register Pet for Tutor (Tenant A)
    pet_data = {
        "tutor_id": tutor_id,
        "name": "Firu",
        "species": "Perro",
        "breed": "Pastor Alemán",
        "gender": "Macho",
        "birth_date": "2024-01-10",
        "status": "Activo",
        "is_active": True
    }
    res_pet = client.post("/api/v1/patients/pets", json=pet_data, headers={"Authorization": f"Bearer {token_vet_a_ok}"})
    assert res_pet.status_code == 201
    pet_id = res_pet.json()["id"]

    # 4. Book Appointment (Tenant A)
    appt_data = {
        "branch_id": BRANCH_A_ID,
        "pet_id": pet_id,
        "veterinarian_id": USER_VET_OK_ID,
        "appointment_date": (datetime.datetime.utcnow() + datetime.timedelta(days=1)).isoformat() + "Z",
        "status": "Programada",
        "reason_for_visit": "Vacunación y chequeo anual"
    }
    res_appt = client.post("/api/v1/appointments", json=appt_data, headers={"Authorization": f"Bearer {token_vet_a_ok}"})
    assert res_appt.status_code == 201
    appt_id = res_appt.json()["id"]

    # 5. Register Triage (Tenant A)
    triage_data = {
        "appointment_id": appt_id,
        "pet_id": pet_id,
        "temperature": 38.6,
        "heart_rate": 90,
        "respiratory_rate": 22,
        "weight": 14.5,
        "triage_level": "Consulta Rotativa",
        "reason": "Mascota activa, temperatura normal"
    }
    res_triage = client.post("/api/v1/appointments/triage", json=triage_data, headers={"Authorization": f"Bearer {token_vet_a_ok}"})
    assert res_triage.status_code == 201
    triage_id = res_triage.json()["id"]

    # 6. Open Clinical Consultation (EMR)
    record_data = {
        "pet_id": pet_id,
        "branch_id": BRANCH_A_ID,
        "triage_id": triage_id,
        "anamnesis": "El tutor reporta que requiere vacunación de refuerzo.",
        "physical_examination": "Constantes normales, pelaje sano, dentadura limpia.",
        "diagnosis_id": DIAG_CONTROL_SANO,
        "diagnosis_notes": "Paciente clínicamente sano",
        "treatment_plan": "Aplicar vacuna óctuple y desparasitante",
        "consent_signed": True
    }
    res_record = client.post("/api/v1/clinical/records", json=record_data, headers={"Authorization": f"Bearer {token_vet_a_ok}"})
    assert res_record.status_code == 201
    record_id = res_record.json()["id"]
    assert res_record.json()["status"] == "Abierto"

    # 7. Edit Open Record (Permitted)
    edit_data = {
        "treatment_plan": "Aplicar vacuna óctuple, desparasitante y recomendar alimento premium"
    }
    res_edit = client.put(f"/api/v1/clinical/records/{record_id}", json=edit_data, headers={"Authorization": f"Bearer {token_vet_a_ok}"})
    assert res_edit.status_code == 200
    assert res_edit.json()["treatment_plan"] == "Aplicar vacuna óctuple, desparasitante y recomendar alimento premium"

    # 8. Seal Consultation (status -> Cerrado)
    res_seal = client.post(f"/api/v1/clinical/records/{record_id}/seal", headers={"Authorization": f"Bearer {token_vet_a_ok}"})
    assert res_seal.status_code == 200
    assert res_seal.json()["status"] == "Cerrado"
    assert res_seal.json()["closed_at"] is not None # Automatically populated by trigger

    # 9. Try editing sealed record (Must fail due to trigger BR-CL-001)
    res_edit_fail = client.put(f"/api/v1/clinical/records/{record_id}", json=edit_data, headers={"Authorization": f"Bearer {token_vet_a_ok}"})
    assert res_edit_fail.status_code == 400
    assert "BR-CL-001" in res_edit_fail.json()["detail"] or "inmutable" in res_edit_fail.json()["detail"].lower()

    # 10. Prescriptions & Regulation Checks (BR-CL-002)
    # A controlled prescription requires a veterinarian with a registered professional license.
    prescription_data = {
        "clinical_record_id": record_id,
        "prescription_number": f"RX-{uuid.uuid4().hex[:8].upper()}",
        "is_controlled": True,
        "items": [
            {
                "product_id": PRODUCT_FENTANYL,
                "dosage": "0.1 ml inyectable dosis única",
                "quantity": 1.0
            }
        ]
    }
    
    # 10.1 Issue by Recepcionist (Not authorized to prescribe) -> Must fail 403
    res_rx_recep = client.post("/api/v1/clinical/prescriptions", json=prescription_data, headers={"Authorization": f"Bearer {token_recep_a}"})
    assert res_rx_recep.status_code == 403
    assert "autorizado" in res_rx_recep.json()["detail"].lower() or "facultativo" in res_rx_recep.json()["detail"].lower()

    # 10.2 Issue by Veterinarian WITHOUT license -> Must fail 400 due to BR-CL-002 trigger check
    res_rx_no_lic = client.post("/api/v1/clinical/prescriptions", json=prescription_data, headers={"Authorization": f"Bearer {token_vet_a_no_lic}"})
    assert res_rx_no_lic.status_code == 400
    assert "BR-CL-002" in res_rx_no_lic.json()["detail"] or "matrícula" in res_rx_no_lic.json()["detail"].lower()

    # 10.3 Issue by Veterinarian WITH license (Dra. Laura Gómez) -> Success 201
    res_rx_ok = client.post("/api/v1/clinical/prescriptions", json=prescription_data, headers={"Authorization": f"Bearer {token_vet_a_ok}"})
    assert res_rx_ok.status_code == 201
    assert res_rx_ok.json()["is_controlled"] is True

    # 11. Cross-Tenant RLS Boundaries Verification
    # Tenant B tries to query Tenant A records (Tutor, Pet, ClinicalRecord) -> RLS must block them.
    # Because of RLS, a GET request from Tenant B will simply NOT see Tenant A records.
    
    # Fetch pets as Tenant B
    res_pets_b = client.get("/api/v1/patients/pets", headers={"Authorization": f"Bearer {token_vet_b}"})
    assert res_pets_b.status_code == 200
    pets_list_b = res_pets_b.json()
    # Tenant B has 'Luna' (from seeds), but shouldn't see 'Firu' (created by Tenant A)
    firu_visible = any(p["id"] == pet_id for p in pets_list_b)
    assert not firu_visible, "Security breach: Tenant B can see Tenant A's pet records!"

    # Fetch clinical records as Tenant B
    res_records_b = client.get("/api/v1/clinical/records", headers={"Authorization": f"Bearer {token_vet_b}"})
    assert res_records_b.status_code == 200
    records_list_b = res_records_b.json()
    record_visible = any(r["id"] == record_id for r in records_list_b)
    assert not record_visible, "Security breach: Tenant B can see Tenant A's clinical records!"
