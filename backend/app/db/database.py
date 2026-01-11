"""
SQLite database connection manager.
Placeholder for future database operations.
"""
import aiosqlite

from app.core.config import settings


async def get_db_connection():
    """
    Get an async SQLite database connection.
    Use as async context manager.
    """
    async with aiosqlite.connect(settings.DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db


async def init_db():
    """
    Initialize the database with required tables.
    Called on application startup.
    """
    async with aiosqlite.connect(settings.DATABASE_PATH) as db:
        # Create tables here when needed
        # For now, just ensure the database file exists
        await db.execute("SELECT 1")
        await db.commit()
