# 🏋️ Gym Manager - Hệ thống quản lý phòng gym toàn diện

Hệ thống quản lý phòng gym hiện đại với đầy đủ tính năng từ quản lý thành viên, thanh toán, thiết bị đến bảo trì tự động.

## ✨ Tính năng chính

### 🔐 **Xác thực & Phân quyền**
- ✅ Đăng ký, đăng nhập, đăng xuất
- ✅ JWT Authentication (Access Token + Refresh Token)
- ✅ Phân quyền 3 cấp: **Admin**, **Trainer**, **Member**
- ✅ Bảo mật cao cấp: Hash password, CORS, Validation

### 👥 **Quản lý thành viên**
- ✅ Đăng ký thành viên với mã tự động
- ✅ Quản lý thông tin cá nhân và liên hệ khẩn cấp
- ✅ Tìm kiếm và lọc thành viên
- ✅ Theo dõi trạng thái thành viên

### 💰 **Hệ thống thanh toán thông minh**
- ✅ Tạo hóa đơn tự động khi đăng ký dịch vụ
- ✅ Xác nhận thanh toán bởi Admin
- ✅ Theo dõi hóa đơn chờ thanh toán & quá hạn
- ✅ Thống kê doanh thu theo thời gian thực
- ✅ Dashboard tài chính trực quan

### 🏋️ **Quản lý gói tập**
- ✅ Tạo và quản lý các gói membership
- ✅ Mua gói tập trực tuyến
- ✅ Theo dõi lịch sử và trạng thái gói
- ✅ Ngăn chặn mua gói khi còn nợ

### 🛠️ **Quản lý thiết bị**
- ✅ Quản lý toàn bộ thiết bị gym
- ✅ Hệ thống bảo trì tự động theo lịch
- ✅ Theo dõi lịch sử bảo trì
- ✅ Dashboard thiết bị trực quan

### 🎓 **Quản lý lớp học**
- ✅ Tạo và quản lý lớp tập
- ✅ Đăng ký lớp học
- ✅ Quản lý huấn luyện viên
- ✅ Theo dõi sức chứa lớp học

### 📊 **Dashboard & Báo cáo**
- ✅ Dashboard admin với thống kê toàn diện
- ✅ Báo cáo doanh thu theo thời gian thực
- ✅ Thống kê thành viên và hoạt động
- ✅ Giao diện trực quan và thân thiện

## 🛠️ Công nghệ sử dụng

### **Backend Stack**
- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: PostgreSQL với Sequelize ORM
- **Authentication**: JWT (Access + Refresh Tokens)
- **Security**: bcryptjs, Helmet, CORS, Rate Limiting
- **Validation**: Joi
- **Testing**: Jest, Supertest
- **Performance**: Autocannon, Clinic.js

### **Frontend**
- **Core**: HTML5, CSS3, Vanilla JavaScript
- **UI/UX**: Responsive Design, Modern CSS Grid/Flexbox
- **Components**: Dynamic DOM manipulation
- **API Integration**: Fetch API với error handling

### **DevOps & Tools**
- **Development**: Nodemon, ESLint
- **Testing**: Jest với coverage reports
- **API Documentation**: Swagger/OpenAPI 3.0
- **Database**: PostgreSQL migrations & seeders

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
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api  
- **Swagger Docs**: http://localhost:3000/api-docs
- **Health check**: http://localhost:3000/api/health

### 6. Chạy tests
```bash
# Test cơ bản
npm test

# Test với coverage
npm run test:coverage

# Test tất cả (bao gồm performance & security)
npm run test:all
```

## 👤 Tài khoản mặc định

Hệ thống tự động tạo các tài khoản demo:

### **Admin Account**
- **Email**: admin@gym.com
- **Password**: admin123
- **Quyền**: Quản lý toàn bộ hệ thống

### **Trainer Account**  
- **Email**: trainer@gym.com
- **Password**: trainer123
- **Quyền**: Quản lý thành viên và lớp học

