# ⚡ Quick Facebook Login Setup

## 🚨 สถานะ: ยังใช้งานไม่ได้ - ต้องตั้งค่าก่อน

**Error ที่เจอ:**
```
Unsupported provider: provider is not enabled
```

---

## ⚠️ สิ่งที่คุณมี vs สิ่งที่ต้องการ

### ✅ สิ่งที่คุณมีอยู่:
```
Access Token: EAAhgsTb23goBP9Du4rYBW7ooUQ2eqtRgutTdDkT6MvXP...
```

### ❌ สิ่งที่ยังขาด:
```
1. Facebook App ID (ตัวเลข 15-16 หลัก)
2. Facebook App Secret (string สั้นๆ ไม่ใช่ Access Token)
```

**Access Token ที่คุณมี ≠ App Secret** (ใช้คนละจุดประสงค์)

---

## 🎯 ต้องทำ 3 ขั้นตอนหลัก:

### 1️⃣ Facebook Developer Console (7 นาที)

#### หา App ID และ App Secret:
1. ไปที่ [developers.facebook.com](https://developers.facebook.com/)
2. **My Apps** → เลือก App ของคุณ
3. ที่หน้า Dashboard:
   - **App ID:** เห็นชัดเจน (คัดลอก)
   - **App Secret:** คลิก "Show" (คัดลอก)

#### ตั้งค่า OAuth Redirect:
4. **Facebook Login** → **Settings**
5. เพิ่ม **Valid OAuth Redirect URIs:**
   ```
   https://[project-id].supabase.co/auth/v1/callback
   ```
   (จะได้จาก Supabase ในขั้นตอนถัดไป)

6. **Settings** → **Basic** → **App Domains:**
   ```
   localhost
   [your-domain.com]
   ```

7. **บันทึก**

### 2️⃣ Supabase Dashboard (3 นาที)

1. ไปที่ [supabase.com/dashboard](https://supabase.com/dashboard)
2. เลือกโปรเจกต์ **BOQ Pro**
3. **Authentication** → **Providers** → **Facebook**
4. เปิดสวิตช์ **Enable Sign in with Facebook**
5. กรอก:
   ```
   Facebook App ID: [ที่คัดลอกมา]
   Facebook App Secret: [ที่คัดลอกมา]
   ```
6. คัดลอก **Authorized redirect URIs** ที่แสดง
7. คลิก **Save**

### 3️⃣ กลับไป Facebook - เพิ่ม Redirect URI (2 นาที)

1. กลับไปที่ Facebook Developer Console
2. **Facebook Login** → **Settings**
3. วาง Redirect URI ที่คัดลอกมาจาก Supabase
4. **Save Changes**

---

## ✅ ทดสอบว่าใช้งานได้

1. รีเฟรชหน้าเว็บ BOQ Pro
2. คลิก **"เข้าสู่ระบบด้วย Facebook"**
3. ถ้าเปิดหน้า Facebook Login → สำเร็จ! ✨
4. Login ด้วยบัญชี Facebook
5. ระบบพากลับมาแอป และ login อัตโนมัติ! 🎉

---

## 🐛 Quick Troubleshooting

| Error | วิธีแก้ |
|-------|---------|
| **provider is not enabled** | เปิด Facebook Provider ใน Supabase |
| **URL isn't included in app's domains** | เพิ่ม domain ใน Facebook App Domains |
| **redirect URI is not whitelisted** | เพิ่ม Redirect URI ใน Facebook Login Settings |
| **App is still in development mode** | เปลี่ยนเป็น Live Mode (ถ้าพร้อม production) |

---

## 📱 UI ใหม่ที่เพิ่มเข้ามา

### หน้า Login ตอนนี้มี:
```
1. Email/Password Form
2. ─── หรือ ───
3. 🔴 Google Login
4. 🔵 Facebook Login  ← ใหม่!
5. ℹ️ ต้องตั้งค่าก่อน: เปิด Provider ใน Supabase
6. ─── หรือ ───
7. 🟧 Demo Mode
```

---

## 📚 เอกสารเพิ่มเติม

- **Full Guide:** `/FACEBOOK_LOGIN_SETUP.md` (คู่มือละเอียด)
- **Supabase Docs:** [supabase.com/docs/guides/auth/social-login/auth-facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook)
- **Facebook Docs:** [developers.facebook.com/docs/facebook-login](https://developers.facebook.com/docs/facebook-login/)

---

## ⏱️ เวลาที่ใช้

- **Facebook Setup:** ~7 นาที
- **Supabase Setup:** ~3 นาที
- **เพิ่ม Redirect URI:** ~2 นาที
- **ทดสอบ:** ~2 นาที
- **รวม:** ~15 นาที

---

## 🎁 ประโยชน์หลังตั้งค่าเสร็จ

✅ Login ง่ายด้วย Facebook Account
✅ ไม่ต้องจำรหัสผ่าน
✅ ได้ชื่อ + รูปโปรไฟล์อัตโนมัติ
✅ เพิ่มทางเลือกให้ผู้ใช้
✅ Conversion rate สูงขึ้น

---

## 💡 สิ่งที่ต้องจำ

1. **Access Token ≠ App Secret**
   - Access Token: ยาวมาก, ใช้เรียก Graph API
   - App Secret: สั้นกว่า, ใช้ตั้งค่า OAuth

2. **Development vs Live Mode:**
   - Development: เฉพาะคนที่เพิ่มใน App เท่านั้น
   - Live: ทุกคน login ได้

3. **App Domain ต้องตรง:**
   - localhost สำหรับทดสอบ
   - production domain สำหรับ production

---

**🚀 เริ่มตั้งค่าตอนนี้เลย - ใช้เวลาแค่ 15 นาที!**

**💡 Tip:** ถ้ายังไม่พร้อม สามารถใช้ **Demo Mode** ได้เลยตอนนี้!
