from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440
    JWT_REMEMBER_EXPIRATION_MINUTES: int = 60 * 24 * 180

    OTP_EXPIRATION_MINUTES: int = 10

    CORS_ORIGIN: str

    N8N_WEBHOOK_URL: str = ""
    N8N_WEBHOOK_SECRET: str = ""

    MINIO_ENDPOINT: str = ""
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_BUCKET: str = ""
    MINIO_USE_SSL: bool = False

    GOOGLE_SERVICE_ACCOUNT_EMAIL: str = ""
    GOOGLE_PRIVATE_KEY: str = ""
    GOOGLE_CALENDAR_ID: str = ""

    GOOGLE_OAUTH_CLIENT_ID: str = ""
    GOOGLE_OAUTH_CLIENT_SECRET: str = ""
    GOOGLE_OAUTH_REDIRECT_URI: str = ""
    ADMIN_FRONTEND_URL: str = ""

    RESEND_API_KEY: str = ""
    RESEND_FROM: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
