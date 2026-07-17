import uuid
from typing import List

from app import models, schemas
from app.core.database import get_db
from app.core.security import UserContext, get_current_user
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

router = APIRouter()


@router.post(
    "", response_model=schemas.AppointmentResponse, status_code=status.HTTP_201_CREATED
)
def create_appointment(
    appointment_in: schemas.AppointmentCreate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates a new veterinary appointment.
    Prevents veterinary double-booking via unique indexing overlap triggers in PostgreSQL.
    """
    # Verify pet exists and is accessible
    pet = db.query(models.Pet).filter(models.Pet.id == appointment_in.pet_id).first()
    if not pet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pet not found or access denied",
        )

    # Verify branch exists and is accessible
    branch = (
        db.query(models.Branch)
        .filter(models.Branch.id == appointment_in.branch_id)
        .first()
    )
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found or access denied",
        )

    try:
        appointment = models.Appointment(
            id=uuid.uuid4(),
            tenant_id=current_user.tenant_id,
            branch_id=appointment_in.branch_id,
            pet_id=appointment_in.pet_id,
            veterinarian_id=appointment_in.veterinarian_id,
            appointment_date=appointment_in.appointment_date,
            status=appointment_in.status,
            reason_for_visit=appointment_in.reason_for_visit,
        )
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        return appointment
    except DBAPIError as e:
        db.rollback()
        err_msg = str(e.orig).split("\n")[0] if e.orig else str(e)
        # Check if it was an overlap constraint violation
        if "uq_appointments_no_overlap" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Conflict: This veterinarian is already booked for this time block.",
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.get("", response_model=List[schemas.AppointmentResponse])
def list_appointments(
    current_user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Lists all appointments for the current tenant.
    Implicitly filtered by PostgreSQL RLS.
    """
    return db.query(models.Appointment).all()


@router.post(
    "/triage",
    response_model=schemas.TriageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_triage(
    triage_in: schemas.TriageCreate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Registers triage parameters for a patient.
    Checks that the patient belongs to the active tenant.
    """
    # Verify pet exists and is accessible
    pet = db.query(models.Pet).filter(models.Pet.id == triage_in.pet_id).first()
    if not pet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pet not found or access denied",
        )

    # Verify appointment matches (if provided)
    if triage_in.appointment_id:
        appt = (
            db.query(models.Appointment)
            .filter(models.Appointment.id == triage_in.appointment_id)
            .first()
        )
        if not appt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found or access denied",
            )

    try:
        triage = models.Triage(
            id=uuid.uuid4(),
            tenant_id=current_user.tenant_id,
            appointment_id=triage_in.appointment_id,
            pet_id=triage_in.pet_id,
            temperature=triage_in.temperature,
            heart_rate=triage_in.heart_rate,
            respiratory_rate=triage_in.respiratory_rate,
            weight=triage_in.weight,
            triage_level=triage_in.triage_level,
            reason=triage_in.reason,
            created_by=current_user.id,
        )
        db.add(triage)
        db.commit()
        db.refresh(triage)
        return triage
    except DBAPIError as e:
        db.rollback()
        err_msg = str(e.orig).split("\n")[0] if e.orig else str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.get("/triage", response_model=List[schemas.TriageResponse])
def list_triage(
    current_user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Lists all triage records for the current tenant.
    Implicitly filtered by PostgreSQL RLS.
    """
    return db.query(models.Triage).all()
