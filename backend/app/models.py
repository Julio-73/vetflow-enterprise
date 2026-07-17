import datetime

from app.core.database import Base
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    plan_tier = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    branches = relationship(
        "Branch", back_populates="tenant", cascade="all, delete-orphan"
    )
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")


class Branch(Base):
    __tablename__ = "branches"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(255), nullable=False)
    address = Column(String, nullable=False)
    country = Column(String(2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    tax_identifier = Column(String(50), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="branches")
    stocks = relationship("InventoryStock", back_populates="branch")
    transactions = relationship("InventoryTransaction", back_populates="branch")
    sales = relationship("Sale", back_populates="branch")
    cash_registers = relationship("CashRegister", back_populates="branch")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    email = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    professional_license = Column(String(100), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    adjustments_made = relationship("InventoryTransaction", back_populates="creator")
    sales_registered = relationship("Sale", back_populates="cashier")
    registers_managed = relationship("CashRegister", back_populates="cashier")


# --- CLINICAL CORE & EMR MODELS ---


class DiagnosisCatalog(Base):
    __tablename__ = "diagnosis_catalog"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    clinical_records = relationship("ClinicalRecord", back_populates="diagnosis")


class Tutor(Base):
    __tablename__ = "tutors"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(30), nullable=False)
    tax_identifier = Column(String(50), nullable=True)
    address = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    pets = relationship("Pet", back_populates="tutor", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="tutor")


class Pet(Base):
    __tablename__ = "pets"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    tutor_id = Column(
        UUID(as_uuid=True), ForeignKey("tutors.id", ondelete="RESTRICT"), nullable=False
    )
    name = Column(String(100), nullable=False)
    species = Column(String(50), nullable=False)
    breed = Column(String(100), nullable=True)
    gender = Column(String(10), nullable=False)
    birth_date = Column(Date, nullable=True)
    status = Column(String(50), nullable=False, default="Activo")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    tutor = relationship("Tutor", back_populates="pets")
    appointments = relationship(
        "Appointment", back_populates="pet", cascade="all, delete-orphan"
    )
    triage_records = relationship(
        "Triage", back_populates="pet", cascade="all, delete-orphan"
    )
    clinical_records = relationship(
        "ClinicalRecord", back_populates="pet", cascade="all, delete-orphan"
    )


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    branch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("branches.id", ondelete="RESTRICT"),
        nullable=False,
    )
    pet_id = Column(
        UUID(as_uuid=True), ForeignKey("pets.id", ondelete="RESTRICT"), nullable=False
    )
    veterinarian_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    appointment_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), nullable=False, default="Programada")
    reason_for_visit = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    pet = relationship("Pet", back_populates="appointments")
    triage = relationship(
        "Triage",
        back_populates="appointment",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Triage(Base):
    __tablename__ = "triage"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    appointment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("appointments.id", ondelete="SET NULL"),
        nullable=True,
    )
    pet_id = Column(
        UUID(as_uuid=True), ForeignKey("pets.id", ondelete="RESTRICT"), nullable=False
    )
    temperature = Column(Numeric(4, 2), nullable=True)
    heart_rate = Column(Integer, nullable=True)
    respiratory_rate = Column(Integer, nullable=True)
    weight = Column(Numeric(6, 3), nullable=False)
    triage_level = Column(String(50), nullable=False)
    reason = Column(String, nullable=False)
    created_by = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    pet = relationship("Pet", back_populates="triage_records")
    appointment = relationship("Appointment", back_populates="triage")


