# 📚 EZBOQ Documentation Index

> **Master Index สำหรับเอกสารทั้งหมดของ BOQ Application**

---

## 🎯 เริ่มต้นที่นี่

### สำหรับผู้ใช้งานทั่วไป
1. **[README.md](../README.md)** - Overview และข้อมูลพื้นฐาน
2. **[Quick Start Guide](./QUICK_START.md)** - เริ่มต้นใช้งานใน 5 นาที ⭐
3. **[User Manual](../USER_MANUAL.md)** - คู่มือผู้ใช้งานฉบับเต็ม

### สำหรับนักพัฒนา
1. **[API Reference](./API_REFERENCE.md)** - เอกสาร API ทั้งหมด
2. **[Deployment Guide](../DEPLOYMENT_GUIDE.md)** - Deploy to Production
3. **[Performance Optimization](../PERFORMANCE_OPTIMIZATION.md)** - Cache & Performance

---

## 📖 Documentation ทั้งหมด

### 📘 User Documentation

#### พื้นฐาน
- **[README.md](../README.md)** - ข้อมูลโปรเจกต์และคุณสมบัติหลัก
- **[Quick Start](./QUICK_START.md)** - เริ่มต้นใช้งานอย่างรวดเร็ว
- **[User Manual](../USER_MANUAL.md)** - คู่มือการใช้งานทุกฟีเจอร์
- **[Project Summary](../PROJECT_SUMMARY.md)** - สรุปโปรเจกต์โดยรวม

#### Feature Guides
- **[Template Guide](../TEMPLATE_GUIDE.md)** - ใช้งาน BOQ Templates (40+ templates)
- **[Large BOQ Guide](../LARGE_BOQ_GUIDE.md)** - Export BOQ ขนาดใหญ่ (100+ items)
- **[Affiliate System](../AFFILIATE_SYSTEM.md)** - ระบบ Partner และ Commission

#### การแก้ปัญหา
- **[Troubleshooting](./TROUBLESHOOTING.md)** - แก้ปัญหาที่พบบ่อย ⭐

---

### 💻 Developer Documentation

#### API & Backend
- **[API Reference](./API_REFERENCE.md)** - เอกสาร API ทั้งหมด (Cache-First Strategy) ⭐
- **[Performance Optimization](../PERFORMANCE_OPTIMIZATION.md)** - Nuclear Mode & Cache System
- **[Monitoring Guide](../MONITORING_GUIDE.md)** - Performance Monitoring & Debugging

#### Deployment & Security
- **[Deployment Guide](../DEPLOYMENT_GUIDE.md)** - Deploy to Production (Vercel/Cloudflare)
- **[Security Guide](../SECURITY_README.md)** - Security Best Practices
- **[API Security Guide](../API_SECURITY_GUIDE.md)** - API Security & Authentication

---

## 🗂️ โครงสร้างไฟล์สำคัญ

### Root Documentation
```
/
├── README.md                    # Main documentation
├── PROJECT_SUMMARY.md           # Project overview
├── USER_MANUAL.md               # Full user manual
├── DEPLOYMENT_GUIDE.md          # Production deployment
├── PERFORMANCE_OPTIMIZATION.md  # Performance & cache
├── SECURITY_README.md           # Security practices
├── API_SECURITY_GUIDE.md        # API security
├── MONITORING_GUIDE.md          # Monitoring & debugging
├── TEMPLATE_GUIDE.md            # Template usage
├── LARGE_BOQ_GUIDE.md          # Large BOQ export
└── AFFILIATE_SYSTEM.md          # Affiliate/Partner system
```

### `/docs` Directory
```
/docs/
├── INDEX.md                     # This file
├── QUICK_START.md               # Quick start guide
├── API_REFERENCE.md             # Complete API docs
└── TROUBLESHOOTING.md           # Troubleshooting guide
```

### Source Code
```
/
├── App.tsx                      # Main app entry
├── AppWithAuth.tsx              # Auth wrapper
├── AppWorkflow.tsx              # Workflow manager
├── components/                  # React components
├── pages/                       # Page components
├── utils/                       # Utilities
│   ├── api.ts                  # API client (Cache-First)
│   ├── calculations.ts         # Price calculations
│   └── supabase/               # Supabase integration
├── supabase/functions/server/   # Backend server
├── data/                        # Catalog & templates
└── types/                       # TypeScript types
```

---

## 🔍 ค้นหาเอกสารตามหัวข้อ

