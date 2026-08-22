"""Generación de PDFs imprimibles: recibo de ingreso e informe técnico.

Sin dependencias de sistema (reportlab dibuja directo sobre el canvas),
pensado para imprimirse en A4 desde el navegador.
"""
import io
import textwrap
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, black, white
from reportlab.pdfgen import canvas

ACCENT = HexColor("#F0513B")
GRIS = HexColor("#555555")
GRIS_CLARO = HexColor("#999999")
LINEA = HexColor("#CCCCCC")

PAGE_W, PAGE_H = A4
MARGEN = 24


def _money(value) -> str:
    if value is None:
        return "—"
    entero = f"{float(value):,.0f}"
    return f"$ {entero.replace(',', '.')}"


def _fecha(value) -> str:
    if not value:
        return "—"
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value)
        except ValueError:
            return value
    return value.strftime("%d/%m/%Y %H:%M")


def _wrap(c, texto, x, y, max_chars, line_height, font="Helvetica", size=9):
    c.setFont(font, size)
    for linea in textwrap.wrap(texto or "—", max_chars) or ["—"]:
        c.drawString(x, y, linea)
        y -= line_height
    return y


def _talon(c, y0, alto, ticket, propietario, dispositivo, etiqueta_copia, es_cliente):
    x = MARGEN
    ancho_util = PAGE_W - 2 * MARGEN
    y = y0 + alto - 28

    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(x, y, "ZERO OHMS")
    c.setFillColor(black)

    c.setFont("Helvetica-Bold", 8)
    badge_w = 90
    c.setFillColor(HexColor("#111111"))
    c.rect(x + ancho_util - badge_w, y - 4, badge_w, 16, fill=1, stroke=0)
    c.setFillColor(white)
    c.drawCentredString(x + ancho_util - badge_w / 2, y, etiqueta_copia)
    c.setFillColor(black)

    y -= 20
    c.setFont("Helvetica", 10)
    c.setFillColor(GRIS)
    c.drawString(x, y, "Recibo de ingreso de equipo")
    c.setFillColor(black)

    y -= 10
    c.setStrokeColor(LINEA)
    c.line(x, y, x + ancho_util, y)
    y -= 22

    c.setFont("Helvetica-Bold", 16)
    c.drawString(x, y, f"Código: {ticket.get('codigoseguimiento') or '—'}")
    y -= 26

    c.setFont("Helvetica", 9)
    c.drawString(x, y, f"Ticket #{ticket.get('tkid')}    ·    Ingreso: {_fecha(ticket.get('fechacreacion'))}")
    y -= 20

    nombre = " ".join(filter(None, [propietario.get("nombre"), propietario.get("apellido")])) or "—"
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x, y, "Cliente")
    y -= 13
    c.setFont("Helvetica", 9)
    c.drawString(x, y, f"{nombre}    ·    DNI {propietario.get('dni') or '—'}    ·    Tel. {propietario.get('telefono') or '—'}")
    y -= 20

    equipo = " ".join(filter(None, [dispositivo.get("marca"), dispositivo.get("modelo")])) or "—"
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x, y, "Equipo")
    y -= 13
    c.setFont("Helvetica", 9)
    c.drawString(x, y, f"{equipo}    ·    N° de serie: {dispositivo.get('numeroserie') or '—'}")
    y -= 20

    c.setFont("Helvetica-Bold", 10)
    c.drawString(x, y, "Problema reportado")
    y -= 13
    y = _wrap(c, ticket.get("descripcionproblema"), x, y, 95, 12)
    y -= 8

    c.setStrokeColor(LINEA)
    c.line(x, y, x + ancho_util, y)
    y -= 16

    c.setFont("Helvetica", 8)
    c.setFillColor(GRIS_CLARO)
    if es_cliente:
        c.drawString(x, y, "Conservá este comprobante para retirar tu equipo. Podés seguir tu reparación en")
        y -= 11
        c.drawString(x, y, "zeroohms.com.ar/tracking con el código de arriba.")
    else:
        c.drawString(x, y, "Firma y aclaración del cliente:")
        c.line(x + 170, y - 2, x + ancho_util, y - 2)
    c.setFillColor(black)


def generar_recibo_ingreso(ticket: dict, propietario: dict, dispositivo: dict) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    mitad = PAGE_H / 2
    _talon(c, mitad, mitad, ticket, propietario, dispositivo, "COPIA CLIENTE", es_cliente=True)
    _talon(c, 0, mitad, ticket, propietario, dispositivo, "COPIA TALLER", es_cliente=False)

    c.setDash(3, 3)
    c.setStrokeColor(GRIS_CLARO)
    c.line(MARGEN, mitad, PAGE_W - MARGEN, mitad)
    c.setDash()

    c.setTitle(f"Recibo de ingreso — {ticket.get('codigoseguimiento') or ticket.get('tkid')}")
    c.showPage()
    c.save()
    return buf.getvalue()