class ClinicalRecord(Base):
    __tablename__ = "clinical_records"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    pet_id = Column(
        UUID(as_uuid=True), ForeignKey("pets.id", ondelete="RESTRICT"), nullable=False
    )
    branch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("branches.id", ondelete="RESTRICT"),
        nullable=False,
    )
    veterinarian_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    triage_id = Column(
        UUID(as_uuid=True), ForeignKey("triage.id", ondelete="SET NULL"), nullable=True
    )
    anamnesis = Column(String, nullable=False)
    physical_examination = Column(String, nullable=False)
    diagnosis_id = Column(
        UUID(as_uuid=True),
        ForeignKey("diagnosis_catalog.id", ondelete="RESTRICT"),
        nullable=False,
    )
    diagnosis_notes = Column(String, nullable=True)
    treatment_plan = Column(String, nullable=True)
    status = Column(String(50), nullable=False, default="Abierto")
    consent_signed = Column(Boolean, nullable=False, default=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    pet = relationship("Pet", back_populates="clinical_records")
    diagnosis = relationship("DiagnosisCatalog", back_populates="clinical_records")
    prescriptions = relationship(
        "Prescription", back_populates="clinical_record", cascade="all, delete-orphan"
    )


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    clinical_record_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clinical_records.id", ondelete="RESTRICT"),
        nullable=False,
    )
    veterinarian_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    prescription_number = Column(String(50), nullable=False)
    is_controlled = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    clinical_record = relationship("ClinicalRecord", back_populates="prescriptions")
    items = relationship(
        "PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan"
    )


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    prescription_id = Column(
        UUID(as_uuid=True),
        ForeignKey("prescriptions.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    dosage = Column(String, nullable=False)
    quantity = Column(Numeric(8, 2), nullable=False)

    # Relationships
    prescription = relationship("Prescription", back_populates="items")


# --- INVENTORY & PHARMACY MODELS ---


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    sku = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    category = Column(String(50), nullable=False)
    is_controlled = Column(Boolean, nullable=False, default=False)
    requires_prescription = Column(Boolean, nullable=False, default=False)
    unit_of_measure = Column(String(50), nullable=False)
    minimum_stock = Column(Numeric(12, 4), nullable=False, default=10.0000)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    batches = relationship(
        "ProductBatch", back_populates="product", cascade="all, delete-orphan"
    )
    stocks = relationship(
        "InventoryStock", back_populates="product", cascade="all, delete-orphan"
    )
    transactions = relationship(
        "InventoryTransaction", back_populates="product", cascade="all, delete-orphan"
    )
    sale_items = relationship("SaleItem", back_populates="product")


class ProductBatch(Base):
    __tablename__ = "product_batches"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    batch_number = Column(String(100), nullable=False)
    expiration_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="batches")
    stocks = relationship(
        "InventoryStock", back_populates="batch", cascade="all, delete-orphan"
    )
    transactions = relationship(
        "InventoryTransaction", back_populates="batch", cascade="all, delete-orphan"
    )


class InventoryStock(Base):
    __tablename__ = "inventory_stocks"

    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    branch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("branches.id", ondelete="RESTRICT"),
        primary_key=True,
        nullable=False,
    )
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        primary_key=True,
        nullable=False,
    )
    batch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_batches.id", ondelete="RESTRICT"),
        primary_key=True,
        nullable=False,
    )
    quantity = Column(Numeric(12, 4), nullable=False, default=0.0000)

    # Relationships
    branch = relationship("Branch", back_populates="stocks")
    product = relationship("Product", back_populates="stocks")
    batch = relationship("ProductBatch", back_populates="stocks")


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    branch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("branches.id", ondelete="RESTRICT"),
        nullable=False,
    )
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    batch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_batches.id", ondelete="RESTRICT"),
        nullable=True,
    )
    quantity = Column(Numeric(12, 4), nullable=False)
    transaction_type = Column(String(50), nullable=False)
    reference_id = Column(UUID(as_uuid=True), nullable=True)
    notes = Column(String, nullable=True)
    created_by = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    branch = relationship("Branch", back_populates="transactions")
    product = relationship("Product", back_populates="transactions")
    batch = relationship("ProductBatch", back_populates="transactions")
    creator = relationship("User", back_populates="adjustments_made")


class InventoryTransfer(Base):
    __tablename__ = "inventory_transfers"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    source_branch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("branches.id", ondelete="RESTRICT"),
        nullable=False,
    )
    destination_branch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("branches.id", ondelete="RESTRICT"),
        nullable=False,
    )
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    batch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_batches.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity = Column(Numeric(12, 4), nullable=False)
    status = Column(String(50), nullable=False, default="En Transito")
    created_by = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    received_by = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    sent_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    received_at = Column(DateTime(timezone=True), nullable=True)


# --- NEW BILLING, CASH & SALES MODELS FOR ITERATION 5 ---


class Sale(Base):
    __tablename__ = "sales"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    branch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("branches.id", ondelete="RESTRICT"),
        nullable=False,
    )
    tutor_id = Column(
        UUID(as_uuid=True), ForeignKey("tutors.id", ondelete="RESTRICT"), nullable=False
    )
    cashier_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    total_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    status = Column(
        String(50), nullable=False, default="Pendiente"
    )  # Pendiente, Pagada, Anulada
    invoice_number = Column(String(100), nullable=True)
    invoice_status = Column(
        String(50), nullable=False, default="No Facturado"
    )  # No Facturado, Emitido, Error, Rechazado
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    branch = relationship("Branch", back_populates="sales")
    tutor = relationship("Tutor", back_populates="sales")
    cashier = relationship("User", back_populates="sales_registered")
    items = relationship(
        "SaleItem", back_populates="sale", cascade="all, delete-orphan"
    )
    payments = relationship(
        "Payment", back_populates="sale", cascade="all, delete-orphan"
    )


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    sale_id = Column(
        UUID(as_uuid=True), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False
    )
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)
    tax_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    sale_id = Column(
        UUID(as_uuid=True), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False
    )
    payment_method = Column(
        String(50), nullable=False
    )  # CASH, DEBIT_CARD, CREDIT_CARD, BANK_TRANSFER
    amount = Column(Numeric(12, 2), nullable=False)
    transaction_reference = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    sale = relationship("Sale", back_populates="payments")


class CashRegister(Base):
    __tablename__ = "cash_registers"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    branch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("branches.id", ondelete="RESTRICT"),
        nullable=False,
    )
    cashier_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    opened_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    opening_balance = Column(Numeric(12, 2), nullable=False, default=0.00)
    expected_balance = Column(Numeric(12, 2), nullable=False, default=0.00)
    actual_balance = Column(Numeric(12, 2), nullable=True)
    difference = Column(Numeric(12, 2), nullable=True)
    status = Column(
        String(50), nullable=False, default="Abierta"
    )  # Abierta, Cuadrada, Descuadrada
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    branch = relationship("Branch", back_populates="cash_registers")
    cashier = relationship("User", back_populates="registers_managed")
