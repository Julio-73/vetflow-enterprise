from typing import Generator

from app.core.config import settings
from app.core.security import UserContext, get_current_user
from fastapi import Depends
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Establish SQLAlchemy database engine
# pool_pre_ping=True ensures stale connections are recycled gracefully
engine = create_engine(
    settings.DATABASE_URL, pool_size=10, max_overflow=20, pool_pre_ping=True
)

# Create SessionLocal session builder
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative Base for ORM models
Base = declarative_base()


def get_db(current_user: UserContext = Depends(get_current_user)) -> Generator:
    """
    FastAPI dependency injection to yield a scoped database session.
    Injects the tenant_id from the authenticated user directly into the database session context
    by executing SET LOCAL app.current_tenant_id = :tenant_id inside the current transaction block.
    This guarantees that PostgreSQL Row Level Security (RLS) policies are active for all queries in the request.
    """
    db = SessionLocal()
    try:
        # Execute SET LOCAL within the implicit transaction block started by SQLAlchemy.
        # This configures the transaction-scoped variable for RLS policies.
        db.execute(
            text("SET LOCAL app.current_tenant_id = :tenant_id"),
            {"tenant_id": str(current_user.tenant_id)},
        )
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
