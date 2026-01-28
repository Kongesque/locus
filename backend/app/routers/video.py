import shutil
import uuid
import os
import time
import cv2
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlmodel import Session, select, text

from app.schemas.video import ProcessRequest
from app.core.config import settings
from app.models.sql_models import Video
from app.db.sql_engine import get_session, engine
from app.services.detector import process_video_task
from app.services.analytics import analytics_service

router = APIRouter()

# Directories
MEDIA_DIR = Path(settings.DATA_DIR) / "media"
INPUT_DIR = MEDIA_DIR / "uploads"
OUTPUT_DIR = MEDIA_DIR / "outputs"
THUMBNAILS_DIR = MEDIA_DIR / "thumbnails"

# Ensure dirs exist
INPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)

def get_video_metadata(video_path: str, thumbnail_path: str) -> dict:
    """Extract first frame as thumbnail and get video duration."""
    result = {"has_thumbnail": False, "duration": "00:00"}
    
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return result
        
        # Get duration
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if fps > 0:
            duration_sec = frame_count / fps
            hours = int(duration_sec // 3600)
            minutes = int((duration_sec % 3600) // 60)
            seconds = int(duration_sec % 60)
            if hours > 0:
                result["duration"] = f"{hours}:{minutes:02d}:{seconds:02d}"
            else:
                result["duration"] = f"{minutes:02d}:{seconds:02d}"
        
        # Get thumbnail (first frame)
        ret, frame = cap.read()
        cap.release()
        
        if ret:
            cv2.imwrite(thumbnail_path, frame)
            result["has_thumbnail"] = True
            
        return result
    except Exception as e:
        print(f"Video metadata extraction failed: {e}")
        return result

@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """Upload a video file for processing."""
    task_id = uuid.uuid4()
    filename = f"{task_id}_{file.filename}"
    file_path = INPUT_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Generate Thumbnail and get duration
    thumb_filename = f"{task_id}.jpg"
    thumb_path = THUMBNAILS_DIR / thumb_filename
    metadata = get_video_metadata(str(file_path), str(thumb_path))
    
    video = Video(
        id=task_id,
        filename=filename,
        input_path=str(file_path),
        name=file.filename,
        format="mp4",
        duration=metadata["duration"],
        status="pending"
    )
    
    session.add(video)
    session.commit()
    session.refresh(video)
    
    return {"task_id": str(task_id)}

@router.get("/tasks")
async def get_tasks(session: Session = Depends(get_session)):
    """Get all tasks list."""
    statement = select(Video).order_by(Video.created_at.desc())
    videos = session.exec(statement).all()
    
    # Enrich with thumbnail_url and ensure name
    results = []
    for v in videos:
        v_dict = v.model_dump()
        v_dict["thumbnail_url"] = f"/api/video/{v.id}/thumbnail"
        if not v_dict.get("name"):
             v_dict["name"] = v.filename or "Unnamed Video"
        
        # Ensure completed is 100%
        if v.status == "completed":
            v_dict["progress"] = 100
            
        results.append(v_dict)
        
    return results

@router.get("/{task_id}")
async def get_task_status(task_id: uuid.UUID, session: Session = Depends(get_session)):
    """Get status of a specific task."""
    video = session.get(Video, task_id)
    if not video:
        raise HTTPException(status_code=404, detail="Task not found")
    return video

@router.get("/{task_id}/thumbnail")
async def get_thumbnail(task_id: str):
    """Get video thumbnail."""
    thumb_filename = f"{task_id}.jpg"
    thumb_path = THUMBNAILS_DIR / thumb_filename
    
    if not thumb_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
        
    return FileResponse(thumb_path, media_type="image/jpeg")

@router.get("/{task_id}/stream")
async def stream_video(task_id: uuid.UUID, session: Session = Depends(get_session)):
    """Stream the ORIGINAL uploaded video."""
    video = session.get(Video, task_id)
    if not video:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if not os.path.exists(video.input_path):
        raise HTTPException(status_code=404, detail="Video file missing")
        
    return FileResponse(video.input_path, media_type="video/mp4")

@router.get("/{task_id}/result")
async def stream_result(task_id: uuid.UUID, session: Session = Depends(get_session)):
    """Stream the PROCESSED output video."""
    video = session.get(Video, task_id)
    if not video:
        raise HTTPException(status_code=404, detail="Task not found")
        
    output_filename = f"{task_id}_output.mp4"
    output_path = OUTPUT_DIR / output_filename
    
    if not output_path.exists():
         if video.status == "processing":
             raise HTTPException(status_code=202, detail="Processing in progress")
         raise HTTPException(status_code=404, detail="Result not found")
         
    return FileResponse(output_path, media_type="video/mp4")

def run_processing_job(task_id: uuid.UUID, request: ProcessRequest):
    """Background job wrapper."""
    # Create a new session for the background thread
    with Session(engine) as session:
        video = session.get(Video, task_id)
        if not video:
            print(f"Task {task_id} not found in DB")
            return
            
        try:
            video.status = "processing"
            session.add(video)
            session.commit()
            
            output_filename = f"{task_id}_output.mp4"
            output_path = OUTPUT_DIR / output_filename
            
            # Progress callback
            last_update = 0
            def on_progress(progress: int):
                nonlocal last_update
                now = time.time()
                if now - last_update > 0.5:
                    try:
                        # Direct SQL update to avoid ORM confusion/overhead
                        session.execute(
                            text("UPDATE video SET progress = :p WHERE id = :id"), 
                            {"p": progress, "id": task_id.hex}
                        )
                        session.commit()
                        last_update = now
                    except Exception as e:
                        print(f"Error saving progress: {e}")
            
            # Run synchronous heavy processing
            result = process_video_task(
                input_path=video.input_path,
                output_path=str(output_path),
                zones=request.zones,
                model_name=request.model,
                progress_callback=on_progress
            )
            
            # Update DB with success
            video.status = "completed"
            video.progress = 100
            video.result_url = f"/api/video/{task_id}/result"
            video.count = result["count"]
            session.add(video)
            session.commit()
            
            # --- DUCKDB INGESTION ---
            print(f"Ingesting {len(result['events'])} events into DuckDB...")
            analytics_service.insert_detections(task_id, result["events"])
            
            print(f"Task {task_id} completed. Count: {result['count']}")
            
        except Exception as e:
            print(f"Task {task_id} failed: {e}")
            video.status = "failed"
            video.error = str(e)
            session.add(video)
            session.commit()

@router.post("/{task_id}/process")
async def start_processing(
    task_id: uuid.UUID, 
    request: ProcessRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    """Start asynchronous video processing."""
    video = session.get(Video, task_id)
    if not video:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Add to background queue
    background_tasks.add_task(run_processing_job, task_id, request)
    
    return {"status": "processing", "message": "Job started in background"}

@router.get("/{task_id}/analytics/heatmap")
async def get_video_heatmap(task_id: uuid.UUID):
    """Get heatmap data from DuckDB."""
    return analytics_service.get_heatmap_data(task_id)

@router.get("/{task_id}/analytics/counts")
async def get_video_counts(task_id: uuid.UUID):
    """Get object counts from DuckDB."""
    return analytics_service.get_object_counts(task_id)

@router.delete("/all")
async def delete_all_data(session: Session = Depends(get_session)):
    """Dangerously delete ALL data (Videos, Detections, Files)."""
    from sqlmodel import delete
    
    # 1. Clear SQLite
    session.exec(delete(Video))
    session.commit()
    
    # 2. Clear DuckDB
    analytics_service.clear_all_data()
    
    # 3. Clear Files
    for dir_path in [INPUT_DIR, OUTPUT_DIR, THUMBNAILS_DIR]:
        if dir_path.exists():
            for item in dir_path.iterdir():
                if item.name == ".gitkeep": continue
                try:
                    if item.is_file():
                        item.unlink()
                    elif item.is_dir():
                        shutil.rmtree(item)
                except Exception as e:
                    print(f"Failed to delete {item}: {e}")
                    
    return {"message": "All data deleted"}
