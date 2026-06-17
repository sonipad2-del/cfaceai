from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import random
import string
from ..core.database import get_db
from ..core.models import Company, CompanySettings, User
from ..core.security import get_password_hash, verify_password
from ..core.jwt_handler import create_access_token
from .schemas import UserRegister, UserLogin, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])

def generate_join_code(db: Session) -> str:
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        # Check uniqueness
        exists = db.query(Company).filter(Company.join_code == code).first()
        if not exists:
            return code

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 1. Create company
    join_code = generate_join_code(db)
    new_company = Company(name=user_data.company_name, join_code=join_code)
    db.add(new_company)
    db.flush() # Populate new_company.id
    
    # 2. Create default company settings
    new_settings = CompanySettings(
        company_id=new_company.id,
        office_lat=13.7261,
        office_lng=100.5260,
        radius=200.0,
        owner_chat_id=None
    )
    db.add(new_settings)
    
    # 3. Create user
    from datetime import datetime, timezone
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        company_id=new_company.id,
        terms_accepted=user_data.terms_accepted,
        terms_version="v1.0" if user_data.terms_accepted else None,
        accepted_at=datetime.now(timezone.utc) if user_data.terms_accepted else None
    )
    db.add(new_user)
    
    db.commit()
    
    # Create token
    access_token = create_access_token(data={"sub": new_user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": new_user.role,
        "email": new_user.email
    }

@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email
    }
