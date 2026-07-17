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

# Users (Cashiers / Owners)
USER_OWNER_A_ID = "11111111-1111-1111-1111-111111111111"  # Carlos Pérez (TenantOwner A)
USER_OWNER_B_ID = "55555555-5555-5555-5555-555555555555"  # Dr. Roberto Silva (Tenant B Owner, Colombia)

# Branches
BRANCH_A_MX_ID = "a2222222-2222-4222-a222-222222222222" # Sede Principal San Martín (MX)
BRANCH_B_CO_ID = "b3333333-3333-4333-b333-333333333333" # Sede Única Del Bosque (CO)

# Tutor
TUTOR_A_ID = "77777777-7777-7777-7777-777777777777"
TUTOR_B_ID = "88888888-8888-8888-8888-888888888888"

# Product from seeds (Amoxicillin)
PRODUCT_AMOXICILLIN = "c2222222-2222-2222-2222-222222222222" # Stock: 200 in seeds

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

def test_ports_and_adapters_resolution():
    """
    Validates that the BillingService factory correctly resolves SatAdapter for MX
    and DianAdapter for CO, and raises a 400 Bad Request for unsupported countries.
    """
    from app.core.billing.billing_service import BillingService
    from app.core.billing.adapters.sat_adapter import SatAdapter
    from app.core.billing.adapters.dian_adapter import DianAdapter
    from fastapi import HTTPException

    # Resolves SAT
    adapter_mx = BillingService.get_adapter("MX")
    assert isinstance(adapter_mx, SatAdapter)

    # Resolves DIAN
    adapter_co = BillingService.get_adapter("CO")
    assert isinstance(adapter_co, DianAdapter)

    # Unsupported raises error
    with pytest.raises(HTTPException) as exc:
        BillingService.get_adapter("US")
    assert exc.value.status_code == 400
    assert "not supported" in exc.value.detail


# --- E2E PostgreSQL Database Integration Tests ---

