from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes.health import router as health_router
from app.api.routes.inference import router as inference_router
from app.core.config import get_settings


settings = get_settings()
allowed_origins = [origin.strip() for origin in settings.cors_allow_origins.split(",") if origin.strip()]

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

temp_dir = settings.backend_root / "temp"
temp_dir.mkdir(parents=True, exist_ok=True)
app.mount("/temp", StaticFiles(directory=temp_dir), name="temp")


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": settings.app_name,
        "status": "ok",
        "docs_url": "/docs",
        "health_url": "/api/health",
        "infer_url": "/api/v1/infer",
    }

app.include_router(health_router, prefix="/api")
app.include_router(inference_router, prefix="/api")
