# 🗃️ Database Schema Documentation

## Tổng quan

Hệ thống quản lý gym sử dụng PostgreSQL với Sequelize ORM. Database được thiết kế để hỗ trợ đầy đủ các chức năng từ quản lý thành viên, thanh toán, thiết bị đến bảo trì tự động.

## 📊 ERD (Entity Relationship Diagram)

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    Users    │    │     Members      │    │   Memberships   │
├─────────────┤    ├──────────────────┤    ├─────────────────┤
│ id (PK)     │───▶│ id (PK)          │    │ id (PK)         │
│ username    │    │ user_id (FK)     │    │ name            │
│ email       │    │ member_code      │    │ price           │
│ password    │    │ full_name        │    │ duration        │
│ role        │    │ phone            │    │ description     │
│ is_active   │    │ email            │    │ features        │
└─────────────┘    │ date_of_birth    │    │ is_active       │
                   │ gender           │    └─────────────────┘
                   │ address          │             │
                   │ emergency_info   │             │
                   │ join_date        │             │
                   │ is_active        │             │
                   └──────────────────┘             │
                            │                       │
                            ▼                       │
                   ┌──────────────────┐             │
                   │ MembershipHistory│◀────────────┘
                   ├──────────────────┤
                   │ id (PK)          │
                   │ member_id (FK)   │
                   │ membership_id(FK)│
                   │ start_date       │
                   │ end_date         │
                   │ status           │
                   │ purchase_price   │
                   └──────────────────┘
                            │
                            ▼
                   ┌──────────────────┐    ┌─────────────────┐
                   │     Invoices     │    │    Payments     │
                   ├──────────────────┤    ├─────────────────┤
                   │ id (PK)          │───▶│ id (PK)         │
                   │ invoice_number   │    │ member_id (FK)  │
                   │ member_id (FK)   │    │ invoice_id (FK) │
                   │ total_amount     │    │ amount          │
                   │ status           │    │ payment_method  │
                   │ description      │    │ payment_status  │
                   │ due_date         │    │ payment_date    │
                   │ created_at       │    │ reference_no    │
                   └──────────────────┘    └─────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    Equipment    │    │MaintenanceSchedule│    │MaintenanceHistory│
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ id (PK)         │───▶│ id (PK)          │───▶│ id (PK)         │
│ name            │    │ equipment_id(FK) │    │ schedule_id(FK) │
│ category        │    │ frequency_days   │    │ equipment_id(FK)│
│ brand           │    │ last_completed   │    │ performed_date  │
│ model           │    │ next_due         │    │ description     │
│ serial_number   │    │ is_active        │    │ performed_by    │
│ status          │    │ description      │    │ notes           │
│ purchase_date   │    └──────────────────┘    │ status          │
│ warranty_expiry │                            └─────────────────┘
└─────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Classes     │    │   ClassSchedule  │    │ ClassEnrollment │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ id (PK)         │───▶│ id (PK)          │    │ id (PK)         │
│ name            │    │ class_id (FK)    │    │ member_id (FK)  │
│ description     │    │ trainer_id (FK)  │    │ schedule_id(FK) │
│ trainer_id (FK) │    │ start_time       │    │ enrolled_date   │
│ max_capacity    │    │ end_time         │    │ status          │
│ duration        │    │ day_of_week      │    │ payment_status  │
│ price           │    │ is_active        │    └─────────────────┘
│ is_active       │    └──────────────────┘
└─────────────────┘
```

## 📋 Bảng chi tiết

### 1. Users (Người dùng)
Quản lý tài khoản đăng nhập cho tất cả các loại người dùng.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role user_role_enum NOT NULL DEFAULT 'member',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enum for roles
CREATE TYPE user_role_enum AS ENUM ('admin', 'trainer', 'member');
```

**Các trường quan trọng:**
- `role`: Phân quyền hệ thống (admin, trainer, member)
- `is_active`: Trạng thái tài khoản (cho phép vô hiệu hóa)
- `password_hash`: Mật khẩu được mã hóa bằng bcrypt

