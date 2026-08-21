from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db
from middleware.auth import get_current_user
from models.checklist import CheckList, Pregunta, Respuesta, PreguntaRespuesta
from models.ejecucion import Ejecucion, RespuestaIngresada
from schemas.checklist import (
    CheckListCreate,
    CheckListUpdate,
    CheckListResponse,
    PreguntaCreate,
    PreguntaResponse,
    RespuestaCreate,
    RespuestaResponse,
    EjecucionCreate,
    EjecucionResponse,
    RespuestaIngresadaResponse,
)

router = APIRouter(prefix="/api", tags=["checklists"])


def _build_ejecucion_response(ej, db):
    respuestas_db = (
        db.query(RespuestaIngresada)
        .filter(RespuestaIngresada.ejecucionid == ej.ejecucionid)
        .all()
    )
    respuestas = []
    for ri in respuestas_db:
        pregunta = db.query(Pregunta).filter(Pregunta.preguntaid == ri.preguntaid).first()
        respuesta = db.query(Respuesta).filter(Respuesta.respuestaid == ri.respuestaid).first() if ri.respuestaid else None
        respuestas.append(
            RespuestaIngresadaResponse(
                preguntaid=ri.preguntaid,
                respuestaid=ri.respuestaid,
                observacion=ri.observacion,
                pregunta_texto=pregunta.pregunta if pregunta else None,
                respuesta_texto=respuesta.respuesta if respuesta else None,
            )
        )
    checklist = db.query(CheckList).filter(CheckList.checklistid == ej.checklistid).first()
    return EjecucionResponse(
        ejecucionid=ej.ejecucionid,
        checklistid=ej.checklistid,
        checklist_nombre=checklist.nombre if checklist else None,
        usuario=ej.usuario,
        tkid=ej.tkid,
        fechacreacion=str(ej.fechacreacion),
        respuestas=respuestas,
    )


# ── Checklists CRUD ──

@router.get("/checklists", response_model=list[CheckListResponse])
def list_checklists(db: Session = Depends(get_db), _usuario: str = Depends(get_current_user)):
    return db.query(CheckList).all()


@router.post("/checklists", response_model=CheckListResponse, status_code=201)
def create_checklist(
    body: CheckListCreate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    cl = CheckList(nombre=body.nombre, descripcion=body.descripcion)
    db.add(cl)
    db.commit()
    db.refresh(cl)
    return cl


@router.put("/checklists/{checklistid}", response_model=CheckListResponse)
def update_checklist(
    checklistid: int,
    body: CheckListUpdate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    cl = db.query(CheckList).filter(CheckList.checklistid == checklistid).first()
    if not cl:
        raise HTTPException(status_code=404, detail="Checklist no encontrado")
    if body.nombre is not None:
        cl.nombre = body.nombre
    if body.descripcion is not None:
        cl.descripcion = body.descripcion
    db.commit()
    db.refresh(cl)
    return cl


@router.delete("/checklists/{checklistid}")
def delete_checklist(
    checklistid: int,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    cl = db.query(CheckList).filter(CheckList.checklistid == checklistid).first()
    if not cl:
        raise HTTPException(status_code=404, detail="Checklist no encontrado")
    db.delete(cl)
    db.commit()
    return {"message": f"Checklist {checklistid} eliminado"}


# ── Preguntas CRUD ──

@router.get("/checklists/{checklistid}/preguntas", response_model=list[PreguntaResponse])
def get_preguntas_checklist(
    checklistid: int,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    preguntas = db.query(Pregunta).filter(Pregunta.checklistid == checklistid).all()
    result = []
    for p in preguntas:
        respuestas = [
            RespuestaResponse(respuestaid=r.respuestaid, respuesta=r.respuesta)
            for r in p.respuestas_validas
        ]
        result.append(
            PreguntaResponse(
                preguntaid=p.preguntaid,
                checklistid=p.checklistid,
                pregunta=p.pregunta,
                respuestas_validas=respuestas,
            )
        )
    return result


@router.post("/checklists/{checklistid}/preguntas", response_model=PreguntaResponse, status_code=201)
def create_pregunta(
    checklistid: int,
    body: PreguntaCreate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    cl = db.query(CheckList).filter(CheckList.checklistid == checklistid).first()
    if not cl:
        raise HTTPException(status_code=404, detail="Checklist no encontrado")

    preg = Pregunta(checklistid=checklistid, pregunta=body.pregunta)
    db.add(preg)
    db.flush()

    respuestas = []
    for r in body.respuestas:
        existing = db.query(Respuesta).filter(Respuesta.respuesta == r.respuesta).first()
        if existing:
            res = existing
        else:
            res = Respuesta(respuesta=r.respuesta)
            db.add(res)
            db.flush()
        db.add(PreguntaRespuesta(preguntaid=preg.preguntaid, respuestaid=res.respuestaid))
        respuestas.append(RespuestaResponse(respuestaid=res.respuestaid, respuesta=res.respuesta))

    db.commit()
    db.refresh(preg)

    return PreguntaResponse(
        preguntaid=preg.preguntaid,
        checklistid=preg.checklistid,
        pregunta=preg.pregunta,
        respuestas_validas=respuestas,
    )


@router.delete("/checklists/{checklistid}/preguntas/{preguntaid}")
def delete_pregunta(
    checklistid: int,
    preguntaid: int,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    preg = db.query(Pregunta).filter(
        Pregunta.preguntaid == preguntaid,
        Pregunta.checklistid == checklistid,
    ).first()
    if not preg:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    db.delete(preg)
    db.commit()
    return {"message": f"Pregunta {preguntaid} eliminada"}


# ── Ejecuciones ──

@router.post("/ejecuciones", response_model=EjecucionResponse, status_code=201)
def create_ejecucion(
    body: EjecucionCreate,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    checklist = db.query(CheckList).filter(CheckList.checklistid == body.checklistid).first()
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist no encontrado")

    ejecucion = Ejecucion(
        checklistid=body.checklistid,
        usuario=body.usuario or _usuario,
        tkid=body.tkid,
    )
    db.add(ejecucion)
    db.flush()

    for resp in body.respuestas:
        ri = RespuestaIngresada(
            ejecucionid=ejecucion.ejecucionid,
            preguntaid=resp.preguntaid,
            respuestaid=resp.respuestaid,
            observacion=resp.observacion,
        )
        db.add(ri)

    db.commit()
    db.refresh(ejecucion)
    return _build_ejecucion_response(ejecucion, db)


@router.get("/ejecuciones/{tkid}", response_model=list[EjecucionResponse])
def list_ejecuciones_tk(
    tkid: int,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    ejecuciones = (
        db.query(Ejecucion)
        .filter(Ejecucion.tkid == tkid)
        .order_by(Ejecucion.fechacreacion.desc())
        .all()
    )
    return [_build_ejecucion_response(ej, db) for ej in ejecuciones]


@router.delete("/ejecuciones/{ejecucionid}")
def delete_ejecucion(
    ejecucionid: int,
    db: Session = Depends(get_db),
    _usuario: str = Depends(get_current_user),
):
    ej = db.query(Ejecucion).filter(Ejecucion.ejecucionid == ejecucionid).first()
    if not ej:
        raise HTTPException(status_code=404, detail="Ejecución no encontrada")
    db.delete(ej)
    db.commit()
    return {"message": f"Ejecución {ejecucionid} eliminada"}
