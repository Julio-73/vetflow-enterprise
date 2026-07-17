import logging
import uuid
from typing import List

from app import models, schemas
from app.core.database import get_db
from app.core.security import UserContext, get_current_user
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session, joinedload

logger = logging.getLogger("inventory")
router = APIRouter()


@router.get("/products", response_model=List[schemas.ProductResponse])
def list_products(
    current_user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Returns the catalog of products belonging to the current tenant.
    Implicitly filtered by PostgreSQL RLS.
    """
    return db.query(models.Product).all()


@router.post(
    "/products",
    response_model=schemas.ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    product_in: schemas.ProductCreate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Registers a new product in the catalog.
    Automatically binds the product to the active tenant.
    """
    try:
        product = models.Product(
            id=uuid.uuid4(),
            tenant_id=current_user.tenant_id,
            sku=product_in.sku,
            name=product_in.name,
            description=product_in.description,
            category=product_in.category,
            is_controlled=product_in.is_controlled,
            requires_prescription=product_in.requires_prescription,
            unit_of_measure=product_in.unit_of_measure,
            minimum_stock=product_in.minimum_stock,
            is_active=product_in.is_active,
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        return product
    except DBAPIError as e:
        db.rollback()
        err_msg = str(e.orig).split("\n")[0] if e.orig else str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.get("/stocks", response_model=List[schemas.InventoryStockResponse])
def get_inventory_stocks(
    current_user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Fetches the consolidated stock levels for the current tenant.
    Includes the computed virtual column 'requires_reorder'.
    Utilizes joinedload on models.InventoryStock.product for performance.
    """
    # Join load product to efficiently evaluate quantity <= product.minimum_stock (avoids N+1)
    return (
        db.query(models.InventoryStock)
        .options(joinedload(models.InventoryStock.product))
        .all()
    )


@router.get("/batches", response_model=List[schemas.ProductBatchResponse])
def list_product_batches(
    current_user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Lists product batches sorted strictly by expiration date ascending (FEFO - First Expired, First Out).
    Implicitly filtered by PostgreSQL RLS.
    """
    return (
        db.query(models.ProductBatch)
        .order_by(models.ProductBatch.expiration_date.asc())
        .all()
    )


@router.post(
    "/transactions",
    response_model=schemas.InventoryTransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory_transaction(
    tx_in: schemas.InventoryTransactionCreate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Records stock transactions (purchases, clinical consumption, adjustments).
    Enforces business regulations and captures errors from database triggers:
    1. trg_enforce_product_batch_rules: Blocks drug movement if no batch/expiration date is defined.
    2. trg_validate_inventory_adjustment: Blocks adjustments if the user is not an administrator
       or if notes are too short (<15 characters).
    """
    # Verify product exists
    product = (
        db.query(models.Product).filter(models.Product.id == tx_in.product_id).first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or access denied",
        )

    try:
        tx = models.InventoryTransaction(
            id=uuid.uuid4(),
            tenant_id=current_user.tenant_id,
            branch_id=tx_in.branch_id,
            product_id=tx_in.product_id,
            batch_id=tx_in.batch_id,
            quantity=tx_in.quantity,
            transaction_type=tx_in.transaction_type,
            reference_id=tx_in.reference_id,
            notes=tx_in.notes,
            created_by=current_user.id,
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)
        return tx
    except DBAPIError as e:
        db.rollback()
        err_msg = str(e.orig).split("\n")[0] if e.orig else str(e)

        # Intercept trg_enforce_product_batch_rules (BR-INV-003)
        if (
            "BR-INV-003" in err_msg
            or "lote" in err_msg.lower()
            or "vencimiento" in err_msg.lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inventory Regulation Violation (BR-INV-003): Medicines require batch number and expiration date to record movements.",
            )

        # Intercept trg_validate_inventory_adjustment (BR-INV-004)
        if "BR-INV-004" in err_msg or "justifique" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audit Violation (BR-INV-004): Manual stock adjustments require a detailed justification (min 15 characters).",
            )
        if (
            "permisos" in err_msg.lower()
            or "rol no autorizado" in err_msg.lower()
            or "privilege" in err_msg.lower()
            or "insufficient_privilege" in err_msg.lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Security Restriction (BR-INV-004): Manual adjustments require an authorized role (DirectorClinico, TenantOwner, SuperAdmin).",
            )

        # Intercept trg_update_inventory_stock_balances (BR-INV-001 - stock quiebre)
        if (
            "BR-INV-001" in err_msg
            or "quiebre" in err_msg.lower()
            or "insuficiente" in err_msg.lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stock Outage (BR-INV-001): Insufficient stock in this branch for the selected batch.",
            )

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