### **Member Account**
- **Email**: member@gym.com  
- **Password**: member123
- **Quyền**: Xem thông tin cá nhân và mua gói tập

⚠️ **Bảo mật**: Đổi mật khẩu ngay sau khi đăng nhập lần đầu!

## 📚 API Documentation

### 🔗 **Swagger UI**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
### 📄 **API Spec**: [`docs/swagger.yaml`](docs/swagger.yaml)

### **Các endpoints chính:**

#### 🔐 **Authentication**
- \`POST /api/auth/register\` - Đăng ký tài khoản
- \`POST /api/auth/login\` - Đăng nhập
- \`POST /api/auth/logout\` - Đăng xuất
- \`POST /api/auth/refresh\` - Làm mới token

#### 👥 **Members Management**
- \`GET /api/members\` - Danh sách thành viên (Admin/Trainer)
- \`POST /api/members/register\` - Đăng ký thành viên mới
- \`GET /api/members/:id\` - Chi tiết thành viên
- \`PUT /api/members/:id\` - Cập nhật thông tin
- \`POST /api/members/my/membership\` - Mua gói tập (Member)

#### 💰 **Payment & Invoices**
- \`GET /api/invoices\` - Danh sách hóa đơn
- \`GET /api/invoices/:id\` - Chi tiết hóa đơn
- \`PUT /api/invoices/:id/status\` - Xác nhận thanh toán (Admin)
- \`GET /api/payments\` - Lịch sử thanh toán

#### 🏋️ **Memberships**
- \`GET /api/members/memberships/all\` - Danh sách gói tập
- \`POST /api/members/memberships\` - Tạo gói mới (Admin)

#### 🛠️ **Equipment & Maintenance**
- \`GET /api/equipment\` - Danh sách thiết bị
- \`POST /api/equipment\` - Thêm thiết bị (Admin)
- \`GET /api/maintenance-schedules\` - Lịch bảo trì
- \`POST /api/maintenance-schedules\` - Tạo lịch bảo trì

### **Ví dụ sử dụng API:**
\`\`\`bash
# 1. Đăng ký thành viên mới
curl -X POST http://localhost:3000/api/members/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "fullName": "Nguyễn Văn A",
    "phone": "0123456789",
    "email": "nguyenvana@example.com",
    "membershipId": 1
  }'

# 2. Đăng nhập
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "admin@gym.com",
    "password": "admin123"
  }'

# 3. Lấy danh sách hóa đơn (cần token)
curl -X GET http://localhost:3000/api/invoices \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
\`\`\`

## 🗃️ Database Schema

### 📄 **Chi tiết**: [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md)

### **Các bảng chính:**

#### 👤 **User Management**
- `users` - Tài khoản đăng nhập (Admin/Trainer/Member)
- `refresh_tokens` - JWT refresh tokens
- `members` - Hồ sơ thành viên chi tiết

#### 💰 **Payment System**  
- `invoices` - Hóa đơn tự động
- `invoice_items` - Chi tiết hóa đơn
- `payments` - Giao dịch thanh toán
- `promotions` - Mã khuyến mãi

#### 🏋️ **Gym Management**
- `memberships` - Gói thành viên
- `membership_history` - Lịch sử mua gói
- `equipment` - Thiết bị gym
- `maintenance_schedules` - Lịch bảo trì tự động
- `maintenance_history` - Lịch sử bảo trì

#### 🎓 **Class Management**
- `classes` - Lớp tập
- `class_schedules` - Lịch trình lớp
- `class_enrollments` - Đăng ký lớp

### **Tính năng đặc biệt:**
- ✅ **Auto-generated codes**: Member codes, Invoice numbers
- ✅ **Automatic maintenance**: Equipment maintenance scheduling  
- ✅ **Payment workflow**: Invoice → Payment confirmation → Revenue
- ✅ **Membership validation**: Prevent new purchases with pending invoices
- ✅ **Audit trails**: Complete history tracking

## 🔒 Bảo mật

### **Authentication & Authorization**
- ✅ **Password Security**: bcryptjs hashing với salt rounds
- ✅ **JWT Tokens**: Access + Refresh token với expiration
- ✅ **Token Rotation**: Automatic refresh token rotation  
- ✅ **Role-based Access**: Admin/Trainer/Member permissions
- ✅ **Session Management**: Secure logout và token revocation

### **API Security**
- ✅ **CORS Protection**: Configured origins
- ✅ **Input Validation**: Joi schema validation
- ✅ **Rate Limiting**: Request rate limiting per user
- ✅ **Security Headers**: Helmet.js integration
- ✅ **SQL Injection Prevention**: Sequelize ORM protection

### **Data Protection**
- ✅ **Sensitive Data**: No passwords/tokens in logs
- ✅ **Database Security**: Connection encryption
- ✅ **Error Handling**: No sensitive info in error messages

## 📁 Cấu trúc project

\`\`\`
gym-manager/
├── 📁 config/                    # Cấu hình ứng dụng
│   ├── database.js               # Kết nối PostgreSQL
│   └── config.js                 # Cấu hình chung
├── 📁 controllers/               # API Controllers
│   ├── authController.js         # Xác thực & phân quyền
│   ├── memberController.js       # Quản lý thành viên  
│   ├── invoiceController.js      # Quản lý hóa đơn
│   ├── paymentController.js      # Xử lý thanh toán
│   ├── equipmentController.js    # Quản lý thiết bị
│   └── classController.js        # Quản lý lớp tập
├── 📁 middleware/                # Middleware functions
│   ├── auth.js                   # JWT authentication
│   ├── validation.js             # Joi validation
│   ├── errorHandler.js           # Error handling
│   └── security.js               # Security headers
├── 📁 models/                    # Database models (Sequelize)
│   ├── User.js                   # User accounts
│   ├── Member.js                 # Member profiles
│   ├── Invoice.js                # Invoice management
│   ├── Payment.js                # Payment records
│   ├── Equipment.js              # Gym equipment
│   ├── MaintenanceSchedule.js    # Maintenance scheduling
│   └── index.js                  # Model associations
├── 📁 routes/                    # API routes
│   ├── authRoutes.js             # Authentication endpoints
│   ├── memberRoutes.js           # Member management
│   ├── invoiceRoutes.js          # Invoice & payment
│   ├── equipmentRoutes.js        # Equipment management
│   └── classRoutes.js            # Class management
├── 📁 services/                  # Business logic
│   ├── authService.js            # Authentication logic
│   ├── memberService.js          # Member operations
│   ├── paymentService.js         # Payment processing
│   ├── maintenanceSchedulerService.js # Auto maintenance
│   └── notificationService.js    # Notification system
├── 📁 public/demo/               # Frontend demo
│   ├── admin-complete.html       # Admin dashboard
│   ├── member-complete.html      # Member interface
│   ├── trainer-complete.html     # Trainer interface
│   └── css/styles.css            # Styling
├── 📁 tests/                     # Test suites
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   ├── performance/              # Performance tests
│   └── security/                 # Security tests  
├── 📁 docs/                      # Documentation
│   ├── swagger.yaml              # API documentation
│   ├── DATABASE_SCHEMA.md        # Database schema
│   └── TESTING.md                # Testing guide
├── 📁 scripts/                   # Utility scripts
│   ├── createTestData.js         # Generate test data
│   ├── syncDatabase.js           # Database sync
│   └── run-all-tests.js          # Test runner
├── 📁 migrations/                # Database migrations
├── 📁 seeders/                   # Database seeders
├── .env                          # Environment variables
├── app.js                        # Application entry point
├── package.json                  # Dependencies & scripts
└── README.md                     # Project documentation
\`\`\`

## 🧪 Testing

### **Test Coverage**
Hệ thống có test coverage toàn diện với Jest và Supertest:

\`\`\`bash
# Chạy tất cả tests
npm test

# Test với coverage report  
npm run test:coverage

# Performance & security tests
npm run test:all
\`\`\`

### **Test Categories**
- ✅ **Unit Tests**: Business logic và services
- ✅ **Integration Tests**: API endpoints end-to-end
- ✅ **Security Tests**: Authentication & authorization
- ✅ **Performance Tests**: Load testing với Autocannon

### **Test Results**
- **Coverage**: >90% cho controllers và services
- **API Tests**: Toàn bộ endpoints được test
- **Security**: Authentication flows validated
- **Performance**: Load tested up to 1000 concurrent users

## 🚀 Production Deployment

### **Environment Setup**
\`\`\`bash
# Production environment variables
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/gym_manager
JWT_ACCESS_SECRET=your-super-secure-secret
JWT_REFRESH_SECRET=another-secure-secret
CORS_ORIGIN=https://yourdomain.com
\`\`\`

### **Performance Optimizations**
- Database connection pooling
- Query optimization with indexes
- Rate limiting per user
- Caching for frequent queries

## 🐛 Troubleshooting

### **Database Issues**
- ✅ **Connection Failed**: Check PostgreSQL service, credentials in `.env`
- ✅ **Migration Errors**: Run `node scripts/syncDatabase.js` 
- ✅ **Slow Queries**: Check database indexes and connection pool

### **Authentication Issues**  
- ✅ **JWT Errors**: Verify JWT secrets in `.env`
- ✅ **CORS Errors**: Check allowed origins configuration
- ✅ **Permission Denied**: Verify user roles and permissions

### **API Issues**
- ✅ **404 Errors**: Check route definitions and middleware
- ✅ **Validation Errors**: Verify request body against Joi schemas
- ✅ **500 Errors**: Check server logs for detailed error messages

### **Common Solutions**
\`\`\`bash
# Reset database and recreate with test data
npm run clean-start
node scripts/createTestData.js

# Clear all node processes (Windows)
taskkill /f /im node.exe

# Check logs
tail -f logs/app.log  # if logging to file
\`\`\`

## 📊 Monitoring & Logging

### **Health Checks**
- **API Health**: \`GET /api/health\`
- **Database**: Connection status monitoring
- **Services**: Auto-restart on failure

### **Performance Metrics**
- Response time monitoring
- Database query performance
- Memory usage tracking
- Error rate monitoring

## 🤝 Contributing

### **Development Workflow**
1. Fork repository
2. Create feature branch: \`git checkout -b feature/amazing-feature\`
3. Commit changes: \`git commit -m 'Add amazing feature'\`
4. Push to branch: \`git push origin feature/amazing-feature\`
5. Open Pull Request

### **Code Standards**
- ESLint configuration for code quality
- Prettier for code formatting  
- Jest for testing requirements
- Comprehensive error handling

## 📞 Support & Contact

### **Documentation**
- 📖 **API Docs**: http://localhost:3000/api-docs
- 🗃️ **Database Schema**: [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)
- 🧪 **Testing Guide**: [docs/TESTING.md](docs/TESTING.md)

### **Issues & Bugs**
1. Check existing issues on GitHub
2. Create detailed bug report with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Console logs/screenshots

### **Feature Requests**
- Submit via GitHub Issues with "enhancement" label
- Provide clear use case and requirements
- Consider contributing the feature yourself!

---

## 🎯 Project Status

**Current Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: August 2025  
**Maintainer**: Đặng Đức Cường

### **Recent Updates**
- ✅ Complete payment system with admin confirmation
- ✅ Automatic equipment maintenance scheduling  
- ✅ Revenue tracking and financial dashboard
- ✅ Comprehensive test coverage
- ✅ Production-ready security measures
- ✅ Optimized notification system (removed problematic features)

### **Roadmap**
- 🔄 Mobile app integration
- 🔄 Advanced reporting and analytics
- 🔄 Member check-in/check-out system
- 🔄 Nutrition tracking integration
- 🔄 Personal training scheduling

---

**🏋️ Gym Manager** - *Quản lý phòng gym chuyên nghiệp và hiện đại*  
*Phát triển bởi Đặng Đức Cường với tình yêu công nghệ* ❤️