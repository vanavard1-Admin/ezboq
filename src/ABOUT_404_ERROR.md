# 🔍 เกี่ยวกับ 404 Error

**วันที่**: 29 ตุลาคม 2025  
**Error**: `❌ API Error (404): 404 Not Found`  
**สถานะ**: ⏳ รอการตรวจสอบ

---

## 📖 404 Error คืออะไร?

**404 Not Found** = Server ไม่พบ endpoint ที่ร้องขอ

**ตัวอย่าง**:
```
GET /profile/undefined  ← 404! (userId = undefined)
GET /profile/null       ← 404! (userId = null)
GET /nonexistent        ← 404! (endpoint ไม่มีจริง)
GET /profile/abc123     ← 200 OK! (ถูกต้อง)
```

---

## 🤔 สาเหตุที่เป็นไปได้

### 1. User ID เป็น undefined/null

**ปัญหา**:
```typescript
// ProfilePage.tsx
api.get(`/profile/${user.id}`)
// ถ้า user = null → /profile/null → 404!
// ถ้า user.id = undefined → /profile/undefined → 404!
```

**การแก้ไข**:
```typescript
if (!user || !user.id) {
  console.error('❌ No user ID available');
  return;
}
api.get(`/profile/${user.id}`); // ✅ Safe
```

---

### 2. ยังไม่ได้ Login

**สถานะ**:
- User = null
- Session = null
- View = 'login'

**การแก้ไข**:
```bash
# ไปที่หน้า Login
http://localhost:5173/login

# หรือ Demo Mode
# เปิด Console และพิมพ์:
localStorage.setItem('demo-mode', 'true')
localStorage.setItem('demo-session-id', 'demo-' + Date.now())
localStorage.setItem('demo-user', JSON.stringify({
  id: 'demo-user-123',
  email: 'demo@example.com',
  user_metadata: { name: 'Demo User' }
}))
# แล้ว Reload
```

---

### 3. Session หมดอายุ

**ปัญหา**:
- มี user ใน state
- แต่ session หมดอายุ
- API calls ล้มเหลว → 404

**การตรวจสอบ**:
```typescript
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
// ถ้า null → หมดอายุ!
```

**การแก้ไข**:
```typescript
// Login ใหม่
http://localhost:5173/login
```

---

### 4. Endpoint ไม่มีข้อมูล

**ปัญหา**:
- Endpoint มีอยู่จริง
- แต่ยังไม่มีข้อมูลในฐานข้อมูล
- Server return 404

**ตัวอย่าง**:
```typescript
// User ใหม่ → ยังไม่มี profile
GET /profile/new-user-123 → 404

// ยังไม่มี team members
GET /team/members/new-user-123 → 404
```

**การแก้ไข**:
- สร้างข้อมูล default
- หรือ handle 404 gracefully

---

## 🔧 วิธีแก้ไขใน api.ts

### เรามี 404 Handler แล้ว!

```typescript
// utils/api.ts - บรรทัด ~432-447
if (response.status === 404) {
  console.log(`ℹ️ 404 Not Found: ${endpoint} - Returning empty data`);
  
  // ✅ Return empty data structure แทน error
  return new Response(JSON.stringify({ 
    data: null,
    documents: [],
    error: null,
    message: 'Not found'
  }), {
    status: 200, // ← เปลี่ยนเป็น 200!
    headers: {
      'Content-Type': 'application/json',
      'X-Original-Status': '404',
      'X-Cache': 'MISS',
    },
  });
}
```

**ผลลัพธ์**:
- ✅ ไม่ throw error
- ✅ Return empty data structure
- ✅ Status = 200 (เพื่อไม่ให้ caller error)
- ✅ X-Original-Status = '404' (สำหรับ debugging)

---

## 🧪 วิธีตรวจสอบ 404

### Step 1: เปิด Network Tab

1. กด F12
2. ไปที่ tab "Network"
3. Reload page (F5)
4. มองหา requests ที่มี Status: 404 (red)

---

### Step 2: ดู URL

คลิกที่ request ที่ 404 แล้วดู:

**Request URL**:
```
https://cezwqajbkjhvumbhpsgy.supabase.co/functions/v1/make-server-6e95bca3/profile/undefined
                                                                                   ^^^^^^^^
                                                                                   ปัญหา!
```

**Headers**:
```
Authorization: Bearer ...
X-Demo-Session-Id: ... (ถ้ามี)
```

**Response**:
```json
{
  "data": null,
  "documents": [],
  "error": null,
  "message": "Not found"
}
```

---

### Step 3: เช็ค Console

**ควรเห็น**:
```
ℹ️ 404 Not Found: /profile/undefined - Returning empty data
✅ Returning NEW Response object for /profile/undefined
```

**ไม่ควรเห็น**:
```
❌ API Error (404): 404 Not Found  ← ถ้าเห็นแปลว่า handler ไม่ทำงาน
```

---

## 🐛 Debugging 404

### Case 1: user.id = undefined

