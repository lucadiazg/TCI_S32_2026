
from fastapi import FastAPI
from app.controllers.auth import router as auth_router
from app.controllers.recepciones import router as recepciones_router

app = FastAPI(
    title="PharmaPlant CORE API",
    version="0.1.0",
)

# Incorporamos las rutas de autenticación
app.include_router(auth_router)

# Incorporamos las rutas de recepción de repuestos
app.include_router(recepciones_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
