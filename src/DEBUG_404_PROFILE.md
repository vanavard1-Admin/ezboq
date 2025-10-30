# 🔍 Debug 404 Profile Error

**เวลา**: 16:10  
**Status**: 🔍 **Debugging 404 Error**

---

## ❌ ปัญหา

```
❌ API Error (404): 404 Not Found
```

---

## ✅ Endpoints ที่เพิ่มไปแล้ว

### 1. GET /make-server-6e95bca3/profile/:userId ✅

**Location**: `/supabase/functions/server/index.tsx:360`

```typescript
app.get("/make-server-6e95bca3/profile/:userId", async (c) => {
  // ... implementation ...
});
```

---

### 2. PUT /make-server-6e95bca3/profile/:userId ✅

**Location**: `/supabase/functions/server/index.tsx`

---

### 3. GET /make-server-6e95bca3/team/members/:userId ✅

**Location**: `/supabase/functions/server/index.tsx`

---

## 🔍 สาเหตุที่เป็นไปได้

### 1. ⚠️ user.id เป็น undefined/null

ProfilePage.tsx:253:
```typescript
api.get(`/profile/${user.id}`)  // ← ถ้า user.id = undefined → /profile/undefined → 404!
```

**วิธีเช็ค**:
```typescript
// เปิด Console (F12)
console.log('User:', user);
console.log('User ID:', user?.id);

// ถ้าได้ undefined:
// → ต้อง login ก่อน!
```

---

### 2. 🔄 Server ยังไม่ได้ restart

Endpoints ถูกเพิ่มไปแล้ว แต่ server ต้อง restart เพื่อโหลด code ใหม่

**วิธีแก้**:
```bash
# 1. หยุด dev server
Ctrl+C

# 2. Start ใหม่
npm run dev
```

---

### 3. 🌐 Cache ของ browser

Browser อาจจะ cache response 404 เก่าไว้

**วิธีแก้**:
```
F12 → Network Tab → Disable cache (checkbox)
Hard Reload: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
```

---

## 🧪 การทดสอบ

### Test 1: เช็ค Server Endpoints

```bash
# Test health endpoint
curl http://localhost:54321/functions/v1/make-server-6e95bca3/health

# ควรได้:
{"status":"ok"}
```

---

### Test 2: เช็ค Profile Endpoint

```bash
# Test with dummy user ID
curl -H "Authorization: Bearer YOUR_ANON_KEY" \
  http://localhost:54321/functions/v1/make-server-6e95bca3/profile/test-user-123

# ควรได้:
{
  "profile": null,
  "membership": {
    "plan": "free",
    ...
  }
}

# ถ้าได้ 404:
# → Server ยังไม่ได้ restart!
```

---

### Test 3: เช็ค User ID

```typescript
// ใน ProfilePage.tsx เพิ่ม console.log:

const loadAllData = async () => {
  if (!user) {
    console.log('⚠️ No user found, skipping data load');
    return;
  }
  
  // ✅ เพิ่มบรรทัดนี้!
  console.log('👤 User ID:', user.id);
  console.log('👤 Full user:', user);
  
  // ... rest of code
};
```

**Expected Output**:
```
👤 User ID: "abc123-def456-..."
👤 Full user: { id: "abc123-...", email: "user@example.com" }
```

**ถ้าได้**:
```
👤 User ID: undefined
👤 Full user: { email: "user@example.com" }  ← ไม่มี id!
```

→ **ปัญหาอยู่ที่ user object ไม่มี id!**

---

## 🔧 วิธีแก้ (ตามสาเหตุ)

### 1. ถ้า user.id = undefined

**Option A**: ใช้ email แทน id

```typescript
// ProfilePage.tsx
const userId = user.id || user.email || 'default-user';
const [profileResponse, teamResponse] = await Promise.all([
  api.get(`/profile/${userId}`),
  api.get(`/team/members/${userId}`)
]);
```

---

**Option B**: ใช้ localStorage

```typescript
// Get demo user from localStorage
const demoUser = localStorage.getItem('demo-user');
const userData = demoUser ? JSON.parse(demoUser) : null;
const userId = user?.id || userData?.id || 'demo-user-123';
```

---

**Option C**: สร้าง user id ถ้าไม่มี

```typescript
// In AuthContext or ProfilePage
useEffect(() => {
  if (user && !user.id) {
    // Generate ID from email or random
    const userId = user.email 
      ? `user-${btoa(user.email).substring(0, 12)}` 
      : `demo-${Date.now()}`;
    
    setUser({ ...user, id: userId });
  }
}, [user]);
```

---

### 2. ถ้า Server ยังไม่ restart

```bash
# MUST DO!
1. Ctrl+C (stop server)
2. npm run dev (start again)
3. Wait for "Server started on port 54321"
4. Test: http://localhost:5173/profile
```

---

### 3. ถ้า Cache ติด

```
1. F12 (Open DevTools)
2. Network Tab
3. Disable cache ✅
4. Right-click Refresh → "Empty Cache and Hard Reload"
5. Try again
```

---

## 📋 Checklist แก้ปัญหา

