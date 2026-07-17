from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore"
    )

    PORT: int = 3000
    APP_ENV: str = "development"
    CLIENT_URL: str = "http://localhost:5173"

    # Database Connection (PostgreSQL / Supabase)
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/postgres"
    DIRECT_DATABASE_URL: Optional[str] = None

    # Supabase API Credentials
    SUPABASE_URL: str = "https://example.supabase.co"
    SUPABASE_ANON_KEY: str = "mock-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: str = "mock-service-role-key"

    # Authentication & Security
    JWT_SECRET: str = "your_jwt_signing_secret_min_32_characters_here_12345"
    JWT_EXPIRES_IN: str = "1d"

    # Integration Webhooks
    WHATSAPP_VERIFY_TOKEN: Optional[str] = None
    WHATSAPP_API_TOKEN: Optional[str] = None
    MERCADOPAGO_ACCESS_TOKEN: Optional[str] = None
    KUSHKI_PRIVATE_KEY: Optional[str] = None


settings = Settings()
