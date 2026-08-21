import random
import string

import httpx

from config.settings import settings


def generate_tracking_code() -> str:
    number = random.randint(1000, 9999)
    return f"ZO-{number}"


async def send_webhook(event: str, payload: dict) -> bool:
    if not settings.N8N_WEBHOOK_URL:
        return False

    url = f"{settings.N8N_WEBHOOK_URL}/{event}"
    headers = {}
    if settings.N8N_WEBHOOK_SECRET:
        headers["Authorization"] = f"Bearer {settings.N8N_WEBHOOK_SECRET}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload, headers=headers)
            return resp.status_code < 400
    except Exception:
        return False
