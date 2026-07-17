import logging

from app.api.endpoints.appointments import router as appointments_router
from app.api.endpoints.billing import router as billing_router
from app.api.endpoints.clinical import router as clinical_router
from app.api.endpoints.inventory import router as inventory_router
from app.api.endpoints.patients import router as patients_router
from app.api.endpoints.tenants import router as tenants_router
from app.core.config import settings
from app.core.logging_config import (
    StructuredLoggingMiddleware,
    setup_structured_logging,
)
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Initialize structured JSON logging
setup_structured_logging()
logger = logging.getLogger("main")

app = FastAPI(
    title="VetFlow SaaS API",
    description="FastAPI service for VetFlow SaaS featuring Supabase authentication and PostgreSQL RLS tenant context injection.",
    version="1.0.0",
)

# CORS Configuration
origins = [
    settings.CLIENT_URL,
    "http://localhost:3000",
    "http://localhost:5173",  # Default Vite frontend port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(StructuredLoggingMiddleware)


# Global Exception Handler to capture unhandled backend errors cleanly
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Unhandled exception during {request.method} {request.url.path}: {exc}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. The support team has been notified."
        },
    )


# Include API endpoints
app.include_router(
    tenants_router, prefix="/api/v1/tenants", tags=["Tenants & Isolation"]
)

app.include_router(
    patients_router, prefix="/api/v1/patients", tags=["Patients & Tutors"]
)

app.include_router(
    appointments_router, prefix="/api/v1/appointments", tags=["Appointments & Triage"]
)

app.include_router(
    clinical_router, prefix="/api/v1/clinical", tags=["Clinical EMR & Prescriptions"]
)

app.include_router(
    inventory_router, prefix="/api/v1/inventory", tags=["Inventory & Pharmacy"]
)

app.include_router(billing_router, prefix="/api/v1/billing", tags=["Billing & Cash"])


@app.get("/healthz", status_code=status.HTTP_200_OK, tags=["Health"])
def health_check():
    """
    Liveness and readiness check.
    """
    return {"status": "healthy", "environment": settings.APP_ENV}
