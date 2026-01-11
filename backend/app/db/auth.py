"""
Auth database module for password storage.
Uses separate auth.db to keep auth data isolated.
"""
import aiosqlite
from pathlib import Path

from app.core.config import settings

# Auth database path (in db folder with other databases)
AUTH_DB_PATH = Path(settings.DATABASE_PATH).parent / "db" / "auth.db"


async def init_auth_db():
    """
    Initialize the auth database with settings table.
    Called on application startup.
    """
    AUTH_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    async with aiosqlite.connect(AUTH_DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        await db.commit()


async def is_setup_complete() -> bool:
    """Check if initial password setup has been completed."""
    async with aiosqlite.connect(AUTH_DB_PATH) as db:
        cursor = await db.execute(
            "SELECT value FROM settings WHERE key = 'password_hash'"
        )
        row = await cursor.fetchone()
        return row is not None and row[0] is not None


async def get_password_hash() -> str | None:
    """Retrieve the stored password hash."""
    async with aiosqlite.connect(AUTH_DB_PATH) as db:
        cursor = await db.execute(
            "SELECT value FROM settings WHERE key = 'password_hash'"
        )
        row = await cursor.fetchone()
        return row[0] if row else None


async def set_password_hash(password_hash: str) -> None:
    """Store or update the password hash."""
    async with aiosqlite.connect(AUTH_DB_PATH) as db:
        await db.execute("""
            INSERT INTO settings (key, value) VALUES ('password_hash', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        """, (password_hash,))
        await db.commit()


async def clear_password_hash() -> None:
    """Clear the stored password hash (for reset)."""
    async with aiosqlite.connect(AUTH_DB_PATH) as db:
        await db.execute("DELETE FROM settings WHERE key = 'password_hash'")
        await db.commit()
