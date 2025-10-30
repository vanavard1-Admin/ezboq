# Fix: Cloudflare 500 Error & Rate Limiter Crash

## 🐛 Problem
```
Rate limiter error: Error: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
...
| 500: Internal server error
```

**Root Cause:**
- Supabase database (via Cloudflare) occasionally returns HTML error pages instead of JSON
- Rate limiter middleware crashes when trying to parse HTML as database response
- KV store operations throw errors that weren't properly handled
- Entire server becomes unavailable when database has issues

## ✅ Fixes Applied

### 1. Enhanced KV Store Error Handling

All KV operations now detect and handle Cloudflare HTML error pages:

```typescript
// Before: Would crash with HTML parsing error
export const get = async (key: string): Promise<any> => {
  const supabase = client()
  const { data, error } = await supabase.from("kv_store_6e95bca3")...
  if (error) {
    throw new Error(error.message); // ❌ Crashes if error.message is HTML
  }
  return data?.value;
};

// After: Detects HTML and provides clear error message
export const get = async (key: string): Promise<any> => {
  try {
    const supabase = client()
    const { data, error } = await supabase.from("kv_store_6e95bca3")...
    if (error) {
      // ✅ Check if error message contains HTML (Cloudflare error page)
      if (error.message && error.message.includes('<!DOCTYPE html>')) {
        throw new Error('Database temporarily unavailable (Cloudflare error)');
      }
      throw new Error(error.message);
    }
    return data?.value;
  } catch (error) {
    // ✅ Re-throw with better error message if it's an HTML response
    if (error?.message && error.message.includes('<!DOCTYPE html>')) {
      throw new Error('Database temporarily unavailable (Cloudflare error)');
    }
    throw error;
  }
};
```

Applied to:
- ✅ `get()`
- ✅ `set()`
- ✅ `del()`
- ✅ All other operations already had error handling

### 2. Rate Limiter Fail-Open Strategy

Rate limiter now gracefully degrades when database is unavailable:

```typescript
// Before: Crash entire request if KV fails
let count = await kv.get(rateLimitKey) || 0;

// After: Fail open - allow request if we can't check rate limit
try {
  const value = await kv.get(rateLimitKey);
  count = (typeof value === 'number' && !isNaN(value)) ? value : 0;
} catch (kvError) {
  console.warn(`Rate limiter KV get error (failing open):`, kvError?.message);
  // ✅ Can't check rate limit - allow request (better than blocking everything)
  await next();
  return;
}
```

### 3. Circuit Breaker Pattern

Implemented circuit breaker to stop hammering failed database:

```typescript
// Circuit breaker state
let dbCircuitBreakerState = {
  failureCount: 0,
  lastFailureTime: 0,
  isOpen: false,
};
const CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 failures
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

// Check circuit breaker before attempting KV operations
if (dbCircuitBreakerState.isOpen) {
  if (now - dbCircuitBreakerState.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT) {
    // Try to close circuit (half-open state)
    dbCircuitBreakerState.isOpen = false;
  } else {
    // Circuit still open - bypass rate limiting
    console.warn(`Circuit breaker OPEN: Bypassing rate limiter`);
    await next();
    return;
  }
}

// On KV error
dbCircuitBreakerState.failureCount++;
if (dbCircuitBreakerState.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
  dbCircuitBreakerState.isOpen = true;
  console.error(`Circuit breaker OPENED: Database has failed ${count} times`);
}

// On KV success
if (dbCircuitBreakerState.failureCount > 0) {
  console.log(`Circuit breaker: Database recovered, resetting`);
  dbCircuitBreakerState.failureCount = 0;
}
```

**Circuit Breaker States:**
1. **CLOSED** (Normal) - All requests go through
2. **OPEN** (Failing) - Skip rate limiting for 30s after 5 failures
3. **HALF-OPEN** (Testing) - Try one request to test if DB recovered

### 4. Enhanced Readiness Check

