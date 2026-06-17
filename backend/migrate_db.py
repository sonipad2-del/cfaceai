from sqlalchemy import text
from app.core.database import engine

def migrate():
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE employees RENAME COLUMN hourly_rate TO base_rate;"))
            conn.execute(text("ALTER TABLE employees ADD COLUMN employment_type VARCHAR(50) DEFAULT 'monthly';"))
        print("Migration successful")
    except Exception as e:
        print(f"Migration failed or already applied: {e}")

if __name__ == "__main__":
    migrate()
