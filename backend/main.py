
from fastapi import FastAPI
from app.controllers.auth import router as auth_router

app = FastAPI(
    title="PharmaPlant CORE API",
    version="0.1.0",
)

# Incorporamos las rutas de autenticación
app.include_router(auth_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
