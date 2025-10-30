# 🔑 Facebook: Access Token vs App Secret

## ⚠️ สิ่งที่คุณต้องเข้าใจ

คุณให้ **Access Token** มา แต่สำหรับ **Facebook OAuth Login** ต้องใช้ **App Secret**

---

## 📊 เปรียบเทียบ

### 1️⃣ Access Token (ที่คุณมี)

```json
{
  "access_token": "EAAhgsTb23goBP9NZAejktAZAcqZCfY6QovTpSR8ZCZBB7qMNbrZBlBXIil9G1nZCrL2AUawNj3BjevFQEPU7ZBIbMkB5G4rf2HVAGNMw6h2yYzE87C2EqPIKApDJ5xJlUJ8SO4wAbDSW7g4ah3a3cpXIlKgQAQ969kXePWCvMEdykX6mEsB9lYsWNss13txDzxDRohfQCisGc2cNmVZCr",
  "token_type": "bearer",
  "expires_in": 5182511
}
```

**คุณสมบัติ:**
- ✅ ความยาว: 200+ ตัวอักษร
- ✅ เริ่มต้นด้วย: `EAA...`
- ✅ มี `expires_in`: 5182511 วินาที (~60 วัน)
- ✅ เป็น `bearer` token

**ใช้สำหรับ:**
- ✅ เรียก Facebook Graph API
- ✅ ดึงข้อมูล user: `/me`, `/me/posts`
- ✅ Post to Facebook
- ✅ อ่าน/เขียนข้อมูล user ตามสิทธิ์ที่มี
- ❌ **ไม่ได้ใช้สำหรับตั้งค่า OAuth**

**ตัวอย่างการใช้งาน:**
```javascript
// เรียก Facebook Graph API
fetch('https://graph.facebook.com/me?access_token=EAAhgsTb23goBP...')
  .then(res => res.json())
  .then(data => console.log(data.name))
```

---

### 2️⃣ App Secret (สิ่งที่ต้องการ)

```
App Secret: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**คุณสมบัติ:**
- ✅ ความยาว: 32 ตัวอักษร (สั้นกว่า Access Token มาก)
- ✅ ไม่มี `expires_in` (ไม่หมดอายุ)
- ✅ เก็บเป็นความลับ
- ✅ ใช้คู่กับ App ID

**ใช้สำหรับ:**
- ✅ ตั้งค่า Facebook OAuth ใน Supabase
- ✅ Server-to-server authentication
- ✅ Secure API calls
- ❌ **ไม่ได้ใช้เรียก Graph API โดยตรง**

**หาได้จาก:**
```
Facebook Developer Console
→ My Apps
→ [Your App]
→ Settings → Basic
→ App Secret: ••••••••  [Show] ← คลิก!
```

---

### 3️⃣ App ID (ต้องการด้วย)

```
App ID: 1234567890123456
```

**คุณสมบัติ:**
- ✅ ความยาว: 15-16 หลัก
- ✅ เป็นตัวเลขล้วนๆ
- ✅ ไม่ลับ (public)
- ✅ ใช้คู่กับ App Secret

**ใช้สำหรับ:**
- ✅ ระบุ Facebook App ที่ใช้
- ✅ ตั้งค่า Facebook OAuth
- ✅ Facebook SDK initialization

**หาได้จาก:**
```
Facebook Developer Console
→ My Apps
→ [Your App]
→ Dashboard
→ App ID: 1234567890123456 ← อยู่ด้านบนสุด
```

---

## 🎯 สรุปตาราง

| ชื่อ | ความยาว | Expires | ใช้สำหรับ | ลับ? | มี? |
|------|---------|---------|-----------|------|-----|
| **Access Token** | 200+ | ✅ 60 วัน | เรียก Graph API | ⚠️ ควรเก็บ | ✅ มี |
| **App ID** | 15-16 | ❌ ไม่หมด | OAuth Setup | ❌ Public | ❌ **ยังไม่มี** |
| **App Secret** | 32 | ❌ ไม่หมด | OAuth Setup | ✅ ลับมาก | ❌ **ยังไม่มี** |

---

## 🔍 ทำไม Access Token ไม่ใช่ App Secret?

### Access Token:
```
สร้างเมื่อ: User login ผ่าน Facebook
ระยะเวลา: 60 วัน (หลังจากนั้นต้อง refresh)
สิทธิ์: ของ User คนนั้นๆ
ขอบเขต: เฉพาะ User ที่ login
```

### App Secret:
```
สร้างเมื่อ: สร้าง Facebook App
ระยะเวลา: ถาวร (จนกว่าจะ reset)
สิทธิ์: ของทั้ง App
ขอบเขต: ทั้ง App (ทุก Users)
```

---

## 📋 Workflow ที่ถูกต้อง

### ✅ ขั้นตอนการตั้งค่า Facebook OAuth:

```
1. สร้าง Facebook App (ถ้ายังไม่มี)
   ↓
