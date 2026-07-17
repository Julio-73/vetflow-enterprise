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
    "/tutors", response_model=schemas.TutorResponse, status_code=status.HTTP_201_CREATED
)
def create_tutor(
    tutor_in: schemas.TutorCreate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Registers a new pet tutor.
    Automatically assigns the tutor to the current tenant.
    """
    try:
        tutor = models.Tutor(
            id=uuid.uuid4(),
            tenant_id=current_user.tenant_id,
            first_name=tutor_in.first_name,
            last_name=tutor_in.last_name,
            email=tutor_in.email,
            phone=tutor_in.phone,
            tax_identifier=tutor_in.tax_identifier,
            address=tutor_in.address,
            is_active=tutor_in.is_active,
        )
        db.add(tutor)
        db.commit()
        db.refresh(tutor)
        return tutor
    except DBAPIError as e:
        db.rollback()
        err_msg = str(e.orig).split("\n")[0] if e.orig else str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.get("/tutors", response_model=List[schemas.TutorResponse])
def list_tutors(
    current_user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Lists all tutors belonging to the current tenant.
    Implicitly filtered by PostgreSQL RLS.
    """
    return db.query(models.Tutor).all()


@router.post(
    "/pets", response_model=schemas.PetResponse, status_code=status.HTTP_201_CREATED
)
def create_pet(
    pet_in: schemas.PetCreate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Registers a new pet associated with a tutor.
    Validates that the tutor belongs to the current tenant boundaries (guaranteed by RLS).
    """
    # Verify tutor exists and is accessible to this tenant
    tutor = db.query(models.Tutor).filter(models.Tutor.id == pet_in.tutor_id).first()
    if not tutor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor not found or access denied (cross-tenant boundary)",
        )

    try:
        pet = models.Pet(
            id=uuid.uuid4(),
            tenant_id=current_user.tenant_id,
            tutor_id=pet_in.tutor_id,
            name=pet_in.name,
            species=pet_in.species,
            breed=pet_in.breed,
            gender=pet_in.gender,
            birth_date=pet_in.birth_date,
            status=pet_in.status,
            is_active=pet_in.is_active,
        )
        db.add(pet)
        db.commit()
        db.refresh(pet)
        return pet
    except DBAPIError as e:
        db.rollback()
        err_msg = str(e.orig).split("\n")[0] if e.orig else str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.get("/pets", response_model=List[schemas.PetResponse])
def list_pets(
    current_user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Lists all pets belonging to the current tenant.
    Implicitly filtered by PostgreSQL RLS.
    """
    return db.query(models.Pet).all()
