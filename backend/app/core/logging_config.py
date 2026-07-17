import json
import logging
import time
import uuid
from contextvars import ContextVar
from typing import Any, Dict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Context variables to store request-scoped data for logging propagation
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
tenant_id_ctx: ContextVar[str] = ContextVar("tenant_id", default="-")
user_id_ctx: ContextVar[str] = ContextVar("user_id", default="-")


class StructuredJsonFormatter(logging.Formatter):
    """
    Custom logging formatter that produces structured JSON output.
    Integrates request context variables (request_id, tenant_id, user_id)
    and strips sensitive data from logs (passwords, credentials).
    """

    def __init__(self, **kwargs):
        super().__init__()

    def format(self, record: logging.LogRecord) -> str:
        # Standard logging attributes
        log_data: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "filename": record.filename,
            "line_number": record.lineno,
            "request_id": request_id_ctx.get(),
            "tenant_id": tenant_id_ctx.get(),
            "user_id": user_id_ctx.get(),
        }

        # Handle exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Merge extra arguments if present, while sanitizing sensitive details
        if hasattr(record, "extra_data") and isinstance(record.extra_data, dict):
            sanitized_extra = self._sanitize_dict(record.extra_data)
            log_data.update(sanitized_extra)

        return json.dumps(log_data)

    def _sanitize_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitizes sensitive information such as passwords, tokens, and secrets from dict logs.
        """
        sensitive_keys = {
            "password",
            "token",
            "secret",
            "auth",
            "credentials",
            "credit_card",
        }
        sanitized = {}
        for k, v in data.items():
            if any(sk in k.lower() for sk in sensitive_keys):
                sanitized[k] = "[REDACTED_SENSITIVE_DATA]"
            elif isinstance(v, dict):
                sanitized[k] = self._sanitize_dict(v)
            else:
                sanitized[k] = v
        return sanitized


def setup_structured_logging():
    """
    Initializes the logging system to use StructuredJsonFormatter for output.
    """
    root_logger = logging.getLogger()
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredJsonFormatter())

    # Remove existing default handlers to avoid duplicate output
    for h in root_logger.handlers[:]:
        root_logger.removeHandler(h)

    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)

    # Silence third-party logs a bit for cleanliness
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware that captures request/response lifecycle, computes latency,
    records status, sets contextvars, and writes structured JSON logs.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()

        # Generate or capture request_id
        req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request_id_token = request_id_ctx.set(req_id)

        # Reset tenant and user contexts
        tenant_token = tenant_id_ctx.set("-")
        user_token = user_id_ctx.set("-")

        response: Response = None
        try:
            response = await call_next(request)
            return response
        finally:
            duration = time.perf_counter() - start_time
            status_code = response.status_code if response else 500

            # Log structured entry
            # Extract endpoint path
            endpoint = request.url.path
            method = request.method

            # Formulate audit metadata
            log_msg = (
                f"HTTP {method} {endpoint} returned {status_code} in {duration:.4f}s"
            )

            # Get logger
            logger = logging.getLogger("api_access")

            # Write structured JSON log with extra audit details
            extra_audit = {
                "endpoint": endpoint,
                "method": method,
                "duration": duration,
                "status_code": status_code,
                "client_ip": request.client.host if request.client else "unknown",
            }

            # Injecting extra fields by passing extra_data
            record = logger.makeRecord(
                name="api_access",
                level=logging.INFO,
                fn="",
                lno=0,
                msg=log_msg,
                args=(),
                exc_info=None,
            )
            record.extra_data = extra_audit
            logger.handle(record)

            # Reset context vars to clean the thread state
            request_id_ctx.reset(request_id_token)
            tenant_id_ctx.reset(tenant_token)
            user_id_ctx.reset(user_token)