### 2. RefreshTokens (Token làm mới)
Quản lý refresh tokens cho JWT authentication.

```sql
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Members (Thành viên)
Lưu thông tin chi tiết của thành viên gym.

```sql
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    member_code VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    date_of_birth DATE,
    gender gender_enum,
    address TEXT,
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    join_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
```

**Tính năng đặc biệt:**
- `member_code`: Mã thành viên tự động (format: GM2024010001)
- `user_id`: Liên kết với tài khoản đăng nhập (nullable cho guest members)

### 4. Memberships (Gói thành viên)
Định nghĩa các loại gói tập có sẵn.

```sql
CREATE TABLE memberships (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    duration INTEGER NOT NULL, -- số ngày
    description TEXT,
    features JSONB, -- danh sách tính năng
    max_classes_per_month INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. MembershipHistory (Lịch sử gói tập)
Theo dõi việc mua và sử dụng gói tập của thành viên.

```sql
CREATE TABLE membership_history (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    membership_id INTEGER REFERENCES memberships(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status membership_status_enum DEFAULT 'active',
    purchase_price DECIMAL(10,2) NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE membership_status_enum AS ENUM ('active', 'expired', 'cancelled', 'suspended');
```

### 6. Invoices (Hóa đơn)
Quản lý hóa đơn thanh toán tự động.

```sql
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    status invoice_status_enum DEFAULT 'pending',
    description TEXT,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE invoice_status_enum AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
```

**Tính năng:**
- Tự động tạo khi thành viên đăng ký dịch vụ
- Tự động cập nhật trạng thái quá hạn
- Số hóa đơn tự động theo format

### 7. InvoiceItems (Chi tiết hóa đơn)
Chi tiết các dịch vụ trong hóa đơn.

```sql
CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    item_type VARCHAR(50), -- 'membership', 'class', 'service'
    item_reference_id INTEGER, -- ID của membership, class, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 8. Payments (Thanh toán)
Ghi nhận các giao dịch thanh toán.

```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method_enum NOT NULL,
    payment_status payment_status_enum DEFAULT 'pending',
    payment_date TIMESTAMP,
    reference_number VARCHAR(100),
    notes TEXT,
    processed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE payment_method_enum AS ENUM ('cash', 'card', 'bank_transfer', 'mobile_payment');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed', 'refunded');
```

### 9. Equipment (Thiết bị)
Quản lý thiết bị gym.

```sql
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    brand VARCHAR(50),
    model VARCHAR(50),
    serial_number VARCHAR(100) UNIQUE,
    status equipment_status_enum DEFAULT 'active',
    purchase_date DATE,
    warranty_expiry DATE,
    location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE equipment_status_enum AS ENUM ('active', 'maintenance', 'retired', 'broken');
```

### 10. MaintenanceSchedules (Lịch bảo trì)
Quản lý lịch bảo trì thiết bị tự động.

```sql
CREATE TABLE maintenance_schedules (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
    frequency_days INTEGER NOT NULL, -- chu kỳ bảo trì (ngày)
    last_completed_date DATE,
    next_due_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    maintenance_type VARCHAR(50), -- 'routine', 'preventive', 'corrective'
    description TEXT,
    estimated_duration INTEGER, -- phút
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 11. MaintenanceHistory (Lịch sử bảo trì)
Ghi nhận các lần bảo trì đã thực hiện.

```sql
CREATE TABLE maintenance_history (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
    schedule_id INTEGER REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
    performed_date TIMESTAMP NOT NULL,
    performed_by INTEGER REFERENCES users(id),
    description TEXT NOT NULL,
    notes TEXT,
    cost DECIMAL(10,2),
    status maintenance_history_status_enum DEFAULT 'completed',
    next_maintenance_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE maintenance_history_status_enum AS ENUM ('completed', 'incomplete', 'cancelled');
```

### 12. Classes (Lớp tập)
Quản lý các lớp tập.

```sql
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    trainer_id INTEGER REFERENCES users(id),
    max_capacity INTEGER NOT NULL,
    duration INTEGER NOT NULL, -- phút
    price DECIMAL(10,2),
    difficulty_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
    equipment_requirements TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 13. ClassSchedules (Lịch lớp tập)
Lịch trình các buổi tập.

```sql
CREATE TABLE class_schedules (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    trainer_id INTEGER REFERENCES users(id),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    room_location VARCHAR(50),
    max_participants INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 14. ClassEnrollments (Đăng ký lớp tập)
Quản lý việc đăng ký lớp của thành viên.

```sql
CREATE TABLE class_enrollments (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    class_schedule_id INTEGER REFERENCES class_schedules(id) ON DELETE CASCADE,
    enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status enrollment_status_enum DEFAULT 'enrolled',
    payment_status VARCHAR(20) DEFAULT 'pending',
    attendance_status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE enrollment_status_enum AS ENUM ('enrolled', 'cancelled', 'completed', 'no_show');
```

### 15. Promotions (Khuyến mãi)
Quản lý các chương trình khuyến mãi.

```sql
CREATE TABLE promotions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_type promotion_discount_enum NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_amount DECIMAL(10,2),
    max_discount DECIMAL(10,2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    applicable_items JSONB, -- loại dịch vụ áp dụng
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE promotion_discount_enum AS ENUM ('percentage', 'fixed_amount');
```

### 16. PromotionUsages (Sử dụng khuyến mãi)
Theo dõi việc sử dụng mã khuyến mãi.

```sql
CREATE TABLE promotion_usages (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER REFERENCES promotions(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Indexes và Constraints

### Indexes quan trọng
```sql
-- Performance indexes
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_invoices_member_status ON invoices(member_id, status);
CREATE INDEX idx_payments_member_date ON payments(member_id, payment_date);
CREATE INDEX idx_maintenance_schedules_next_due ON maintenance_schedules(next_due_date);
CREATE INDEX idx_class_schedules_day_time ON class_schedules(day_of_week, start_time);

-- Unique constraints
ALTER TABLE members ADD CONSTRAINT uk_members_member_code UNIQUE (member_code);
ALTER TABLE invoices ADD CONSTRAINT uk_invoices_number UNIQUE (invoice_number);
```

### Triggers tự động
```sql
-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- (repeat for other tables...)
```

## 📊 Quan hệ và ràng buộc

### Quan hệ chính:
- **Users ↔ Members**: 1:1 (optional) - User có thể không có member profile
- **Members ↔ MembershipHistory**: 1:n - Member có thể có nhiều gói tập
- **Members ↔ Invoices**: 1:n - Member có nhiều hóa đơn
- **Invoices ↔ Payments**: 1:n - Hóa đơn có thể thanh toán nhiều lần
- **Equipment ↔ MaintenanceSchedules**: 1:n - Thiết bị có nhiều lịch bảo trì

### Ràng buộc nghiệp vụ:
- Không thể mua gói tập mới khi còn hóa đơn membership chưa thanh toán
- Thiết bị phải có ít nhất 1 lịch bảo trì khi status = 'active'
- Member chỉ có thể có 1 gói membership active tại một thời điểm
- Trainer chỉ có thể được assign cho 1 class tại 1 thời điểm

## 🚀 Migration Scripts

Các file migration được lưu trong thư mục `migrations/`:
- `create_equipment_tables.sql`
- `create_maintenance_schedule_and_history_tables.sql`
- `add_maintenance_tables_simple.sql`
- `update_invoice_status_enum.sql`

## 🔄 Seeder Data

Dữ liệu mẫu được tạo thông qua:
- `seeders/membershipSeeder.js` - Tạo các gói membership cơ bản
- `seeders/classTypeSeeder.js` - Tạo các loại lớp tập
- `scripts/createTestData.js` - Tạo dữ liệu test hoàn chỉnh

---

**Lưu ý**: Schema này được thiết kế để hỗ trợ mở rộng trong tương lai với các tính năng như nutrition tracking, personal training, member check-ins, và reporting nâng cao.

**Tác giả**: Đặng Đức Cường  
**Phiên bản**: 1.0.0  
**Cập nhật**: August 2025