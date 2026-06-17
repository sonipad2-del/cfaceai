from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import random
from ..core.database import get_db
from ..core.models import Company, Employee, Ad, AdLog, User
from ..core.dependencies import get_current_user, require_superadmin
from .schemas import AdCreate, AdResponse, AdLogRequest

router = APIRouter(prefix="/ads", tags=["Ads"])

TZ_BANGKOK = timezone(timedelta(hours=7))

def get_current_time_slot() -> str:
    hour = datetime.now(TZ_BANGKOK).hour
    if 5 <= hour < 12:
        return "morning"
    elif 12 <= hour < 17:
        return "afternoon"
    elif 17 <= hour < 22:
        return "evening"
    else:
        return "night"

# 1. Admin: Get all ads
@router.get("", response_model=List[dict])
def get_company_ads(current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    if current_user.role == "superadmin":
        # Superadmin sees all ads globally
        ads = db.query(Ad).all()
    else:
        if not current_user.company_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not associated with a company")
        ads = db.query(Ad).filter(Ad.company_id == current_user.company_id).all()
    
    # Calculate stats for each ad
    results = []
    for ad in ads:
        impressions = db.query(AdLog).filter(AdLog.ad_id == ad.id, AdLog.action_type == "impression").count()
        clicks = db.query(AdLog).filter(AdLog.ad_id == ad.id, AdLog.action_type == "click").count()
        ctr = round((clicks / impressions * 100), 2) if impressions > 0 else 0.0
        
        # Estimate earnings: 1.50 THB per click, 0.05 THB per impression
        revenue = round((clicks * 1.50) + (impressions * 0.05), 2)
        
        results.append({
            "id": ad.id,
            "title": ad.title,
            "image_url": ad.image_url,
            "affiliate_url": ad.affiliate_url,
            "time_slot": ad.time_slot,
            "is_active": ad.is_active,
            "created_at": ad.created_at,
            "impressions": impressions,
            "clicks": clicks,
            "ctr": ctr,
            "revenue": revenue
        })
        
    return results

# 2. Admin: Create a new ad
@router.post("", response_model=AdResponse)
def create_ad(data: AdCreate, current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    company_id = current_user.company_id
    if not company_id:
        if current_user.role == "superadmin":
            # Assign to the first company as fallback/global ad representation
            first_company = db.query(Company).first()
            if not first_company:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No companies exist to assign the ad to")
            company_id = first_company.id
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not associated with a company")
        
    new_ad = Ad(
        company_id=company_id,
        title=data.title,
        image_url=data.image_url,
        affiliate_url=data.affiliate_url,
        time_slot=data.time_slot,
        is_active=True
    )
    db.add(new_ad)
    db.commit()
    db.refresh(new_ad)
    return new_ad

# 3. Admin: Delete an ad
@router.delete("/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ad(ad_id: str, current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    if current_user.role == "superadmin":
        ad = db.query(Ad).filter(Ad.id == ad_id).first()
    else:
        if not current_user.company_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not associated with a company")
        ad = db.query(Ad).filter(Ad.id == ad_id, Ad.company_id == current_user.company_id).first()
        
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ad not found")
        
    db.delete(ad)
    db.commit()
    return None

# 4. Admin: Toggle ad active status
@router.put("/{ad_id}/toggle", response_model=AdResponse)
def toggle_ad(ad_id: str, current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    if current_user.role == "superadmin":
        ad = db.query(Ad).filter(Ad.id == ad_id).first()
    else:
        if not current_user.company_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not associated with a company")
        ad = db.query(Ad).filter(Ad.id == ad_id, Ad.company_id == current_user.company_id).first()
        
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ad not found")
        
    ad.is_active = not ad.is_active
    db.commit()
    db.refresh(ad)
    return ad

# 5. Bot: Get active advertisement based on time_slot and employee's chat_id
@router.get("/active")
def get_active_ad(
    chat_id: str = Query(..., description="Telegram Chat ID of the employee"),
    time_slot: Optional[str] = Query(None, description="Explicit time slot to filter (optional)"),
    db: Session = Depends(get_db)
):
    # Find employee's company
    employee = db.query(Employee).filter(Employee.chat_id == chat_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not registered")
        
    target_slot = time_slot if time_slot else get_current_time_slot()
    
    # Query active ads for the company in this time slot
    ads = db.query(Ad).filter(
        Ad.company_id == employee.company_id,
        Ad.time_slot == target_slot,
        Ad.is_active == True
    ).all()
    
    if not ads:
        # Global fallback — show any active ad in the system (Super Admin ads)
        ads = db.query(Ad).filter(Ad.is_active == True).all()
        
    if not ads:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active ads found for this company")
        
    # Return a random ad from the list
    chosen_ad = random.choice(ads)
    return {
        "id": chosen_ad.id,
        "title": chosen_ad.title,
        "image_url": chosen_ad.image_url,
        "affiliate_url": chosen_ad.affiliate_url,
        "time_slot": chosen_ad.time_slot
    }

# 6. Bot: Log ad impression or click
@router.post("/log")
def log_ad_action(data: AdLogRequest, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.chat_id == data.chat_id).first()
    employee_id = employee.id if employee else None
    
    new_log = AdLog(
        ad_id=data.ad_id,
        employee_id=employee_id,
        action_type=data.action_type
    )
    db.add(new_log)
    db.commit()
    return {"status": "logged"}

@router.get("/redirect/{ad_id}")
def redirect_ad(ad_id: str, chat_id: str, db: Session = Depends(get_db)):
    ad = db.query(Ad).filter(Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ad not found")
        
    employee = db.query(Employee).filter(Employee.chat_id == chat_id).first()
    employee_id = employee.id if employee else None
    
    # Log click action
    new_log = AdLog(
        ad_id=ad.id,
        employee_id=employee_id,
        action_type="click"
    )
    db.add(new_log)
    db.commit()
    
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=ad.affiliate_url)

