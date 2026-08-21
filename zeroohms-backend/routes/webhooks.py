from fastapi import APIRouter
from pydantic import BaseModel

from services.webhook_service import send_webhook

router = APIRouter(prefix="/webhook", tags=["webhooks"])


class WebhookPayload(BaseModel):
    data: dict = {}


@router.post("/ticket-creado")
async def webhook_ticket_creado(body: WebhookPayload):
    await send_webhook("ticket-creado", body.data)
    return {"ok": True}


@router.post("/estado-cambiado")
async def webhook_estado_cambiado(body: WebhookPayload):
    await send_webhook("estado-cambiado", body.data)
    return {"ok": True}


@router.post("/presupuesto-listo")
async def webhook_presupuesto_listo(body: WebhookPayload):
    await send_webhook("presupuesto-listo", body.data)
    return {"ok": True}
