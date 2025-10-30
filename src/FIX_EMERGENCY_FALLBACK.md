# Fix: Emergency Fallback Document Number Issue

## 🐛 Problem
System was occasionally using emergency fallback document numbers (BOQ-2025-10-9999) indicating that the document number generation was failing after all retry attempts.

## 🔍 Root Cause Analysis
The `generateDocumentNumber` function was reaching the emergency fallback case, which means:
1. All 10 retry attempts failed
2. No detailed error logging was available to diagnose the issue
3. KV operations might be timing out or hanging
4. Lock acquisition might be failing silently

## ✅ Fixes Applied

### 1. Enhanced Error Logging
```typescript
// Added detailed logging at each step
console.log(`[${requestId}] 🔄 Document number generation attempt ${attempt + 1}/${MAX_RETRIES}`);
console.log(`[${requestId}] 📊 Getting counter from key: ${counterKey}`);
console.log(`[${requestId}] 📊 Current counter value: ${counter}, type: ${typeof counter}`);

// Enhanced error details
console.error(`[${requestId}] ❌ Error details:`, {
  message: error?.message,
  stack: error?.stack,
  counterKey,
  lockKey,
  prefix,
  year,
  month
});
```

### 2. Added Timeout Protection
```typescript
const KV_TIMEOUT = 5000; // 5 seconds timeout for KV operations

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}
```

All KV operations now wrapped with timeout:
- `kv.get()` - 5 seconds
- `kv.set()` - 5 seconds
- `kv.del()` - 5 seconds
- `kv.getByPrefix()` - 10 seconds (more time for searches)

### 3. Enhanced Error Handling
```typescript
// Lock acquisition with try-catch
try {
  const existing = await withTimeout(
    kv.get(lockKey),
    KV_TIMEOUT,
    'acquireCounterLock:get'
  );
  // ... rest of logic
} catch (error) {
  console.error(`❌ Error in acquireCounterLock:`, error);
  await new Promise(resolve => setTimeout(resolve, 50));
}

// Lock release with error handling
async function releaseCounterLock(lockKey: string): Promise<void> {
  try {
    await withTimeout(kv.del(lockKey), KV_TIMEOUT, 'releaseCounterLock:del');
  } catch (error) {
    console.error(`❌ Error in releaseCounterLock:`, error);
    // Don't throw - we're releasing a lock
  }
}
```

### 4. Date Validation
```typescript
// Validate year
if (isNaN(year) || year < 2000 || year > 2100) {
  console.error(`[${requestId}] ❌ Invalid year: ${year}`);
  throw new Error(`Invalid year: ${year}`);
}

// Validate month
if (isNaN(parseInt(month)) || parseInt(month) < 1 || parseInt(month) > 12) {
  console.error(`[${requestId}] ❌ Invalid month: ${month}`);
  throw new Error(`Invalid month: ${month}`);
}
```

### 5. Better Fallback Messages
```typescript
if (attempt === MAX_RETRIES - 1) {
  const fallback = `${prefix}-${year}-${month}-${String(Date.now()).slice(-4)}`;
  console.error(`[${requestId}] ⚠️ All ${MAX_RETRIES} attempts failed. Using fallback document number: ${fallback}`);
  return fallback;
}

// Emergency fallback (should never happen)
console.error(`[${requestId}] 🚨 Emergency fallback after all retries: ${emergency}`);
console.error(`[${requestId}] 🚨 This should never happen. Please check logs above.`);
```

## 🧪 Testing

### Monitor Logs
After deploying, monitor for:
1. ✅ All document numbers should follow format: `{PREFIX}-{YYYY}-{MM}-{####}`
2. ✅ No more emergency fallback numbers (9999)
3. ✅ Detailed logs for any failures
4. ✅ Timeout errors if KV is slow

### Test Scenarios
```bash
# 1. Normal generation
curl -X POST https://cezwqajbkjhvumbhpsgy.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"boq","projectTitle":"Test",...}'

# 2. Concurrent requests (test lock mechanism)
for i in {1..10}; do
  curl -X POST ... &
done
wait

# 3. Check document numbers
curl https://cezwqajbkjhvumbhpsgy.supabase.co/functions/v1/make-server-6e95bca3/documents?type=boq
```

## 📊 Expected Outcomes

### Before Fix
```
[req-xxx] 🚨 Emergency fallback: BOQ-2025-10-9999
```
No other logs to diagnose the issue.

### After Fix
```
[req-xxx] 🔢 Starting document number generation for type: boq
[req-xxx] 📅 Date: 2025-10
[req-xxx] 🔄 Document number generation attempt 1/10
[req-xxx] 📊 Getting counter from key: counter:boq:202510
[req-xxx] 📊 Current counter value: 42, type: number
[req-xxx] 📊 New counter value: 43
[req-xxx] 🔢 Generated document number: BOQ-2025-10-0043 (counter: 43)
```

If errors occur:
```
[req-xxx] ❌ Document number generation attempt 1 failed: Error: acquireCounterLock:get timed out after 5000ms
[req-xxx] ❌ Error details: {
  message: "acquireCounterLock:get timed out after 5000ms",
  counterKey: "counter:boq:202510",
  lockKey: "counter:boq:202510:lock",
  ...
}
[req-xxx] ⏱️ Waiting 10ms before retry...
```

## 🔄 Deployment

```bash
# Deploy the fix
cd supabase/functions/server
deno cache index.tsx

# Or use deploy script
./deploy.sh
```

## 📝 Monitoring Checklist

After deployment, check for:
- [ ] No emergency fallback numbers in logs
- [ ] Document numbers increment correctly
- [ ] No timeout errors (if there are, increase KV_TIMEOUT)
- [ ] Lock acquisition succeeds
- [ ] Concurrent requests handled correctly
- [ ] Average generation time < 1 second

## 🚨 If Issues Persist

1. **Check Supabase Performance**
   - Database response times
   - Connection pool status
   - Query performance

2. **Increase Timeouts** (if needed)
   ```typescript
   const KV_TIMEOUT = 10000; // Increase to 10 seconds
   ```

3. **Check Logs for Patterns**
   - Which operations timeout most?
   - Are there specific times of day?
   - Correlation with other traffic?

4. **Database Optimization**
   ```sql
   -- Add index if not exists
   CREATE INDEX IF NOT EXISTS idx_kv_key ON kv_store_6e95bca3(key);
   
   -- Check table stats
   SELECT count(*), pg_size_pretty(pg_total_relation_size('kv_store_6e95bca3'))
   FROM kv_store_6e95bca3;
   ```

## ✅ Success Criteria

- ✅ No emergency fallback numbers
- ✅ Clear error messages in logs if issues occur
- ✅ Document numbers increment sequentially
- ✅ No duplicate numbers under concurrent load
- ✅ Generation completes in < 1 second (99th percentile)
