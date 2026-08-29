import httpx

from config.settings import settings

RESEND_URL = "https://api.resend.com/emails"

BANNER_URL = "https://zeroohms.com.ar/email/banner-fondo.jpg?v=2"
LOGO_URL = "https://zeroohms.com.ar/email/logo.png?v=2"


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
    return (
        '<div style="display:none;max-height:0;overflow:hidden;">Tu código de acceso al panel de Zero Ohms.</div>'
        "<style>@import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;600;700;800&display=swap');</style>"
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background-color:#050505;background-image:url(\'{BANNER_URL}\');background-repeat:repeat;">'
        '<tr><td align="center" style="padding:32px 16px;'
        f'background-image:url(\'{BANNER_URL}\');background-repeat:repeat;">'
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" '
        'style="max-width:600px;width:100%;background-color:#0a0a0a;border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden;">'
        '<tr><td align="center" style="padding:28px 32px 0;">'
        f'<img src="{LOGO_URL}" width="130" alt="Zero Ohms" style="display:block;border:0;" /></td></tr>'
        '<tr><td style="padding:24px 32px 0;">'
        '<p style="margin:0;font-family:\'Inter\',Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.05em;'
        'text-transform:uppercase;color:#F0513B;font-weight:bold;">Código de acceso</p>'
        '<h1 style="margin:8px 0 0;font-family:\'Anton\',\'Arial Black\',Arial,sans-serif;font-weight:400;'
        'font-size:28px;line-height:1.2;color:#ffffff;letter-spacing:0.01em;">Tu código para ingresar al panel</h1>'
        '</td></tr>'
        '<tr><td style="padding:8px 32px 0;">'
        '<p style="margin:0;font-family:\'Inter\',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;'
        'color:rgba(255,255,255,0.75);">Usá este código para completar el inicio de sesión en el panel de administración.</p>'
        '</td></tr>'
        '<tr><td style="padding:20px 32px 0;">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="background-color:#1c100e;border:1px solid rgba(240,81,59,0.4);border-radius:6px;">'
        '<tr><td align="center" style="padding:20px;font-family:\'Anton\',\'Arial Black\',Arial,sans-serif;'
        f'font-weight:400;font-size:36px;letter-spacing:0.25em;color:#ffffff;">{codigo}</td></tr>'
        '</table></td></tr>'
        '<tr><td style="padding:16px 32px 0;">'
        '<p style="margin:0;font-family:\'Inter\',Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;'
        f'color:rgba(255,255,255,0.45);text-align:center;">Vence en {minutos_vencimiento} minutos. Si no fuiste vos, ignorá este mail.</p>'
        '</td></tr>'
        '<tr><td style="padding:24px 32px 32px;">'
        '<p style="margin:0;font-family:\'Inter\',Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;'
        'color:rgba(255,255,255,0.35);text-align:center;">Zero Ohms · Servicio técnico especializado</p>'
        '</td></tr></table></td></tr></table>'
    )
