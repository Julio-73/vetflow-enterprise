import datetime
from typing import Any, List, Optional

from pydantic import UUID4, BaseModel, EmailStr, Field, model_validator


# --- DIAGNOSIS CATALOG ---
class DiagnosisCatalogBase(BaseModel):
    code: str
    name: str
    category: str
    description: Optional[str] = None
    is_active: bool = True


class DiagnosisCatalogResponse(DiagnosisCatalogBase):
    id: UUID4
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# --- TUTOR ---
class TutorBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: str
    tax_identifier: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True


class TutorCreate(TutorBase):
    pass


class TutorResponse(TutorBase):
    id: UUID4
    tenant_id: UUID4
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# --- PET ---
class PetBase(BaseModel):
    tutor_id: UUID4
    name: str
    species: str
    breed: Optional[str] = None
    gender: str = Field(..., description="Macho, Hembra, Desconocido")
    birth_date: Optional[datetime.date] = None
    status: str = "Activo"
    is_active: bool = True


class PetCreate(PetBase):
    pass


class PetResponse(PetBase):
    id: UUID4
    tenant_id: UUID4
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# --- APPOINTMENT ---
class AppointmentBase(BaseModel):
    branch_id: UUID4
    pet_id: UUID4
    veterinarian_id: UUID4
    appointment_date: datetime.datetime
    status: str = "Programada"
    reason_for_visit: str


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    branch_id: Optional[UUID4] = None
    veterinarian_id: Optional[UUID4] = None
    appointment_date: Optional[datetime.datetime] = None
    status: Optional[str] = None
    reason_for_visit: Optional[str] = None


class AppointmentResponse(AppointmentBase):
    id: UUID4
    tenant_id: UUID4
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# --- TRIAGE ---
class TriageBase(BaseModel):
    appointment_id: Optional[UUID4] = None
    pet_id: UUID4
    temperature: Optional[float] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    weight: float
    triage_level: str = Field(
        ..., description="Emergencia, Urgencia, Consulta Rotativa, Control"
    )
    reason: str


class TriageCreate(TriageBase):
    pass


class TriageResponse(TriageBase):
    id: UUID4
    tenant_id: UUID4
    created_by: UUID4
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- PRESCRIPTION ITEM ---
class PrescriptionItemBase(BaseModel):
    product_id: UUID4
    dosage: str
    quantity: float


class PrescriptionItemCreate(PrescriptionItemBase):
    pass


class PrescriptionItemResponse(PrescriptionItemBase):
    id: UUID4
    tenant_id: UUID4
    prescription_id: UUID4

    class Config:
        from_attributes = True


# --- PRESCRIPTION ---
class PrescriptionBase(BaseModel):
    clinical_record_id: UUID4
    prescription_number: str
    is_controlled: bool = False


class PrescriptionCreate(PrescriptionBase):
    items: List[PrescriptionItemCreate]


class PrescriptionResponse(PrescriptionBase):
    id: UUID4
    tenant_id: UUID4
    veterinarian_id: UUID4
    created_at: datetime.datetime
    items: List[PrescriptionItemResponse] = []

    class Config:
        from_attributes = True


# --- CLINICAL RECORD ---
class ClinicalRecordBase(BaseModel):
    pet_id: UUID4
    branch_id: UUID4
    triage_id: Optional[UUID4] = None
    anamnesis: str
    physical_examination: str
    diagnosis_id: UUID4
    diagnosis_notes: Optional[str] = None
    treatment_plan: Optional[str] = None
    consent_signed: bool = False


class ClinicalRecordCreate(ClinicalRecordBase):
    pass


class ClinicalRecordUpdate(BaseModel):
    anamnesis: Optional[str] = None
    physical_examination: Optional[str] = None
    diagnosis_id: Optional[UUID4] = None
    diagnosis_notes: Optional[str] = None
    treatment_plan: Optional[str] = None
    consent_signed: Optional[bool] = None


class ClinicalRecordSeal(BaseModel):
    status: str = Field("Cerrado", description="Sellar consulta (cambiar a Cerrado)")


class ClinicalRecordResponse(ClinicalRecordBase):
    id: UUID4
    tenant_id: UUID4
    veterinarian_id: UUID4
    status: str
    closed_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# --- INVENTORY & PHARMACY SCHEMAS ---


class ProductBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category: str = Field(
        ...,
        description="Medicamento, Medicamento Controlado, Insumo, Servicio, Alimento, Otros",
    )
    is_controlled: bool = False
    requires_prescription: bool = False
    unit_of_measure: str
    minimum_stock: float = 10.0000
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductResponse(ProductBase):
    id: UUID4
    tenant_id: UUID4
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class ProductBatchBase(BaseModel):
    product_id: UUID4
    batch_number: str
    expiration_date: datetime.date


class ProductBatchCreate(ProductBatchBase):
    pass


class ProductBatchResponse(ProductBatchBase):
    id: UUID4
    tenant_id: UUID4
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class InventoryStockResponse(BaseModel):
    branch_id: UUID4
    product_id: UUID4
    batch_id: UUID4
    quantity: float
    tenant_id: UUID4
    requires_reorder: bool = False

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def compute_requires_reorder(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            quantity = float(data.quantity)
            min_stock = (
                float(data.product.minimum_stock)
                if getattr(data, "product", None)
                else 10.0
            )
            return {
                "branch_id": data.branch_id,
                "product_id": data.product_id,
                "batch_id": data.batch_id,
                "quantity": quantity,
                "tenant_id": data.tenant_id,
                "requires_reorder": quantity <= min_stock,
            }
        else:
            quantity = float(data.get("quantity", 0.0))
            min_stock = float(data.get("minimum_stock", 10.0))
            data["requires_reorder"] = quantity <= min_stock
            return data


class InventoryTransactionBase(BaseModel):
    branch_id: UUID4
    product_id: UUID4
    batch_id: Optional[UUID4] = None
    quantity: float
    transaction_type: str = Field(
        ...,
        description="Compra, Consumo Clinico, Traslado Entrada, Traslado Salida, Ajuste Merma, Ajuste Faltante",
    )
    reference_id: Optional[UUID4] = None
    notes: Optional[str] = None


class InventoryTransactionCreate(InventoryTransactionBase):
    pass


class InventoryTransactionResponse(InventoryTransactionBase):
    id: UUID4
    tenant_id: UUID4
    created_by: UUID4
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- NEW BILLING, CASH & SALES SCHEMAS FOR ITERATION 5 ---


class CashRegisterOpen(BaseModel):
    branch_id: UUID4
    opening_balance: float = Field(..., ge=0.0)


class CashRegisterClose(BaseModel):
    actual_balance: float = Field(..., ge=0.0)


class CashRegisterResponse(BaseModel):
    id: UUID4
    tenant_id: UUID4
    branch_id: UUID4
    cashier_id: UUID4
    opened_at: datetime.datetime
    closed_at: Optional[datetime.datetime] = None
    opening_balance: float
    expected_balance: float
    actual_balance: Optional[float] = None
    difference: Optional[float] = None
    status: str

    class Config:
        from_attributes = True


class SaleItemCreate(BaseModel):
    product_id: UUID4
    quantity: float = Field(..., gt=0.0)
    unit_price: float = Field(..., ge=0.0)
    tax_amount: float = Field(default=0.0, ge=0.0)


class PaymentCreate(BaseModel):
    payment_method: str = Field(
        ..., description="CASH, DEBIT_CARD, CREDIT_CARD, BANK_TRANSFER"
    )
    amount: float = Field(..., gt=0.0)
    transaction_reference: Optional[str] = None


class SaleCreate(BaseModel):
    branch_id: UUID4
    tutor_id: UUID4
    items: List[SaleItemCreate]
    payments: List[PaymentCreate]


class SaleItemResponse(BaseModel):
    id: UUID4
    product_id: UUID4
    quantity: float
    unit_price: float
    subtotal: float
    tax_amount: float

    class Config:
        from_attributes = True


class PaymentResponse(BaseModel):
    id: UUID4
    payment_method: str
    amount: float
    transaction_reference: Optional[str] = None

    class Config:
        from_attributes = True


class SaleResponse(BaseModel):
    id: UUID4
    tenant_id: UUID4
    branch_id: UUID4
    tutor_id: UUID4
    cashier_id: UUID4
    total_amount: float
    status: str
    invoice_number: Optional[str] = None
    invoice_status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    items: List[SaleItemResponse]
    payments: List[PaymentResponse]

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    status: str
    country: str
    authority: str
    invoice_number: str
    fiscal_uuid: Optional[str] = None  # Mexican SAT UUID
    timbre: Optional[str] = None  # Mexican SAT stamp signature
    cufe: Optional[str] = None  # Colombian DIAN CUFE hash
    total: float
    stamp_date: str
    xml_representation: str
