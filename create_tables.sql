-- Supabase SQL Schema for Telegram Location Check-in & Ads Management System (tlg-web)

-- 1. Create Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    join_code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Company Settings table (1-to-1 with companies)
CREATE TABLE IF NOT EXISTS company_settings (
    company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    office_lat DOUBLE PRECISION DEFAULT 13.7261,
    office_lng DOUBLE PRECISION DEFAULT 100.5260,
    radius DOUBLE PRECISION DEFAULT 200.0, -- in meters
    owner_chat_id VARCHAR(100), -- Owner's telegram chat_id to notify new employee registers/check-ins
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Users table (Dashboard admins)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'owner',
    telegram_id VARCHAR(100) UNIQUE,
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_version VARCHAR(50) DEFAULT 'v1.0',
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    chat_id VARCHAR(100) UNIQUE, -- Telegram chat ID of employee
    full_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'pending', 'active', 'inactive'
    face_registered BOOLEAN DEFAULT FALSE,
    face_photo_path VARCHAR(255),
    base_rate DOUBLE PRECISION DEFAULT 0.0,
    employment_type VARCHAR(50) DEFAULT 'monthly',
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_version VARCHAR(50) DEFAULT 'v1.0',
    accepted_at TIMESTAMP WITH TIME ZONE,
    phone VARCHAR(20),
    email VARCHAR(255),
    position VARCHAR(100),
    department VARCHAR(100),
    start_date VARCHAR(50),
    bank_account VARCHAR(50),
    bank_name VARCHAR(100),
    id_card VARCHAR(20),
    day_off VARCHAR(50),
    profile_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Checkins table
CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_time TIMESTAMP WITH TIME ZONE,
    distance_in DOUBLE PRECISION,
    distance_out DOUBLE PRECISION,
    match_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Ads table
CREATE TABLE IF NOT EXISTS ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    image_url VARCHAR(1000) NOT NULL,
    affiliate_url VARCHAR(1000) NOT NULL,
    time_slot VARCHAR(50) NOT NULL, -- 'morning', 'afternoon', 'evening', 'night'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create Ad Logs table
CREATE TABLE IF NOT EXISTS ad_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, -- 'impression', 'click'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date VARCHAR(100) NOT NULL,
    end_date VARCHAR(100),
    total_days INTEGER DEFAULT 1,
    reason VARCHAR(255) NOT NULL,
    attachment_path VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    image_url VARCHAR(1000),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS announcement_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE
);

-- 10. Payroll Extras / Deductions / Advances
CREATE TABLE IF NOT EXISTS payroll_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    description VARCHAR(255),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    description VARCHAR(255),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    amount DOUBLE PRECISION NOT NULL,
    reason VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_companies_join_code ON companies(join_code);
CREATE INDEX IF NOT EXISTS idx_employees_chat_id ON employees(chat_id);
CREATE INDEX IF NOT EXISTS idx_checkins_employee_id ON checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_ads_time_slot ON ads(time_slot);
CREATE INDEX IF NOT EXISTS idx_ad_logs_ad_id ON ad_logs(ad_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_announcements_company_id ON announcements(company_id);
CREATE INDEX IF NOT EXISTS idx_announcement_logs_ann_id ON announcement_logs(announcement_id);

-- Insert Mock Data
INSERT INTO companies (id, name, join_code)
VALUES ('7cc8a635-430c-4e8c-8515-37ff4bb73a3c', 'คาเฟ่ริมน้ำ', 'K8F3D2')
ON CONFLICT (join_code) DO NOTHING;

INSERT INTO company_settings (company_id, office_lat, office_lng, radius, owner_chat_id)
VALUES ('7cc8a635-430c-4e8c-8515-37ff4bb73a3c', 13.7261, 100.5260, 200.0, NULL)
ON CONFLICT (company_id) DO NOTHING;

-- Insert Mock Ads
-- Morning (05:00 - 11:59)
INSERT INTO ads (company_id, title, image_url, affiliate_url, time_slot, is_active)
VALUES ('7cc8a635-430c-4e8c-8515-37ff4bb73a3c', 'แก้วกาแฟเก็บอุณหภูมิ สดชื่นยามเช้า', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=400&auto=format&fit=crop', 'https://shopee.co.th/search?keyword=coffee%20mug', 'morning', TRUE)
ON CONFLICT DO NOTHING;

-- Afternoon (12:00 - 16:59)
INSERT INTO ads (company_id, title, image_url, affiliate_url, time_slot, is_active)
VALUES ('7cc8a635-430c-4e8c-8515-37ff4bb73a3c', 'พัดลมพกพา ดับร้อนช่วงบ่าย', 'https://images.unsplash.com/photo-1618944913480-b67ee16d7b77?q=80&w=400&auto=format&fit=crop', 'https://shopee.co.th/search?keyword=mini%20fan', 'afternoon', TRUE)
ON CONFLICT DO NOTHING;

-- Evening (17:00 - 21:59)
INSERT INTO ads (company_id, title, image_url, affiliate_url, time_slot, is_active)
VALUES ('7cc8a635-430c-4e8c-8515-37ff4bb73a3c', 'ดีล Grab Food ส่วนลดมื้อเย็นสุดคุ้ม', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=400&auto=format&fit=crop', 'https://shopee.co.th/search?keyword=grabfood', 'evening', TRUE)
ON CONFLICT DO NOTHING;

-- Night (22:00 - 04:59)
INSERT INTO ads (company_id, title, image_url, affiliate_url, time_slot, is_active)
VALUES ('7cc8a635-430c-4e8c-8515-37ff4bb73a3c', 'ของกินเล่น 7-Eleven ยามดึก', 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=400&auto=format&fit=crop', 'https://shopee.co.th/search?keyword=snack', 'night', TRUE)
ON CONFLICT DO NOTHING;

-- Insert default superadmin
INSERT INTO users (email, password_hash, role, company_id)
VALUES ('superadmin@cfaceai.com', '$2b$12$Hm6EzYGKWSvydHpLT1smau8zcwVVeOESQZ.T/Tjq9XNWwDxwnFf/e', 'superadmin', NULL)
ON CONFLICT (email) DO NOTHING;

