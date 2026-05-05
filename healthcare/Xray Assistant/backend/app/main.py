from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes.health import router as health_router
from app.api.routes.inference import router as inference_router
from app.core.config import get_settings


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

temp_dir = settings.backend_root / "temp"
temp_dir.mkdir(parents=True, exist_ok=True)
app.mount("/temp", StaticFiles(directory=temp_dir), name="temp")

app.include_router(health_router, prefix="/api")
app.include_router(inference_router, prefix="/api")
