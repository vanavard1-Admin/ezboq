# 🔵 Facebook Login Setup Guide

## ⚠️ สถานะ: **ต้องตั้งค่าก่อนใช้งาน**

ระบบมี **Facebook OAuth Login** แล้ว แต่ **ยังใช้งานไม่ได้** จนกว่าคุณจะตั้งค่าใน Supabase Dashboard

---

## 📌 สิ่งที่คุณมีอยู่แล้ว

คุณให้ Access Token มา:
```
EAAhgsTb23goBP9Du4rYBW7ooUQ2eqtRgutTdDkT6MvXP01yXaZBpsAZCDlDJjWdObqLyQDyV8jgd8KxoZB9pWoDcvTDmCkEvVBgSQmKh4rzyAQwnmWFWKnsfR23ZC7I2kyHiDQq7iLFmtb9zNJWWZAhmGyvnlqAp1zQ4esCfnEebUIMN8ZBhZC1qOZB2L8wbaBBxEy0j90Hog5j66wXEkmy0ZCujk1xSX8KON7bvGuGeZCWNMNYB8aw84R9wIJz59ZAJPLxhocqZBpaCyVxB62g7HBHZBcjrAOt38bR1rPWOrcG7CwZAR5vcrywTreGabAzAIK87ti00WF3hOmi4JGVfUfCjW0V5j1OZAcZD
```

### ⚠️ แต่นี่คือ Access Token ไม่ใช่ App Secret!

สำหรับ Facebook OAuth ใน Supabase ต้องใช้:
1. **Facebook App ID** (ตัวเลข เช่น 1234567890)
2. **Facebook App Secret** (string แบบสั้นกว่า Access Token)

---

## 🔍 วิธีหา App ID และ App Secret

### ขั้นตอนที่ 1: ไปที่ Facebook Developer Console

