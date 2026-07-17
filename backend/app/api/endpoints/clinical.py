import logging
import uuid
from typing import List

from app import models, schemas
from app.core.database import get_db
from app.core.security import UserContext, get_current_user
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

logger = logging.getLogger("clinical")
router = APIRouter()

# --- DIAGNOSIS CATALOG ---


@router.get("/diagnoses", response_model=List[schemas.DiagnosisCatalogResponse])
def list_diagnoses(
    current_user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Returns the global diagnosis catalog.
    Accessible to any authenticated user (enforced via database RLS select policy).
    """
    return (
        db.query(models.DiagnosisCatalog)
        .filter(models.DiagnosisCatalog.is_active)
        .all()
    )


# --- CLINICAL RECORDS (EMR) ---


@router.post(
    "/records",
    response_model=schemas.ClinicalRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
def open_clinical_record(
    record_in: schemas.ClinicalRecordCreate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Opens a new clinical consultation record (status starts as 'Abierto').
    Automatically links to the active tenant and the logged-in veterinarian.
    """
    # Verify pet exists and belongs to the tenant
    pet = db.query(models.Pet).filter(models.Pet.id == record_in.pet_id).first()
    if not pet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pet not found or access denied",
        )

    # Verify diagnosis code exists in catalog
    diag = (
        db.query(models.DiagnosisCatalog)
        .filter(models.DiagnosisCatalog.id == record_in.diagnosis_id)
        .first()
    )
    if not diag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected diagnosis catalog item not found",
        )

    try:
        record = models.ClinicalRecord(
            id=uuid.uuid4(),
            tenant_id=current_user.tenant_id,
            pet_id=record_in.pet_id,
            branch_id=record_in.branch_id,
            veterinarian_id=current_user.id,  # Logged in user is the attending vet
            triage_id=record_in.triage_id,
            anamnesis=record_in.anamnesis,
            physical_examination=record_in.physical_examination,
            diagnosis_id=record_in.diagnosis_id,
            diagnosis_notes=record_in.diagnosis_notes,
            treatment_plan=record_in.treatment_plan,
            status="Abierto",
            consent_signed=record_in.consent_signed,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    except DBAPIError as e:
        db.rollback()
        err_msg = str(e.orig).split("\n")[0] if e.orig else str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.put("/records/{record_id}", response_model=schemas.ClinicalRecordResponse)
def update_clinical_record(
    record_id: uuid.UUID,
    record_up: schemas.ClinicalRecordUpdate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates an open clinical record.
    If the record is already sealed ('Cerrado'), the database trigger BR-CL-001
    will block the edit. This controller captures that error and returns a 400.
    """
    record = (
        db.query(models.ClinicalRecord)
        .filter(models.ClinicalRecord.id == record_id)
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical record not found or access denied",
        )

    # Apply updates
    update_data = record_up.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)

    try:
        db.commit()
        db.refresh(record)
        return record
    except DBAPIError as e:
        db.rollback()
        err_msg = str(e.orig).split("\n")[0] if e.orig else str(e)
        # Catch trigger custom raise message
        if "BR-CL-001" in err_msg or "inmutable" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business Rule Violation (BR-CL-001): Sealed clinical records are immutable and cannot be updated.",
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.post("/records/{record_id}/seal", response_model=schemas.ClinicalRecordResponse)
def seal_clinical_record(
    record_id: uuid.UUID,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Seals a clinical consultation record (sets status to 'Cerrado').
    Triggers check_clinical_record_immutability, auto-populating closed_at.
    """
    record = (
        db.query(models.ClinicalRecord)
        .filter(models.ClinicalRecord.id == record_id)
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical record not found or access denied",
        )

    if record.status == "Cerrado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Clinical record is already sealed.",
        )

    record.status = "Cerrado"

    try:
        db.commit()
        db.refresh(record)
        return record
    except DBAPIError as e:
        db.rollback()
        err_msg = str(e.orig).split("\n")[0] if e.orig else str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.get("/records", response_model=List[schemas.ClinicalRecordResponse])
def list_clinical_records(
    current_user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Lists all clinical records belonging to the current tenant.
    Implicitly filtered by PostgreSQL RLS.
    """
    return db.query(models.ClinicalRecord).all()


# --- PRESCRIPTIONS ---


@router.post(
    "/prescriptions",
    response_model=schemas.PrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_prescription(
    prescription_in: schemas.PrescriptionCreate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Issues a medical prescription for a clinical record.
    The database trigger trg_validate_veterinarian_prescription checks:
    - The issuer must be a veterinarian or medical director.
    - If controlled = True, the veterinarian must have a professional license registered.
    """
    # Verify clinical record exists and is accessible
    record = (
        db.query(models.ClinicalRecord)
        .filter(models.ClinicalRecord.id == prescription_in.clinical_record_id)
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical record not found or access denied",
        )

    prescription_id = uuid.uuid4()

    try:
        prescription = models.Prescription(
            id=prescription_id,
            tenant_id=current_user.tenant_id,
            clinical_record_id=prescription_in.clinical_record_id,
            veterinarian_id=current_user.id,
            prescription_number=prescription_in.prescription_number,
            is_controlled=prescription_in.is_controlled,
        )
        db.add(prescription)

        # Add prescription items
        for item_in in prescription_in.items:
            item = models.PrescriptionItem(
                id=uuid.uuid4(),
                tenant_id=current_user.tenant_id,
                prescription_id=prescription_id,
                product_id=item_in.product_id,
                dosage=item_in.dosage,
                quantity=item_in.quantity,
            )
            db.add(item)

        db.commit()
        db.refresh(prescription)
        return prescription

    except DBAPIError as e:
        db.rollback()
        err_msg = str(e.orig).split("\n")[0] if e.orig else str(e)

        # Capture medical regulation trigger validation errors (BR-CL-002)
        if "BR-CL-002" in err_msg or "matrícula" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Regulation Violation (BR-CL-002): Controlled prescriptions require the prescribing veterinarian to have a registered professional license.",
            )
        if "facultativo" in err_msg.lower() or "recetar" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Security Restriction: Only veterinarians or clinical directors are authorized to issue medical prescriptions.",
            )

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.get("/prescriptions", response_model=List[schemas.PrescriptionResponse])
def list_prescriptions(
    current_user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Lists all prescriptions issued for the current tenant.
    Implicitly filtered by PostgreSQL RLS.
    """
    return db.query(models.Prescription).all()
