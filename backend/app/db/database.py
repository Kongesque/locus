"""
Database initialization module.
"""
from pathlib import Path

from app.core.config import settings


async def init_db():
    """
    Initialize the data directory structure.
    Called on application startup.
    """
    db_dir = Path(settings.DATA_DIR) / "db"
    db_dir.mkdir(parents=True, exist_ok=True)