2. หา App ID จาก Dashboard
   → ตัวเลข 15-16 หลัก
   ↓
3. หา App Secret จาก Settings → Basic
   → คลิก "Show"
   → string 32 ตัวอักษร
   ↓
4. ตั้งค่า Facebook Login Product
   → เพิ่ม Valid OAuth Redirect URIs
   → เพิ่ม App Domains
   ↓
5. ไปที่ Supabase Dashboard
   → Authentication → Providers → Facebook
   → Enable
   → กรอก App ID + App Secret
   → Save
   ↓
6. คัดลอก Redirect URI จาก Supabase
   ↓
7. กลับไป Facebook → Facebook Login → Settings
   → เพิ่ม Redirect URI
   → Save
   ↓
8. ทดสอบ Login! ✅
```

---

## ❌ Workflow ที่ผิด (ที่คุณกำลังทำ):

```
1. ได้ Access Token มา ❌
   ↓
2. คิดว่าเป็น App Secret ❌
   ↓
3. นำไปใส่ใน Supabase ❌
   ↓
4. Error: "Invalid credentials" ❌
```

**สาเหตุ:** Access Token ไม่ใช่ App Secret!

---

## 🎓 เข้าใจ Architecture

### Facebook OAuth Flow ที่ถูกต้อง:

```
User คลิก "Login with Facebook"
  ↓
Frontend ส่งคำขอไป Supabase
  ↓
Supabase ใช้ App ID + App Secret
  ↓
Redirect ไป Facebook OAuth
  ↓
User อนุญาต
  ↓
Facebook ส่ง Authorization Code กลับมา
  ↓
Supabase แลก Code กับ Access Token
  ↓
