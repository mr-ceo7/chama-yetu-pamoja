"""
API-Football proxy service with server-side key rotation.
"""

import asyncio
import logging
import time
from datetime import date
from typing import Optional

import httpx

from app.config import settings
from app.services.cache import get_cached, set_cached

logger = logging.getLogger(__name__)

API_BASE = "https://v3.football.api-sports.io"

_key_usage: dict[str, dict] = {}


def _get_today() -> str:
    return date.today().isoformat()


def _get_key_info(key: str) -> dict:
    today = _get_today()
    entry = _key_usage.get(key)
    if not entry or entry.get("date") != today:
        entry = {
            "date": today,
            "count": 0,
            "limit_day": 7500,
            "blocked_until": 0.0,
            "last_request": 0.0,
            "exhausted": False,
            "reason": None,
        }
        _key_usage[key] = entry
    return entry


def _get_key_usage(key: str) -> int:
    return _get_key_info(key)["count"]


def _increment_key(key: str) -> None:
    entry = _get_key_info(key)
    entry["count"] += 1


def _mark_key_exhausted(key: str, reason: str | None = None) -> None:
    entry = _get_key_info(key)
    entry["exhausted"] = True
    entry["reason"] = reason


def _mark_key_blocked_for_minute(key: str) -> None:
    entry = _get_key_info(key)
    entry["blocked_until"] = time.time() + 61


def _is_key_available(key: str) -> bool:
    entry = _get_key_info(key)
    if entry["exhausted"]:
        return False
    if entry["blocked_until"] and time.time() < entry["blocked_until"]:
        return False
    if entry["count"] >= entry["limit_day"]:
        return False
    return True


def _is_exhaustion_error(data: dict, status_code: int) -> bool:
    if status_code == 429:
        return True
    errors = data.get("errors")
    if not errors:
        return False
    err_str = str(errors).lower()
    return any(
        token in err_str for token in ["rate", "suspended", "forbidden", "quota", "access"]
    )


def _update_key_quota_from_headers(key: str, headers: dict) -> None:
    remaining_daily = headers.get("x-ratelimit-requests-remaining")
    limit_daily = headers.get("x-ratelimit-requests-limit") or headers.get(
        "X-RateLimit-Requests-Limit"
    )

    entry = _get_key_info(key)

    if limit_daily is not None:
        try:
            entry["limit_day"] = int(limit_daily)
        except ValueError:
            pass

    if remaining_daily is not None:
        try:
            if int(remaining_daily) <= 0:
                _mark_key_exhausted(key, "daily quota exhausted")
                return
        except ValueError:
            pass

    remaining_minute = headers.get("x-ratelimit-remaining") or headers.get(
        "X-RateLimit-Remaining"
    )
    if remaining_minute is not None:
        try:
            if int(remaining_minute) <= 0:
                _mark_key_blocked_for_minute(key)
        except ValueError:
            pass


async def _api_fetch(endpoint: str) -> dict:
    keys = settings.api_football_key_list
    if not keys:
        logger.warning("No API-Football keys configured")
        return {}

    async with httpx.AsyncClient(timeout=30) as client:
        for key in sorted(keys, key=lambda candidate: _get_key_usage(candidate)):
            if not _is_key_available(key):
                continue

            entry = _get_key_info(key)
            now = time.time()
            elapsed = now - entry["last_request"]
            if elapsed < 0.2:
                await asyncio.sleep(0.2 - elapsed)
                now = time.time()

            try:
                response = await client.get(
                    f"{API_BASE}{endpoint}",
                    headers={"x-apisports-key": key},
                )
                entry["last_request"] = now
                _increment_key(key)
                data = response.json()
                _update_key_quota_from_headers(key, response.headers)

                if _is_exhaustion_error(data, response.status_code):
                    reason = data.get("errors") or f"status_{response.status_code}"
                    logger.warning(
                        "API-Football key blocked/exhausted: %s reason=%s",
                        key[:8],
                        reason,
                    )
                    _mark_key_exhausted(key, str(reason))
                    continue

                if response.status_code != 200:
                    logger.warning(
                        "API-Football returned non-200 status %s for key %s",
                        response.status_code,
                        key[:8],
                    )
                    continue

                return data
            except Exception as exc:
                logger.warning("API-Football request failed for key %s: %s", key[:8], exc)
                if isinstance(exc, httpx.HTTPStatusError) and exc.response is not None:
                    if exc.response.status_code == 429:
                        _mark_key_blocked_for_minute(key)
                continue

    logger.warning("ALL_KEYS_EXHAUSTED")
    return {}


def _map_fixture(item: dict) -> dict:
    status_short = item["fixture"]["status"]["short"]
    if status_short in ("1H", "2H", "HT", "ET", "P", "LIVE"):
        status = "live"
    elif status_short in ("FT", "AET", "PEN"):
        status = "finished"
    else:
        status = "upcoming"

    home_goals = item["goals"]["home"]
    away_goals = item["goals"]["away"]
    score = (
        f"{home_goals} - {away_goals}"
        if home_goals is not None and away_goals is not None
        else None
    )

    return {
        "id": item["fixture"]["id"],
        "sport": "Soccer",
        "league": item["league"]["name"],
        "leagueId": item["league"]["id"],
        "leagueLogo": item["league"].get("logo"),
        "country": item["league"].get("country"),
        "countryFlag": item["league"].get("flag"),
        "homeTeam": item["teams"]["home"]["name"],
        "awayTeam": item["teams"]["away"]["name"],
        "homeLogo": item["teams"]["home"].get("logo"),
        "awayLogo": item["teams"]["away"].get("logo"),
        "matchDate": item["fixture"]["date"],
        "status": status,
        "score": score,
        "elapsed": item["fixture"]["status"].get("elapsed"),
        "venue": item["fixture"].get("venue", {}).get("name"),
    }


async def fetch_fixtures_by_date(date_str: Optional[str] = None) -> list:
    date_str = date_str or date.today().isoformat()
    cache_key = f"fixtures_{date_str}"

    cached = get_cached("fixtures", cache_key)
    if cached:
        return cached

    data = await _api_fetch(f"/fixtures?date={date_str}")
    fixtures = [_map_fixture(item) for item in (data.get("response") or [])]

    weight = {"live": 3, "upcoming": 2, "finished": 1}
    fixtures.sort(key=lambda fixture: weight.get(fixture["status"], 0), reverse=True)

    set_cached("fixtures", cache_key, fixtures)
    return fixtures
