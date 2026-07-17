import logging
from typing import Any, Dict

import httpx
import jwt
from app.core.config import settings
from app.core.logging_config import tenant_id_ctx, user_id_ctx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import ExpiredSignatureError, InvalidSignatureError, PyJWTError
from uuid import UUID
from pydantic import BaseModel, EmailStr

logger = logging.getLogger("security")

# Authentication Scheme
security_scheme = HTTPBearer()


# User Context Model extracted from JWT Payload
class UserContext(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    tenant_id: UUID


# In-memory JWKS cache for Supabase public keys
_jwks_cache: Dict[str, Any] = {}


async def get_jwk_by_kid(kid: str) -> Dict[str, Any]:
    """
    Fetches the public JWK key from Supabase matching the provided key ID (kid).
    Uses in-memory caching to avoid database/network roundtrips on every request.
    """
    global _jwks_cache
    if kid in _jwks_cache:
        return _jwks_cache[kid]

    # Construct standard Supabase JWKS URL
    jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/roles/v1/.well-known/jwks.json"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(jwks_url)
            if response.status_code == 200:
                jwks = response.json()
                for key in jwks.get("keys", []):
                    _jwks_cache[key["kid"]] = key
                if kid in _jwks_cache:
                    return _jwks_cache[kid]
    except Exception as e:
        logger.error(f"Error fetching JWKS from Supabase: {e}")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not verify token signature: JWKS public key not found",
    )


def parse_user_context(payload: Dict[str, Any]) -> UserContext:
    """
    Parses the JWT payload and extracts the user context.
    Looks flexibly inside root payload, app_metadata, and user_metadata.
    """
    # Extract User ID
    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing user identifier (sub/user_id)",
        )

    # Extract Email
    email = payload.get("email") or payload.get("user_metadata", {}).get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing email",
        )

    # Extract Tenant ID
    tenant_id = (
        payload.get("tenant_id")
        or payload.get("app_metadata", {}).get("tenant_id")
        or payload.get("user_metadata", {}).get("tenant_id")
    )
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing tenant_id context",
        )

    # Extract Role
    role = (
        payload.get("role")
        or payload.get("app_metadata", {}).get("role")
        or payload.get("user_metadata", {}).get("role")
    )
    if not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing user role",
        )

    tenant_id_ctx.set(str(tenant_id))
    user_id_ctx.set(str(user_id))

    return UserContext(id=user_id, email=email, role=role, tenant_id=tenant_id)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> UserContext:
    """
    FastAPI dependency injection to authenticate users and load tenant context.
    Validates token signature (HS256 or RS256), checks expiration, and extracts claims.
    """
    token = credentials.credentials
    try:
        # Read header to determine the signing algorithm
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")

        if alg == "HS256":
            if settings.APP_ENV == "production":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="HS256 algorithm is disabled in production environment",
                )
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        elif alg == "RS256":
            kid = unverified_header.get("kid")
            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="RS256 token is missing key ID (kid)",
                )

            jwk = await get_jwk_by_kid(kid)
            # Import RSA public key from JWK configuration
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk)
            payload = jwt.decode(token, public_key, algorithms=["RS256"])
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Unsupported JWT signing algorithm: {alg}",
            )

        return parse_user_context(payload)

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired"
        )
    except InvalidSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature"
        )
    except PyJWTError as e:
        logger.error(f"JWT verification failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
