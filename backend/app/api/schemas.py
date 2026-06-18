from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    company_name: str
    terms_accepted: bool = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str

class CompanyResponse(BaseModel):
    id: str
    name: str
    join_code: str
    created_at: datetime
    class Config:
        from_attributes = True

class CompanySettingsResponse(BaseModel):
    company_id: str
    office_lat: float
    office_lng: float
    radius: float
    owner_chat_id: Optional[str] = None
    class Config:
        from_attributes = True

class CompanySettingsUpdate(BaseModel):
    office_lat: float
    office_lng: float
    radius: float
    owner_chat_id: Optional[str] = None

class EmployeeRegister(BaseModel):
    chat_id: str
    full_name: str
    join_code: str

class EmployeeResponse(BaseModel):
    id: str
    company_id: str
    chat_id: Optional[str] = None
    full_name: str
    status: str
    face_registered: bool
    face_photo_path: Optional[str] = None
    base_rate: float
    employment_type: str
    created_at: datetime
    monthly_hours: Optional[float] = 0.0
    monthly_salary: Optional[float] = 0.0
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    start_date: Optional[str] = None
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    id_card: Optional[str] = None
    day_off: Optional[str] = None
    class Config:
        from_attributes = True

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    status: Optional[str] = None
    base_rate: Optional[float] = None
    employment_type: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    start_date: Optional[str] = None
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    id_card: Optional[str] = None
    day_off: Optional[str] = None

class EmployeeSelfRegister(BaseModel):
    full_name: str
    join_code: str
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None

class EmployeeApprove(BaseModel):
    base_rate: float
    employment_type: str
    position: Optional[str] = None
    department: Optional[str] = None

class PayrollExtraCreate(BaseModel):
    employee_id: str
    type: str
    amount: float
    description: Optional[str] = None
    month: int
    year: int

class PayrollDeductionCreate(BaseModel):
    employee_id: str
    type: str
    amount: float
    description: Optional[str] = None
    month: int
    year: int

class AdvanceCreate(BaseModel):
    chat_id: str
    amount: float
    reason: Optional[str] = None
    month: int
    year: int

class CheckinRequest(BaseModel):
    chat_id: str
    lat: float
    lng: float

class CheckinResponse(BaseModel):
    id: str
    employee_id: str
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    distance_in: Optional[float] = None
    distance_out: Optional[float] = None
    match_score: Optional[int] = None
    class Config:
        from_attributes = True

class AdCreate(BaseModel):
    title: str
    image_url: str
    affiliate_url: str
    time_slot: str # 'morning', 'afternoon', 'evening', 'night'

class AdResponse(BaseModel):
    id: str
    title: str
    image_url: str
    affiliate_url: str
    time_slot: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class AdLogRequest(BaseModel):
    ad_id: str
    chat_id: str
    action_type: str # 'impression', 'click'

class LeaveSubmit(BaseModel):
    chat_id: str
    leave_type: str
    start_date: str
    end_date: str
    total_days: int
    reason: str
    attachment_path: Optional[str] = None

class LeaveStatusUpdate(BaseModel):
    status: str

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    image_url: Optional[str] = None

class AnnouncementResponse(BaseModel):
    id: str
    company_id: str
    title: str
    message: str
    image_url: Optional[str] = None
    created_by: Optional[str] = None
    status: str
    created_at: datetime
    sent_at: Optional[datetime] = None
    sent_count: Optional[int] = 0
    read_count: Optional[int] = 0
    clicked_count: Optional[int] = 0

    class Config:
        from_attributes = True