**เช็ค**:
```typescript
// ProfilePage.tsx - บรรทัด ~249
console.log('🔍 User:', user);
console.log('🔍 User ID:', user?.id);
```

**Output**:
```
🔍 User: null           ← ยังไม่ login!
🔍 User ID: undefined   ← ไม่มี ID!
```

**แก้ไข**: Login ก่อน

---

### Case 2: Demo Mode ไม่ทำงาน

**เช็ค**:
```typescript
const isDemoMode = localStorage.getItem('demo-mode') === 'true';
const demoUser = localStorage.getItem('demo-user');
const demoSessionId = localStorage.getItem('demo-session-id');

console.log('Demo Mode:', isDemoMode);
console.log('Demo User:', demoUser);
console.log('Session ID:', demoSessionId);
```

**แก้ไข**: ตั้งค่า Demo Mode ใหม่

---

### Case 3: Endpoint ผิด

**เช็ค Server Routes**:
```bash
grep "app.get" supabase/functions/server/index.tsx | grep profile

# ควรเห็น:
# app.get("/make-server-6e95bca3/profile/:userId", ...)
```

**เช็ค API Call**:
```typescript
// ✅ ถูกต้อง:
api.get(`/profile/${user.id}`)
// URL: /make-server-6e95bca3/profile/abc123

// ❌ ผิด:
api.get(`/profiles/${user.id}`)  // <- 's' ผิด!
api.get(`/user/${user.id}`)      // <- endpoint ผิด!
```

---

## ✅ Expected Behavior

### หลังจาก Restart:

**ถ้ามี User**:
```
✅ 🔄 Loading all data for user: abc123-...
✅ 💾 Cached response for /profile/abc123 (234ms)
✅ Profile loaded successfully
```

**ถ้าไม่มี User**:
```
⚠️ No user found, skipping data load
ℹ️ Redirecting to login...
```

**ถ้า 404 แต่ handle ได้**:
```
ℹ️ 404 Not Found: /profile/new-user - Returning empty data
✅ Profile page loaded (empty state)
```

---

## 🔧 แนวทางแก้ไข

### Option 1: ตรวจสอบ User ก่อน

```typescript
const loadAllData = async () => {
  // ✅ Check user first!
  if (!user || !user.id) {
    console.log('⚠️ No user found, skipping data load');
    toast.info('กรุณาเข้าสู่ระบบ');
    setView('login'); // Redirect to login
    return;
  }

  // Now safe to call API
  const response = await api.get(`/profile/${user.id}`);
  ...
}
```

---

### Option 2: Handle 404 Gracefully

```typescript
const response = await api.get(`/profile/${user.id}`);

if (response.ok) {
  const data = await response.json();
  
  // ✅ Check if data exists
  if (data.data === null || !data.profile) {
    console.log('ℹ️ Profile not found, using default');
    setProfile(getDefaultProfile());
  } else {
    setProfile(data.profile);
  }
}
```

---

### Option 3: Create Default Data

```typescript
// Server: supabase/functions/server/index.tsx

app.get("/make-server-6e95bca3/profile/:userId", async (c) => {
  const userId = c.req.param("userId");
  
  let profile = await kv.get(`profile-${userId}`);
  
  // ✅ If not found, create default
  if (!profile) {
    profile = {
      id: userId,
      name: 'New User',
      email: '',
      // ... default fields
    };
    await kv.set(`profile-${userId}`, profile);
  }
  
  return c.json({ profile });
});
```

---

## 📊 สรุป

### 404 Error เกิดจาก:

1. **User ID = undefined/null** ← Most common!
2. **ยังไม่ได้ Login**
3. **Session หมดอายุ**
4. **Endpoint ไม่มีข้อมูล**
5. **Endpoint ผิด** (typo)

### การแก้ไข:

1. ✅ **Check user before API call**
2. ✅ **Handle 404 gracefully** (already done in api.ts)
3. ✅ **Ensure user is logged in**
4. ✅ **Create default data if needed**

---

## 🚀 Action Items

### ตอนนี้:

1. **Restart dev server** (ถ้ายังไม่ได้ทำ)
   ```bash
   npm run dev
   ```

2. **เช็ค Console**
   ```
   ควรเห็น: ✅ Profile loaded successfully
   ไม่ควรเห็น: ❌ API Error (404)
   ```

3. **ถ้ายังมี 404**:
   - เช็ค User ID: `console.log(user?.id)`
   - Login ใหม่: `/login`
   - เช็ค Demo Mode

---

## 📚 อ่านเพิ่มเติม

- `/FIX_BODY_STREAM_AND_404.md` - คำแนะนำครบถ้วน
- `/QUICK_FIX_BODY_STREAM_404.md` - Quick fix guide
- `/FIXED_BODY_STREAM_COMPLETE.md` - Body stream fix details

---

**สถานะ**: ⏳ รอการทดสอบหลัง restart  
**Action Required**: RESTART dev server แล้วทดสอบ

**วันที่**: 29 ตุลาคม 2025  
**เวลา**: 15:25
