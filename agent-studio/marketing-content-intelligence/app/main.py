from __future__ import annotations
import logging
from fastapi import FastAPI
from app.api import router
from app.core.settings import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
)

app.include_router(router)