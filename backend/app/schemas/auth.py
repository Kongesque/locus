"""
Pydantic schemas for authentication.
"""
from pydantic import BaseModel, field_validator


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
    """Response for auth status check (requires auth)."""

    authenticated: bool


class SetupStatusResponse(BaseModel):
    """Response for setup status check (no auth required)."""

    setup_complete: bool


class SetupRequest(BaseModel):
    """Request body for initial setup."""

    password: str
    confirm_password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class SetupResponse(BaseModel):
    """Response for setup endpoint."""

    success: bool
    message: str = "Setup complete"
