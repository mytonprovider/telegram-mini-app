import logging
import time

from fastapi import APIRouter, Response, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db import session_factory
from app.workers import WORKERS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health")

STALE_FACTOR = 3
STARTED = time.monotonic()


class HealthResponse(BaseModel):
    status: str
    stale: list[str]


def _stale() -> list[str]:
    now = time.monotonic()
    return [
        worker.__name__
        for worker in WORKERS
        if now - (worker.last_success or STARTED) > worker.interval * STALE_FACTOR + worker.delay
    ]


@router.api_route("", methods=["GET", "HEAD"])
async def health(response: Response) -> HealthResponse:
    response.headers["Cache-Control"] = "no-store"
    try:
        async with session_factory() as session:
            await session.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        logger.warning("database check failed: %s", error)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthResponse(status="down", stale=[])

    stale = _stale()
    return HealthResponse(status="degraded" if stale else "ok", stale=stale)
