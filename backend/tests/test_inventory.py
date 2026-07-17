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

# Users (Attending Veterinarians / Owner / Recepcionists)
USER_OWNER_A_ID = "11111111-1111-1111-1111-111111111111"      # Carlos Pérez (TenantOwner)
USER_RECEPCIONIST_A_ID = "44444444-4444-4444-4444-444444444444" # María López (Recepcionist)
USER_VET_B_ID = "55555555-5555-5555-5555-555555555555"          # Dr. Roberto Silva (Tenant B Owner)

# Branch
BRANCH_A_ID = "a2222222-2222-4222-a222-222222222222" # Sede Principal San Martín

# Products & Batches from seeds
PRODUCT_FENTANYL = "c1111111-1111-1111-1111-111111111111"  # Controlled Drug
BATCH_FENTANYL_1 = "e1111111-1111-1111-1111-111111111111"  # Expires 2027-01-01
BATCH_FENTANYL_2 = "e2222222-2222-2222-2222-222222222222"  # Expires 2026-10-01 (should expire first)

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

def test_requires_reorder_calculation():
    """
    Unit test to verify that the Pydantic schema properly computes the
    'requires_reorder' field using current stock levels and minimum stock thresholds.
    """
    from app.schemas import InventoryStockResponse
    
    # 1. quantity (5) <= minimum_stock (10) -> requires_reorder: True
    data_low = {
        "branch_id": uuid.uuid4(),
        "product_id": uuid.uuid4(),
        "batch_id": uuid.uuid4(),
        "quantity": 5.0,
        "minimum_stock": 10.0,
        "tenant_id": uuid.uuid4()
    }
    response_low = InventoryStockResponse.model_validate(data_low)
    assert response_low.requires_reorder is True

    # 2. quantity (15) > minimum_stock (10) -> requires_reorder: False
    data_high = {
        "branch_id": uuid.uuid4(),
        "product_id": uuid.uuid4(),
        "batch_id": uuid.uuid4(),
        "quantity": 15.0,
        "minimum_stock": 10.0,
        "tenant_id": uuid.uuid4()
    }
    response_high = InventoryStockResponse.model_validate(data_high)
    assert response_high.requires_reorder is False


# --- E2E PostgreSQL Database Integration Tests ---

