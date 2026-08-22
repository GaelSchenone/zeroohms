import io
import logging

from minio import Minio
from minio.error import S3Error

from config.settings import settings

_client: Minio | None = None
_bucket_asegurado = False


def _get_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL,
        )
    return _client


def _asegurar_bucket() -> None:
    global _bucket_asegurado
    if _bucket_asegurado:
        return
    client = _get_client()
    if not client.bucket_exists(settings.MINIO_BUCKET):
        client.make_bucket(settings.MINIO_BUCKET)
    _bucket_asegurado = True


def subir_objeto(key: str, datos: bytes, content_type: str) -> None:
    _asegurar_bucket()
    client = _get_client()
    client.put_object(
        settings.MINIO_BUCKET,
        key,
        io.BytesIO(datos),
        length=len(datos),
        content_type=content_type,
    )


def traer_objeto(key: str) -> tuple[bytes, str]:
    client = _get_client()
    response = client.get_object(settings.MINIO_BUCKET, key)
    try:
        datos = response.read()
        content_type = response.headers.get("Content-Type", "application/octet-stream")
    finally:
        response.close()
        response.release_conn()
    return datos, content_type


def thumb_key(key: str) -> str:
    carpeta, _, archivo = key.rpartition("/")
    if "." in archivo:
        base, ext = archivo.rsplit(".", 1)
        archivo = f"{base}_thumb.{ext}"
    else:
        archivo = f"{archivo}_thumb"
    return f"{carpeta}/{archivo}" if carpeta else archivo


def borrar_objeto(key: str) -> None:
    try:
        client = _get_client()
        client.remove_object(settings.MINIO_BUCKET, key)
    except S3Error:
        logging.exception("No se pudo borrar el objeto %s de MinIO", key)