1. ไปที่ [developers.facebook.com](https://developers.facebook.com/)
2. คลิก **My Apps** มุมขวาบน
3. เลือก App ที่คุณสร้างไว้ (หรือสร้างใหม่ถ้ายังไม่มี)

### ขั้นตอนที่ 2: หา App ID

1. ที่หน้า Dashboard ของ App
2. จะเห็น **App ID** อยู่ด้านบน (ตัวเลข 15-16 หลัก)
3. คัดลอก App ID

**ตัวอย่าง:**
```
App ID: 1234567890123456
```

### ขั้นตอนที่ 3: หา App Secret

1. ที่หน้า Dashboard เดียวกัน
2. จะเห็น **App Secret** อยู่ข้างๆ App ID
3. คลิก **Show** เพื่อแสดง Secret
4. คัดลอก App Secret

**⚠️ เก็บรักษา App Secret เป็นความลับ!**

**ตัวอย่าง:**
```
App Secret: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## 🚀 ตั้งค่าใน Supabase Dashboard

### ขั้นตอนที่ 1: เปิดหน้า Authentication Providers

1. ไปที่ [supabase.com/dashboard](https://supabase.com/dashboard)
2. เลือกโปรเจกต์ **BOQ Pro**
3. คลิกที่เมนู **Authentication** ทางซ้ายมือ
4. คลิกที่ **Providers** (tab ด้านบน)
5. เลื่อนหา **Facebook** ในรายการ

### ขั้นตอนที่ 2: Enable Facebook Provider

1. คลิกที่ **Facebook** provider
2. เปิดสวิตช์ **Enable Sign in with Facebook** ให้เป็นสีเขียว
3. จะมีฟอร์มให้กรอกข้อมูล

### ขั้นตอนที่ 3: กรอก App ID และ App Secret

```
Facebook App ID:
[ใส่ App ID ที่คัดลอกมา เช่น 1234567890123456]

Facebook App Secret:
[ใส่ App Secret ที่คัดลอกมา เช่น a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6]
```

### ขั้นตอนที่ 4: Save Settings

1. คลิก **Save**
2. Supabase จะแสดง **Authorized redirect URIs**:
   ```
   https://[project-id].supabase.co/auth/v1/callback
   ```
3. คัดลอก URI นี้ (จะใช้ในขั้นตอนต่อไป)

---

## 🔄 ตั้งค่า Redirect URI ใน Facebook

### ขั้นตอนที่ 1: กลับไปที่ Facebook Developer Console

1. ไปที่ App ของคุณ
2. เลือก **Settings** → **Basic** ในเมนูซ้าย

### ขั้นตอนที่ 2: เพิ่ม Facebook Login Product

1. คลิก **+ Add Product** ในเมนูซ้าย (ถ้ายังไม่มี Facebook Login)
2. หา **Facebook Login** แล้วคลิก **Set Up**
3. เลือก **Web**

### ขั้นตอนที่ 3: ตั้งค่า Valid OAuth Redirect URIs

1. ในหน้า **Facebook Login** → **Settings**
2. หาฟิลด์ **Valid OAuth Redirect URIs**
3. เพิ่ม URI จาก Supabase:
   ```
   https://[project-id].supabase.co/auth/v1/callback
   ```
4. คลิก **Save Changes**

### ขั้นตอนที่ 4: ตั้งค่า App Domains (สำคัญ!)

1. กลับไปที่ **Settings** → **Basic**
2. หาฟิลด์ **App Domains**
3. เพิ่มโดเมนของคุณ:
   ```
   localhost (สำหรับทดสอบ)
   [your-production-domain.com]
   ```
4. คลิก **Save Changes**

---

## 🧪 ทดสอบ Facebook Login

### 1. ตรวจสอบว่าตั้งค่าครบแล้ว

✅ Checklist:
- [ ] มี Facebook App ID และ App Secret
- [ ] Enable Facebook Provider ใน Supabase
- [ ] เพิ่ม Valid OAuth Redirect URIs ใน Facebook App
- [ ] ตั้งค่า App Domains
- [ ] App เป็น **Live Mode** (ไม่ใช่ Development Mode)

### 2. ทดสอบในหน้า Login

1. รีเฟรชหน้าเว็บ BOQ Pro
2. คลิกปุ่ม **"เข้าสู่ระบบด้วย Facebook"**
3. ถ้าขึ้นหน้า Facebook Login → สำเร็จ! ✨
4. เลือกบัญชี Facebook
5. อนุญาตการเข้าถึง
6. ระบบจะพากลับมายังแอป และ login อัตโนมัติ! 🎉

---

## 🐛 Troubleshooting

### Error: "provider is not enabled"
❌ **ยังไม่ได้เปิด Facebook Provider ใน Supabase**
✅ **วิธีแก้:** ทำตามขั้นตอน "ตั้งค่าใน Supabase Dashboard"

### Error: "Can't Load URL: The domain of this URL isn't included in the app's domains"
❌ **ยังไม่ได้เพิ่ม App Domains ใน Facebook App**
✅ **วิธีแก้:** 
1. Facebook Developer Console → Settings → Basic
2. เพิ่ม domain ใน **App Domains**
3. บันทึก

### Error: "URL Blocked: This redirect failed because the redirect URI is not whitelisted"
❌ **ยังไม่ได้เพิ่ม Valid OAuth Redirect URIs**
✅ **วิธีแก้:**
1. Facebook Developer Console → Facebook Login → Settings
2. เพิ่ม `https://[project-id].supabase.co/auth/v1/callback`
3. บันทึก

### Error: "App Not Setup: This app is still in development mode"
❌ **App ยังเป็น Development Mode**
✅ **วิธีแก้:**
1. Facebook Developer Console → Settings → Basic
2. เลื่อนลงล่างสุด
3. สลับ App Mode จาก **Development** → **Live**
4. บันทึก

### ปุ่ม Facebook Login ไม่มี reaction
❌ **Network error หรือ Supabase ไม่ตอบสนอง**
✅ **วิธีแก้:** 
1. เปิด Console (F12) ดู error
2. ตรวจสอบ Supabase project status
3. ตรวจสอบว่า Facebook Provider enable แล้ว

---

## 📱 UI ใหม่ที่เพิ่มเข้ามา

### ปุ่ม Facebook Sign In
```
┌──────────────────────────────────┐
│  🔵 เข้าสู่ระบบด้วย Facebook    │
└──────────────────────────────────┘
```

### Layout หน้า Login
```
1. Email/Password Form
2. "หรือ" divider
3. 🟥 Google Login Button
4. 🔵 Facebook Login Button  ← ใหม่!
5. ℹ️ Setup Notice
6. "หรือ" divider
7. 🟧 Demo Mode Button
```

### Error Message (เมื่อยังไม่ตั้งค่า)
```
🔧 Facebook Login ยังไม่พร้อมใช้งาน

⚙️ ต้องตั้งค่า Facebook Provider ใน Supabase ก่อน - 
   ดูคู่มือใน FACEBOOK_LOGIN_SETUP.md
```

---

## 📚 เอกสารอ้างอิง

- [Supabase Facebook Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-facebook)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- [Facebook App Development](https://developers.facebook.com/docs/development)

---

## ⏱️ เวลาที่ใช้

- **สร้าง Facebook App:** ~5 นาที (ถ้ายังไม่มี)
- **หา App ID/Secret:** ~2 นาที
- **ตั้งค่า Supabase:** ~3 นาที
- **ตั้งค่า Redirect URIs:** ~5 นาที
- **ทดสอบ:** ~2 นาที
- **รวม:** ~15-20 นาที

---

## 🎁 ประโยชน์หลังตั้งค่าเสร็จ

✅ User Login ได้ง่าย ด้วยบัญชี Facebook
✅ ไม่ต้องจำรหัสผ่าน
✅ ปลอดภัยด้วย OAuth 2.0
✅ ได้ชื่อ, อีเมล, รูปโปรไฟล์อัตโนมัติ
✅ เพิ่มทางเลือกให้ผู้ใช้
✅ Conversion rate สูงขึ้น

---

## 🎯 สรุป Checklist

### ✅ สิ่งที่ต้องมี:

- [ ] **Facebook App ID** (จาก Facebook Developer Console)
- [ ] **Facebook App Secret** (จาก Facebook Developer Console)
- [ ] **Supabase Project** (เปิด Facebook Provider)
- [ ] **Valid OAuth Redirect URIs** (เพิ่มใน Facebook App)
- [ ] **App Domains** (ตั้งค่าใน Facebook App)
- [ ] **Live Mode** (เปลี่ยนจาก Development Mode)

### 🔴 ปัจจุบัน: **ยังใช้งานไม่ได้**
Error: `Unsupported provider: provider is not enabled`

### 🟢 หลังตั้งค่าเสร็จ: **ใช้งานได้ทันที**
User จะสามารถ Login ด้วย Facebook Account ได้เลย!

---

## 💡 Tips

1. **Development Mode vs Live Mode:**
   - Development: เฉพาะ Admins, Developers, Testers เท่านั้นที่ login ได้
   - Live: ทุกคน login ได้

2. **Testing:**
   - ใช้ Development Mode ตอนทดสอบ
   - เพิ่ม Test Users ได้ใน **Roles** → **Test Users**

3. **Access Token ที่คุณมี:**
   - ใช้เรียก Facebook Graph API ไม่ใช่ใช้ตั้งค่า OAuth
   - เก็บไว้ใช้สำหรับ features อื่น เช่น post to Facebook, fetch user data

---

**🚀 เริ่มตั้งค่าตอนนี้เลย - ใช้เวลาแค่ 15 นาที!**

**🎉 เมื่อตั้งค่าเสร็จ - ระบบพร้อมใช้งาน Facebook Login!**
