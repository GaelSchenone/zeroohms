"""Generación de PDFs imprimibles: recibo de ingreso e informe técnico.

Sin dependencias de sistema (reportlab dibuja directo sobre el canvas),
pensado para imprimirse en A4 desde el navegador.
"""
import io
import os
import textwrap
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, black, white
from reportlab.pdfgen import canvas
from reportlab.graphics import renderPDF
from svglib.svglib import svg2rlg

ACCENT = HexColor("#F0513B")
GRIS = HexColor("#555555")
GRIS_CLARO = HexColor("#999999")
LINEA = HexColor("#CCCCCC")
GRIS_CELDA = HexColor("#EFEFEF")

PAGE_W, PAGE_H = A4
MARGEN = 24

_LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "logo_mono.svg")
_logo_drawing = None


def _logo():
    global _logo_drawing
    if _logo_drawing is None:
        _logo_drawing = svg2rlg(_LOGO_PATH)
    return _logo_drawing


def _dibujar_logo(c, x, y_top, alto) -> float:
    """Dibuja el isotipo con la altura dada, alineado arriba-izquierda en (x, y_top). Devuelve el ancho ocupado."""
    logo = _logo()
    escala = alto / logo.height
    ancho = logo.width * escala
    c.saveState()
    c.translate(x, y_top - alto)
    c.scale(escala, escala)
    renderPDF.draw(logo, c, 0, 0)
    c.restoreState()
    return ancho


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


def _cant(value) -> str:
    v = float(value)
    if v == int(v):
        return str(int(v))
    return f"{v:.2f}".rstrip("0").rstrip(".")


def _bloque_lista(c, x, y, ancho, etiqueta, lineas, alto_por_linea=11):
    """Caja con franja de etiqueta arriba y una lista de líneas abajo.
    Cada línea es (texto, valor_derecha_o_None, negrita, italica)."""
    n = max(len(lineas), 1)
    alto = 11 + 4 + n * alto_por_linea + 3

    c.setStrokeColor(black)
    c.setLineWidth(0.6)
    c.rect(x, y - alto, ancho, alto, stroke=1, fill=0)

    c.setFillColor(GRIS_CELDA)
    c.rect(x, y - 11, ancho, 11, stroke=0, fill=1)
    c.setStrokeColor(black)
    c.line(x, y - 11, x + ancho, y - 11)

    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 6.2)
    c.drawString(x + 5, y - 8, etiqueta.upper())

    cy = y - 11 - alto_por_linea + 3
    for texto, derecha, negrita, italica in lineas:
        if italica:
            c.setFont("Helvetica-Oblique", 8.5)
            c.setFillColor(GRIS_CLARO)
        else:
            c.setFont("Helvetica-Bold" if negrita else "Helvetica", 8.5)
        c.drawString(x + 5, cy, texto)
        if derecha:
            c.drawRightString(x + ancho - 5, cy, derecha)
        c.setFillColor(black)
        cy -= alto_por_linea

    return y - alto


def _altura_bloque_lista(n_lineas, alto_por_linea=11) -> float:
    n = max(n_lineas, 1)
    return 11 + 4 + n * alto_por_linea + 3


def _fila_grid(c, x, y, ancho, alto_fila, celdas):
    """Dibuja una fila de celdas tipo formulario: borde, franja de etiqueta gris arriba y valor abajo.
    celdas: lista de (etiqueta, valor, fraccion_de_ancho)."""
    cx = x
    for etiqueta, valor, frac in celdas:
        w = ancho * frac
        c.setStrokeColor(black)
        c.setLineWidth(0.6)
        c.rect(cx, y - alto_fila, w, alto_fila, stroke=1, fill=0)

        c.setFillColor(GRIS_CELDA)
        c.rect(cx, y - 11, w, 11, stroke=0, fill=1)
        c.setStrokeColor(black)
        c.line(cx, y - 11, cx + w, y - 11)

        c.setFillColor(black)
        c.setFont("Helvetica-Bold", 6.2)
        c.drawString(cx + 5, y - 8, etiqueta.upper())
        c.setFont("Helvetica", 9.5)
        c.drawString(cx + 5, y - alto_fila + 7, str(valor) if valor not in (None, "") else "—")
        cx += w
    return y - alto_fila