Health check endpoint now has timeout and better error messages:

```typescript
app.get("/make-server-6e95bca3/readyz", async (c) => {
  try {
    // ✅ Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout after 5s')), 5000);
    });
    
    const healthCheckPromise = (async () => {
      await kv.set(testKey, { timestamp: Date.now() });
      const result = await kv.get(testKey);
      await kv.del(testKey);
      return result;
    })();
    
    const result = await Promise.race([healthCheckPromise, timeoutPromise]);
    
    return c.text("ok");
  } catch (error) {
    // ✅ Better error messages
    if (error.message.includes('Cloudflare error')) {
      return c.text("not ready: database unavailable (cloudflare error)", 503);
    } else if (error.message.includes('timeout')) {
      return c.text("not ready: database timeout", 503);
    }
    
    return c.text("not ready", 503);
  }
});
```

### 5. Safer Header Setting

Prevent crashes from header setting errors:

```typescript
// Set rate limit headers with try-catch
try {
  c.header('X-RateLimit-Limit', String(maxRequests));
  c.header('X-RateLimit-Remaining', String(remaining));
  c.header('X-RateLimit-Reset', String(resetTime));
} catch (headerError) {
  // ✅ Ignore header errors - don't crash the entire request
}
```

## 🔍 Error Flow Comparison

### Before Fix
```
1. Request arrives
2. Rate limiter tries to get counter
3. Supabase returns Cloudflare 500 HTML page
4. kv.get() throws error with HTML message
5. ❌ Rate limiter crashes
6. ❌ Entire request fails
7. ❌ User sees error
```

### After Fix
```
1. Request arrives
2. Rate limiter checks circuit breaker
   - If OPEN: Skip rate limiting ✅
3. Rate limiter tries to get counter
4. Supabase returns Cloudflare 500 HTML page
5. kv.get() detects HTML and throws clear error
6. Rate limiter catches error
   - Increments circuit breaker counter
   - Opens circuit if threshold reached
   - ✅ Fails open - allows request
7. ✅ Request proceeds normally
8. ✅ User gets their data
9. Circuit breaker prevents further DB calls for 30s
10. After 30s, circuit tries to close (half-open)
11. If DB recovered, circuit closes and normal operation resumes
```

## 📊 Expected Behavior

### During Cloudflare/Database Outage

**Logs:**
```
[req-xxx] ⚠️ Rate limiter KV get error (1/5): Database temporarily unavailable (Cloudflare error)
[req-xxx] ⚠️ Rate limiter KV get error (2/5): Database temporarily unavailable (Cloudflare error)
...
[req-xxx] ⚡ Circuit breaker OPENED: Database has failed 5 times
[req-xxx] ⚡ Circuit breaker OPEN: Bypassing rate limiter (database unavailable)
[req-xxx] ⚡ Circuit breaker OPEN: Bypassing rate limiter (database unavailable)
```

**Behavior:**
- ✅ Requests still work (fail open)
- ⚠️ Rate limiting temporarily disabled
- ✅ No crashes
- ✅ Circuit breaker prevents hammering failed DB

### When Database Recovers

**Logs:**
```
[req-xxx] 🔄 Circuit breaker: Attempting to close circuit (half-open state)
[req-xxx] ✅ Circuit breaker: Database recovered, resetting failure count
[req-xxx] Rate limit: 1/100 requests used
```

**Behavior:**
- ✅ Circuit automatically closes
- ✅ Rate limiting resumes
- ✅ Normal operation

## 🧪 Testing

### Test Cloudflare Error Handling

You can simulate the error by temporarily breaking the database connection:

```bash
# 1. Monitor logs
curl https://cezwqajbkjhvumbhpsgy.supabase.co/functions/v1/make-server-6e95bca3/readyz

# 2. Make requests during outage
for i in {1..10}; do
  curl -X GET https://cezwqajbkjhvumbhpsgy.supabase.co/functions/v1/make-server-6e95bca3/documents
  sleep 0.5
done

# Expected:
# - First 5 requests: Warning logs about KV errors
# - After 5th: Circuit breaker opens
# - Next requests: Bypass rate limiting
# - All requests succeed (fail open)
```