def generar_informe_tecnico(ticket: dict, propietario: dict, dispositivo: dict, ejecuciones: list, presupuestos: list) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    x = MARGEN
    ancho_util = PAGE_W - 2 * MARGEN
    y = PAGE_H - MARGEN - 20

    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x, y, "ZERO OHMS")
    c.setFillColor(black)
    y -= 20
    c.setFont("Helvetica", 11)
    c.setFillColor(GRIS)
    c.drawString(x, y, "Informe técnico y presupuesto")
    c.setFillColor(black)
    y -= 8
    c.setStrokeColor(LINEA)
    c.line(x, y, x + ancho_util, y)
    y -= 22

    c.setFont("Helvetica-Bold", 13)
    c.drawString(x, y, f"Ticket #{ticket.get('tkid')} · {ticket.get('codigoseguimiento') or '—'}")
    y -= 16
    c.setFont("Helvetica", 9)
    c.drawString(x, y, f"Ingreso: {_fecha(ticket.get('fechacreacion'))}")
    y -= 20

    nombre = " ".join(filter(None, [propietario.get("nombre"), propietario.get("apellido")])) or "—"
    equipo = " ".join(filter(None, [dispositivo.get("marca"), dispositivo.get("modelo")])) or "—"
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x, y, "Cliente")
    c.drawString(x + 280, y, "Equipo")
    y -= 13
    c.setFont("Helvetica", 9)
    c.drawString(x, y, f"{nombre}")
    c.drawString(x + 280, y, equipo)
    y -= 12
    c.drawString(x, y, f"DNI {propietario.get('dni') or '—'} · Tel. {propietario.get('telefono') or '—'}")
    c.drawString(x + 280, y, f"N° de serie: {dispositivo.get('numeroserie') or '—'}")
    y -= 18

    c.setFont("Helvetica-Bold", 10)
    c.drawString(x, y, "Problema reportado")
    y -= 13
    y = _wrap(c, ticket.get("descripcionproblema"), x, y, 100, 12)
    y -= 14

    c.setFont("Helvetica-Bold", 12)
    c.drawString(x, y, "Diagnóstico realizado")
    y -= 6
    c.setStrokeColor(LINEA)
    c.line(x, y, x + ancho_util, y)
    y -= 16

    if not ejecuciones:
        c.setFont("Helvetica-Oblique", 9)
        c.setFillColor(GRIS_CLARO)
        c.drawString(x, y, "No se registraron checklists de diagnóstico para este ticket.")
        c.setFillColor(black)
        y -= 18
    else:
        for ej in ejecuciones:
            c.setFont("Helvetica-Bold", 10)
            c.drawString(x, y, ej.get("checklist_nombre") or "Checklist")
            c.setFont("Helvetica", 8)
            c.setFillColor(GRIS_CLARO)
            c.drawRightString(x + ancho_util, y, f"{ej.get('usuario') or ''} · {_fecha(ej.get('fechacreacion'))}")
            c.setFillColor(black)
            y -= 14
            for r in ej.get("respuestas", []):
                c.setFont("Helvetica", 9)
                linea = f"• {r.get('pregunta_texto') or ''}: {r.get('respuesta_texto') or '—'}"
                c.drawString(x + 6, y, linea)
                y -= 12
                if r.get("observacion"):
                    c.setFont("Helvetica-Oblique", 8)
                    c.setFillColor(GRIS)
                    y = _wrap(c, f"  {r['observacion']}", x + 12, y, 105, 10, font="Helvetica-Oblique", size=8)
                    c.setFillColor(black)
            y -= 10

    y -= 6
    c.setFont("Helvetica-Bold", 12)
    c.drawString(x, y, "Presupuesto")
    y -= 6
    c.setStrokeColor(LINEA)
    c.line(x, y, x + ancho_util, y)
    y -= 16

    if not presupuestos:
        c.setFont("Helvetica-Oblique", 9)
        c.setFillColor(GRIS_CLARO)
        c.drawString(x, y, "Todavía no se generó un presupuesto para este ticket.")
        c.setFillColor(black)
        y -= 18
    else:
        for p in presupuestos:
            c.setFont("Helvetica-Bold", 11)
            c.setFillColor(ACCENT)
            c.drawString(x, y, _money(p.get("monto")))
            c.setFillColor(black)
            c.setFont("Helvetica", 9)
            estado = (p.get("estado_actual") or "borrador").replace("_", " ")
            c.drawString(x + 90, y, f"Estado: {estado}    ·    Creado: {_fecha(p.get('fechacreacion'))}")
            y -= 14
            if p.get("fechavalidez"):
                c.setFont("Helvetica", 8)
                c.setFillColor(GRIS_CLARO)
                c.drawString(x, y, f"Válido hasta: {_fecha(p['fechavalidez'])}")
                c.setFillColor(black)
                y -= 14
            y -= 6

    c.setFont("Helvetica", 7)
    c.setFillColor(GRIS_CLARO)
    c.drawString(x, MARGEN, f"Generado por Zero Ohms el {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    c.setFillColor(black)

    c.setTitle(f"Informe técnico — {ticket.get('codigoseguimiento') or ticket.get('tkid')}")
    c.showPage()
    c.save()
    return buf.getvalue()