### Authentication & Security
- [Security Guide](../SECURITY_README.md)
- [API Security](../API_SECURITY_GUIDE.md)
- [Deployment Security](../DEPLOYMENT_GUIDE.md#security)

### Performance & Caching
- [Performance Optimization](../PERFORMANCE_OPTIMIZATION.md) - Nuclear Mode
- [API Reference - Cache Strategy](./API_REFERENCE.md#cache-strategy)
- [Monitoring Guide](../MONITORING_GUIDE.md)

### Features
- [SmartBOQ](./QUICK_START.md#smartboq) - AI-Powered BOQ
- [Templates](../TEMPLATE_GUIDE.md) - 40+ BOQ Templates
- [Large BOQ Export](../LARGE_BOQ_GUIDE.md) - Pagination & Export
- [Affiliate System](../AFFILIATE_SYSTEM.md) - Partner Management

### API & Integration
- [API Reference](./API_REFERENCE.md) - Complete API Documentation
- [API Security](../API_SECURITY_GUIDE.md) - Auth & Security
- Cache Strategy - [Performance Guide](../PERFORMANCE_OPTIMIZATION.md)

### Deployment
- [Deployment Guide](../DEPLOYMENT_GUIDE.md) - Production Deployment
- [Security Checklist](../SECURITY_README.md) - Pre-deployment
- [Monitoring Setup](../MONITORING_GUIDE.md) - Post-deployment

### Troubleshooting
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - ปัญหาที่พบบ่อย
- [Performance Issues](../PERFORMANCE_OPTIMIZATION.md#troubleshooting)
- [API Errors](./API_REFERENCE.md#error-responses)

---

## 📝 Version History

### Latest: v1.0.0 (October 30, 2025)
- ✅ Documentation cleanup (ลบ 140+ ไฟล์ที่ล้าสมัย)
- ✅ Reorganized documentation structure
- ✅ Created master INDEX.md
- ✅ Added comprehensive guides

### Previous Updates
- Nuclear Mode implementation (Cache-First Strategy)
- User-specific cache isolation
- Body stream error fixes
- Profile 404 error fixes
- Dashboard redesign
- Premium Carousel ads

---

## 🎓 Learning Path

### Level 1: เริ่มต้น (15 นาที)
1. อ่าน [README.md](../README.md)
2. ทำตาม [Quick Start](./QUICK_START.md)
3. ทดลอง Demo Mode

### Level 2: ใช้งานขั้นสูง (1 ชั่วโมง)
1. อ่าน [User Manual](../USER_MANUAL.md)
2. ศึกษา [Template Guide](../TEMPLATE_GUIDE.md)
3. ลองใช้ SmartBOQ

### Level 3: Developer (3 ชั่วโมง)
1. ศึกษา [API Reference](./API_REFERENCE.md)
2. อ่าน [Performance Guide](../PERFORMANCE_OPTIMIZATION.md)
3. ทำความเข้าใจ Cache Strategy

### Level 4: Production Deployment (2 ชั่วโมง)
1. อ่าน [Deployment Guide](../DEPLOYMENT_GUIDE.md)
2. ตรวจสอบ [Security Checklist](../SECURITY_README.md)
3. Setup [Monitoring](../MONITORING_GUIDE.md)

---

## 🆘 ต้องการความช่วยเหลือ?

### ปัญหาทั่วไป
👉 ดู [Troubleshooting Guide](./TROUBLESHOOTING.md)

### ปัญหาเฉพาะ
- **Performance**: [Performance Guide](../PERFORMANCE_OPTIMIZATION.md)
- **API Errors**: [API Reference](./API_REFERENCE.md#error-responses)
- **Deployment**: [Deployment Guide](../DEPLOYMENT_GUIDE.md)
- **Security**: [Security Guide](../SECURITY_README.md)

### ติดต่อ Support
- Email: support@ezboq.com
- Line: @ezboq
- Facebook: facebook.com/ezboq

---

## 📌 Quick Links

### ใช้งานบ่อย
- [Quick Start](./QUICK_START.md) ⭐
- [API Reference](./API_REFERENCE.md) ⭐
- [Troubleshooting](./TROUBLESHOOTING.md) ⭐

### ฟีเจอร์หลัก
- [SmartBOQ](./QUICK_START.md#smartboq)
- [Templates](../TEMPLATE_GUIDE.md)
- [Large BOQ Export](../LARGE_BOQ_GUIDE.md)

### Technical
- [Performance](../PERFORMANCE_OPTIMIZATION.md)
- [Security](../SECURITY_README.md)
- [Monitoring](../MONITORING_GUIDE.md)

---

**📚 Last Updated: October 30, 2025**

