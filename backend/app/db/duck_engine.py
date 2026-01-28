import duckdb
from pathlib import Path
from app.core.config import settings

DUCKDB_FILE_NAME = "analytics.duckdb"
DUCKDB_PATH = Path(settings.DATA_DIR) / "db" / DUCKDB_FILE_NAME

def get_duckdb_connection():
    """
    Get a connection to the DuckDB analytics database.
    DuckDB handles concurrency well enough for this use case, 
    but for high traffic we might want a connection pool or read_only connections.
    """
    # Ensure dir exists
    DUCKDB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    # Connect to the persistent database
    conn = duckdb.connect(str(DUCKDB_PATH))
    return conn

def init_duckdb():
    """Initialize DuckDB tables."""
    conn = get_duckdb_connection()
    
    # Create Detections Table
    # Optimized for fast aggregation by video_id
    conn.execute("""
        CREATE TABLE IF NOT EXISTS detections (
            video_id UUID,
            track_id INTEGER,
            timestamp DOUBLE,
            class_name VARCHAR,
            confidence DOUBLE,
            bbox_x1 DOUBLE,
            bbox_y1 DOUBLE,
            bbox_x2 DOUBLE,
            bbox_y2 DOUBLE,
            center_x DOUBLE,  -- Pre-calculated for heatmaps
            center_y DOUBLE
        );
    """)
    
    # Create index for fast retrieval by video
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_detections_video ON detections(video_id);
    """)
    
    conn.close()
