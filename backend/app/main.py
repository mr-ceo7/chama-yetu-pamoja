"""
Chama Yetu Pamoja (CYP) FastAPI backend — main application entry point.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base
import os

logger = logging.getLogger(__name__)

# Import all models so SQLAlchemy registers them
from app.models import user, tip, jackpot, subscription, payment, ad, notification, campaign  # noqa: F401

# Import routers
from app.routers import auth, tips, payments, subscriptions, admin, notifications, campaigns, internal, seo


async def seed_default_ads():
    from sqlalchemy import select
    from app.database import AsyncSessionLocal
    from app.models.ad import AdPost
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(AdPost).limit(1))
        if result.scalar_one_or_none() is not None:
            return  # Already seeded or has data

        ads_data = [
            {
                "title": "CHAMA YETU PAMOJA - KEEP YOUR TIPS UP",
                "image_url": "/brand-ad.jpeg",
                "link_url": "/tips",
                "category": "Promo",
                "is_active": True,
            },
            {
                "title": "🎁 Invite Friends & Get Free Daily Tips! Share your referral link and unlock exclusive predictions.",
                "image_url": "https://images.unsplash.com/photo-1577223625816-7546f13df25d?q=80&w=800&auto=format&fit=crop",
                "link_url": "/tips",
                "category": "Promo",
                "is_active": True,
            },
            {
                "title": "🏆 Go Premium — Get Exclusive Expert Tips with 75%+ Win Rate. Join the winning team today!",
                "image_url": "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?q=80&w=800&auto=format&fit=crop",
                "link_url": "/tips",
                "category": "Promo",
                "is_active": True,
            },
            {
                "title": "🔔 Never Miss a Winning Tip! Subscribe for daily free picks and premium alerts delivered straight to you.",
                "image_url": "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=800&auto=format&fit=crop",
                "link_url": "/tips",
                "category": "Promo",
                "is_active": True,
            }
        ]
        for val in ads_data:
            session.add(AdPost(**val))
        await session.commit()


async def seed_default_tiers():
    from sqlalchemy import select
    from app.database import AsyncSessionLocal
    from app.models.subscription import SubscriptionTier
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(SubscriptionTier).limit(1))
        if result.scalar_one_or_none() is not None:
            return  # Already seeded or has data

        tiers_data = [
            {
                "tier_id": "5day",
                "name": "5 Days Trial Plan",
                "description": "5 days of immediate full access to all premium tips and odds.",
                "price": 200.0,
                "duration_days": 5,
                "categories": ["free", "premium"],
                "popular": False,
            },
            {
                "tier_id": "10day",
                "name": "10 Days Premium Plan",
                "description": "10 days of full access to all our premium football predictions.",
                "price": 500.0,
                "duration_days": 10,
                "categories": ["free", "premium"],
                "popular": True,
            },
            {
                "tier_id": "30day",
                "name": "30 Days Monthly VIP",
                "description": "Full 30 days of VIP access. Best value for serious players.",
                "price": 1000.0,
                "duration_days": 30,
                "categories": ["free", "premium"],
                "popular": False,
            }
        ]
        for val in tiers_data:
            session.add(SubscriptionTier(**val))
        await session.commit()

import asyncio
from sqlalchemy import text, inspect as sa_inspect


# ── Automatic Schema Migrations ─────────────────────────────
# Compares SQLAlchemy model definitions against the live database
# and safely adds any missing columns. Fully automatic — just
# define new columns in your models and deploy.

def _sa_type_to_ddl(col) -> str:
    """Convert a SQLAlchemy column type to a MySQL DDL string."""
    from sqlalchemy import String, Integer, BigInteger, Float, Boolean, DateTime, Text, JSON
    t = type(col.type)
    if t == String:
        length = getattr(col.type, 'length', 255) or 255
        return f"VARCHAR({length})"
    elif t == Text:
        return "TEXT"
    elif t == BigInteger:
        return "BIGINT"
    elif t == Integer:
        return "INT"
    elif t == Float:
        return "FLOAT"
    elif t == Boolean:
        return "TINYINT(1)"
    elif t == DateTime:
        return "DATETIME"
    elif t == JSON:
        return "JSON"
    else:
        # Fallback: use the compile output
        try:
            from sqlalchemy.dialects import mysql
            return col.type.compile(dialect=mysql.dialect())
        except Exception:
            return "TEXT"


def _col_default_ddl(col) -> str:
    """Build the DEFAULT clause for a column."""
    if col.server_default is not None:
        val = col.server_default.arg
        if callable(val):
            return ""
        return f" DEFAULT {val}" if isinstance(val, str) and val.isdigit() else f" DEFAULT '{val}'"
    return ""


async def run_migrations():
    """
    Automatically detect and add missing columns to existing tables,
    and modify columns whose types have changed (e.g. VARCHAR→TEXT).
    - create_all handles new tables.
    - This handles new columns and type changes on existing tables.
    Fully idempotent and safe to run on every startup.
    """
    async with engine.begin() as conn:
        # Get list of tables that actually exist in the database
        result = await conn.execute(text(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = DATABASE()"
        ))
        existing_tables = {row[0] for row in result.fetchall()}

        if not existing_tables:
            return  # Fresh database, create_all will handle everything

        for table_name, table in Base.metadata.tables.items():
            if table_name not in existing_tables:
                continue  # New table — create_all already handled it

            # Get columns with their types from the database
            result = await conn.execute(text(
                "SELECT column_name, column_type, is_nullable "
                "FROM information_schema.columns "
                "WHERE table_schema = DATABASE() AND table_name = :table"
            ), {"table": table_name})
            db_columns = {}
            for row in result.fetchall():
                db_columns[row[0]] = {"type": row[1].upper(), "nullable": row[2]}

            # Compare with model columns
            for col in table.columns:
                col_type = _sa_type_to_ddl(col)
                nullable = "NULL" if col.nullable else "NOT NULL"
                default = _col_default_ddl(col)

                if col.name not in db_columns:
                    # ── New column: ADD ──
                    alter_sql = f"ALTER TABLE `{table_name}` ADD COLUMN `{col.name}` {col_type} {nullable}{default}"
                    try:
                        await conn.execute(text(alter_sql))
                        logger.info(f"Auto-migration: added `{table_name}`.`{col.name}` ({col_type} {nullable}{default})")
                    except Exception as e:
                        logger.warning(f"Auto-migration skip add `{table_name}`.`{col.name}`: {e}")
                else:
                    # ── Existing column: check for type mismatch ──
                    db_type = db_columns[col.name]["type"]
                    model_type_upper = col_type.upper()

                    # Detect meaningful type changes (e.g. VARCHAR(255) → TEXT)
                    needs_modify = False
                    if model_type_upper == "TEXT" and db_type.startswith("VARCHAR"):
                        needs_modify = True
                    elif model_type_upper.startswith("VARCHAR") and db_type.startswith("VARCHAR"):
                        # Check if length increased
                        import re
                        db_match = re.search(r'VARCHAR\((\d+)\)', db_type)
                        model_match = re.search(r'VARCHAR\((\d+)\)', model_type_upper)
                        if db_match and model_match:
                            if int(model_match.group(1)) > int(db_match.group(1)):
                                needs_modify = True

                    if needs_modify:
                        modify_sql = f"ALTER TABLE `{table_name}` MODIFY COLUMN `{col.name}` {col_type} {nullable}{default}"
                        try:
                            await conn.execute(text(modify_sql))
                            logger.info(f"Auto-migration: modified `{table_name}`.`{col.name}` {db_type} → {col_type}")
                        except Exception as e:
                            logger.warning(f"Auto-migration skip modify `{table_name}`.`{col.name}`: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: Create tables if they don't exist (dev convenience)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Run safe column migrations for existing tables
    await run_migrations()
        
    await seed_default_ads()
    await seed_default_tiers()
    
    yield
    
    # Shutdown: dispose connection pool
    await engine.dispose()


app = FastAPI(
    title="Chama Yetu Pamoja API",
    description="Sports betting tips platform API",
    version="1.0.0",
    lifespan=lifespan,
)

os.makedirs("media/uploads", exist_ok=True)
app.mount("/api/media", StaticFiles(directory="media"), name="media")

# ── CORS ─────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ────────────────────────────────────────
app.include_router(auth.router)
app.include_router(tips.router)
app.include_router(payments.router)
app.include_router(subscriptions.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(campaigns.router)
app.include_router(internal.router)
app.include_router(seo.router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in settings.cors_origins:
        headers["access-control-allow-origin"] = origin
        headers["access-control-allow-credentials"] = "true"
    detail = str(exc) if settings.DEBUG else "Internal Server Error"
    return JSONResponse(
        status_code=500,
        content={"detail": detail},
        headers=headers,
    )


@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok", "service": "chama-yetu-pamoja-api"}


@app.post("/api/bootstrap-admin")
async def bootstrap_admin(request: Request):
    """One-time endpoint to promote the first admin. Only works when zero admins exist."""
    from sqlalchemy import select, func
    from app.database import AsyncSessionLocal
    from app.models.user import User

    body = await request.json()
    email = body.get("email", "").lower().strip()
    secret = body.get("secret", "")

    # Require a bootstrap secret to prevent random access
    import os
    bootstrap_secret = os.getenv("BOOTSTRAP_SECRET", "chamayetupamoja-first-admin-2026")
    if secret != bootstrap_secret:
        raise HTTPException(status_code=403, detail="Invalid bootstrap secret")

    async with AsyncSessionLocal() as session:
        # Check if any admin already exists
        admin_count = await session.execute(select(func.count(User.id)).where(User.is_admin == True))
        if admin_count.scalar() > 0:
            raise HTTPException(status_code=409, detail="Admin already exists. Use /api/admin/users/{id}/make-admin instead.")

        # Find user by email
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail=f"No user found with email: {email}")

        user.is_admin = True
        session.add(user)
        await session.commit()

    return {"status": "success", "message": f"{email} is now the first admin!"}
