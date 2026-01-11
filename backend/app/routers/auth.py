"""
Authentication routes - login, logout, setup, and auth status.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.core.config import settings
from app.db.auth import is_setup_complete, set_password_hash
from app.schemas.auth import (
    AuthStatusResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    SetupRequest,
    SetupResponse,
    SetupStatusResponse,
)

router = APIRouter()

# Rate limiter for login endpoint
limiter = Limiter(key_func=get_remote_address)


@router.get("/status", response_model=SetupStatusResponse)
async def setup_status() -> SetupStatusResponse:
    """
    Check if initial setup is complete.
    No authentication required - used to determine if setup page should be shown.
    """
    complete = await is_setup_complete()
    return SetupStatusResponse(setup_complete=complete)


@router.post("/setup", response_model=SetupResponse)
@limiter.limit("3/minute")
async def initial_setup(
    request: Request, data: SetupRequest, response: Response
) -> SetupResponse:
    """
    Set the initial password during first-run setup.
    Only works if no password has been configured yet.
    """
    # Check if setup is already complete
    if await is_setup_complete():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setup already complete. Use login instead.",
        )

    # Hash and store the password
    password_hash = hash_password(data.password)
    await set_password_hash(password_hash)

    # Auto-login after setup
    token = create_access_token()
    response.set_cookie(
        key="locus_auth",
        value=token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_HOURS * 3600,
    )

    return SetupResponse(success=True)


@router.post("/login", response_model=LoginResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login(
    request: Request, data: LoginRequest, response: Response
) -> LoginResponse:
    """
    Authenticate with the single password.
    Sets an HTTP-only cookie on success.
    Rate limited to prevent brute force attacks.
    """
    # Check if setup is complete
    if not await is_setup_complete():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setup not complete. Please set up your password first.",
        )

    if not await verify_password(data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )

    token = create_access_token()

    # Set HTTP-only cookie for security
    response.set_cookie(
        key="locus_auth",
        value=token,
        httponly=True,
        secure=not settings.DEBUG,  # Secure in production (HTTPS)
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_HOURS * 3600,
    )

    return LoginResponse(success=True)


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    response: Response,
    _user: dict = Depends(get_current_user),
) -> LogoutResponse:
    """
    Log out by clearing the auth cookie.
    """
    response.delete_cookie("locus_auth")
    return LogoutResponse(success=True)


@router.get("/me", response_model=AuthStatusResponse)
async def me(user: dict = Depends(get_current_user)) -> AuthStatusResponse:
    """
    Check if the current request is authenticated.
    """
    return AuthStatusResponse(authenticated=user["authenticated"])
