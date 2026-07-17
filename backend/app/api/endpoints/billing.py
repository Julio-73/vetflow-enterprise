import datetime
import logging
import uuid

from app import models, schemas
from app.core.billing.billing_service import BillingService
from app.core.database import get_db
from app.core.security import UserContext, get_current_user
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session, joinedload

logger = logging.getLogger("billing")
router = APIRouter()

# --- CASH REGISTERS ---


@router.post(
    "/registers",
    response_model=schemas.CashRegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def open_cash_register(
    register_in: schemas.CashRegisterOpen,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Opens a new cash register for the logged-in cashier at the specified branch.
    Ensures that only one cash register remains open per cashier.
    """
    # Check for already open cash register
    active_register = (
        db.query(models.CashRegister)
        .filter(
            models.CashRegister.cashier_id == current_user.id,
            models.CashRegister.closed_at.is_(None),
        )
        .first()
    )

    if active_register:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cashier already has an active open cash register. Close it before opening a new one.",
        )

    # Verify branch access
    branch = (
        db.query(models.Branch)
        .filter(models.Branch.id == register_in.branch_id)
        .first()
    )
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found or access denied",
        )

    try:
        register = models.CashRegister(
            id=uuid.uuid4(),
            tenant_id=current_user.tenant_id,
            branch_id=register_in.branch_id,
            cashier_id=current_user.id,
            opening_balance=register_in.opening_balance,
            expected_balance=register_in.opening_balance,  # Starts as opening balance
            status="Abierta",
        )
        db.add(register)
        db.commit()
        db.refresh(register)
        return register
    except DBAPIError as e:
        db.rollback()
        err_msg = str(e.orig).split("\n")[0] if e.orig else str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.get("/registers/me", response_model=schemas.CashRegisterResponse)
def get_my_active_register(
    current_user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Retrieves the active (unclosed) cash register for the logged-in cashier.
    """
    active_register = (
        db.query(models.CashRegister)
        .filter(
            models.CashRegister.cashier_id == current_user.id,
            models.CashRegister.closed_at.is_(None),
        )
        .first()
    )

    if not active_register:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active cash register found for this cashier.",
        )
    return active_register


@router.post(
    "/registers/{register_id}/close", response_model=schemas.CashRegisterResponse
)
def close_cash_register(
    register_id: uuid.UUID,
    close_in: schemas.CashRegisterClose,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Closes the cash register.
    Calculates expected cash balance by aggregating all CASH payments received since the register was opened.
    Computes differences and flags status as 'Cuadrada' (Balanced) or 'Descuadrada' (Unbalanced).
    """
    register = (
        db.query(models.CashRegister)
        .filter(
            models.CashRegister.id == register_id,
            models.CashRegister.cashier_id == current_user.id,
        )
        .first()
    )

    if not register:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cash register not found or access denied",
        )

    if register.closed_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cash register is already closed.",
        )

    # Calculate expected balance based on CASH payments since opened_at
    # Non-cash payments (DEBIT_CARD, CREDIT_CARD, BANK_TRANSFER) go directly to the bank, not cash register drawers.
    cash_sales_sum = (
        db.query(models.Payment.amount)
        .join(models.Sale)
        .filter(
            models.Sale.cashier_id == current_user.id,
            models.Sale.branch_id == register.branch_id,
            models.Sale.created_at >= register.opened_at,
            models.Payment.payment_method == "CASH",
            models.Sale.status == "Pagada",
        )
        .all()
    )

    total_cash_received = sum(float(item[0]) for item in cash_sales_sum)
    expected_balance = float(register.opening_balance) + total_cash_received

    actual_balance = close_in.actual_balance
    difference = actual_balance - expected_balance

    register.expected_balance = expected_balance
    register.actual_balance = actual_balance
    register.difference = difference
    register.closed_at = datetime.datetime.utcnow()
    register.status = "Cuadrada" if difference == 0.0 else "Descuadrada"
    register.updated_at = datetime.datetime.utcnow()

    try:
        db.commit()
        db.refresh(register)
        return register
    except DBAPIError as e:
        db.rollback()
        err_msg = str(e.orig).split("\n")[0] if e.orig else str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


# --- SALES & BILLING ---


@router.post(
    "/sales", response_model=schemas.SaleResponse, status_code=status.HTTP_201_CREATED
)
def create_sale(
    sale_in: schemas.SaleCreate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Registers a new commercial sale.
    Requires an active cash register for the cashier.
    Automatically decrements physical inventory stock (using FEFO batch selection for drugs)
    by writing to inventory_transactions, raising errors if stock is insufficient.
    """
    # 1. Verify active cash register exists
    active_register = (
        db.query(models.CashRegister)
        .filter(
            models.CashRegister.cashier_id == current_user.id,
            models.CashRegister.branch_id == sale_in.branch_id,
            models.CashRegister.closed_at.is_(None),
        )
        .first()
    )

    if not active_register:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Operation blocked: Cashier does not have an active cash register open at this branch.",
        )

    # 2. Verify tutor exists and is accessible
    tutor = db.query(models.Tutor).filter(models.Tutor.id == sale_in.tutor_id).first()
    if not tutor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor not found or access denied",
        )

    sale_id = uuid.uuid4()
    total_amount = 0.0
    sale_items = []
    inv_transactions = []

    # 3. Process Sale Items
    for item_in in sale_in.items:
        # Fetch product details
        product = (
            db.query(models.Product)
            .filter(models.Product.id == item_in.product_id)
            .first()
        )
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item_in.product_id} not found",
            )

        subtotal = float(item_in.quantity) * float(item_in.unit_price)
        item_total = subtotal + float(item_in.tax_amount)
        total_amount += item_total

        batch_id = None

        # --- FEFO Stock Selection for Medicines ---
        if product.category in ("Medicamento", "Medicamento Controlado"):
            # Query active stocks with batches for this product in the branch, sorted by expiration ASC (FEFO)
            available_stocks = (
                db.query(models.InventoryStock)
                .join(models.ProductBatch)
                .filter(
                    models.InventoryStock.branch_id == sale_in.branch_id,
                    models.InventoryStock.product_id == item_in.product_id,
                    models.InventoryStock.quantity >= item_in.quantity,
                )
                .order_by(models.ProductBatch.expiration_date.asc())
                .all()
            )

            if not available_stocks:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock Outage (BR-INV-001): Insufficient stock in this branch for medicine '{product.name}'.",
                )

            # Select the batch closest to expiration (first in sorted list)
            selected_stock = available_stocks[0]
            batch_id = selected_stock.batch_id

        # Prepare Sale Item ORM
        sale_item = models.SaleItem(
            id=uuid.uuid4(),
            tenant_id=current_user.tenant_id,
            sale_id=sale_id,
            product_id=item_in.product_id,
            quantity=item_in.quantity,
            unit_price=item_in.unit_price,
            subtotal=subtotal,
            tax_amount=item_in.tax_amount,
        )
        sale_items.append(sale_item)

        # Prepare Inventory Transaction to deduct stock (negative quantity)
        if product.category != "Servicio":
            inv_tx = models.InventoryTransaction(
                id=uuid.uuid4(),
                tenant_id=current_user.tenant_id,
                branch_id=sale_in.branch_id,
                product_id=item_in.product_id,
                batch_id=batch_id,
                quantity=-float(item_in.quantity),  # Output (-)
                transaction_type="Consumo Clinico",
                reference_id=sale_id,
                notes=f"Venta de producto registrada. Folio Venta: {sale_id}",
                created_by=current_user.id,
            )
            inv_transactions.append(inv_tx)

    # 4. Process Payments
    total_paid = sum(float(p.amount) for p in sale_in.payments)

    # Simple status check
    sale_status = "Pagada" if total_paid >= total_amount else "Pendiente"

    # Create Sale ORM
    sale = models.Sale(
        id=sale_id,
        tenant_id=current_user.tenant_id,
        branch_id=sale_in.branch_id,
        tutor_id=sale_in.tutor_id,
        cashier_id=current_user.id,
        total_amount=total_amount,
        status=sale_status,
        invoice_status="No Facturado",
    )

    try:
        # Write Sale and Items
        db.add(sale)
        for item in sale_items:
            db.add(item)

        # Write Payments
        for p_in in sale_in.payments:
            p = models.Payment(
                id=uuid.uuid4(),
                tenant_id=current_user.tenant_id,
                sale_id=sale_id,
                payment_method=p_in.payment_method,
                amount=p_in.amount,
                transaction_reference=p_in.transaction_reference,
            )
            db.add(p)

        # Write Inventory transactions (triggering stock decrement & outage check triggers)
        for tx in inv_transactions:
            db.add(tx)

        db.commit()
        db.refresh(sale)
        return sale
    except DBAPIError as e:
        db.rollback()
        err_msg = str(e.orig).split("\n")[0] if e.orig else str(e)

        # Intercept trigger stock check failure (BR-INV-001)
        if (
            "BR-INV-001" in err_msg
            or "quiebre" in err_msg.lower()
            or "insuficiente" in err_msg.lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction Rejected (BR-INV-001): Insufficient physical inventory stock to fulfill this sale.",
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.get("/sales/{sale_id}", response_model=schemas.SaleResponse)
def get_sale_details(
    sale_id: uuid.UUID,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves sale details by ID, including items and payments.
    Implicitly filtered by PostgreSQL RLS.
    """
    sale = (
        db.query(models.Sale)
        .options(joinedload(models.Sale.items), joinedload(models.Sale.payments))
        .filter(models.Sale.id == sale_id)
        .first()
    )

    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found or access denied",
        )
    return sale


@router.post("/sales/{sale_id}/invoice", response_model=schemas.InvoiceResponse)
def generate_electronic_invoice(
    sale_id: uuid.UUID,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates and registers the fiscal electronic invoice for a completed sale.
    Uses Ports & Adapters: dynamically resolves adapter (SAT for MX, DIAN for CO)
    based on the country of the branch where the sale occurred.
    """
    # Load sale details along with branch info
    sale = (
        db.query(models.Sale)
        .options(
            joinedload(models.Sale.branch),
            joinedload(models.Sale.tutor),
            joinedload(models.Sale.items),
        )
        .filter(models.Sale.id == sale_id)
        .first()
    )

    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found or access denied",
        )

    if sale.status != "Pagada":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice Rejected: Only fully paid sales can be invoiced.",
        )

    if sale.invoice_status == "Emitido":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice Rejected: An electronic invoice has already been emitted for this sale.",
        )

    branch = sale.branch
    country = branch.country

    # 1. Resolve structural Adapter dynamically (MX -> SAT, CO -> DIAN)
    adapter = BillingService.get_adapter(country)

    # Prepare data payload for the adapter
    sale_payload = {
        "id": str(sale.id),
        "total_amount": float(sale.total_amount),
        "tutor_tax_identifier": sale.tutor.tax_identifier,
        "items": [
            {"sku": item.product.sku, "qty": float(item.quantity)}
            for item in sale.items
        ],
    }

    branch_payload = {
        "tax_identifier": branch.tax_identifier,
        "country": branch.country,
        "name": branch.name,
    }

    # 2. Invoke the Adapter (Port execution)
    try:
        invoice_receipt = adapter.issue_invoice(sale_payload, branch_payload)

        # 3. Update Sale records with fiscal metadata
        sale.invoice_number = invoice_receipt["invoice_number"]
        sale.invoice_status = "Emitido"
        sale.updated_at = datetime.datetime.utcnow()
        db.commit()

        return invoice_receipt

    except Exception as e:
        db.rollback()
        sale.invoice_status = "Error"
        db.commit()
        logger.error(f"Invoicing failure for sale {sale_id} under authority: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Tax Authority connection failure: {str(e)}",
        )