def test_inventory_and_pharmacy_e2e_flow():
    """
    E2E integration test against PostgreSQL validating RLS, FEFO order,
    requires_reorder calculation, and stock control triggers.
    """
    if not is_postgres_available():
        pytest.skip("PostgreSQL database is not available on DATABASE_URL. Skipping inventory integration tests.")

    # Setup tokens
    token_owner_a = generate_token(TENANT_A_ID, USER_OWNER_A_ID, "carlos.admin@sanmartin.com", "TenantOwner")
    token_recep_a = generate_token(TENANT_A_ID, USER_RECEPCIONIST_A_ID, "maria.lopez@sanmartin.com", "Recepcionista")
    token_owner_b = generate_token(TENANT_B_ID, USER_VET_B_ID, "roberto.silva@delbosque.com", "DirectorClinico")

    # 1. Create a non-controlled product with a high minimum stock threshold to trigger reorder alerts
    product_data = {
        "sku": f"INS-GLOVE-{uuid.uuid4().hex[:4].upper()}",
        "name": "Guantes de Látex Desechables",
        "description": "Caja de guantes quirúrgicos",
        "category": "Insumo",
        "is_controlled": False,
        "requires_prescription": False,
        "unit_of_measure": "caja",
        "minimum_stock": 50.0,  # High threshold
        "is_active": True
    }
    res_prod = client.post("/api/v1/inventory/products", json=product_data, headers={"Authorization": f"Bearer {token_owner_a}"})
    assert res_prod.status_code == 201
    product_id = res_prod.json()["id"]

    # 2. Add some stock that triggers reorder (quantity 20 <= minimum_stock 50)
    tx_data = {
        "branch_id": BRANCH_A_ID,
        "product_id": product_id,
        "quantity": 20.0,  # Below minimum stock
        "transaction_type": "Compra",
        "notes": "Ingreso por compra inicial de insumos de guantes"
    }
    res_tx = client.post("/api/v1/inventory/transactions", json=tx_data, headers={"Authorization": f"Bearer {token_owner_a}"})
    assert res_tx.status_code == 201

    # 3. Retrieve stocks and verify 'requires_reorder' is calculated as True
    res_stocks = client.get("/api/v1/inventory/stocks", headers={"Authorization": f"Bearer {token_owner_a}"})
    assert res_stocks.status_code == 200
    stocks_list = res_stocks.json()
    
    # Locate our product stock entry
    our_stock = next((s for s in stocks_list if str(s["product_id"]) == product_id), None)
    assert our_stock is not None
    assert our_stock["requires_reorder"] is True, "requires_reorder should be True since stock 20 <= min_stock 50"

    # 4. Verify FEFO (First Expired, First Out) sorting of batches
    # We query batches list. From seeds, LOTE-FENT-26B (expires 2026-10-01) should appear BEFORE LOTE-FENT-27A (expires 2027-01-01)
    res_batches = client.get("/api/v1/inventory/batches", headers={"Authorization": f"Bearer {token_owner_a}"})
    assert res_batches.status_code == 200
    batches_list = res_batches.json()
    
    fent_batches = [b for b in batches_list if str(b["product_id"]) == PRODUCT_FENTANYL]
    assert len(fent_batches) >= 2
    # Verify expiration order ascending
    exp_dates = [datetime.datetime.strptime(b["expiration_date"], "%Y-%m-%d").date() for b in fent_batches]
    assert exp_dates == sorted(exp_dates), "Batches should be sorted strictly by expiration date ascending (FEFO)"

    # 5. Verify BR-INV-003 (Lote & Expiración for drugs)
    # Trying to book a transaction for Fentanyl (which is a drug) without providing batch_id
    tx_drug_fail = {
        "branch_id": BRANCH_A_ID,
        "product_id": PRODUCT_FENTANYL,
        "batch_id": None,  # Missing batch
        "quantity": 10.0,
        "transaction_type": "Compra",
        "notes": "Compra fallida sin registrar lote de medicamento"
    }
    res_fail_3 = client.post("/api/v1/inventory/transactions", json=tx_drug_fail, headers={"Authorization": f"Bearer {token_owner_a}"})
    assert res_fail_3.status_code == 400
    assert "BR-INV-003" in res_fail_3.json()["detail"] or "lote" in res_fail_3.json()["detail"].lower()

    # 6. Verify BR-INV-004 (Audited Stock Adjustments)
    tx_adjust_fail_role = {
        "branch_id": BRANCH_A_ID,
        "product_id": product_id,
        "quantity": -2.0,
        "transaction_type": "Ajuste Merma",
        "notes": "Merma por rotura de caja en almacén central"  # Long enough notes
    }
    
    # 6.1 Call as Recepcionist -> Must fail 403
    res_fail_role = client.post("/api/v1/inventory/transactions", json=tx_adjust_fail_role, headers={"Authorization": f"Bearer {token_recep_a}"})
    assert res_fail_role.status_code == 403
    assert "permisos" in res_fail_role.json()["detail"].lower() or "BR-INV-004" in res_fail_role.json()["detail"]

    # 6.2 Call as Admin but with short notes (<15 characters) -> Must fail 400
    tx_adjust_fail_notes = {
        "branch_id": BRANCH_A_ID,
        "product_id": product_id,
        "quantity": -2.0,
        "transaction_type": "Ajuste Merma",
        "notes": "Roto"  # Too short
    }
    res_fail_notes = client.post("/api/v1/inventory/transactions", json=tx_adjust_fail_notes, headers={"Authorization": f"Bearer {token_owner_a}"})
    assert res_fail_notes.status_code == 400
    assert "BR-INV-004" in res_fail_notes.json()["detail"] or "justifique" in res_fail_notes.json()["detail"].lower()

    # 7. Verify BR-INV-001 (Stock Outages prevention)
    # We try to consume 1000 units of Fentanyl (we only have 150 units consolidated from seeds)
    tx_outage = {
        "branch_id": BRANCH_A_ID,
        "product_id": PRODUCT_FENTANYL,
        "batch_id": BATCH_FENTANYL_1,
        "quantity": -1000.0,  # Exceeds available stock (100)
        "transaction_type": "Consumo Clinico",
        "notes": "Despacho clínico de emergencia"
    }
    res_outage = client.post("/api/v1/inventory/transactions", json=tx_outage, headers={"Authorization": f"Bearer {token_owner_a}"})
    assert res_outage.status_code == 400
    assert "BR-INV-001" in res_outage.json()["detail"] or "insuficiente" in res_outage.json()["detail"].lower() or "quiebre" in res_outage.json()["detail"].lower()

    # 8. Verify Cross-Tenant Isolation (RLS)
    # Tenant B queries product list. Must NOT see the Glove product created by Tenant A.
    res_prod_b = client.get("/api/v1/inventory/products", headers={"Authorization": f"Bearer {token_owner_b}"})
    assert res_prod_b.status_code == 200
    prod_list_b = res_prod_b.json()
    
    glove_visible = any(p["id"] == product_id for p in prod_list_b)
    assert not glove_visible, "Security breach: Tenant B can see Tenant A's products catalog!"
