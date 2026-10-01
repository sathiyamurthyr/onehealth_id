from fastapi import APIRouter, HTTPException, Depends
from backend.app.schemas.models import LoginRequest, LoginResponse, UserProfile
from backend.app.core.security import verify_password, create_access_token
from backend.app.repositories.sp_views_repository import sp_repository

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Fallback in-memory users for instant tests / offline
STATIC_USERS = {
    "admin": {
        "password": "admin123",
        "profile": UserProfile(
            username="admin",
            name="Dr. Administrator",
            role="Admin",
            email="admin@hospital.org",
            hospital_name="Apollo Central Hospital",
            tenant_name="Apollo Healthcare Network"
        ),
    },
    "doctor": {
        "password": "doctor123",
        "profile": UserProfile(
            username="doctor",
            name="Dr. Gregory House",
            role="Doctor",
            email="house@hospital.org",
            hospital_name="Apollo Central Hospital",
            tenant_name="Apollo Healthcare Network"
        ),
    },
    "receptionist": {
        "password": "rec123",
        "profile": UserProfile(
            username="receptionist",
            name="Sarah Jenkins",
            role="Receptionist",
            email="reception@hospital.org",
            hospital_name="Apollo Central Hospital",
            tenant_name="Apollo Healthcare Network"
        ),
    },
    "patient": {
        "password": "patient123",
        "profile": UserProfile(
            username="patient",
            name="Alice Smith",
            role="Patient",
            email="alice.smith@example.com",
            hospital_name="Apollo Central Hospital",
            tenant_name="Apollo Healthcare Network"
        ),
    },
}

@router.post("/login", response_model=LoginResponse)
def login(creds: LoginRequest):
    # 1. First check PostgreSQL user view
    try:
        user_row = sp_repository.get_user_by_username(creds.username)
        if user_row:
            # Check password
            if verify_password(creds.password, user_row.get("password_hash", creds.password)):
                profile = UserProfile(
                    username=user_row["username"],
                    name=user_row["full_name"],
                    role=user_row["role"].capitalize() if user_row["role"] else "Staff",
                    email=user_row["email"],
                    hospital_name=user_row.get("hospital_name") or "Apollo Central Hospital",
                    tenant_name=user_row.get("tenant_name") or "Apollo Healthcare Network"
                )
                token = create_access_token({"sub": profile.username, "role": profile.role})
                return LoginResponse(access_token=token, user=profile)
    except Exception:
        pass

    # 2. Fallback to static users
    user_entry = STATIC_USERS.get(creds.username)
    if not user_entry or user_entry["password"] != creds.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": user_entry["profile"].username, "role": user_entry["profile"].role})
    return LoginResponse(access_token=token, user=user_entry["profile"])
