from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session

from app.core.config import settings

# Path to the main SQLite app database
# We use a separate DB 'app.db' to avoid conflict with 'auth.db' (though they could be merged later)
# For now, let's keep them somewhat distinct or just use 'app.db' as the main one.
SQLITE_FILE_NAME = "app.db"
SQLITE_URL = f"sqlite:///{Path(settings.DATA_DIR) / 'db' / SQLITE_FILE_NAME}"

connect_args = {"check_same_thread": False}
engine = create_engine(SQLITE_URL, echo=False, connect_args=connect_args)

def create_db_and_tables():
    """Create the database and tables."""
    # Ensure the directory exists
    db_dir = Path(settings.DATA_DIR) / "db"
    db_dir.mkdir(parents=True, exist_ok=True)
    
    SQLModel.metadata.create_all(engine)

def get_session():
    """Dependency for getting a DB session."""
    with Session(engine) as session:
        yield session
