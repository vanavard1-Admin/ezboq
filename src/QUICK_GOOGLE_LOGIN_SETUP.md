# ⚡ Quick Google Login Setup

## 🚨 สถานะ: ยังใช้งานไม่ได้ - ต้องตั้งค่าก่อน

**Error ที่เจอ:**
```
Unsupported provider: provider is not enabled
```

---

## 🎯 ต้องทำ 2 ขั้นตอนหลัก:

### 1️⃣ Google Cloud Console (5 นาที)

1. ไปที่ [console.cloud.google.com](https://console.cloud.google.com/)
2. เลือกโปรเจกต์ที่มี Client ID: `22226959309-1de3534e6o5utkut1ivv3gp1m3dge4po`
3. **APIs & Services** → **Credentials**
4. คลิกที่ OAuth 2.0 Client ID นั้น
5. **ดู/คัดลอก Client Secret** (ถ้าไม่เห็น คลิก Show)
6. บันทึก Client Secret ไว้

### 2️⃣ Supabase Dashboard (3 นาที)

1. ไปที่ [supabase.com/dashboard](https://supabase.com/dashboard)
2. เลือกโปรเจกต์ **BOQ Pro**
3. **Authentication** → **Providers** → **Google**
4. เปิดสวิตช์ **Enable Sign in with Google**
5. กรอก:
   ```
   Client ID: 22226959309-1de3534e6o5utkut1ivv3gp1m3dge4po
   Client Secret: [ที่คัดลอกมาจาก Google Cloud Console]
   ```
6. คลิก **Save**

---

## 🔄 ตั้งค่า Redirect URI (ถ้าจำเป็น)

หลังจาก Save ใน Supabase แล้ว:

1. Supabase จะแสดง **Authorized redirect URIs**:
   ```
   https://[project-id].supabase.co/auth/v1/callback
   ```
2. คัดลอก URI นี้
3. กลับไปที่ **Google Cloud Console** → **Credentials** → **Edit OAuth Client**
4. เพิ่ม URI ใน **Authorized redirect URIs**
5. คลิก **Save**

---

## ✅ ทดสอบว่าใช้งานได้

1. รีเฟรชหน้าเว็บ BOQ Pro
2. คลิก **"เข้าสู่ระบบด้วย Google"**
3. ถ้าไม่มี error → สำเร็จ! ✨
4. ถ้ายังมี error → ดู [Troubleshooting](#troubleshooting) ด้านล่าง

---

## 🐛 Troubleshooting

### Error: "provider is not enabled"
❌ **ยังไม่ได้เปิด Google Provider ใน Supabase**
✅ **วิธีแก้:** ทำตามขั้นตอนที่ 2️⃣ ด้านบน

### Error: "Invalid client_secret"
❌ **Client Secret ผิด หรือยังไม่ได้กรอก**
✅ **วิธีแก้:** ไปหา Client Secret ใหม่จาก Google Cloud Console

### Error: "redirect_uri_mismatch"
❌ **Redirect URI ไม่ตรงกัน**
✅ **วิธีแก้:** ทำตามขั้นตอน "ตั้งค่า Redirect URI" ด้านบน

### ปุ่ม Google Login ไม่มี reaction
❌ **Network error หรือ Supabase ไม่ตอบสนอง**
✅ **วิธีแก้:** เช็ค Console (F12) ดู error, ตรวจสอบ Supabase project status

---

## 📱 UI ใหม่ที่เพิ่มเข้ามา

### ปุ่ม Google Sign In
```
┌──────────────────────────────────┐
│  🔴 เข้าสู่ระบบด้วย Google      │
└──────────────────────────────────┘
```

### ข้อความแจ้งเตือน
```
ℹ️ ต้องตั้งค่าก่อน: เปิด Google Provider ใน 
   Supabase Dashboard → Authentication → Providers
```

### Error Message (เมื่อยังไม่ตั้งค่า)
```
🔧 Google Login ยังไม่พร้อมใช้งาน

⚙️ ต้องตั้งค่า Google Provider ใน Supabase ก่อน - 
   ดูคู่มือใน GOOGLE_LOGIN_SETUP.md
```

---

## 📚 เอกสารเพิ่มเติม

- **Full Guide:** `/GOOGLE_LOGIN_SETUP.md` (คู่มือละเอียด)
- **Supabase Docs:** [supabase.com/docs/guides/auth/social-login/auth-google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- **Google OAuth:** [developers.google.com/identity/protocols/oauth2](https://developers.google.com/identity/protocols/oauth2)

---

## ⏱️ เวลาที่ใช้

- **ตั้งค่าครั้งแรก:** ~10 นาที
- **ทดสอบ:** ~2 นาที
- **รวม:** ~12 นาที

---

## 🎁 ประโยชน์หลังตั้งค่าเสร็จ

✅ User Login ได้ง่าย ไม่ต้องจำรหัสผ่าน
✅ ปลอดภัยด้วย OAuth 2.0
✅ ได้ชื่อ, อีเมล, รูปโปรไฟล์อัตโนมัติ
✅ Professional - เพิ่มความน่าเชื่อถือ
✅ Conversion rate สูงขึ้น

---

**🚀 เริ่มตั้งค่าตอนนี้เลย - ใช้เวลาแค่ 10 นาที!**
