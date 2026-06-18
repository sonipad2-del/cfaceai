from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, timezone, timedelta, time
import os
import sys
import tempfile
import cv2
import numpy as np

# Fix Windows encoding for DeepFace emoji logs
os.environ.setdefault("PYTHONIOENCODING", "utf-8")

try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False

from ..core.database import get_db
from ..core.models import Company, CompanySettings, Employee, Checkin, User
from ..core.dependencies import get_current_user
from ..services.gps_service import calculate_distance
from .schemas import CheckinRequest, CheckinResponse

router = APIRouter(prefix="/checkins", tags=["Checkins"])

# Bangkok timezone
TZ_BANGKOK = timezone(timedelta(hours=7))

def get_local_today_range():
    # Return UTC start and end datetimes for today in Bangkok time
    now_bangkok = datetime.now(TZ_BANGKOK)
    start_bangkok = now_bangkok.replace(hour=0, minute=0, second=0, microsecond=0)
    end_bangkok = start_bangkok + timedelta(days=1)
    return start_bangkok, end_bangkok

@router.get("")
def get_all_checkins(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.company_id and current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not associated with a company")

    query = db.query(Checkin, Employee).join(Employee, Checkin.employee_id == Employee.id)
    if current_user.company_id:
        query = query.filter(Employee.company_id == current_user.company_id)
    results = query.order_by(Checkin.check_in_time.desc()).all()
        
    checkins_list = []
    for checkin, employee in results:
        checkins_list.append({
            "id": checkin.id,
            "employee_id": employee.id,
            "employee_name": employee.full_name,
            "chat_id": employee.chat_id,
            "check_in_time": checkin.check_in_time,
            "check_out_time": checkin.check_out_time,
            "distance_in": checkin.distance_in,
            "distance_out": checkin.distance_out,
            "created_at": checkin.created_at
        })
        
    return checkins_list

@router.post("")
def record_checkin(request_data: CheckinRequest, db: Session = Depends(get_db)):
    # 1. Find employee by chat_id
    employee = db.query(Employee).filter(Employee.chat_id == request_data.chat_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not registered")
        
    # 2. Get company settings
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == employee.company_id).first()
    if not settings:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company settings not found")
        
    # 3. Calculate distance
    distance = calculate_distance(request_data.lat, request_data.lng, settings.office_lat, settings.office_lng)
    
    if distance > settings.radius:
        return {
            "status": "out_of_bounds",
            "distance": round(distance, 1),
            "radius": settings.radius
        }
        
    # 4. Check if they have an active check-in today
    start_today, end_today = get_local_today_range()
    
    existing_checkin = db.query(Checkin).filter(
        Checkin.employee_id == employee.id,
        Checkin.check_in_time >= start_today,
        Checkin.check_in_time < end_today
    ).order_by(Checkin.check_in_time.desc()).first()
    
    now_utc = datetime.now(timezone.utc)
    
    if existing_checkin and existing_checkin.check_out_time is None:
        # Check out
        existing_checkin.check_out_time = now_utc
        existing_checkin.distance_out = distance
        db.commit()
        db.refresh(existing_checkin)
        return {
            "status": "success",
            "action": "check_out",
            "employee_name": employee.full_name,
            "time": now_utc.astimezone(TZ_BANGKOK).strftime("%H:%M น."),
            "distance": round(distance, 1)
        }
    else:
        # Check in
        new_checkin = Checkin(
            employee_id=employee.id,
            check_in_time=now_utc,
            distance_in=distance
        )
        db.add(new_checkin)
        db.commit()
        db.refresh(new_checkin)
        return {
            "status": "success",
            "action": "check_in",
            "employee_name": employee.full_name,
            "time": now_utc.astimezone(TZ_BANGKOK).strftime("%H:%M น."),
            "distance": round(distance, 1)
        }

@router.post("/check-location")
def check_location(request_data: CheckinRequest, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.chat_id == request_data.chat_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not registered")
        
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == employee.company_id).first()
    if not settings:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company settings not found")
        
    distance = calculate_distance(request_data.lat, request_data.lng, settings.office_lat, settings.office_lng)
    
    if distance > settings.radius:
        return {
            "status": "out_of_bounds",
            "distance": round(distance, 1),
            "radius": settings.radius
        }
        
    return {
        "status": "awaiting_selfie",
        "employee_name": employee.full_name,
        "face_registered": employee.face_registered
    }

@router.post("/verify-face")
async def verify_face(
    chat_id: str,
    lat: float,
    lng: float,
    file: UploadFile = File(...),
    action: Optional[str] = Query(None, description="Forced action: 'check_in' or 'check_out'. Auto-detects if omitted."),
    db: Session = Depends(get_db)
):
    # 1. Find employee
    employee = db.query(Employee).filter(Employee.chat_id == chat_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not registered")
        
    # 2. Get settings
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == employee.company_id).first()
    if not settings:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company settings not found")
        
    # 3. Double-check distance
    distance = calculate_distance(lat, lng, settings.office_lat, settings.office_lng)
    if distance > settings.radius:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ตำแหน่งพิกัดของคุณอยู่นอกพื้นที่ทำงาน")
        
    # 4. Read selfie bytes
    contents = await file.read()
    
    # 5. Save selfie to temp file for DeepFace
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(contents)
        selfie_path = tmp.name

    match_percentage = 90  # default fallback
    
    try:
        if DEEPFACE_AVAILABLE and employee.face_photo_path and os.path.exists(employee.face_photo_path):
            # === DeepFace Facenet512 Verification (Real Face Recognition) ===
            try:
                result = DeepFace.verify(
                    img1_path=employee.face_photo_path,
                    img2_path=selfie_path,
                    model_name="Facenet512",
                    enforce_detection=True,
                    detector_backend="opencv",
                    threshold=0.50,     # More lenient than default 0.30 — suitable for MVP
                    silent=True         # Suppress emoji logs that crash Windows cp874
                )
                verified = result.get("verified", False)
                distance = result.get("distance", 1.0)
                # Convert distance to match percentage (lower distance = better match)
                # Facenet512 threshold is typically 0.30
                match_percentage = max(0, int((1 - distance) * 100))
                
                if not verified:
                    os.unlink(selfie_path)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"สแกนใบหน้าไม่ผ่าน (Match {match_percentage}%) กรุณาถ่ายรูปหน้าตรง แสงดี ไม่สวมแว่น ลองใหม่อีกครั้งครับ"
                    )
            except HTTPException:
                raise
            except Exception as df_err:
                err_msg = str(df_err)
                if "Face could not be detected" in err_msg or "No face" in err_msg:
                    os.unlink(selfie_path)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="ไม่พบใบหน้าในรูปถ่าย กรุณาถ่ายรูปหน้าตรง แสงดี ไม่สวมแว่นกันแดดครับ"
                    )
                # Other DeepFace errors — fallback to OpenCV
                print(f"DeepFace error, falling back to OpenCV: {repr(df_err)}")
                nparr = np.frombuffer(contents, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                ref_img = cv2.imread(employee.face_photo_path)
                if img is not None and ref_img is not None:
                    ref_hsv = cv2.cvtColor(cv2.resize(ref_img, (200, 200)), cv2.COLOR_BGR2HSV)
                    img_hsv = cv2.cvtColor(cv2.resize(img, (200, 200)), cv2.COLOR_BGR2HSV)
                    hist_ref = cv2.calcHist([ref_hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
                    hist_img = cv2.calcHist([img_hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
                    cv2.normalize(hist_ref, hist_ref, 0, 1, cv2.NORM_MINMAX)
                    cv2.normalize(hist_img, hist_img, 0, 1, cv2.NORM_MINMAX)
                    similarity = cv2.compareHist(hist_ref, hist_img, cv2.HISTCMP_CORREL)
                    match_percentage = max(0, int((similarity + 1) / 2 * 100))
                    if match_percentage < 50:
                        os.unlink(selfie_path)
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"สแกนใบหน้าไม่ผ่าน (ความคล้ายคลึง {match_percentage}%) กรุณาส่งรูปเซลฟี่ใหม่อีกครั้งครับ"
                        )
        else:
            # DeepFace not available or no reference photo — basic face detection only
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                os.unlink(selfie_path)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ไฟล์รูปภาพเซลฟี่ไม่ถูกต้อง")
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            face_cascade = cv2.CascadeClassifier(cascade_path)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
            if len(faces) == 0:
                os.unlink(selfie_path)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ไม่พบใบหน้าในรูปถ่ายเซลฟี่ กรุณาส่งรูปถ่ายเซลฟี่หน้าตรงที่เห็นใบหน้าชัดเจนครับ"
                )
            match_percentage = 90  # Face detected, no reference to compare
    finally:
        try:
            os.unlink(selfie_path)
        except:
            pass
        
    # 7. Complete check-in / check-out
    start_today, end_today = get_local_today_range()
    existing_checkin = db.query(Checkin).filter(
        Checkin.employee_id == employee.id,
        Checkin.check_in_time >= start_today,
        Checkin.check_in_time < end_today
    ).order_by(Checkin.check_in_time.desc()).first()

    now_utc = datetime.now(timezone.utc)
    time_str = now_utc.astimezone(TZ_BANGKOK).strftime("%H:%M น.")

    if action == "check_out":
        # User explicitly chose check-out
        if existing_checkin and existing_checkin.check_out_time is None:
            existing_checkin.check_out_time = now_utc
            existing_checkin.distance_out = distance
            existing_checkin.match_score = match_percentage
            db.commit()
            db.refresh(existing_checkin)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ไม่พบการเช็กอินที่ยังไม่ได้เช็กเอาต์ในวันนี้ กรุณาเลือก 'เข้างาน' ก่อนครับ"
            )
    elif action == "check_in":
        # User explicitly chose check-in — close any open record first
        if existing_checkin and existing_checkin.check_out_time is None:
            existing_checkin.check_out_time = now_utc
            existing_checkin.match_score = match_percentage
            db.commit()
        new_checkin = Checkin(
            employee_id=employee.id,
            check_in_time=now_utc,
            distance_in=distance,
            match_score=match_percentage
        )
        db.add(new_checkin)
        db.commit()
        db.refresh(new_checkin)
    else:
        # Auto-detect (legacy / fallback)
        if existing_checkin and existing_checkin.check_out_time is None:
            existing_checkin.check_out_time = now_utc
            existing_checkin.distance_out = distance
            existing_checkin.match_score = match_percentage
            db.commit()
            db.refresh(existing_checkin)
            action = "check_out"
        else:
            new_checkin = Checkin(
                employee_id=employee.id,
                check_in_time=now_utc,
                distance_in=distance,
                match_score=match_percentage
            )
            db.add(new_checkin)
            db.commit()
            db.refresh(new_checkin)
            action = "check_in"
    
    # 8. Notify owner via Telegram
    try:
        if settings.owner_chat_id:
            bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
            if bot_token:
                action_text = "เช็กอินเข้างาน" if action == "check_in" else "เช็กเอาต์ออกงาน"
                notify_msg = (
                    f"🔔 แจ้งเตือนสแกนใบหน้า {action_text}\n"
                    f"👤 พนักงาน: {employee.full_name}\n"
                    f"🕐 เวลา: {time_str}\n"
                    f"📍 ระยะห่าง: {round(distance, 1)} เมตร\n"
                    f"🤖 Face ID Match: {match_percentage}%"
                )
                import requests as req
                url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                req.post(url, json={"chat_id": settings.owner_chat_id, "text": notify_msg}, timeout=3)
    except Exception:
        pass  # Fail silently
    
    return {
        "status": "success",
        "action": action,
        "employee_name": employee.full_name,
        "time": time_str,
        "distance": round(distance, 1),
        "match_score": match_percentage
    }


@router.get("/today")
def get_today_checkins(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.company_id and current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not associated with a company")

    start_today, end_today = get_local_today_range()

    query = db.query(Checkin, Employee).join(Employee, Checkin.employee_id == Employee.id).filter(
        Checkin.check_in_time >= start_today,
        Checkin.check_in_time < end_today
    )
    if current_user.company_id:
        query = query.filter(Employee.company_id == current_user.company_id)
    results = query.order_by(Checkin.check_in_time.desc()).all()
        
    checkins_list = []
    for checkin, employee in results:
        checkins_list.append({
            "id": checkin.id,
            "employee_id": employee.id,
            "employee_name": employee.full_name,
            "check_in_time": checkin.check_in_time,
            "check_out_time": checkin.check_out_time,
            "distance_in": checkin.distance_in,
            "distance_out": checkin.distance_out
        })
        
    return checkins_list

@router.get("/summary")
def get_checkin_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.company_id and current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not associated with a company")

    start_today, end_today = get_local_today_range()
    is_superadmin = current_user.role == "superadmin"

    # 1. Total active employees
    emp_q = db.query(Employee).filter(Employee.status == "active")
    if not is_superadmin:
        emp_q = emp_q.filter(Employee.company_id == current_user.company_id)
    total_employees = emp_q.count()

    # 2. Today's check-ins
    today_q = db.query(Checkin, Employee).join(Employee, Checkin.employee_id == Employee.id).filter(
        Checkin.check_in_time >= start_today,
        Checkin.check_in_time < end_today
    )
    if not is_superadmin:
        today_q = today_q.filter(Employee.company_id == current_user.company_id)
    today_checkins = today_q.all()

    checked_in_employee_ids = {c.employee_id for c, _ in today_checkins}
    checked_in_count = len(checked_in_employee_ids)

    late_count = 0
    for checkin, _ in today_checkins:
        local_time = checkin.check_in_time.astimezone(TZ_BANGKOK)
        if local_time.time() > time(8, 30):
            late_count += 1

    absent_count = max(0, total_employees - checked_in_count)

    # 3. Weekly chart data (last 7 days)
    weekly_chart = []
    today_date = datetime.now(TZ_BANGKOK).date()
    day_names = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]

    for i in range(6, -1, -1):
        target_date = today_date - timedelta(days=i)
        target_start = datetime.combine(target_date, time.min).replace(tzinfo=TZ_BANGKOK)
        target_end = target_start + timedelta(days=1)

        cnt_q = db.query(Checkin.employee_id).join(Employee, Checkin.employee_id == Employee.id).filter(
            Checkin.check_in_time >= target_start,
            Checkin.check_in_time < target_end
        )
        if not is_superadmin:
            cnt_q = cnt_q.filter(Employee.company_id == current_user.company_id)
        cnt = cnt_q.distinct().count()

        weekday_idx = int(target_date.strftime("%w"))
        weekly_chart.append({
            "name": day_names[weekday_idx],
            "date": target_date.strftime("%d/%m"),
            "count": cnt
        })

    # 4. Ad stats
    from ..core.models import Ad, AdLog
    imp_q = db.query(AdLog).join(Ad, AdLog.ad_id == Ad.id).filter(AdLog.action_type == "impression")
    clk_q = db.query(AdLog).join(Ad, AdLog.ad_id == Ad.id).filter(AdLog.action_type == "click")
    if not is_superadmin:
        imp_q = imp_q.filter(Ad.company_id == current_user.company_id)
        clk_q = clk_q.filter(Ad.company_id == current_user.company_id)

    total_impressions = imp_q.count()
    total_clicks = clk_q.count()
    est_earnings = round((total_clicks * 1.50) + (total_impressions * 0.05), 2)

    return {
        "summary": {
            "total_employees": total_employees,
            "checked_in": checked_in_count,
            "late": late_count,
            "absent": absent_count,
            "total_impressions": total_impressions,
            "total_clicks": total_clicks,
            "est_earnings": est_earnings
        },
        "weekly_chart": weekly_chart
    }

@router.get("/bot/report")
def get_bot_report(owner_chat_id: str, report_type: str, db: Session = Depends(get_db)):
    # Find company settings with this owner_chat_id
    settings = db.query(CompanySettings).filter(CompanySettings.owner_chat_id == owner_chat_id).first()
    if not settings:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized: Chat ID is not registered as an owner")
        
    start_today, end_today = get_local_today_range()
    
    # Get all active employees
    employees = db.query(Employee).filter(
        Employee.company_id == settings.company_id,
        Employee.status == "active"
    ).all()
    
    employee_map = {emp.id: emp for emp in employees}
    
    # Get checkins today
    checkins = db.query(Checkin).filter(
        Checkin.employee_id.in_(list(employee_map.keys())) if employee_map else False,
        Checkin.check_in_time >= start_today,
        Checkin.check_in_time < end_today
    ).all() if employee_map else []
    
    checked_in_ids = {c.employee_id for c in checkins}
    
    if report_type == "today":
        data = []
        for c in checkins:
            emp = employee_map.get(c.employee_id)
            if emp:
                data.append({
                    "name": emp.full_name,
                    "time": c.check_in_time.astimezone(TZ_BANGKOK).strftime("%H:%M น."),
                    "status": "เช็กอินแล้ว"
                })
        return {"report": data}
        
    elif report_type == "late":
        data = []
        for c in checkins:
            local_time = c.check_in_time.astimezone(TZ_BANGKOK)
            if local_time.time() > time(8, 30):
                emp = employee_map.get(c.employee_id)
                if emp:
                    data.append({
                        "name": emp.full_name,
                        "time": local_time.strftime("%H:%M น.")
                    })
        return {"report": data}
        
    elif report_type == "absent":
        absents = [emp.full_name for emp in employees if emp.id not in checked_in_ids]
        return {"report": absents}
        
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

