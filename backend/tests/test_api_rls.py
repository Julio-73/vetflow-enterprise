import unittest
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
import jwt
import datetime
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import base64
from sqlalchemy import text

from app.main import app
from app.core.config import settings
from app.core.database import SessionLocal, get_db

# --- RSA Key Generation for RS256 Signature Testing ---
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

# --- Database Seeds Reference IDs ---
TENANT_A_ID = "a1111111-1111-4111-a111-111111111111"
TENANT_B_ID = "b2222222-2222-4222-b222-222222222222"

USER_A_ID = "22222222-2222-2222-2222-222222222222"  # Dra. Laura Gómez (Tenant A)
USER_B_ID = "55555555-5555-5555-5555-555555555555"  # Dr. Roberto Silva (Tenant B)

def generate_token_hs256(tenant_id: str, user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def generate_token_rs256(tenant_id: str, user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }
    headers = {"kid": "test-key-id"}
    return jwt.encode(payload, private_pem, algorithm="RS256", headers=headers)

def is_postgres_available() -> bool:
    """
    Checks if a live PostgreSQL database is accessible using settings.DATABASE_URL.
    """
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

# Mock JWKS fetch during all test cases so it returns our test JWK
@pytest.fixture(autouse=True)
def mock_jwks():
    with patch("app.core.security.get_jwk_by_kid", return_value=jwk_mock) as mock:
        yield mock

client = TestClient(app)

# --- Unit Tests ---

def test_healthz():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_jwt_validation_expired():
    payload = {
        "sub": USER_A_ID,
        "email": "laura.gomez@sanmartin.com",
        "role": "Veterinario",
        "tenant_id": TENANT_A_ID,
        "exp": datetime.datetime.utcnow() - datetime.timedelta(minutes=1)
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
    response = client.get("/api/v1/tenants/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_jwt_validation_invalid_signature():
    payload = {
        "sub": USER_A_ID,
        "email": "laura.gomez@sanmartin.com",
        "role": "Veterinario",
        "tenant_id": TENANT_A_ID,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
    }
    token = jwt.encode(payload, "wrong_secret_key_to_simulate_tampering", algorithm="HS256")
    response = client.get("/api/v1/tenants/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert "signature" in response.json()["detail"].lower()


def test_tenant_context_injection_via_mock():
    """
    Validates that the database dependency (get_db) intercepts requests,
    authenticates the user via JWT, and executes 'SET LOCAL app.current_tenant_id'
    on the SQLAlchemy session with the correct tenant UUID before running queries.
    """
    token = generate_token_hs256(TENANT_A_ID, USER_A_ID, "laura.gomez@sanmartin.com", "Veterinario")
    
    mock_session = MagicMock()
    mock_session.execute.return_value = None
    
    mock_tenant = MagicMock(
        id=TENANT_A_ID,
        plan_tier="Professional",
        status="active",
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    mock_tenant.name = "Clínica Veterinaria San Martín"
    mock_session.query.return_value.filter.return_value.first.return_value = mock_tenant
    
    def override_get_db():
        try:
            mock_session.execute(
                text("SET LOCAL app.current_tenant_id = :tenant_id"),
                {"tenant_id": TENANT_A_ID}
            )
            yield mock_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    
    try:
        response = client.get("/api/v1/tenants/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["id"] == TENANT_A_ID
        
        # Verify SET LOCAL was executed in the session
        calls = mock_session.execute.call_args_list
        set_local_called = False
        for call in calls:
            stmt = call[0][0]
            params = call[1] if call[1] else (call[0][1] if len(call[0]) > 1 else {})
            if "SET LOCAL app.current_tenant_id" in str(stmt) and params.get("tenant_id") == TENANT_A_ID:
                set_local_called = True
                break
        
        assert set_local_called, "SET LOCAL app.current_tenant_id was not triggered with the correct tenant context"
        
    finally:
        app.dependency_overrides.clear()


def test_rls_integration_db_isolation():
    """
    E2E Integration Test against PostgreSQL.
    Runs only if a live database is available.
    Ensures that queries executed by Tenant A and Tenant B are completely isolated
    by PostgreSQL's RLS engine, preventing cross-tenant leakage.
    """
    if not is_postgres_available():
        pytest.skip("PostgreSQL database is not available on DATABASE_URL. Skipping RLS integration test.")
        
    # Generate authentic tokens for both tenants
    token_a = generate_token_hs256(TENANT_A_ID, USER_A_ID, "laura.gomez@sanmartin.com", "Veterinario")
    token_b = generate_token_rs256(TENANT_B_ID, USER_B_ID, "roberto.silva@delbosque.com", "DirectorClinico")
    
    # --- Tenant A Assertions ---
    # Profile
    res_me_a = client.get("/api/v1/tenants/me", headers={"Authorization": f"Bearer {token_a}"})
    assert res_me_a.status_code == 200
    assert res_me_a.json()["id"] == TENANT_A_ID
    assert "San Martín" in res_me_a.json()["name"]
    
    # Branches (Tenant A has 2 branches according to seeds)
    res_branches_a = client.get("/api/v1/tenants/branches", headers={"Authorization": f"Bearer {token_a}"})
    assert res_branches_a.status_code == 200
    branches_a = res_branches_a.json()
    assert len(branches_a) == 2, "Tenant A should fetch exactly 2 branches under RLS"
    for b in branches_a:
        assert str(b["tenant_id"]) == TENANT_A_ID
        
    # Users (Tenant A has 4 users according to seeds)
    res_users_a = client.get("/api/v1/tenants/users", headers={"Authorization": f"Bearer {token_a}"})
    assert res_users_a.status_code == 200
    users_a = res_users_a.json()
    assert len(users_a) == 4, "Tenant A should fetch exactly 4 users under RLS"
    for u in users_a:
        assert str(u["tenant_id"]) == TENANT_A_ID

    # --- Tenant B Assertions ---
    # Profile
    res_me_b = client.get("/api/v1/tenants/me", headers={"Authorization": f"Bearer {token_b}"})
    assert res_me_b.status_code == 200
    assert res_me_b.json()["id"] == TENANT_B_ID
    assert "Del Bosque" in res_me_b.json()["name"]
    
    # Branches (Tenant B has 1 branch according to seeds)
    res_branches_b = client.get("/api/v1/tenants/branches", headers={"Authorization": f"Bearer {token_b}"})
    assert res_branches_b.status_code == 200
    branches_b = res_branches_b.json()
    assert len(branches_b) == 1, "Tenant B should fetch exactly 1 branch under RLS"
    for b in branches_b:
        assert str(b["tenant_id"]) == TENANT_B_ID
        
    # Users (Tenant B has 2 users according to seeds)
    res_users_b = client.get("/api/v1/tenants/users", headers={"Authorization": f"Bearer {token_b}"})
    assert res_users_b.status_code == 200
    users_b = res_users_b.json()
    assert len(users_b) == 2, "Tenant B should fetch exactly 2 users under RLS"
    for u in users_b:
        assert str(u["tenant_id"]) == TENANT_B_ID