User login สำเร็จ + ได้ Access Token ✅
```

**สังเกต:**
- App ID + App Secret: ใช้ในขั้นตอนตั้งค่า (Supabase → Facebook)
- Access Token: ได้รับหลังจาก User login สำเร็จ

---

## 🛠️ การใช้งาน Access Token ที่คุณมี

Access Token ที่คุณมีนั้น**ใช้งานได้**! แต่ใช้สำหรับจุดประสงค์อื่น:

### ✅ สิ่งที่ทำได้ด้วย Access Token:

#### 1. ดึงข้อมูล User:
```javascript
const response = await fetch(
  'https://graph.facebook.com/me?fields=id,name,email,picture&access_token=EAAhgsTb23goBP...'
);
const user = await response.json();
console.log(user);
// { id: '...', name: '...', email: '...', picture: {...} }
```

#### 2. Post to Facebook:
```javascript
const response = await fetch(
  'https://graph.facebook.com/me/feed',
  {
    method: 'POST',
    body: JSON.stringify({
      message: 'Hello from BOQ Pro!',
      access_token: 'EAAhgsTb23goBP...'
    })
  }
);
```

#### 3. อ่าน Posts:
```javascript
const response = await fetch(
  'https://graph.facebook.com/me/posts?access_token=EAAhgsTb23goBP...'
);
const posts = await response.json();
```

### ❌ สิ่งที่ทำไม่ได้ด้วย Access Token:

- ❌ ตั้งค่า Facebook OAuth ใน Supabase
- ❌ ใช้แทน App Secret
- ❌ Server-to-server authentication

---

## 💡 แนวทางแก้ไข

### Option 1: ใช้ Facebook OAuth (แนะนำ)

**ต้องการ:**
- App ID (หาจาก Facebook Developer Console)
- App Secret (หาจาก Facebook Developer Console)

**ประโยชน์:**
- User login ง่าย (1 คลิก)
- ไม่ต้องจำ password
- ปลอดภัย (OAuth 2.0)

**ดูคู่มือ:**
- FACEBOOK_APP_CREDENTIALS.md (เอกสารนี้)
- QUICK_FACEBOOK_LOGIN_SETUP.md

### Option 2: ใช้ Email/Password Login

**ต้องการ:**
- ไม่ต้องการอะไร (ใช้ได้เลย!)

**ประโยชน์:**
- Setup ง่าย (0 นาที)
- ทำงานได้ทันที

**วิธีใช้:**
- คลิก "สมัครสมาชิก" ในหน้า Login
- กรอกอีเมล + password
- เข้าสู่ระบบอัตโนมัติ

### Option 3: ใช้ Demo Mode

**ต้องการ:**
- ไม่ต้องการอะไร (ใช้ได้เลย!)

**ประโยชน์:**
- เข้าใช้ทันที (0 วินาที)
- ไม่ต้องสมัครสมาชิก

**วิธีใช้:**
- คลิกปุ่มสีส้ม "ทดลองใช้งานทันที (Demo Mode)"

---

## 🎯 Next Steps

### ถ้าต้องการใช้ Facebook Login:

1. **ไปที่ Facebook Developer Console**
   - https://developers.facebook.com/

2. **หา App ID และ App Secret**
   - My Apps → [Your App] → Dashboard
   - คัดลอกทั้งสองอย่าง

3. **ตั้งค่าใน Supabase**
   - Authentication → Providers → Facebook
   - กรอก App ID + App Secret

4. **ทดสอบ**
   - คลิก "เข้าสู่ระบบด้วย Facebook"

### ถ้าไม่ต้องการ Setup:

1. **ใช้ Email/Password**
   - สมัครสมาชิกได้เลย

2. **ใช้ Demo Mode**
   - คลิกปุ่มสีส้มได้เลย

---

## 📚 เอกสารที่เกี่ยวข้อง

- **FACEBOOK_APP_CREDENTIALS.md** - เอกสารนี้
- **QUICK_FACEBOOK_LOGIN_SETUP.md** - Setup แบบเร็ว
- **FACEBOOK_LOGIN_SETUP.md** - Setup แบบละเอียด
- **SOCIAL_LOGIN_SETUP.md** - ภาพรวม Social Login
- **LOGIN_PRODUCTION_READY.md** - หน้า Login Production

---

## ✅ สรุป

### สิ่งที่คุณมี:
```
✅ Access Token (200+ ตัวอักษร)
   → ใช้เรียก Facebook Graph API
   → Expires ใน 60 วัน
   → ไม่ใช่สิ่งที่ต้องการสำหรับ OAuth
```

### สิ่งที่ต้องการ:
```
❌ App ID (15-16 หลัก)
   → หาจาก Facebook Developer Console
   
❌ App Secret (32 ตัวอักษร)
   → หาจาก Facebook Developer Console
   → คลิก "Show" ที่ Settings → Basic
```

### การกระทำต่อไป:
```
1. ไปที่ developers.facebook.com
2. หา App ID และ App Secret
3. ตั้งค่าใน Supabase
4. ทดสอบ Facebook Login! ✅
```

---

**🎓 จำไว้: Access Token ≠ App Secret!**

**Last Updated:** 2025-10-29
