# 🔐 Google Login Setup Guide

## ⚠️ สถานะ: **ต้องตั้งค่าก่อนใช้งาน**

ระบบมี **Google OAuth Login** แล้ว แต่ **ยังใช้งานไม่ได้** จนกว่าคุณจะตั้งค่าใน Supabase Dashboard

### 📌 Error ที่เจอ:
```json
{
  "code": 400,
  "error_code": "validation_failed",
  "msg": "Unsupported provider: provider is not enabled"
}
```

**สาเหตุ:** Google Provider ยังไม่ได้เปิดใช้งานใน Supabase

---

## 📋 Google Client ID ของคุณ

```
Client ID: 22226959309-1de3534e6o5utkut1ivv3gp1m3dge4po.apps.googleusercontent.com
```

⚠️ **คุณยังต้องมี Client Secret จาก Google Cloud Console ด้วย**

---

## 🚀 ขั้นตอนการตั้งค่าใน Supabase Dashboard (บังคับ)

### ขั้นตอนที่ 1: เข้าสู่ Supabase Dashboard
1. ไปที่ [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. เลือกโปรเจกต์ของคุณ (BOQ Pro)

### ขั้นตอนที่ 2: เปิดหน้า Authentication Providers
1. คลิกที่เมนู **Authentication** ทางซ้ายมือ
2. คลิกที่ **Providers** (tab ด้านบน)
3. เลื่อนหา **Google** ในรายการ

### ขั้นตอนที่ 3: Enable Google Provider
1. คลิกที่ **Google** provider
2. เปิดสวิตช์ **Enable Sign in with Google** ให้เป็นสีเขียว
3. จะมีฟอร์มให้กรอกข้อมูล

### ขั้นตอนที่ 4: กรอก Client ID และ Client Secret

```
Client ID (for OAuth):
22226959309-1de3534e6o5utkut1ivv3gp1m3dge4po.apps.googleusercontent.com

Client Secret (for OAuth):
[ต้องได้มาจาก Google Cloud Console - ดูวิธีด้านล่าง]
```

> **🚨 สำคัญมาก:** คุณ**ต้องมี Client Secret** ด้วย! ไม่มี Client ID อย่างเดียวไม่ได้

### 4. ตั้งค่า Redirect URLs
Supabase จะแสดง **Authorized redirect URIs** ให้คุณ (ตัวอย่าง):

```
https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback
```

คัดลอก URL นี้แล้วไปเพิ่มใน **Google Cloud Console** → **Credentials** → **Authorized redirect URIs**

### 5. บันทึกการตั้งค่า
1. คลิก **Save** ใน Supabase Dashboard
2. รอสักครู่ให้ระบบอัพเดท

---

## 🔧 หา Client Secret จาก Google Cloud Console

### ⚠️ สำคัญ: ต้องทำขั้นตอนนี้ก่อน!

คุณมี Client ID แล้ว แต่ยังขาด **Client Secret** ซึ่งต้องได้จาก Google Cloud Console

### วิธีหา Client Secret:

**กรณีที่ 1: มี OAuth Client ID อยู่แล้ว**
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. เลือกโปรเจกต์ที่มี Client ID นี้
3. ไปที่ **APIs & Services** → **Credentials**
4. หา OAuth 2.0 Client ID ที่มี Client ID: `22226959309-1de3534e6o5utkut1ivv3gp1m3dge4po`
5. คลิกที่ชื่อ Client ID นั้น
6. จะเห็น **Client secret** อยู่ในหน้านั้น (ถ้าไม่เห็น คลิก "Show secret")
7. คัดลอก Client Secret ไปใส่ใน Supabase

**กรณีที่ 2: ยังไม่มี Client Secret (ต้องสร้างใหม่)**

### สร้าง OAuth 2.0 Client ID ใหม่

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. เลือกโปรเจกต์ของคุณ (หรือสร้างใหม่)
3. ไปที่ **APIs & Services** → **Credentials**
4. คลิก **CREATE CREDENTIALS** → **OAuth client ID**
5. เลือก **Application type**: **Web application**
6. ตั้งชื่อ: `BOQ Pro - Supabase Auth`

### ตั้งค่า Authorized redirect URIs

เพิ่ม URIs ต่อไปนี้:

```
# Production (จาก Supabase)
https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback

# Development (สำหรับทดสอบ localhost)
http://localhost:5173
http://localhost:3000
```

### เปิดใช้งาน Google+ API

1. ไปที่ **APIs & Services** → **Library**
2. ค้นหา **Google+ API**
3. คลิก **Enable**

---

## ✅ ทดสอบ Google Login

### 1. ในหน้า Login
1. รีเฟรชหน้าเว็บ
2. คุณจะเห็นปุ่ม **"เข้าสู่ระบบด้วย Google"** 
3. คลิกปุ่ม
4. เลือกบัญชี Google ของคุณ
5. อนุญาตการเข้าถึง
6. ระบบจะพาคุณกลับมายังแอป และเข้าสู่ระบบอัตโนมัติ! 🎉

---

## 📱 UI Changes

### ปุ่ม Google Sign In
```tsx
<Button
  onClick={handleGoogleSignIn}
  variant="outline"
  className="w-full h-12 border-2 hover:bg-gray-50"
>
  <Chrome className="h-5 w-5 mr-2 text-red-500" />
  เข้าสู่ระบบด้วย Google
</Button>
```

### ลำดับการแสดงใน LoginPage:
1. **Form Login/Signup** (Email + Password)
2. **Divider** ("หรือ")
3. **Google Sign In Button** ⭐ ใหม่!
4. **Divider** ("หรือ")
5. **Demo Mode Button** (สำหรับทดลอง)

---

## 🐛 Troubleshooting

### ปัญหา: "Provider is not enabled"
**สาเหตุ:** Google Provider ยังไม่ได้เปิดใช้งานใน Supabase

**วิธีแก้:**
1. ไปที่ Supabase Dashboard → Authentication → Providers
2. เปิดใช้งาน Google Provider
3. กรอก Client ID และ Client Secret

### ปัญหา: "Redirect URI mismatch"
**สาเหตุ:** Redirect URI ใน Google Cloud Console ไม่ตรงกับ Supabase

**วิธีแก้:**
1. คัดลอก Redirect URI จาก Supabase (จะแสดงในหน้าตั้งค่า Google Provider)
2. เพิ่ม URI นี้ใน Google Cloud Console → Credentials → Authorized redirect URIs
3. บันทึกและรอ 5-10 นาที

### ปัญหา: "Access blocked: This app's request is invalid"
**สาเหตุ:** Google+ API ไม่ได้เปิดใช้งาน หรือ OAuth Consent Screen ไม่ได้ตั้งค่า

**วิธีแก้:**
1. เปิดใช้งาน Google+ API ใน Google Cloud Console
2. ตั้งค่า OAuth Consent Screen:
   - ไปที่ **OAuth consent screen**
   - เลือก **External** (สำหรับทดสอบ)
   - กรอกข้อมูล App name, User support email, Developer email
   - บันทึก

---

## 📚 เอกสารอ้างอิง

- [Supabase Google Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## 🎯 Benefits ของ Google Login

✅ **สะดวกรวดเร็ว** - ไม่ต้องจำรหัสผ่าน
✅ **ปลอดภัย** - ใช้ OAuth 2.0 มาตรฐาน
✅ **ข้อมูลครบถ้วน** - ได้ชื่อ, อีเมล, รูปโปรไฟล์อัตโนมัติ
✅ **ไว้ใจได้** - ใช้บัญชี Google ที่มีอยู่แล้ว

---

## 🔐 Security Notes

- **Client Secret** ต้องเก็บเป็นความลับ ไม่ควรแชร์ใน public repositories
- Supabase จัดการ OAuth flow ทั้งหมด - ไม่ต้องกังวลเรื่อง token management
- Google Login จะสร้าง User ใน Supabase Auth table อัตโนมัติ
- User metadata (ชื่อ, รูป) จะถูกเก็บใน `user_metadata` field

---

## ✨ Next Steps

หลังจากตั้งค่า Google Login เรียบร้อย:

1. **ทดสอบ** - Login ด้วย Google Account จริง
2. **Profile Setup** - ตรวจสอบว่า User profile ถูกสร้างอัตโนมัติ
3. **Production Deploy** - เพิ่ม Production URL ใน Authorized redirect URIs
4. **Monitor** - ดู Auth logs ใน Supabase Dashboard

---

---

## 🎯 สรุปสั้นๆ - ต้องทำอะไรบ้าง?

### ✅ Checklist:

- [ ] **1. หา Client Secret จาก Google Cloud Console**
  - ไปที่ Credentials → คลิก OAuth Client ID ที่มี Client ID นี้
  - Copy Client Secret

- [ ] **2. เปิด Google Provider ใน Supabase**
  - Dashboard → Authentication → Providers → Google
  - Enable และกรอก Client ID + Client Secret

- [ ] **3. Copy Redirect URI จาก Supabase**
  - จะแสดงใน Google Provider settings

- [ ] **4. เพิ่ม Redirect URI ใน Google Cloud Console**
  - Credentials → Edit OAuth Client → Authorized redirect URIs
  - เพิ่ม URI จาก Supabase

- [ ] **5. บันทึกและทดสอบ**
  - Save ทั้ง Supabase และ Google Cloud Console
  - ลอง Login ด้วย Google ในแอป

### 🔴 ปัจจุบัน: **ยังใช้งานไม่ได้**
Error: `Unsupported provider: provider is not enabled`

### 🟢 หลังตั้งค่าเสร็จ: **ใช้งานได้ทันที**
User จะสามารถ Login ด้วย Google Account ได้เลย!

---

**🎉 เมื่อตั้งค่าเสร็จ - ระบบพร้อมใช้งาน Google Login!**
