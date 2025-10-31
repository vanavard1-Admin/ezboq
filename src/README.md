# 🏗️ EZBOQ - ระบบจัดการ BOQ ออนไลน์

[![Production Ready](https://img.shields.io/badge/status-production-green.svg)](https://ezboq.com)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://ezboq.com)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](https://ezboq.com)

> **ระบบจัดการรายการถอดวัสดุก่อสร้าง (Bill of Quantities) แบบครบวงจร**
> 
> พร้อม Workflow 4 ขั้นตอน, Catalog 750+ รายการ, SmartBOQ AI, และระบบ Cache-First Performance

---

## 🚀 Quick Start

```bash
# Installation
npm install

# Development
npm run dev

# Production Build
npm run build
```

**หรือทดลองใช้งานทันที**: [EZBOQ Demo Mode](https://ezboq.com)

---

## 📋 รายละเอียดระบบ

**EZBOQ.COM** คือระบบจัดการรายการถอดวัสดุก่อสร้าง (Bill of Quantities) แบบครบวงจร ที่ออกแบบมาเพื่อธุรกิจก่อสร้างและผู้รับเหมา

### ✨ คุณสมบัติหลัก

#### 📊 Workflow 4 ขั้นตอน
1. **BOQ** - รายการวัสดุ + รายละเอียด (750+ items, 40 categories)
2. **Quotation** - ใบเสนอราคา + ส่วนลด + Promo Code
3. **Invoice** - ใบวางบิล + แบ่งงวดชำระ + QR Code พร้อมเพย์
4. **Tax Invoice/Receipt** - ใบกำกับภาษี/ใบเสร็จ + ภาษีหัก ณ ที่จ่าย

#### 🤖 SmartBOQ AI
สร้าง BOQ อัตโนมัติจาก 10 ประเภทโครงการ:
- บ้านเดี่ยว (Single House)
- ทาวน์เฮ้าส์ (Townhouse)
- อาคารพาณิชย์ (Commercial Building)
- โรงงาน (Factory)
- และอีก 6 ประเภท

#### 💰 ระบบคำนวณอัตโนมัติ
- ค่าของเสีย 3% + ค่าดำเนินการ 5% + ค่าคลาดเคลื่อน 2%
- กำไร 10% (ปรับได้ตาม Profile)
- VAT 7%
- ภาษีหัก ณ ที่จ่าย (1%, 2%, 3%, 5%)

#### 🏦 ระบบการเงิน
- รองรับ 13 ธนาคารหลัก (กสิกรไทย, SCB, BBL, KTB, ฯลฯ)
- QR Code พร้อมเพย์
- ระบบแบ่งงวดชำระ (ไม่จำกัดจำนวนงวด)

#### ⚡ Performance
- **Nuclear Mode**: Cache-First Strategy บน GET Endpoints ทั้งหมด
- **User Isolation**: Cache แยกตาม userId อัตโนมัติ
- **Auto Invalidation**: ลบ cache เมื่อข้อมูลเปลี่ยน
- **Response Time**: < 100ms (cached), < 500ms (database)

#### 👥 จัดการลูกค้าและพาร์ทเนอร์
- **ลูกค้า (Customer)**: บริษัท/บุคคล พร้อมเลขผู้เสียภาษี
- **พาร์ทเนอร์ (Partner)**: ผู้รับเหมาช่วง พร้อมภาษีหัก ณ ที่จ่าย

#### 📈 รายงานและวิเคราะห์
- **เปรียบเทียบรายเดือน**: กำไร/ต้นทุน/รายได้สุทธิ
- **Bar Chart & Line Chart**: แสดงแนวโน้มธุรกิจ
- **จัดการภาษี**: ติดตาม VAT และภาษีหัก ณ ที่จ่าย

#### 🛠️ วัสดุก่อสร้าง 680+ รายการ
ครอบคลุมทุกหมวดหมู่:
- งานโครงสร้าง (เสาเข็ม, คาน, เสา, พื้น)
- งานสถาปัตย์ (ผนัง, ฝ้า, พื้น, หลังคา)
- งานระบบ (ไฟฟ้า, ประปา, แอร์)
- งานตกแต่ง (สี, วอลล์เปเปอร์, กระจก)

---

## 📖 เอกสารประกอบ

### 📚 Documentation
- **[Quick Start Guide](./docs/QUICK_START.md)** - เริ่มต้นใช้งานใน 5 นาที
- **[User Manual](./USER_MANUAL.md)** - คู่มือผู้ใช้งานฉบับเต็ม
- **[API Reference](./docs/API_REFERENCE.md)** - เอกสาร API ทั้งหมด
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - แก้ปัญหาที่พบบ่อย

### 🔧 Technical Guides
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Deploy to Production
- **[Performance Optimization](./PERFORMANCE_OPTIMIZATION.md)** - Cache & Performance
- **[Security Guide](./SECURITY_README.md)** - Security Best Practices
- **[Template Guide](./TEMPLATE_GUIDE.md)** - ใช้งาน Templates

### 📊 Feature Guides
- **[SmartBOQ](./docs/SMARTBOQ_GUIDE.md)** - AI-Powered BOQ Generation
- **[Large BOQ Export](./LARGE_BOQ_GUIDE.md)** - Export BOQ ขนาดใหญ่
- **[Affiliate System](./AFFILIATE_SYSTEM.md)** - Partner Commission System
- **[Monitoring](./MONITORING_GUIDE.md)** - Performance Monitoring

---

## 🛠️ เทคโนโลยีที่ใช้

### Frontend
- **React 18** + TypeScript
- **Tailwind CSS** v4.0
- **Vite** - Build Tool
- **shadcn/ui** - Component Library
- **Recharts** - Charts & Graphs
- **jsPDF** - PDF Export

### Backend
- **Supabase** - Database & Auth
- **Hono** - Edge Functions
- **PostgreSQL** - Database

### Deployment
- **Vercel** - Hosting (แนะนำ)
- **Cloudflare Pages** - Alternative
- **Custom Domain**: EZBOQ.COM

---

## 📞 ติดต่อและสนับสนุน

- **Website**: [https://ezboq.com](https://ezboq.com)
- **Email**: support@ezboq.com
- **Line**: @ezboq
- **Facebook**: facebook.com/ezboq

---

## 🎯 Roadmap

### Version 1.1 (Q1 2026)
- [ ] Mobile App (iOS/Android)
- [ ] Real-time Collaboration
- [ ] Advanced Analytics Dashboard
- [ ] Email Integration

### Version 1.2 (Q2 2026)
- [ ] Multi-language Support (EN, CN)
- [ ] Public API for Third-party Integration
- [ ] Advanced Permission System (Team Management)
- [ ] Inventory Management System

---

## 📜 License

Copyright © 2025 EZBOQ. All rights reserved.

**Proprietary Software** - ห้ามคัดลอก แจกจ่าย หรือนำไปใช้เพื่อการค้าโดยไม่ได้รับอนุญาต

---

**🏗️ EZBOQ - ทำ BOQ ง่ายๆ ได้ใน 5 นาที!**

*Version 1.0.0 - Production Release*  
*Last Updated: October 30, 2025*