### Step 1: เช็ค User ID ✅
```typescript
console.log('User:', user);
console.log('User ID:', user?.id);
```

- [ ] user.id มีค่า (ไม่ใช่ undefined)
- [ ] user.id เป็น string ยาว (UUID หรือ email-based)

---

### Step 2: Restart Server ✅
```bash
Ctrl+C
npm run dev
```

- [ ] Server started successfully
- [ ] No errors in terminal
- [ ] Health endpoint returns 200 OK

---

### Step 3: เช็ค Endpoints ✅
```bash
curl http://localhost:54321/functions/v1/make-server-6e95bca3/profile/test
```

- [ ] Returns 200 OK (not 404)
- [ ] Returns JSON with profile + membership
- [ ] No errors in server logs

---

### Step 4: Test ProfilePage ✅

- [ ] Navigate to http://localhost:5173/profile
- [ ] Open Console (F12)
- [ ] Check for 404 errors
- [ ] Check User ID in console logs

---

## 🎯 Expected Console Output (Success)

```
👤 User ID: "abc123-def456-789ghi"
🔄 Loading all data for user: abc123-def456-789ghi
🌐 API GET: /profile/abc123-def456-789ghi
💤 CACHE MISS: profile - fetching from server (non-critical endpoint)...
✅ Response in 85ms: 200
💾 Cached response for /profile (85ms)
✅ Profile loaded successfully
✅ Membership: Free Plan
```

---

## ❌ Expected Console Output (404 Error)

### Scenario 1: undefined User ID

```
👤 User ID: undefined  ← ⚠️ PROBLEM!
🔄 Loading all data for user: undefined
🌐 API GET: /profile/undefined
❌ API Error (404): 404 Not Found  ← Invalid user ID!
```

**Fix**: ใช้ Option A/B/C ด้านบน

---

### Scenario 2: Server Not Restarted

```
👤 User ID: "abc123-def456-789ghi"
🔄 Loading all data for user: abc123-def456-789ghi
🌐 API GET: /profile/abc123-def456-789ghi
❌ API Error (404): 404 Not Found  ← Endpoint not found!
```

**Fix**: Restart server!

---

## 🚀 Quick Fix Script

สร้างไฟล์ `/test-profile-endpoint.sh`:

```bash
#!/bin/bash

echo "🔍 Testing Profile Endpoint..."
echo ""

# Test health
echo "1️⃣ Testing health endpoint..."
curl -s http://localhost:54321/functions/v1/make-server-6e95bca3/health
echo ""
echo ""

# Test profile
echo "2️⃣ Testing profile endpoint..."
curl -s http://localhost:54321/functions/v1/make-server-6e95bca3/profile/test-user-123
echo ""
echo ""

# Test team
echo "3️⃣ Testing team endpoint..."
curl -s http://localhost:54321/functions/v1/make-server-6e95bca3/team/members/test-user-123
echo ""
echo ""

echo "✅ Test complete!"
```

รัน:
```bash
chmod +x test-profile-endpoint.sh
./test-profile-endpoint.sh
```

---

## 🔍 Advanced Debugging

### Enable Detailed Logging

**ProfilePage.tsx**:
```typescript
const loadAllData = async () => {
  console.group('🔄 Loading Profile Data');
  console.log('User:', user);
  console.log('User ID:', user?.id);
  console.log('User Email:', user?.email);
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    const profileUrl = `/profile/${user.id}`;
    console.log('Fetching:', profileUrl);
    
    const profileResponse = await api.get(profileUrl);
    console.log('Profile Response:', {
      ok: profileResponse.ok,
      status: profileResponse.status,
      statusText: profileResponse.statusText,
      headers: Object.fromEntries(profileResponse.headers.entries()),
    });
    
    if (profileResponse.ok) {
      const data = await profileResponse.json();
      console.log('Profile Data:', data);
    } else {
      const errorText = await profileResponse.text();
      console.error('Error Response:', errorText);
    }
  } catch (error) {
    console.error('Exception:', error);
  } finally {
    console.groupEnd();
  }
};
```

---

## 📚 Related Files

- `/supabase/functions/server/index.tsx` - Server endpoints
- `/pages/ProfilePage.tsx` - Client code
- `/utils/api.ts` - API utility
- `/FIX_404_PROFILE_ENDPOINTS.md` - Full documentation

---

## ✅ Summary

ปัญหา 404 อาจเกิดจาก:

1. ✅ **user.id = undefined** → ใช้ email หรือ generate ID
2. ✅ **Server ยังไม่ restart** → Ctrl+C, npm run dev
3. ✅ **Browser cache** → Hard reload

**ขั้นตอนแก้**:
1. เช็ค user.id ใน console
2. Restart server ถ้ายังไม่ได้ทำ
3. Hard reload browser
4. Test profile endpoint ด้วย curl
5. เช็ค console logs

---

**สถานะ**: 🔍 **Debugging Guide Ready**  
**Next**: Test ตามขั้นตอนด้านบน

**วันที่**: 29 ตุลาคม 2025  
**เวลา**: 16:10
