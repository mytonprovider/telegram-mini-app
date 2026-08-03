import asyncio
import gzip
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path

from aiogram.types import FSInputFile
from sqlalchemy import text

from app import config
from app.bot import sender
from app.db import db_dir, engine
from app.workers._base import BaseWorker

logger = logging.getLogger(__name__)

SNAPSHOT_LIMIT = 14


def _archive(path: Path) -> Path:
    archive = path.with_name(f"{path.name}.gz")
    with path.open("rb") as raw, gzip.open(archive, "wb") as packed:
        shutil.copyfileobj(raw, packed)
    return archive


class DbBackupWorker(BaseWorker):
    interval = 24 * 60 * 60
    delay = 5 * 60
    align = True

    async def run(self) -> None:
        backup_dir = db_dir / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        path = backup_dir / f"database-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}.sqlite"

        async with engine.connect() as conn:
            await conn.execution_options(isolation_level="AUTOCOMMIT")
            await conn.execute(text("VACUUM INTO :path"), {"path": str(path)})

        stale = sorted(backup_dir.glob("database-*.sqlite"))[:-SNAPSHOT_LIMIT]
        for old in stale:
            old.unlink()

        logger.debug("backed up %s: %d bytes, removed %d", path.name, path.stat().st_size, len(stale))

        if config.BOT_BACKUP_ID:
            archive = await asyncio.to_thread(_archive, path)
            try:
                await sender.send_document(config.BOT_BACKUP_ID, FSInputFile(archive), path.name)
            finally:
                archive.unlink(missing_ok=True)
