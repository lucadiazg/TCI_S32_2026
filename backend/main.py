
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.auth import router as auth_router
from app.controllers.incidencias import router as incidencias_router
from app.controllers.recepciones import router as recepciones_router
from app.controllers.repuestos import router as repuestos_router
from app.controllers.reparaciones import router as reparaciones_router
from app.controllers.maquinas import router as maquinas_router
from app.controllers.compras import router as compras_router

app = FastAPI(
    title="PharmaPlant CORE API",
    version="0.1.0",
)

# Permitir solicitudes desde el frontend React
app.add_middleware(
    CORSMiddleware,
   allow_origins=[
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas de la API
app.include_router(auth_router)
app.include_router(incidencias_router)
app.include_router(recepciones_router)
app.include_router(repuestos_router)
app.include_router(reparaciones_router)
app.include_router(maquinas_router)
app.include_router(compras_router)

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
