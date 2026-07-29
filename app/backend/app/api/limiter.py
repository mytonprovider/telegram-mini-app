import time

from cachetools import TTLCache
from fastapi import Depends, HTTPException, Request, Response, status

from app import config

_hits = TTLCache(maxsize=100_000, ttl=config.API_RATE_WINDOW)


def _client_ip(request: Request) -> str:
    real = request.headers.get("x-real-ip")
    if real:
        return real
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    return request.client.host if request.client else "unknown"


async def rate_limiter(request: Request, response: Response) -> None:
    now = time.monotonic()
    ip = _client_ip(request)
    hits = [hit for hit in _hits.get(ip, ()) if now - hit < config.API_RATE_WINDOW]
    response.headers["X-RateLimit-Limit"] = str(config.API_RATE_LIMIT)
    response.headers["X-RateLimit-Remaining"] = str(max(0, config.API_RATE_LIMIT - len(hits) - 1))
    oldest = min(hits) if hits else now
    response.headers["X-RateLimit-Reset"] = str(int(config.API_RATE_WINDOW - (now - oldest)))
    if len(hits) >= config.API_RATE_LIMIT:
        _hits[ip] = hits
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many requests",
            headers={
                "Retry-After": str(config.API_RATE_WINDOW),
                "X-RateLimit-Limit": str(config.API_RATE_LIMIT),
                "X-RateLimit-Remaining": "0",
            },
        )
    hits.append(now)
    _hits[ip] = hits


limiter = Depends(rate_limiter)
