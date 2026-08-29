import httpx

from config.settings import settings

RESEND_URL = "https://api.resend.com/emails"

BANNER_URL = "https://zeroohms.com.ar/email/banner-fondo.jpg"
LOGO_URL = "https://zeroohms.com.ar/email/logo.png"


async def enviar_email(destinatario: str, asunto: str, html: str) -> bool:
    if not settings.RESEND_API_KEY or not settings.RESEND_FROM:
        return False

    headers = {"Authorization": f"Bearer {settings.RESEND_API_KEY}"}
    payload = {
        "from": settings.RESEND_FROM,
        "to": [destinatario],
        "subject": asunto,
        "html": html,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(RESEND_URL, json=payload, headers=headers)
            return resp.status_code < 400
    except Exception:
        return False


def codigo_login_html(codigo: str, minutos_vencimiento: int) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 24px 0;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden;">
        <img src="{BANNER_URL}" alt="Zero Ohms" style="width: 100%; display: block;" />
        <div style="padding: 32px 24px; text-align: center;">
          <img src="{LOGO_URL}" alt="Zero Ohms" style="height: 48px; margin-bottom: 16px;" />
          <p style="font-size: 15px; color: #333;">Tu código para iniciar sesión en el panel de Zero Ohms es:</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111; margin: 16px 0;">{codigo}</p>
          <p style="font-size: 13px; color: #888;">Vence en {minutos_vencimiento} minutos. Si no fuiste vos, ignorá este mail.</p>
        </div>
      </div>
    </div>
    """