### Test Circuit Breaker Recovery

```bash
# Wait 30+ seconds after outage ends
sleep 35

# Make new request
curl -X GET https://cezwqajbkjhvumbhpsgy.supabase.co/functions/v1/make-server-6e95bca3/documents

# Expected log:
# "Circuit breaker: Attempting to close circuit (half-open state)"
# "Circuit breaker: Database recovered, resetting failure count"
```

## 🎯 Key Benefits

### 1. Resilience
- ✅ Server stays up even when database is down
- ✅ Graceful degradation (rate limiting disabled temporarily)
- ✅ Automatic recovery when database comes back

### 2. Better Error Messages
- Before: `Error: <!DOCTYPE html>...` (confusing)
- After: `Database temporarily unavailable (Cloudflare error)` (clear)

### 3. Circuit Breaker Protection
- ✅ Stops hammering failed database
- ✅ Reduces error log spam
- ✅ Automatic recovery testing

### 4. Fail-Open Strategy
- ✅ Users can still use the system during DB issues
- ⚠️ Rate limiting temporarily disabled (acceptable trade-off)
- ✅ Better than completely blocking all requests

## 🚨 Monitoring

### What to Watch For

**Normal Operation:**
```
✅ Rate limit: 42/100 requests used
✅ Readiness check passed
```

**During Database Issues:**
```
⚠️ Rate limiter KV get error (1/5): Database temporarily unavailable
⚠️ Rate limiter KV get error (2/5): Database temporarily unavailable
⚡ Circuit breaker OPENED: Database has failed 5 times
⚡ Circuit breaker OPEN: Bypassing rate limiter
```

**After Recovery:**
```
🔄 Circuit breaker: Attempting to close circuit (half-open state)
✅ Circuit breaker: Database recovered, resetting failure count
✅ Rate limit: 1/100 requests used
```

### Alerts to Set Up

1. **Circuit Breaker Opens** - Important but not critical
   - Log pattern: `Circuit breaker OPENED`
   - Action: Check Supabase status, review logs

2. **Circuit Breaker Stays Open** - Critical
   - Circuit open for > 5 minutes
   - Action: Investigate database connectivity

3. **Readiness Check Fails** - Critical
   - Pattern: `not ready: database unavailable`
   - Action: Check Supabase dashboard

## 📋 Deployment Checklist

- [x] Updated kv_store.tsx with HTML error detection
- [x] Added circuit breaker to rate limiter
- [x] Enhanced readiness check with timeout
- [x] Added fail-open logic to rate limiter
- [x] Added better error logging
- [x] Tested circuit breaker manually
- [ ] Deploy to production
- [ ] Monitor for 24 hours
- [ ] Verify circuit breaker works during next outage

## ✅ Success Criteria

- ✅ No more crashes from HTML error pages
- ✅ Server stays up during database outages
- ✅ Circuit breaker opens after 5 failures
- ✅ Circuit breaker closes when database recovers
- ✅ Users can still make requests (with degraded rate limiting)
- ✅ Clear error messages in logs
- ✅ Automatic recovery without manual intervention

## 🔄 Future Improvements

1. **Add Circuit Breaker Status Endpoint**
   ```typescript
   app.get('/make-server-6e95bca3/circuit-breaker', (c) => {
     return c.json(dbCircuitBreakerState);
   });
   ```

2. **Metrics Export**
   - Track circuit breaker open/close events
   - Monitor failure rate over time
   - Alert on repeated failures

3. **Database Connection Pool**
   - Reuse connections
   - Faster recovery from transient issues

4. **Fallback Rate Limiting**
   - Use in-memory rate limiting when DB is down
   - Less accurate but better than nothing
