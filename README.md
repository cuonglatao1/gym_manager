# Gym Manager - Hệ thống quản lý phòng gym

Dự án thực tập về hệ thống quản lý phòng gym với Node.js, Express và PostgreSQL.

## 🚀 Tính năng

- ✅ Đăng ký, đăng nhập, đăng xuất
- ✅ Xác thực JWT với Access Token và Refresh Token
- ✅ Phân quyền: Admin, Trainer, Member
- ✅ Bảo mật: Hash password, CORS
- ✅ Database: PostgreSQL với Sequelize ORM
- ✅ Frontend test đơn giản

## 🛠️ Công nghệ sử dụng

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs
- **Frontend**: HTML, CSS, JavaScript

## 📋 Yêu cầu hệ thống

- Node.js >= 16.0.0
- PostgreSQL >= 12.0
- npm >= 8.0.0

## ⚡ Cài đặt nhanh

### 1. Clone project
\`\`\`bash
git clone <repository-url>
cd gym-manager
\`\`\`

### 2. Cài đặt dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Cấu hình database
- Tạo database PostgreSQL: \`gym_manager_simple\`
- Copy \`.env.example\` thành \`.env\`
- Cập nhật thông tin database trong \`.env\`

### 4. Chạy ứng dụng
\`\`\`bash
# Development
npm run dev

# Production
npm start
\`\`\`

### 5. Test ứng dụng
- Frontend: http://localhost:3000
- API: http://localhost:3000/api
- Health check: http://localhost:3000/api/health

## 👤 Tài khoản mặc định

Hệ thống tự động tạo admin mặc định:
- **Email**: admin@gym.com
- **Password**: admin123
- **Role**: admin

⚠️ **Lưu ý**: Đổi mật khẩu ngay sau khi đăng nhập lần đầu!

## 📚 API Endpoints

### Authentication
- \`POST /api/auth/register\` - Đăng ký
- \`POST /api/auth/login\` - Đăng nhập  
- \`POST /api/auth/logout\` - Đăng xuất
- \`POST /api/auth/refresh\` - Refresh token
- \`GET /api/auth/me\` - Lấy thông tin user

### Example Request:
\`\`\`bash
# Đăng ký
curl -X POST http://localhost:3000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "testuser",
    "email": "test@example.com", 
    "password": "123456",
    "fullName": "Test User",
    "role": "member"
  }'

# Đăng nhập
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "password": "123456"
  }'
\`\`\`

## 🗃️ Database Schema

\`\`\`sql
-- Users table
users (
  id, username, email, password_hash, 
  full_name, phone, role, is_active,
  created_at, updated_at
)

-- Refresh tokens table  
refresh_tokens (
  id, user_id, token_hash, expires_at,
  is_revoked, created_at
)
\`\`\`

## 🔒 Bảo mật

- Password được hash bằng bcryptjs
- JWT tokens với thời gian hết hạn
- Refresh token rotation
- CORS protection
- Input validation

## 📁 Cấu trúc project

\`\`\`
gym-manager/
├── config/
│   ├── database.js
│   └── config.js
├── controllers/
│   └── authController.js
├── middleware/
│   └── auth.js
├── models/
│   ├── User.js
│   ├── RefreshToken.js
│   └── index.js
├── routes/
│   └── auth.routes.js
├── services/
│   └── authService.js
├── public/
│   └── index.html
├── .env
├── .gitignore
├── app.js
├── package.json
└── README.md
\`\`\`

## 🐛 Troubleshooting

### Lỗi kết nối database:
- Kiểm tra PostgreSQL đã chạy
- Kiểm tra thông tin trong \`.env\`
- Tạo database nếu chưa có

### Lỗi CORS:
- Kiểm tra frontend URL trong CORS config
- Chạy frontend và backend cùng domain

### Lỗi JWT:
- Kiểm tra JWT_ACCESS_SECRET trong \`.env\`
- Đảm bảo secret đủ dài và bảo mật

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs trong console
2. Đảm bảo tất cả dependencies đã cài đặt
3. Kiểm tra database connection
4. Tham khảo troubleshooting section

---

**Dự án thực tập - Quản lý phòng gym**  
Phiên bản: 1.0.0  
Ngày cập nhật: $(date)