from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import os
import random
import string
from ..core.database import get_db
from ..core.models import Company, CompanySettings, User
from ..core.dependencies import get_current_user
from .schemas import CompanyResponse, CompanySettingsResponse, CompanySettingsUpdate

router = APIRouter(prefix="/companies", tags=["Companies"])

@router.get("/me")
def get_company_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.company_id:
        if current_user.role == "superadmin":
            return {
                "id": None,
                "name": "Super Admin",
                "join_code": None,
                "created_at": current_user.created_at,
                "settings": {
                    "office_lat": None,
                    "office_lng": None,
                    "radius": None,
                    "owner_chat_id": None
                }
            }
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not associated with a company")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == company.id).first()
    
    return {
        "id": company.id,
        "name": company.name,
        "join_code": company.join_code,
        "created_at": company.created_at,
        "settings": {
            "office_lat": settings.office_lat if settings else 13.7261,
            "office_lng": settings.office_lng if settings else 100.5260,
            "radius": settings.radius if settings else 200.0,
            "owner_chat_id": settings.owner_chat_id if settings else None
        }
    }

@router.get("/qrcode")
def get_qrcode(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not associated with a company")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    # Let's read bot token/username. Typically we suffix the join link
    # We can get bot username from backend env or default to a mock/placeholder
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "tlg_checkin_bot")
    join_link = f"https://t.me/{bot_username}?start=join_{company.join_code}"
    
    # We can use a public QR code API to generate the image URL
    qr_code_image_url = f"https://api.qrserver.com/v1/create-qr-code/?size=400x400&data={join_link}"
    
    return {
        "join_code": company.join_code,
        "join_url": join_link,
        "qr_code_url": qr_code_image_url
    }

@router.post("/qrcode/regenerate")
def regenerate_join_code(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not associated with a company")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    
    # Generate new unique join code
    while True:
        new_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        exists = db.query(Company).filter(Company.join_code == new_code).first()
        if not exists:
            break
            
    company.join_code = new_code
    db.commit()
    
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "tlg_checkin_bot")
    join_link = f"https://t.me/{bot_username}?start=join_{company.join_code}"
    qr_code_image_url = f"https://api.qrserver.com/v1/create-qr-code/?size=400x400&data={join_link}"
    
    return {
        "join_code": company.join_code,
        "join_url": join_link,
        "qr_code_url": qr_code_image_url
    }

@router.put("/settings", response_model=CompanySettingsResponse)
def update_settings(settings_data: CompanySettingsUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not associated with a company")
    
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == current_user.company_id).first()
    if not settings:
        settings = CompanySettings(company_id=current_user.company_id)
        db.add(settings)
        
    settings.office_lat = settings_data.office_lat
    settings.office_lng = settings_data.office_lng
    settings.radius = settings_data.radius
    settings.owner_chat_id = settings_data.owner_chat_id
    
    # Auto-link user's telegram_id if provided here (backward compatibility)
    if settings_data.owner_chat_id:
        current_user.telegram_id = settings_data.owner_chat_id
    
    db.commit()
    db.refresh(settings)
    return settings

@router.get("/telegram-link")
def get_telegram_link(current_user: User = Depends(get_current_user)):
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "cfaceai_notify_bot")
    # Using User ID as the secure token to link account
    token = f"linkowner_{current_user.id}"
    link = f"https://t.me/{bot_username}?start={token}"
    return {"url": link}

@router.get("/by-code/{join_code}")
def get_company_by_code(join_code: str, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.join_code == join_code).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found with this join code")
    return {
        "id": company.id,
        "name": company.name,
        "join_code": company.join_code
    }

