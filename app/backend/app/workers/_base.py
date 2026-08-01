import asyncio
import logging
import time

from app.bot import notify


class BaseWorker:
    interval: int
    delay: int = 0
    align: bool = False

    async def run(self) -> None:
        raise NotImplementedError

    @classmethod
    def _pause(cls, plain: float) -> float:
        if not cls.align:
            return plain
        return cls.interval - time.time() % cls.interval + cls.delay

    @classmethod
    async def loop(cls) -> None:
        logger = logging.getLogger(cls.__module__)
        worker = cls()
        await asyncio.sleep(cls._pause(cls.delay))
        last_error = None
        while True:
            try:
                await worker.run()
                last_error = None
            except asyncio.CancelledError:
                raise
            except Exception as error:
                logger.exception("run failed")
                signature = f"{type(error).__name__}: {error}"
                if signature != last_error:
                    last_error = signature
                    await notify.report_error(cls.__name__, error)
            await asyncio.sleep(cls._pause(cls.interval))
