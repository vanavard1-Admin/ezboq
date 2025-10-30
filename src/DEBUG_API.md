# 🔍 API Debug Guide

## Quick Check Script

### In Browser Console

```javascript
// 1. Check API connection
const projectId = 'YOUR_PROJECT_ID';
const publicAnonKey = 'YOUR_ANON_KEY';
const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3`;

// 2. Test health endpoint
fetch(`${API_BASE}/health`)
  .then(r => r.json())
  .then(d => console.log('✅ Health check:', d))
  .catch(e => console.error('❌ Health check failed:', e));

// 3. Test customers endpoint
fetch(`${API_BASE}/customers`, {
  headers: {
    'Authorization': `Bearer ${publicAnonKey}`,
    'apikey': publicAnonKey
  }
})
  .then(r => r.json())
  .then(d => console.log('✅ Customers:', d))
  .catch(e => console.error('❌ Customers failed:', e));

// 4. Test preflight (OPTIONS)
fetch(`${API_BASE}/customers`, {
  method: 'OPTIONS',
  headers: {
    'Origin': window.location.origin,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type,Authorization'
  }
})
  .then(r => {
    console.log('✅ Preflight response:', {
      status: r.status,
      headers: Object.fromEntries(r.headers.entries())
    });
  })
  .catch(e => console.error('❌ Preflight failed:', e));
```

## Check CORS Headers

```bash
# Test from command line
curl -i -X OPTIONS \
  -H "Origin: https://ezboq.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/customers
```

**Expected Output:**
```
HTTP/2 204
access-control-allow-origin: https://ezboq.com
access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS
access-control-allow-headers: Content-Type,Authorization,Idempotency-Key,X-Demo-Session-Id,apikey,X-Request-ID
access-control-max-age: 600
```

## Check Server Status

```bash
# Liveness probe
curl https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/livez
# Expected: "ok"

# Readiness probe
curl https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/readyz
# Expected: {"status":"ready","timestamp":...}

# Version
curl https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/version
# Expected: {"version":"2.0.0",...}
```

## Debug Checklist

### ❌ If still getting "Failed to fetch"

1. **Check Supabase Edge Function Status**
   ```
   Supabase Dashboard -> Edge Functions -> make-server-6e95bca3
   - Status: Active ✅
   - Last deployed: Recent
   ```

2. **Check Environment Variables**
   ```
   Edge Functions -> Settings -> Environment Variables
   - SUPABASE_URL ✅
   - SUPABASE_SERVICE_ROLE_KEY ✅
   - SUPABASE_ANON_KEY ✅
   - ENV=production or development
   ```

3. **Check Function Logs**
   ```
   Edge Functions -> Logs
   Look for:
   - "→ GET /customers" (requests)
   - "← 200 GET /customers" (responses)
   - Any errors or stack traces
   ```

4. **Check Network in DevTools**
   ```
   Browser DevTools -> Network Tab
   - Request URL correct?
   - Status code? (should be 200, not failed)
   - Response headers include CORS?
   - Response preview shows data?
   ```

5. **Check Browser Console**
   ```
   - Any CORS errors?
   - "Failed to fetch" errors?
   - Look at error stack trace
   ```

### ✅ If working correctly

You should see:

1. **Network Tab:**
   ```
   GET /customers  200  OK  50ms
   Response Headers:
     access-control-allow-origin: *
     content-type: application/json
   ```

2. **Console:**
   ```
   🌐 API GET: /customers { demoMode: false, ... }
   🔍 Sending request to: https://...
   ✅ Response received: { status: 200, ... }
   ```

3. **Response:**
   ```json
   {
     "customers": [...]
   }
   ```

## Common Issues & Fixes

### Issue 1: CORS Error

**Symptom:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Fix:**
Check `middleware.ts` CORS settings:
```typescript
const ALLOWED_ORIGINS = new Set([
  "https://ezboq.com",
  "https://www.ezboq.com",
  "http://localhost:5173",  // ✅ Add your dev URL
]);
```

### Issue 2: 401 Unauthorized

**Symptom:**
```
{"error":"Unauthorized","message":"Missing apikey header"}
```

**Fix:**
Ensure both headers are sent:
```typescript
headers: {
  'Authorization': `Bearer ${publicAnonKey}`,
  'apikey': publicAnonKey  // ✅ Both required
}
```

### Issue 3: 429 Too Many Requests

**Symptom:**
```
{"error":"Too Many Requests","retryAfter":60}
```

**Fix:**
Wait 60 seconds or increase rate limits in `middleware.ts`:
```typescript
const RATE_LIMIT_MAX_PER_IP = 100;  // ✅ Increase if needed
```

### Issue 4: Empty Response

**Symptom:**
```
✅ Response received: { status: 200 }
{customers: []}  // Empty array when should have data
```

**Fix:**
Check demo mode:
```typescript
// If using demo mode, add header:
headers: {
  'X-Demo-Session-Id': getDemoSessionId()
}
```

## Environment-Specific Debug

### Development (localhost)

```javascript
// Check if using correct API base
console.log('API Base:', API_BASE);
// Should be: https://xxxxx.supabase.co/functions/v1/make-server-6e95bca3

// Check keys
console.log('Project ID:', projectId);
console.log('Anon Key length:', publicAnonKey?.length);
// Should be: ~200+ characters
```

### Production (ezboq.com)

```javascript
// Check origin
console.log('Origin:', window.location.origin);
// Should be: https://ezboq.com or https://www.ezboq.com

// Check if CORS allows
// Should NOT see CORS errors in console
```

## Manual Test Sequence

Run these in order:

```javascript
// 1. Health Check
fetch('https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/health')
  .then(r => r.json())
  .then(console.log);

// 2. Version Check  
fetch('https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/version')
  .then(r => r.json())
  .then(console.log);

// 3. Customers (requires auth)
fetch('https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/customers', {
  headers: {
    'Authorization': 'Bearer YOUR_ANON_KEY',
    'apikey': 'YOUR_ANON_KEY'
  }
})
  .then(r => r.json())
  .then(console.log);

// 4. Documents (requires auth)
fetch('https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents', {
  headers: {
    'Authorization': 'Bearer YOUR_ANON_KEY',
    'apikey': 'YOUR_ANON_KEY'
  }
})
  .then(r => r.json())
  .then(console.log);
```

All should return `200 OK` with JSON data.

## Advanced Debug

### Enable Verbose Logging

In `index.tsx`:
```typescript
const DEBUG_LOG = true;  // Force enable even in production
```

### Check Middleware Flow

Add logs in `middleware.ts`:
```typescript
export function corsMiddleware() {
  return async (c: Context, next: Function) => {
    console.log('🔍 CORS Check:', {
      origin: c.req.header('origin'),
      method: c.req.method,
      path: c.req.path
    });
    // ... rest of middleware
  };
}
```

### Monitor Real-Time Logs

```bash
# Using Supabase CLI (if installed)
supabase functions logs make-server-6e95bca3 --follow

# Or in Dashboard
Edge Functions -> make-server-6e95bca3 -> Logs (auto-refresh)
```

## Success Indicators

✅ All these should work:

1. Health check returns `{status: "ok"}`
2. Version returns `{version: "2.0.0",...}`
3. Customers returns `{customers: [...]}`
4. Documents returns `{documents: [...]}`
5. No CORS errors in console
6. No "Failed to fetch" errors
7. Network tab shows 200 OK responses
8. Response times < 500ms

---

**Last Updated**: 2025-10-28  
**Status**: Debug Tools Ready
