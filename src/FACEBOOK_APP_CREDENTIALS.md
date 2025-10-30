# 🔑 วิธีหา Facebook App ID และ App Secret

## ⚠️ สิ่งสำคัญ

**Access Token ≠ App Secret**

### สิ่งที่คุณมี:
```json
{
  "access_token": "EAAhgsTb23goBP9NZAejktAZAcqZCfY6Qov...",
  "token_type": "bearer",
  "expires_in": 5182511
}
```

### สิ่งที่ต้องการ:
```
✅ Facebook App ID: [ตัวเลข 15-16 หลัก]
✅ Facebook App Secret: [string สั้นๆ]
```

---

## 📍 ขั้นตอนที่ 1: ไปที่ Facebook Developer Console

1. เปิดเบราว์เซอร์
2. ไปที่: [https://developers.facebook.com/](https://developers.facebook.com/)
3. Login ด้วยบัญชี Facebook ของคุณ

---

## 📍 ขั้นตอนที่ 2: เข้าสู่หน้า Apps

1. คลิก **"My Apps"** มุมขวาบน
2. คุณจะเห็นรายการ Apps ทั้งหมดที่คุณสร้าง
3. **เลือก App ที่ต้องการใช้** (หรือสร้างใหม่ถ้ายังไม่มี)

### ถ้ายังไม่มี App:
```
1. คลิก "Create App"
2. เลือกประเภท: "Consumer" หรือ "Business"
3. ตั้งชื่อ App
4. กรอกข้อมูลพื้นฐาน
5. Create App
```

---

## 📍 ขั้นตอนที่ 3: หา App ID

เมื่อเข้าไปในหน้า Dashboard ของ App:

```
┌──────────────────────────────────────┐
│  App Dashboard                        │
├──────────────────────────────────────┤
│  App ID: 1234567890123456  ← นี่ไง! │
│  App Secret: ••••••••  [Show]         │
│                                       │
│  App Mode: Development                │
└──────────────────────────────────────┘
```

### วิธีคัดลอก App ID:
1. มองหาบรรทัด **"App ID:"** ที่ด้านบนของหน้า
2. จะเห็นตัวเลข 15-16 หลัก
3. คลิกเพื่อคัดลอก หรือ copy ด้วยมือ

**ตัวอย่าง:**
```
App ID: 1234567890123456
```

---

## 📍 ขั้นตอนที่ 4: หา App Secret

ที่หน้า Dashboard เดียวกัน:

```
┌──────────────────────────────────────┐
│  App Secret: ••••••••  [Show]  ← คลิก!│
└──────────────────────────────────────┘
```

### วิธีคัดลอก App Secret:
1. มองหาบรรทัด **"App Secret:"** ใต้ App ID
2. คลิกปุ่ม **"Show"**
3. อาจต้องยืนยันด้วย password Facebook
4. คัดลอก App Secret

**ตัวอย่าง:**
```
App Secret: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**⚠️ เก็บรักษา App Secret เป็นความลับ!**

---

## 📍 ขั้นตอนที่ 5: ตั้งค่า Facebook Login Product

### 1. เพิ่ม Facebook Login:
```
1. ในเมนูซ้ายมือ
2. หา "+ Add Product" หรือ "Products"
3. หา "Facebook Login"
4. คลิก "Set Up"
```

### 2. เลือก Platform:
```
1. เลือก "Web"
2. กรอก Site URL: http://localhost (สำหรับทดสอบ)
3. Save
4. Continue
```

---

## 📍 ขั้นตอนที่ 6: ตั้งค่า Valid OAuth Redirect URIs

### 1. ไปที่ Facebook Login Settings:
```
1. เมนูซ้าย → "Facebook Login"
2. คลิก "Settings"
```

### 2. เพิ่ม Valid OAuth Redirect URIs:
```
1. หาฟิลด์ "Valid OAuth Redirect URIs"
2. เพิ่ม URI จาก Supabase:
   https://[project-id].supabase.co/auth/v1/callback
3. คลิก "Save Changes"
```

**📝 หมายเหตุ:** จะได้ URI นี้จาก Supabase Dashboard หลังจากเพิ่ม App ID และ App Secret แล้ว

---

## 📍 ขั้นตอนที่ 7: ตั้งค่า App Domains

### 1. ไปที่ Settings → Basic:
```
1. เมนูซ้าย → "Settings"
2. คลิก "Basic"
```

### 2. เพิ่ม App Domains:
```
1. เลื่อนหา "App Domains"
2. เพิ่ม:
   localhost (สำหรับทดสอบ)
   [your-domain.com] (สำหรับ production)
3. Save Changes
```

---

## 📍 ขั้นตอนที่ 8: ตั้งค่าใน Supabase

### 1. ไปที่ Supabase Dashboard:
```
1. https://supabase.com/dashboard
2. เลือกโปรเจกต์ BOQ Pro
3. Authentication → Providers
4. หา "Facebook"
```

### 2. Enable Facebook Provider:
```
1. เปิดสวิตช์ "Enable Sign in with Facebook"
2. กรอก:
   - Facebook App ID: [ที่คัดลอกมา]
   - Facebook App Secret: [ที่คัดลอกมา]
3. คลิก "Save"
```

### 3. คัดลอก Authorized redirect URIs:
```
Supabase จะแสดง:
https://[project-id].supabase.co/auth/v1/callback

คัดลอก URI นี้
```

---

## 📍 ขั้นตอนที่ 9: กลับไป Facebook - เพิ่ม Redirect URI

### 1. กลับไปที่ Facebook Developer Console
### 2. Facebook Login → Settings
### 3. วาง Redirect URI ที่คัดลอกมาจาก Supabase
### 4. Save Changes

---

## ✅ Checklist สุดท้าย

- [ ] มี Facebook App แล้ว
- [ ] คัดลอก App ID แล้ว
- [ ] คัดลอก App Secret แล้ว (คลิก Show)
- [ ] เพิ่ม Facebook Login Product
- [ ] ตั้งค่า Valid OAuth Redirect URIs
- [ ] ตั้งค่า App Domains
- [ ] Enable Facebook Provider ใน Supabase
- [ ] กรอก App ID และ App Secret ใน Supabase
- [ ] คัดลอก Redirect URI จาก Supabase กลับไป Facebook

---

## 🧪 ทดสอบ

### 1. รีเฟรชหน้าเว็บ BOQ Pro
### 2. คลิก "เข้าสู่ระบบด้วย Facebook"
### 3. ถ้าเปิดหน้า Facebook Login → สำเร็จ! ✅
### 4. ถ้าได้ error → ดู Troubleshooting ด้านล่าง

---

## 🐛 Troubleshooting

### Error: "provider is not enabled"
❌ ยังไม่ได้เปิด Facebook Provider ใน Supabase
✅ ไป Supabase Dashboard → Authentication → Providers → Enable Facebook

### Error: "App Not Setup"
❌ App ยังเป็น Development Mode และคุณไม่ได้อยู่ใน whitelist
✅ เพิ่มตัวเองเป็น Admin/Developer/Tester หรือเปลี่ยนเป็น Live Mode

### Error: "URL isn't included in app's domains"
❌ ยังไม่ได้เพิ่ม App Domains
✅ Settings → Basic → เพิ่ม domain

### Error: "redirect_uri is not whitelisted"
❌ ยังไม่ได้เพิ่ม Valid OAuth Redirect URIs
✅ Facebook Login → Settings → เพิ่ม Redirect URI จาก Supabase

---

## 📊 สรุปความต่าง

| ชื่อ | ใช้สำหรับ | ตัวอย่าง | ความยาว |
|------|-----------|----------|---------|
| **Access Token** | เรียก Graph API | EAAhgsTb23goBP9NZ... | ยาวมาก (200+ ตัวอักษร) |
| **App ID** | ตั้งค่า OAuth | 1234567890123456 | สั้น (15-16 หลัก) |
| **App Secret** | ตั้งค่า OAuth | a1b2c3d4e5f6g7h8... | กลางๆ (32 ตัวอักษร) |

---

## 💡 สิ่งที่ต้องจำ

1. **Access Token ≠ App Secret**
   - Access Token: ใช้เรียก API, มี expiration
   - App Secret: ใช้ตั้งค่า OAuth, ไม่มี expiration

2. **App Secret ต้องเก็บเป็นความลับ**
   - อย่า commit ลง Git
   - อย่าแชร์ในที่สาธารณะ
   - ใช้เฉพาะใน Backend/Supabase

3. **Development vs Live Mode**
   - Development: เฉพาะคนที่เพิ่มใน App เท่านั้น
   - Live: ทุกคนใช้ได้

---

## 🎯 หลังจากได้ App ID และ App Secret แล้ว

### ตั้งค่าใน Supabase:
```
1. Supabase Dashboard
2. Authentication → Providers → Facebook
3. Enable + กรอก App ID และ App Secret
4. Save
5. Copy Redirect URI
6. กลับไป Facebook และเพิ่ม Redirect URI
7. ทดสอบ Login!
```

---

## 📞 ต้องการความช่วยเหลือ?

ดูเอกสารเพิ่มเติม:
- **QUICK_FACEBOOK_LOGIN_SETUP.md** - Setup แบบเร็ว 15 นาที
- **FACEBOOK_LOGIN_SETUP.md** - Setup แบบละเอียด
- **SOCIAL_LOGIN_SETUP.md** - ภาพรวม Social Login

---

**✨ สรุป: ต้องหา App ID และ App Secret จาก Facebook Developer Console ไม่ใช่ Access Token!**

**Last Updated:** 2025-10-29
