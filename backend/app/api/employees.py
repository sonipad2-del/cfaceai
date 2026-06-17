from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..core.models import Company, Employee, User, CompanySettings, Checkin, LeaveRequest
from ..core.dependencies import get_current_user
from .schemas import EmployeeRegister, EmployeeResponse, EmployeeUpdate
from datetime import datetime, timezone, timedelta, time
import requests
import os
import cv2
import numpy as np

router = APIRouter(prefix="/employees", tags=["Employees"])

# 1. List employees for the admin's company (with monthly payroll calculation)
@router.get("")
def get_employees(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.company_id and current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not associated with a company")

    if current_user.company_id:
        employees = db.query(Employee).filter(Employee.company_id == current_user.company_id).all()
    else:
        employees = db.query(Employee).all()
    
    # Calculate monthly hours for each employee
    TZ_BANGKOK = timezone(timedelta(hours=7))
    now_bangkok = datetime.now(TZ_BANGKOK)
    month_start = now_bangkok.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    result = []
    for emp in employees:
        # Get all completed checkins this month
        checkins = db.query(Checkin).filter(
            Checkin.employee_id == emp.id,
            Checkin.check_in_time >= month_start,
            Checkin.check_out_time.isnot(None)
        ).all()
        
        total_hours = 0.0
        for c in checkins:
            if c.check_out_time and c.check_in_time:
                diff = (c.check_out_time - c.check_in_time).total_seconds() / 3600.0
                total_hours += max(0, diff)
        
        monthly_salary = round(total_hours * (emp.base_rate or 0.0), 2)

        result.append({
            "id": emp.id,
            "company_id": emp.company_id,
            "chat_id": emp.chat_id,
            "full_name": emp.full_name,
            "status": emp.status,
            "face_registered": emp.face_registered,
            "face_photo_path": emp.face_photo_path,
            "base_rate": emp.base_rate or 0.0,
            "created_at": emp.created_at,
            "monthly_hours": round(total_hours, 2),
            "monthly_salary": monthly_salary
        })
    
    return result

# 2. Register a new employee (called by the Telegram Bot)
@router.post("/register", response_model=EmployeeResponse)
def register_employee(data: EmployeeRegister, db: Session = Depends(get_db)):
    # Find company by join code
    company = db.query(Company).filter(Company.join_code == data.join_code).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid join code"
        )
    
    # Check if employee already registered (chat_id must be unique)
    existing_employee = db.query(Employee).filter(Employee.chat_id == data.chat_id).first()
    if existing_employee:
        # If already registered, we can just update the full name and company
        existing_employee.full_name = data.full_name
        existing_employee.company_id = company.id
        existing_employee.status = "active"
        existing_employee.terms_accepted = True
        existing_employee.terms_version = "v1.0"
        existing_employee.accepted_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing_employee)
        return existing_employee
        
    # Create employee record
    new_employee = Employee(
        company_id=company.id,
        chat_id=data.chat_id,
        full_name=data.full_name,
        status="active",
        terms_accepted=True,
        terms_version="v1.0",
        accepted_at=datetime.now(timezone.utc)
    )
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    
    # Notify Owner via Telegram if owner_chat_id is set
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == company.id).first()
    if settings and settings.owner_chat_id:
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if bot_token:
            msg = (
                f"👤 พนักงานใหม่\n"
                f"ชื่อ: {new_employee.full_name}\n"
                f"เวลา: {new_employee.created_at.strftime('%H:%M น.')}"
            )
            # Make a non-blocking request to telegram bot send message API
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            try:
                requests.post(url, json={"chat_id": settings.owner_chat_id, "text": msg}, timeout=5)
            except Exception:
                pass # Fail silently if telegram notification fails
                
    return new_employee

# 3. Delete an employee
@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(employee_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not associated with a company")
        
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == current_user.company_id
    ).first()
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found or doesn't belong to your company"
        )
        
    db.delete(employee)
    db.commit()
    return None

