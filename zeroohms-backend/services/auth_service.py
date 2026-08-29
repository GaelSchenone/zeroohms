import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from config.settings import settings


def hash_password(password: str) -> str:
    # bcrypt directo: passlib 1.7.4 es incompatible con bcrypt >= 4.1
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_token(usuario: str, expiration_minutes: int | None = None) -> str:
    minutos = expiration_minutes if expiration_minutes is not None else settings.JWT_EXPIRATION_MINUTES
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutos)
    return jwt.encode(
        {"sub": usuario, "typ": "login", "exp": expire},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_upload_token(tkid: int, usuario: str, minutos: int = 15) -> tuple[str, datetime]:
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutos)
    token = jwt.encode(
        {
            "sub": usuario,
            "typ": "upload",
            "tkid": tkid,
            "jti": uuid.uuid4().hex,
            "exp": expire,
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    return token, expire


def verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except Exception:
        return None