def _talon(c, y0, alto, ticket, propietario, dispositivo, etiqueta_copia, es_cliente, accesorios=None, items_presupuesto=None, monto_presupuesto=0):
    x = MARGEN
    ancho_util = PAGE_W - 2 * MARGEN
    y = y0 + alto - 22

    logo_alto = 22
    ancho_logo = _dibujar_logo(c, x, y + 4, logo_alto)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(x + ancho_logo + 8, y - 3, "ZERO OHMS")
    c.setFont("Helvetica", 6.5)
    c.setFillColor(GRIS)
    c.drawString(x + ancho_logo + 8, y - 12, "SERVICIO TÉCNICO DE REPARACIÓN")
    c.setFillColor(black)

    badge_w = 92
    c.setFillColor(black)
    c.rect(x + ancho_util - badge_w, y - 12, badge_w, 15, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawCentredString(x + ancho_util - badge_w / 2, y - 8, etiqueta_copia)
    c.setFillColor(black)

    y -= 26
    c.setLineWidth(1.2)
    c.setStrokeColor(black)
    c.line(x, y, x + ancho_util, y)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x, y - 10, "RECIBO DE INGRESO DE EQUIPO")
    c.setLineWidth(0.6)
    y -= 16

    marco_top = y

    # Callout del código de seguimiento: la referencia con la que el cliente sigue su reparación.
    alto_codigo = 30
    c.rect(x, y - alto_codigo, ancho_util, alto_codigo, stroke=1, fill=0)
    c.setFillColor(GRIS_CELDA)
    c.rect(x, y - 11, ancho_util, 11, stroke=0, fill=1)
    c.setStrokeColor(black)
    c.line(x, y - 11, x + ancho_util, y - 11)
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 6.2)
    c.drawString(x + 6, y - 8, "CÓDIGO DE SEGUIMIENTO")
    c.setFont("Courier-Bold", 15)
    c.drawString(x + 6, y - alto_codigo + 8, ticket.get("codigoseguimiento") or "—")
    y -= alto_codigo

    nombre = " ".join(filter(None, [propietario.get("nombre"), propietario.get("apellido")])) or "—"
    equipo = " ".join(filter(None, [dispositivo.get("marca"), dispositivo.get("modelo")])) or "—"

    y = _fila_grid(c, x, y, ancho_util, 26, [
        ("N° de ticket", f"#{ticket.get('tkid')}", 0.35),
        ("Fecha de ingreso", _fecha(ticket.get("fechacreacion")), 0.65),
    ])
    y = _fila_grid(c, x, y, ancho_util, 26, [("Cliente", nombre, 1.0)])
    y = _fila_grid(c, x, y, ancho_util, 26, [
        ("DNI", propietario.get("dni"), 0.45),
        ("Teléfono", propietario.get("telefono"), 0.55),
    ])
    y = _fila_grid(c, x, y, ancho_util, 26, [("Equipo", equipo, 1.0)])
    y = _fila_grid(c, x, y, ancho_util, 26, [("N° de serie", dispositivo.get("numeroserie"), 1.0)])

    alto_problema = 46
    c.rect(x, y - alto_problema, ancho_util, alto_problema, stroke=1, fill=0)
    c.setFillColor(GRIS_CELDA)
    c.rect(x, y - 11, ancho_util, 11, stroke=0, fill=1)
    c.setStrokeColor(black)
    c.line(x, y - 11, x + ancho_util, y - 11)
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 6.2)
    c.drawString(x + 6, y - 8, "PROBLEMA REPORTADO")
    _wrap(c, ticket.get("descripcionproblema"), x + 6, y - 21, 100, 10, size=8.5)
    y -= alto_problema

    if accesorios:
        y = _bloque_lista(c, x, y, ancho_util, "Accesorios entregados", [(", ".join(accesorios), None, False, False)])

    if items_presupuesto:
        lineas = [
            (
                f"{it['descripcion']} ({_cant(it['cantidad'])} x {_money(it['preciounitario'])})",
                _money(float(it["cantidad"]) * float(it["preciounitario"])),
                False,
                False,
            )
            for it in items_presupuesto
        ]
        lineas.append(("TOTAL", _money(monto_presupuesto), True, False))
        y = _bloque_lista(c, x, y, ancho_util, "Presupuesto", lineas)
    else:
        y = _bloque_lista(c, x, y, ancho_util, "Presupuesto", [("Pendiente de diagnóstico", None, False, True)])

    # Marco exterior que enmarca toda la grilla, como un comprobante.
    c.setLineWidth(1.1)
    c.rect(x, y, ancho_util, marco_top - y, stroke=1, fill=0)
    c.setLineWidth(0.6)

    y -= 13
    c.setFont("Helvetica", 7.5)
    c.setFillColor(GRIS)
    if es_cliente:
        c.drawString(x, y, "Conservá este comprobante para retirar tu equipo. Podés seguir tu reparación en")
        y -= 10
        c.drawString(x, y, "zeroohms.com.ar/tracking con el código de arriba.")
    else:
        c.drawString(x, y, "Firma y aclaración del cliente:")
        c.line(x + 150, y - 2, x + ancho_util, y - 2)
    c.setFillColor(black)


# Alto libre estimado en el talón dentro del formato actual de 2 talones por hoja
# (talón ~421pt, contenido fijo ~293pt) — si los bloques nuevos no entran ahí, se
# pasa a 2 hojas completas (una por talón) en vez de recortar contenido.
MARGEN_LIBRE_TALON = 128