# Update employee details (name, status, hourly_rate)
@router.put("/{employee_id}")
def update_employee(employee_id: str, data: EmployeeUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not associated with a company")
        
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == current_user.company_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    
    if data.full_name is not None:
        employee.full_name = data.full_name
    if data.status is not None:
        employee.status = data.status
    if data.base_rate is not None:
        employee.base_rate = data.base_rate
    if data.employment_type is not None:
        employee.employment_type = data.employment_type
    
    db.commit()
    db.refresh(employee)
    return {"status": "success", "message": "อัปเดตข้อมูลพนักงานเรียบร้อยแล้ว"}

@router.get("/bot/list")
def get_bot_employee_list(owner_chat_id: str, db: Session = Depends(get_db)):
    # Find company settings with this owner_chat_id
    settings = db.query(CompanySettings).filter(CompanySettings.owner_chat_id == owner_chat_id).first()
    if not settings:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized: Chat ID is not registered as an owner")
        
    employees = db.query(Employee).filter(
        Employee.company_id == settings.company_id,
        Employee.status == "active"
    ).all()
    
    return {"employees": [{"chat_id": emp.chat_id, "name": emp.full_name} for emp in employees]}

# 4. Register Face ID (called by Telegram Bot during signup)
@router.post("/register-face")
async def register_face(chat_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ไฟล์รูปภาพไม่ถูกต้อง")
        
    # Load OpenCV Face Detector (Haar Cascade)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)
    
    # Convert to grayscale for face detection
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    
    if len(faces) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ไม่พบใบหน้าในรูปถ่าย กรุณาส่งรูปถ่ายหน้าตรงที่เห็นใบหน้าของคุณชัดเจนครับ"
        )
        
    # Find employee
    employee = db.query(Employee).filter(Employee.chat_id == chat_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ไม่พบข้อมูลพนักงานในระบบ")
        
    # Save face image
    storage_dir = os.path.join("storage", "faces")
    os.makedirs(storage_dir, exist_ok=True)
    
    file_path = os.path.join(storage_dir, f"{chat_id}.jpg")
    cv2.imwrite(file_path, img)
    
    # Update employee DB record
    employee.face_registered = True
    employee.face_photo_path = file_path
    db.commit()
    
    return {"status": "success", "message": "ลงทะเบียน Face ID เรียบร้อยแล้ว"}

@router.get("/bot/history")
def get_employee_history(chat_id: str, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.chat_id == chat_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    TZ_BANGKOK = timezone(timedelta(hours=7))
    now_bangkok = datetime.now(TZ_BANGKOK)
    month_start = now_bangkok.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Calculate days worked (unique days in checkins this month)
    checkins = db.query(Checkin).filter(
        Checkin.employee_id == employee.id,
        Checkin.check_in_time >= month_start
    ).all()
    
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == employee.company_id).first()
    late_cutoff = time(8, 30)

    worked_dates = set()
    late_count = 0
    for c in checkins:
        local_time = c.check_in_time.astimezone(TZ_BANGKOK)
        date_str = local_time.date().isoformat()
        worked_dates.add(date_str)

        if local_time.time() > late_cutoff:
            late_count += 1
            
    days_worked = len(worked_dates)
    
    # Calculate approved leaves this month
    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee.id,
        LeaveRequest.status == 'approved',
        LeaveRequest.created_at >= month_start
    ).all()
    leaves_count = len(leaves)
    
    return {
        "days_worked": days_worked,
        "late_count": late_count,
        "leaves_count": leaves_count
    }

@router.get("/bot/salary")
def get_bot_salary(chat_id: str, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.chat_id == chat_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    TZ_BANGKOK = timezone(timedelta(hours=7))
    now_bangkok = datetime.now(TZ_BANGKOK)
    month_start = now_bangkok.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_name = now_bangkok.strftime("%B %Y")

    checkins = db.query(Checkin).filter(
        Checkin.employee_id == employee.id,
        Checkin.check_in_time >= month_start
    ).all()

    days_worked_set = set()
    hours_worked = 0.0
    for c in checkins:
        local_in = c.check_in_time.astimezone(TZ_BANGKOK)
        days_worked_set.add(local_in.date().isoformat())
        if c.check_out_time:
            diff = c.check_out_time - c.check_in_time
            hours_worked += diff.total_seconds() / 3600.0

    days_worked = len(days_worked_set)
    base_rate = employee.base_rate or 0.0
    emp_type = employee.employment_type or "monthly"

    if emp_type == "monthly":
        total = base_rate
        rate_label = f"{base_rate:,.0f} บาท/เดือน"
    elif emp_type == "daily":
        total = days_worked * base_rate
        rate_label = f"{base_rate:,.0f} บาท/วัน"
    else:  # hourly
        total = round(hours_worked, 2) * base_rate
        rate_label = f"{base_rate:,.0f} บาท/ชั่วโมง"

    return {
        "full_name": employee.full_name,
        "month": month_name,
        "employment_type": emp_type,
        "rate_label": rate_label,
        "days_worked": days_worked,
        "hours_worked": round(hours_worked, 1),
        "total_payroll": round(total, 2)
    }

@router.get("/payroll")
def get_payroll(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["owner", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    company_id = current_user.company_id
    if current_user.role == "superadmin":
        # For simplicity, if superadmin, just return empty list or all. Let's just return all for superadmin demo.
        employees = db.query(Employee).all()
    else:
        employees = db.query(Employee).filter(Employee.company_id == company_id).all()

    TZ_BANGKOK = timezone(timedelta(hours=7))
    now_bangkok = datetime.now(TZ_BANGKOK)
    month_start = now_bangkok.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    results = []
    for emp in employees:
        checkins = db.query(Checkin).filter(
            Checkin.employee_id == emp.id,
            Checkin.check_in_time >= month_start
        ).all()

        days_worked_set = set()
        hours_worked = 0.0

        for c in checkins:
            local_in = c.check_in_time.astimezone(TZ_BANGKOK)
            days_worked_set.add(local_in.date().isoformat())

            if c.check_out_time:
                diff = c.check_out_time - c.check_in_time
                hours = diff.total_seconds() / 3600.0
                hours_worked += hours

        days_worked = len(days_worked_set)
        
        base_rate = emp.base_rate if emp.base_rate else 0.0
        emp_type = emp.employment_type if emp.employment_type else "monthly"

        total_payroll = 0.0
        if emp_type == "monthly":
            total_payroll = base_rate
        elif emp_type == "daily":
            total_payroll = days_worked * base_rate
        elif emp_type == "hourly":
            total_payroll = hours_worked * base_rate

        results.append({
            "id": emp.id,
            "full_name": emp.full_name,
            "employment_type": emp_type,
            "base_rate": base_rate,
            "days_worked": days_worked,
            "hours_worked": round(hours_worked, 2),
            "total_payroll": round(total_payroll, 2)
        })

    return results
