"""
Health check endpoint for monitoring.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    """
    Health check endpoint.
    Returns service status for monitoring and load balancers.
    """
    return {
        "status": "ok",
        "service": "locus-backend",
    }
