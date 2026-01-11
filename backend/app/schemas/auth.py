"""
Pydantic schemas for authentication.
"""
from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Request body for login endpoint."""

    password: str


class LoginResponse(BaseModel):
    """Response for successful login."""

    success: bool
    message: str = "Login successful"


class LogoutResponse(BaseModel):
    """Response for logout endpoint."""

    success: bool
    message: str = "Logged out successfully"


class AuthStatusResponse(BaseModel):
    """Response for auth status check."""

    authenticated: bool