def test_financial_billing_and_cash_flow():
    """
    E2E integration test against PostgreSQL validating billing and sales.
    Covers:
      1. Opening a cash register drawer.
      2. Attempting sales booking when active register is open.
      3. Verifying stock decrement trigger checks on sale.
      4. Auditing cash register drawer close (expected vs actual balance).
      5. Simulating multi-country electronic invoicing (SAT for Mexico, DIAN for Colombia).
    """
    if not is_postgres_available():
        pytest.skip("PostgreSQL database is not available on DATABASE_URL. Skipping billing integration tests.")

    # 1. Tokens Setup
    token_owner_a = generate_token(TENANT_A_ID, USER_OWNER_A_ID, "carlos.admin@sanmartin.com", "TenantOwner")
    token_owner_b = generate_token(TENANT_B_ID, USER_OWNER_B_ID, "roberto.silva@delbosque.com", "DirectorClinico")

    # Clean any active registers first to avoid blockages
    db = SessionLocal()
    db.execute(text("UPDATE cash_registers SET closed_at = NOW(), status = 'Cuadrada' WHERE closed_at IS NULL"))
    db.commit()
    db.close()

    # --- TENANT A FLOW (MEXICO - SAT) ---
    # 2. Open Cash Register
    open_data = {
        "branch_id": BRANCH_A_MX_ID,
        "opening_balance": 1500.00
    }
    res_open = client.post("/api/v1/billing/registers", json=open_data, headers={"Authorization": f"Bearer {token_owner_a}"})
    assert res_open.status_code == 201
    register_a_id = res_open.json()["id"]

    # 3. Book a Sale (which decrements Amoxicillin stock)
    # Price: 150.00 each, qty: 2. Total: 300.00. Paid 300.00 CASH.
    sale_data = {
        "branch_id": BRANCH_A_MX_ID,
        "tutor_id": TUTOR_A_ID,
        "items": [
            {
                "product_id": PRODUCT_AMOXICILLIN,
                "quantity": 2.0,
                "unit_price": 150.00,
                "tax_amount": 0.00
            }
        ],
        "payments": [
            {
                "payment_method": "CASH",
                "amount": 300.00
            }
        ]
    }
    res_sale = client.post("/api/v1/billing/sales", json=sale_data, headers={"Authorization": f"Bearer {token_owner_a}"})
    assert res_sale.status_code == 201
    sale_a_id = res_sale.json()["id"]
    assert res_sale.json()["status"] == "Pagada"

    # Verify stock was decremented in database
    db = SessionLocal()
    remaining_stock = db.execute(
        text("SELECT quantity FROM inventory_stocks WHERE branch_id = :b AND product_id = :p"),
        {"b": BRANCH_A_MX_ID, "p": PRODUCT_AMOXICILLIN}
    ).scalar()
    # 200 (seeds) - 2 (this sale) = 198
    assert float(remaining_stock) == 198.0
    db.close()

    # 4. Generate Mexico Electronic Invoice (SAT)
    res_invoice_a = client.post(f"/api/v1/billing/sales/{sale_a_id}/invoice", headers={"Authorization": f"Bearer {token_owner_a}"})
    assert res_invoice_a.status_code == 200
    invoice_a = res_invoice_a.json()
    assert invoice_a["country"] == "MX"
    assert invoice_a["authority"] == "SAT"
    assert invoice_a["fiscal_uuid"] is not None
    assert invoice_a["timbre"] is not None
    assert "cfdi:Comprobante" in invoice_a["xml_representation"]

    # 5. Close Cash Register & Arqueo
    # Expected: 1500 (open) + 300 (cash sale) = 1800.
    # We close with 1800 (Balanced -> Cuadrada)
    close_data = {
        "actual_balance": 1800.00
    }
    res_close = client.post(f"/api/v1/billing/registers/{register_a_id}/close", json=close_data, headers={"Authorization": f"Bearer {token_owner_a}"})
    assert res_close.status_code == 200
    assert res_close.json()["status"] == "Cuadrada"
    assert float(res_close.json()["expected_balance"]) == 1800.00
    assert float(res_close.json()["difference"]) == 0.0

    # --- TENANT B FLOW (COLOMBIA - DIAN) ---
    # We must first register a product in Tenant B to transact, since product RLS isolates catalogs.
    # Register Product in Tenant B (using same UUID or dynamic one, let's create a dynamic product)
    prod_b_data = {
        "sku": "SERV-CONS-B",
        "name": "Consulta Especializada del Bosque",
        "category": "Servicio",  # No stock deduction required
        "unit_of_measure": "servicio",
        "minimum_stock": 0.0,
        "is_active": True
    }
    res_prod_b = client.post("/api/v1/inventory/products", json=prod_b_data, headers={"Authorization": f"Bearer {token_owner_b}"})
    assert res_prod_b.status_code == 201
    prod_b_id = res_prod_b.json()["id"]

    # Open Cash Register for B (Colombia)
    open_data_b = {
        "branch_id": BRANCH_B_CO_ID,
        "opening_balance": 50000.00  # 50,000 COP
    }
    res_open_b = client.post("/api/v1/billing/registers", json=open_data_b, headers={"Authorization": f"Bearer {token_owner_b}"})
    assert res_open_b.status_code == 201
    register_b_id = res_open_b.json()["id"]

    # Book a Sale in Tenant B
    sale_b_data = {
        "branch_id": BRANCH_B_CO_ID,
        "tutor_id": TUTOR_B_ID,
        "items": [
            {
                "product_id": prod_b_id,
                "quantity": 1.0,
                "unit_price": 80000.00,
                "tax_amount": 0.00
            }
        ],
        "payments": [
            {
                "payment_method": "BANK_TRANSFER", # Non-cash payment
                "amount": 80000.00,
                "transaction_reference": "TRANS-98765"
            }
        ]
    }
    res_sale_b = client.post("/api/v1/billing/sales", json=sale_b_data, headers={"Authorization": f"Bearer {token_owner_b}"})
    assert res_sale_b.status_code == 201
    sale_b_id = res_sale_b.json()["id"]

    # Generate Colombia Electronic Invoice (DIAN)
    res_invoice_b = client.post(f"/api/v1/billing/sales/{sale_b_id}/invoice", headers={"Authorization": f"Bearer {token_owner_b}"})
    assert res_invoice_b.status_code == 200
    invoice_b = res_invoice_b.json()
    assert invoice_b["country"] == "CO"
    assert invoice_b["authority"] == "DIAN"
    assert invoice_b["cufe"] is not None
    assert "Invoice" in invoice_b["xml_representation"]

    # Close Cash Register for B & Arqueo
    # Expected: 50,000 (open). Sales amount (80,000) was paid via BANK_TRANSFER, so expected cash in register drawer remains 50,000.
    # We close with 45,000 (Unbalanced -> Descuadrada with -5000 difference)
    close_data_b = {
        "actual_balance": 45000.00
    }
    res_close_b = client.post(f"/api/v1/billing/registers/{register_b_id}/close", json=close_data_b, headers={"Authorization": f"Bearer {token_owner_b}"})
    assert res_close_b.status_code == 200
    assert res_close_b.json()["status"] == "Descuadrada"
    assert float(res_close_b.json()["expected_balance"]) == 50000.00
    assert float(res_close_b.json()["difference"]) == -5000.00