def _altura_extra_talon(accesorios, items_presupuesto) -> float:
    extra = 0.0
    if accesorios:
        extra += _altura_bloque_lista(1)
    n_lineas_presupuesto = len(items_presupuesto) + 1 if items_presupuesto else 1
    extra += _altura_bloque_lista(n_lineas_presupuesto)
    return extra


def generar_recibo_ingreso(ticket: dict, propietario: dict, dispositivo: dict, accesorios: list | None = None, presupuestos: list | None = None) -> bytes:
    accesorios = accesorios or []
    presupuesto_actual = presupuestos[-1] if presupuestos else None
    items_presupuesto = (presupuesto_actual or {}).get("items") or []
    monto_presupuesto = (presupuesto_actual or {}).get("monto") or 0

    extra = _altura_extra_talon(accesorios, items_presupuesto)

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    if extra <= MARGEN_LIBRE_TALON:
        mitad = PAGE_H / 2
        _talon(c, mitad, mitad, ticket, propietario, dispositivo, "COPIA CLIENTE", True, accesorios, items_presupuesto, monto_presupuesto)
        _talon(c, 0, mitad, ticket, propietario, dispositivo, "COPIA TALLER", False, accesorios, items_presupuesto, monto_presupuesto)

        c.setDash(3, 3)
        c.setStrokeColor(GRIS_CLARO)
        c.line(MARGEN, mitad, PAGE_W - MARGEN, mitad)
        c.setDash()
    else:
        alto_pagina = PAGE_H - 2 * MARGEN
        _talon(c, MARGEN, alto_pagina, ticket, propietario, dispositivo, "COPIA CLIENTE", True, accesorios, items_presupuesto, monto_presupuesto)
        c.showPage()
        _talon(c, MARGEN, alto_pagina, ticket, propietario, dispositivo, "COPIA TALLER", False, accesorios, items_presupuesto, monto_presupuesto)

    c.setTitle(f"Recibo de ingreso — {ticket.get('codigoseguimiento') or ticket.get('tkid')}")
    c.showPage()
    c.save()
    return buf.getvalue()


def _asegurar_espacio(c, y, minimo=70) -> float:
    """Si queda poco espacio antes del margen inferior, arranca una hoja nueva."""
    if y < minimo:
        c.showPage()
        c.setFillColor(black)
        c.setStrokeColor(black)
        return PAGE_H - MARGEN
    return y


def generar_informe_tecnico(ticket: dict, propietario: dict, dispositivo: dict, ejecuciones: list, presupuestos: list) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    x = MARGEN
    ancho_util = PAGE_W - 2 * MARGEN
    y = PAGE_H - MARGEN - 6

    ancho_logo = _dibujar_logo(c, x, y, 24)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x + ancho_logo + 8, y - 8, "ZERO OHMS")
    c.setFont("Helvetica", 9)
    c.setFillColor(GRIS)
    c.drawString(x + ancho_logo + 8, y - 19, "Informe técnico y presupuesto")
    c.setFillColor(black)
    y -= 26
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
            y = _asegurar_espacio(c, y, minimo=80)
            c.setFont("Helvetica-Bold", 10)
            c.drawString(x, y, ej.get("checklist_nombre") or "Checklist")
            c.setFont("Helvetica", 8)
            c.setFillColor(GRIS_CLARO)
            c.drawRightString(x + ancho_util, y, f"{ej.get('usuario_nombre') or ej.get('usuario') or ''} · {_fecha(ej.get('fechacreacion'))}")
            c.setFillColor(black)
            y -= 14
            for r in ej.get("respuestas", []):
                y = _asegurar_espacio(c, y, minimo=40)
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

    y = _asegurar_espacio(c, y, minimo=90)
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
            y = _asegurar_espacio(c, y, minimo=70)
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

            items = p.get("items") or []
            if not items:
                c.setFont("Helvetica-Oblique", 8.5)
                c.setFillColor(GRIS_CLARO)
                c.drawString(x + 6, y, "Sin ítems cargados todavía.")
                c.setFillColor(black)
                y -= 14
            else:
                for it in items:
                    y = _asegurar_espacio(c, y, minimo=40)
                    c.setFont("Helvetica", 8.5)
                    subtotal = float(it["cantidad"]) * float(it["preciounitario"])
                    c.drawString(
                        x + 6, y,
                        f"• {it['descripcion']}  ({_cant(it['cantidad'])} x {_money(it['preciounitario'])})",
                    )
                    c.drawRightString(x + ancho_util, y, _money(subtotal))
                    y -= 12
            y -= 8

    c.setFont("Helvetica", 7)
    c.setFillColor(GRIS_CLARO)
    c.drawString(x, MARGEN, f"Generado por Zero Ohms el {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    c.setFillColor(black)

    c.setTitle(f"Informe técnico — {ticket.get('codigoseguimiento') or ticket.get('tkid')}")
    c.showPage()
    c.save()
    return buf.getvalue()
