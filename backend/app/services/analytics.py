import uuid
from typing import List, Dict, Any
from app.db.duck_engine import get_duckdb_connection

class AnalyticsService:
    def insert_detections(self, video_id: uuid.UUID, events: List[Dict[str, Any]]):
        """
        Bulk insert detection events into DuckDB.
        Exepcts events to have bbox [x1, y1, x2, y2].
        """
        if not events:
            return

        conn = get_duckdb_connection()
        
        # Prepare data for bulk insert
        # We construct a list of tuples
        data_to_insert = []
        for event in events:
            # Calculate center for heatmaps
            # Assuming normalized coordinates 0-1 or pixel coords. 
            # If pixel coords, we might want to normalize on retrieval or here if we know dims.
            # Storing as is for now.
             
            # Parse different event formats if needed, but assuming a standard structure
            # If structure differs, we map it here.
            
            # Extract bbox
            # 'box': [x1, y1, x2, y2] or similar in the event dict
            box = event.get('box', [])
            if len(box) == 4:
                x1, y1, x2, y2 = box
                cx = (x1 + x2) / 2
                cy = (y1 + y2) / 2
            else:
                x1, y1, x2, y2 = 0, 0, 0, 0
                cx, cy = 0, 0
            
            data_to_insert.append((
                str(video_id),
                event.get('track_id', -1),
                event.get('timestamp', 0.0),
                event.get('label', 'unknown'),
                event.get('confidence', 0.0),
                x1, y1, x2, y2,
                cx, cy
            ))

        # DuckDB generic appender is fast
        conn.executemany("""
            INSERT INTO detections (
                video_id, track_id, timestamp, class_name, 
                confidence, bbox_x1, bbox_y1, bbox_x2, bbox_y2, 
                center_x, center_y
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, data_to_insert)
        
        conn.close()

    def get_heatmap_data(self, video_id: uuid.UUID, grid_size: int = 64) -> List[Dict[str, Any]]:
        """
        Generate heatmap data by aggregating detection centers into a grid.
        Returns list of {x_bucket, y_bucket, count}.
        """
        conn = get_duckdb_connection()
        
        # We can use DuckDB's powerful histogram/aggregation functions
        # For a simple heatmap, we can just group by rounded coordinates
        # Query assumes normalized coordinates (0-1). If pixels, logic needs video dims.
        # Let's assume we want raw points for client-side density plot? 
        # Or server-side massive aggregation. 
        # Let's do a simple count aggregation for now.
        
        # NOTE: This query groups data into 100x100 bins (approx)
        query = f"""
            SELECT 
                floor(center_x * {grid_size}) as x_bucket,
                floor(center_y * {grid_size}) as y_bucket,
                count(*) as intensity
            FROM detections
            WHERE video_id = ?
            GROUP BY x_bucket, y_bucket
        """
        
        result = conn.execute(query, [str(video_id)]).fetchall()
        conn.close()
        
        return [
            {"x": row[0], "y": row[1], "value": row[2]} 
            for row in result
        ]

    def get_object_counts(self, video_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Get total counts per object class."""
        conn = get_duckdb_connection()
        result = conn.execute("""
            SELECT class_name, count(*) 
            FROM detections 
            WHERE video_id = ? 
            GROUP BY class_name
        """, [str(video_id)]).fetchall()
        conn.close()
        
        return [{"class": row[0], "count": row[1]} for row in result]

analytics_service = AnalyticsService()
