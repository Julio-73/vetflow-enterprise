import datetime
from typing import List, Optional

from app import models
from app.core.database import get_db
from app.core.security import UserContext, get_current_user
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import UUID4, BaseModel, EmailStr
from sqlalchemy.orm import Session

router = APIRouter()

# --- Pydantic Response Schemas ---


class TenantResponse(BaseModel):
    id: UUID4
    name: str
    plan_tier: str
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class BranchResponse(BaseModel):
    id: UUID4
    tenant_id: UUID4
    name: str
    address: str
    country: str
    currency: str
    tax_identifier: str
    is_active: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: UUID4
    tenant_id: UUID4
    email: EmailStr
    name: str
    role: str
    professional_license: Optional[str] = None
    is_active: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


# --- Protected Endpoints ---


@router.get("/me", response_model=TenantResponse)
def get_current_tenant(
    current_user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Fetches the profile of the tenant associated with the authenticated user.
    Demonstrates RLS policy filtering on the root 'tenants' table where only the
    matching current_tenant_id record is accessible.
    """
    tenant = (
        db.query(models.Tenant)
        .filter(models.Tenant.id == current_user.tenant_id)
        .first()
    )
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant profile not found or access denied by RLS policies",
        )
    return tenant


@router.get("/branches", response_model=List[BranchResponse])
def get_tenant_branches(
    current_user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Returns branches belonging to the authenticated tenant.
    Demonstrates implicit RLS filtering—no tenant_id filter is added manually to the query.
    """
    # RLS enforces that db.query(models.Branch).all() only retrieves records matching the session's tenant_id
    branches = db.query(models.Branch).all()
    return branches


@router.get("/users", response_model=List[UserResponse])
def get_tenant_users(
    current_user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Returns users belonging to the authenticated tenant.
    Demonstrates implicit RLS filtering—no tenant_id filter is added manually to the query.
    """
    # RLS enforces that db.query(models.User).all() only retrieves records matching the session's tenant_id
    users = db.query(models.User).all()
    return users
