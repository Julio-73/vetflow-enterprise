from typing import Generator

from app.core.config import settings
from app.core.security import UserContext, get_current_user
from fastapi import Depends
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker


# ============================================================
# SQLAlchemy Database Engine
# PostgreSQL + psycopg3 (Supabase)
# ============================================================

database_url = settings.DATABASE_URL

# Force psycopg3 driver when using PostgreSQL URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1
    )

engine = create_engine(
    database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)


# ============================================================
# Database Session
# ============================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ============================================================
# ORM Base
# ============================================================

Base = declarative_base()


# ============================================================
# FastAPI Database Dependency
# Multi-tenant RLS Context
# ============================================================

def get_db(
    current_user: UserContext = Depends(get_current_user),
) -> Generator:

    db = SessionLocal()

    try:
        # Activate tenant isolation in PostgreSQL RLS
        db.execute(
            text(
                "SET LOCAL app.current_tenant_id = :tenant_id"
            ),
            {
                "tenant_id": str(current_user.tenant_id)
            },
        )

        yield db

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

        