import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the parent directory to Python path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.core.database import Base
from backend.app.core.models import Company, CompanySettings, Ad

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("[ERROR] DATABASE_URL is not set in backend/.env")
    sys.exit(1)

print(f"Connecting to database at: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")

try:
    # Set up engine
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        engine = create_engine(DATABASE_URL)
        
    # 1. Create all tables using SQLAlchemy ORM (automatic & database-agnostic)
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed mock data
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if mock company exists
        company_id = '7cc8a635-430c-4e8c-8515-37ff4bb73a3c'
        existing_company = db.query(Company).filter(Company.id == company_id).first()
        
        if not existing_company:
            print("Seeding mock company: คาเฟ่ริมน้ำ...")
            mock_company = Company(
                id=company_id,
                name="คาเฟ่ริมน้ำ",
                join_code="K8F3D2"
            )
            db.add(mock_company)
            db.flush()
            
            # Create settings
            mock_settings = CompanySettings(
                company_id=company_id,
                office_lat=13.7261,
                office_lng=100.5260,
                radius=200.0,
                owner_chat_id=None
            )
            db.add(mock_settings)
            
            # Create mock ads
            mock_ads = [
                Ad(
                    company_id=company_id,
                    title="แก้วกาแฟเก็บอุณหภูมิ สดชื่นยามเช้า",
                    image_url="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=400&auto=format&fit=crop",
                    affiliate_url="https://shopee.co.th/search?keyword=coffee%20mug",
                    time_slot="morning",
                    is_active=True
                ),
                Ad(
                    company_id=company_id,
                    title="พัดลมพกพา ดับร้อนช่วงบ่าย",
                    image_url="https://images.unsplash.com/photo-1618944913480-b67ee16d7b77?q=80&w=400&auto=format&fit=crop",
                    affiliate_url="https://shopee.co.th/search?keyword=mini%20fan",
                    time_slot="afternoon",
                    is_active=True
                ),
                Ad(
                    company_id=company_id,
                    title="ดีล Grab Food ส่วนลดมื้อเย็นสุดคุ้ม",
                    image_url="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=400&auto=format&fit=crop",
                    affiliate_url="https://shopee.co.th/search?keyword=grabfood",
                    time_slot="evening",
                    is_active=True
                ),
                Ad(
                    company_id=company_id,
                    title="ของกินเล่น 7-Eleven ยามดึก",
                    image_url="https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=400&auto=format&fit=crop",
                    affiliate_url="https://shopee.co.th/search?keyword=snack",
                    time_slot="night",
                    is_active=True
                )
            ]
            db.bulk_save_objects(mock_ads)
            db.commit()
            print("[SUCCESS] Seeding completed successfully!")
        else:
            print("Mock company already exists. Skipping seeding.")
            
        print("[SUCCESS] Database schema initialized successfully!")
        
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
            
except Exception as e:
    print(f"[ERROR] Database initialization failed: {e}")
    sys.exit(1)
