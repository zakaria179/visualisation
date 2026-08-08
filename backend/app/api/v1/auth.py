from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.api.dependencies import get_auth_service, get_current_user
from app.domains.auth.service import AuthService
from app.domains.auth.schemas import UserLogin, Token, UserResponse
from app.core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login_for_access_token(
    user_data: UserLogin,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Authenticate user credentials and issue a JWT access token."""
    user = auth_service.authenticate_user(user_data.username, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return Token(
        access_token=access_token,
        token_type="bearer",
        username=user.username,
        full_name=user.full_name,
        role=user.role
    )

@router.get("/me", response_model=UserResponse)
def read_current_user_profile(
    current_user: UserResponse = Depends(get_current_user)
):
    """Return the profile and organization details for the logged-in user."""
    return current_user
