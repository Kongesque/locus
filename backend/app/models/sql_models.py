from datetime import datetime
from typing import Optional
import uuid
from sqlmodel import Field, SQLModel

class VideoBase(SQLModel):
    filename: str
    status: str = Field(default="pending") # pending, processing, completed, failed
    duration: Optional[str] = None
    format: Optional[str] = None
    name: Optional[str] = None

class Video(VideoBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    input_path: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Metadata for processed results
    result_url: Optional[str] = None
    error: Optional[str] = None
    count: Optional[int] = None
    progress: int = Field(default=0)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "filename": "video.mp4",
                "status": "completed",
                "count": 142
            }
        }
