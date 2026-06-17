from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.models import User, Employee, Company, CompanySettings

router = APIRouter(prefix="/bot", tags=["Bot"])

@router.post("/link_owner")
def link_owner(payload: dict, db: Session = Depends(get_db)):
    token = payload.get("token")
    chat_id = payload.get("chat_id")
    
    if not token or not chat_id:
        raise HTTPException(status_code=400, detail="Missing token or chat_id")
        
    if not token.startswith("linkowner_"):
        raise HTTPException(status_code=400, detail="Invalid token format")
        
    user_id = token.replace("linkowner_", "")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Owner account not found")
        
    user.telegram_id = str(chat_id)
    
    # Also update CompanySettings.owner_chat_id for backward compatibility
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == user.company_id).first()
    if settings:
        settings.owner_chat_id = str(chat_id)
        
    db.commit()
    return {"status": "success", "message": "Owner linked successfully"}

@router.get("/user/{chat_id}")
def get_user_role(chat_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == chat_id).first()
    employee = db.query(Employee).filter(Employee.chat_id == chat_id).first()
    
    if user:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        company_name = company.name if company else "Unknown Company"
        
        return {
            "role": user.role, # 'owner' or 'superadmin'
            "company_id": str(user.company_id) if user.company_id else None,
            "company_name": company_name,
            "is_dual_role": employee is not None
        }
        
    if employee:
        company = db.query(Company).filter(Company.id == employee.company_id).first()
        company_name = company.name if company else "Unknown Company"
        
        return {
            "role": "employee",
            "company_id": str(employee.company_id),
            "company_name": company_name,
            "employee_id": str(employee.id),
            "full_name": employee.full_name,
            "is_dual_role": user is not None
        }
        
    # 3. Not found
    raise HTTPException(status_code=404, detail="User not found")

@router.get("/owner/dashboard/{chat_id}")
def get_owner_dashboard(chat_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == chat_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Owner not found")
        
    company = db.query(Company).filter(Company.id == user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    # Get stats
    from datetime import datetime, timezone
    from ..core.models import Checkin, LeaveRequest
    
    total_emp = db.query(Employee).filter(Employee.company_id == company.id).count()
    
    today = datetime.now(timezone.utc).date()
    # Checkins today
    checkins_today = db.query(Checkin).join(Employee).filter(
        Employee.company_id == company.id,
        Checkin.check_in_time >= datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    ).all()
    
    present = len(checkins_today)
    late = len([c for c in checkins_today if c.check_in_time.hour >= 2]) # 02:00 UTC = 09:00 BKK
    absent = total_emp - present
    
    pending_leaves = db.query(LeaveRequest).join(Employee).filter(
        Employee.company_id == company.id,
        LeaveRequest.status == 'pending'
    ).count()
    
    return {
        "company_name": company.name,
        "total_emp": total_emp,
        "present": present,
        "late": late,
        "absent": absent,
        "pending_leaves": pending_leaves
    }

@router.put("/leaves/{leave_id}/status")
def bot_update_leave_status(leave_id: str, payload: dict, db: Session = Depends(get_db)):
    from ..core.models import LeaveRequest
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave.status = payload.get("status")
    db.commit()

    return {
        "status": "success",
        "employee_chat_id": leave.employee.chat_id,
        "employee_name": leave.employee.full_name,
        "leave_type": leave.leave_type
    }

@router.get("/owner/pending_leaves/{chat_id}")
def get_pending_leaves(chat_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == chat_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Owner not found")
        
    company_id = user.company_id
    from ..core.models import LeaveRequest
    
    pending = db.query(LeaveRequest).join(Employee).filter(
        Employee.company_id == company_id,
        LeaveRequest.status == 'pending'
    ).all()
    
    result = []
    for l in pending:
        result.append({
            "id": str(l.id),
            "employee_name": l.employee.full_name,
            "leave_type": l.leave_type,
            "start_date": l.start_date.strftime("%d/%m/%Y"),
            "end_date": l.end_date.strftime("%d/%m/%Y") if l.end_date else l.start_date.strftime("%d/%m/%Y"),
            "total_days": l.total_days,
            "reason": l.reason
        })
        
    return result

@router.post("/owner/announcements")
def create_bot_announcement(payload: dict, db: Session = Depends(get_db)):
    chat_id = payload.get("chat_id")
    message_text = payload.get("message")
    
    user = db.query(User).filter(User.telegram_id == chat_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Owner not found")
        
    from ..core.models import Announcement, AnnouncementLog
    
    # 1. Create Announcement
    announcement = Announcement(
        company_id=user.company_id,
        title="ประกาศจากบริษัท",
        message=message_text,
        created_by=user.id
    )
    db.add(announcement)
    db.flush()
    
    # 2. Get all employees in company
    employees = db.query(Employee).filter(Employee.company_id == user.company_id).all()
    employee_chat_ids = []
    
    for emp in employees:
        if emp.chat_id:
            employee_chat_ids.append(emp.chat_id)
            # Create log
            log = AnnouncementLog(
                announcement_id=announcement.id,
                employee_id=emp.id
            )
            db.add(log)
            
    db.commit()
    
    return {
        "status": "success",
        "announcement_id": str(announcement.id),
        "employee_chat_ids": employee_chat_ids
    }

@router.put("/announcements/{announcement_id}/read/{chat_id}")
def mark_announcement_read(announcement_id: str, chat_id: str, db: Session = Depends(get_db)):
    from ..core.models import AnnouncementLog, Employee
    from datetime import datetime, timezone
    
    emp = db.query(Employee).filter(Employee.chat_id == chat_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    log = db.query(AnnouncementLog).filter(
        AnnouncementLog.announcement_id == announcement_id,
        AnnouncementLog.employee_id == emp.id
    ).first()
    
    if log and not log.read_at:
        log.read_at = datetime.now(timezone.utc)
        db.commit()
        
    return {"status": "success"}

@router.get("/owner/promotions/{chat_id}")
def get_owner_promotions(chat_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == chat_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Owner not found")
        
    from ..core.models import Ad
    import random
    
    # Get active ads (globally or for this company)
    ads = db.query(Ad).filter(
        (Ad.company_id == user.company_id) | (Ad.company_id == None),
        Ad.is_active == True
    ).all()
    
    if not ads:
        return []
        
    # Return a random active ad or all
    ad = random.choice(ads)
    
    return [{
        "id": str(ad.id),
        "title": ad.title,
        "image_url": ad.image_url,
        "affiliate_url": ad.affiliate_url,
        "message": f"🔥 โปรโมชั่นพิเศษ!\n\n{ad.title}\n\n👉 ดูรายละเอียด: {ad.affiliate_url}" if ad.affiliate_url else f"🔥 โปรโมชั่นพิเศษ!\n\n{ad.title}"
    }]
