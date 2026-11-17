
# Utilizamos Python 3.12
FROM python:3.12-slim

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Instalamos uv para administrar dependencias
RUN pip install --no-cache-dir uv

# Copiamos la configuración de dependencias
COPY pyproject.toml uv.lock ./

# Instalamos las dependencias del backend
RUN uv sync --frozen --no-dev

# Copiamos el código del proyecto
COPY . .

# Puerto utilizado por FastAPI
EXPOSE 8000

# Iniciamos el servidor
CMD ["uv", "run", "--no-sync", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
