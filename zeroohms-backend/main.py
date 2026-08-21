from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from models import Base
from config.database import engine
from routes import auth, tickets, clientes, dispositivos, tareas, presupuestos, checklists, tracking, webhooks, usuarios

app = FastAPI(
    title="Zero Ohms API",
    description="API del sistema de gestión de reparaciones — zeroohms.com.ar",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGIN.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(clientes.router)
app.include_router(dispositivos.router)
app.include_router(tareas.router)
app.include_router(presupuestos.router)
app.include_router(checklists.router)
app.include_router(tracking.router)
app.include_router(webhooks.router)
app.include_router(usuarios.router)


@app.get("/api/health")
def health():
    return {"ok": True, "service": "zeroohms-api"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=True)
