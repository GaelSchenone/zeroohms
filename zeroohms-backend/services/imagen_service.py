import io

from PIL import Image, ImageOps, UnidentifiedImageError

TAMANO_FULL = 2560
TAMANO_THUMB = 400
CALIDAD_JPEG = 85


class ImagenInvalidaError(Exception):
    pass


def _preparar(datos: bytes) -> Image.Image:
    try:
        img = Image.open(io.BytesIO(datos))
        img.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise ImagenInvalidaError("El archivo no es una imagen válida") from exc

    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img


def _redimensionar(img: Image.Image, lado_max: int) -> Image.Image:
    ancho, alto = img.size
    if max(ancho, alto) <= lado_max:
        return img
    escala = lado_max / max(ancho, alto)
    nuevo_tamano = (round(ancho * escala), round(alto * escala))
    return img.resize(nuevo_tamano, Image.LANCZOS)


def _a_jpeg(img: Image.Image) -> bytes:
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=CALIDAD_JPEG, optimize=True)
    return buffer.getvalue()


def normalizar_imagen(datos: bytes) -> tuple[bytes, bytes]:
    """Valida, auto-rota, quita EXIF (incluye GPS) y devuelve (jpeg_full, jpeg_thumb)."""
    img = _preparar(datos)
    full = _a_jpeg(_redimensionar(img, TAMANO_FULL))
    thumb = _a_jpeg(_redimensionar(img, TAMANO_THUMB))
    return full, thumb
