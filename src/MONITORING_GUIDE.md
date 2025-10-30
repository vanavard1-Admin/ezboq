# 📊 EZBOQ Monitoring & Alerting Guide

## Sentry + Uptime Monitoring + Error Rate Alerts

**Version**: 1.1.0  
**Last Updated**: 28 January 2025

---

## 📋 Table of Contents

1. [Sentry Setup (Frontend + Edge Functions)](#sentry-setup)
2. [Uptime Monitoring (/livez)](#uptime-monitoring)
3. [Error Rate Alerts](#error-rate-alerts)
4. [Performance Monitoring](#performance-monitoring)
5. [Dashboard & Metrics](#dashboard)

---

## 1️⃣ Sentry Setup

### 1.1 สร้าง Sentry Project

1. ไปที่ [https://sentry.io](https://sentry.io)
2. สร้าง account (หรือ login)
3. สร้าง 2 projects:
   - **ezboq-frontend** (React)
   - **ezboq-edge** (Generic/JavaScript)

4. Copy DSN จากแต่ละ project:
   ```
   Frontend DSN: https://xxxxxx@sentry.io/xxxxxx
   Edge DSN: https://yyyyyy@sentry.io/yyyyyy
   ```

---

### 1.2 Setup Frontend (React)

**Step 1**: Install Sentry SDK

```bash
npm install @sentry/react
```

**Step 2**: Initialize Sentry ใน `App.tsx`

```typescript
import { initSentry, SentryErrorBoundary } from './utils/sentry';

// Initialize Sentry (ทำครั้งเดียวตอนเริ่มแอป)
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
initSentry(SENTRY_DSN);

function App() {
  return (
    <SentryErrorBoundary fallback={<ErrorFallback />}>
      {/* Your app content */}
    </SentryErrorBoundary>
  );
}
```

**Step 3**: เพิ่ม environment variable

สร้างไฟล์ `.env.local`:

```bash
VITE_SENTRY_DSN=https://xxxxxx@sentry.io/xxxxxx
```

**Step 4**: ใช้งาน Sentry ใน code

```typescript
import { captureException, captureMessage, addBreadcrumb } from './utils/sentry';

try {
  // Your code
} catch (error) {
  captureException(error, {
    context: 'BOQ Calculation',
    documentId: 'doc-123',
  });
}

// Log important events
addBreadcrumb('User created document', 'action', {
  documentType: 'invoice',
  amount: 50000,
});

// Info messages
captureMessage('Payment received', 'info');
```

---

### 1.3 Setup Edge Functions

**Step 1**: เพิ่ม Sentry DSN ใน Supabase Secrets

```bash
supabase secrets set SENTRY_DSN=https://yyyyyy@sentry.io/yyyyyy
```

**Step 2**: Initialize Sentry ใน `index.tsx`

```typescript
import { initSentryEdge, getSentry } from './sentry.ts';

// Initialize at the top
const sentry = initSentryEdge();

// Use in error handlers
try {
  // Your code
} catch (error) {
  console.error('Error:', error);
  
  // Report to Sentry
  await sentry?.captureException(error, {
    endpoint: '/documents',
    method: 'POST',
  });
  
  return c.json({ error: 'Internal server error' }, { status: 500 });
}
```

**Step 3**: Wrap all endpoints with error handling

```typescript
app.post("/make-server-6e95bca3/documents", async (c) => {
  try {
    // Your logic
  } catch (error: any) {
    console.error("Create document error:", error);
    
    // Report to Sentry with context
    const sentry = getSentry();
    await sentry?.captureException(error, 
      sentry.createContext(c.req.raw, {
        documentType: document.type,
        userId: userId,
      })
    );
    
    return c.json({ error: error.message }, { status: 500 });
  }
});
```

---

## 2️⃣ Uptime Monitoring (/livez)

### 2.1 UptimeRobot Setup

**Free Service**: [https://uptimerobot.com](https://uptimerobot.com)

**Step 1**: สร้าง account

**Step 2**: เพิ่ม Monitor

- **Monitor Type**: HTTP(s)
- **URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/livez`
- **Monitoring Interval**: 5 minutes (free tier)
- **Monitor Timeout**: 30 seconds
- **Alert Contacts**: อีเมลของคุณ

**Step 3**: ตั้งค่า Alert

- เมื่อ monitor **down** → ส่งอีเมลทันที
- เมื่อ monitor **up again** → ส่งอีเมลแจ้ง

**Expected Response**:
```
Status: 200 OK
Body: ok
```

---

### 2.2 Alternative: Sentry Cron Monitoring

```typescript
// In Edge Function
import * as Sentry from '@sentry/deno';

// Heartbeat every 5 minutes
setInterval(async () => {
  const checkIn = Sentry.captureCheckIn({
    monitorSlug: 'ezboq-health-check',
    status: 'in_progress',
  });

  try {
    // Perform health check
    await kv.get('health-check');
    
    Sentry.captureCheckIn({
      checkInId: checkIn,
      monitorSlug: 'ezboq-health-check',
      status: 'ok',
    });
  } catch (error) {
    Sentry.captureCheckIn({
      checkInId: checkIn,
      monitorSlug: 'ezboq-health-check',
      status: 'error',
    });
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

---

## 3️⃣ Error Rate Alerts

### 3.1 Sentry Alert Rules

**ไปที่**: Sentry Project → Alerts → Create Alert Rule

**Alert 1: High Error Rate**

- **Name**: "EZBOQ High Error Rate (≥5%)"
- **Environment**: Production
- **Conditions**:
  - When **error rate** is **above 5%**
  - In **5 minutes**
  - For **all errors**
- **Actions**:
  - Send email to: your-email@example.com
  - Send Slack notification (optional)
  - Create Jira ticket (optional)

**Alert 2: Critical Errors**

- **Name**: "EZBOQ Critical Errors"
- **Conditions**:
  - When **error count** is **above 10**
  - In **1 minute**
  - With **level = error** or **fatal**
- **Actions**:
  - Send email immediately
  - Send SMS (if configured)

**Alert 3: Performance Degradation**

- **Name**: "EZBOQ Slow Response Time"
- **Conditions**:
  - When **P95 response time** is **above 2 seconds**
  - In **10 minutes**
  - For transaction **/api/documents**
- **Actions**:
  - Send email
  - Post to Slack #alerts channel

---

### 3.2 Manual Error Rate Calculation

หากไม่ใช้ Sentry Alerts สามารถใช้ script ตรวจสอบ:

```bash
#!/bin/bash
# error-rate-check.sh

# Fetch errors from last 5 minutes
ERRORS=$(curl -s "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/health" | jq '.errors_last_5min')
REQUESTS=$(curl -s "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/health" | jq '.requests_last_5min')

ERROR_RATE=$(echo "scale=2; $ERRORS / $REQUESTS * 100" | bc)

if (( $(echo "$ERROR_RATE >= 5.0" | bc -l) )); then
  echo "⚠️ HIGH ERROR RATE: ${ERROR_RATE}% (${ERRORS}/${REQUESTS})"
  
  # Send alert email
  mail -s "EZBOQ Alert: High Error Rate" admin@ezboq.com <<< "Error rate: ${ERROR_RATE}%"
else
  echo "✅ Error rate OK: ${ERROR_RATE}%"
fi
```

Run with cron every 5 minutes:

```bash
*/5 * * * * /path/to/error-rate-check.sh
```

---

## 4️⃣ Performance Monitoring

### 4.1 Sentry Performance Metrics

**Automatic Tracking**:
- Page load times
- API response times
- Database query times
- Cache hit/miss rates

**Custom Transactions**:

```typescript
import { startTransaction } from './utils/sentry';

// Start transaction
const transaction = startTransaction('Calculate BOQ Summary', 'function');

try {
  // Your expensive operation
  const summary = calculateBOQSummary(items, profile);
  
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
  throw error;
} finally {
  transaction.finish();
}
```

---

### 4.2 Key Performance Indicators (KPIs)

Track these metrics:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| P50 Response Time | < 500ms | > 1s |
| P95 Response Time | < 2s | > 5s |
| Error Rate | < 1% | ≥ 5% |
| Uptime | > 99.9% | < 99% |
| API Success Rate | > 99% | < 95% |
| Document Creation Time | < 1s | > 3s |

---

## 5️⃣ Dashboard & Metrics

### 5.1 Sentry Dashboard

**Default Dashboard** มี:
- Error count over time
- User-affected count
- Top 5 errors
- Performance metrics
- Release health

**Custom Dashboard**:

1. ไปที่ Dashboards → Create Custom Dashboard
2. เพิ่ม widgets:
   - **Error Rate (5min window)**
   - **P95 Response Time**
   - **Top Endpoints by Volume**
   - **Failed Document Creations**
   - **Rate Limit Hits**

---

### 5.2 Grafana Integration (Advanced)

หากต้องการ dashboard ละเอียดยิ่งขึ้น:

```bash
# Export Sentry metrics to Grafana
# ใช้ Sentry's Data Export feature
```

**Sample Grafana Queries**:

```promql
# Error rate
rate(sentry_errors_total[5m])

# P95 latency
histogram_quantile(0.95, sentry_transaction_duration_seconds)

# Request throughput
sum(rate(sentry_requests_total[1m])) by (endpoint)
```

---

## 6️⃣ Alert Channels

### 6.1 Email Alerts

**Default**: ใช้ email จาก Sentry/UptimeRobot

**Custom SMTP**:
```bash
# In Edge Function
async function sendAlertEmail(subject: string, body: string) {
  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: 'admin@ezboq.com' }] }],
      from: { email: 'alerts@ezboq.com' },
      subject,
      content: [{ type: 'text/plain', value: body }],
    }),
  });
}
```

---

### 6.2 Slack Alerts

**Setup**:

1. สร้าง Slack Incoming Webhook
2. ตั้งค่าใน Sentry → Settings → Integrations → Slack
3. เชื่อม channel (เช่น #alerts)

**Test**:
```bash
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "🚨 EZBOQ Alert: Error rate exceeded 5%",
    "attachments": [{
      "color": "danger",
      "fields": [
        {"title": "Error Rate", "value": "7.2%", "short": true},
        {"title": "Time", "value": "5 minutes", "short": true}
      ]
    }]
  }'
```

---

### 6.3 Line Notify (Thailand)

```typescript
async function sendLineAlert(message: string) {
  const LINE_TOKEN = Deno.env.get('LINE_NOTIFY_TOKEN');
  
  await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LINE_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ message }),
  });
}

// Usage
await sendLineAlert('🚨 EZBOQ: Error rate 7.2% in last 5 minutes');
```

---

## 7️⃣ Monitoring Checklist

### Pre-Production

- [ ] ✅ Sentry DSN configured (Frontend + Edge)
- [ ] ✅ Release version set (ezboq@1.1.0)
- [ ] ✅ Environment tags configured
- [ ] ✅ Error Boundary implemented
- [ ] ✅ Uptime monitor configured (/livez)
- [ ] ✅ Error rate alert (≥5%/5min) enabled
- [ ] ✅ Alert channels tested (email/Slack)
- [ ] ✅ Performance monitoring enabled
- [ ] ✅ Custom dashboard created

### Post-Production

- [ ] Monitor error rate daily
- [ ] Review top errors weekly
- [ ] Check performance metrics weekly
- [ ] Verify uptime monthly (target: >99.9%)
- [ ] Update alert thresholds based on usage

---

## 8️⃣ Troubleshooting

### Sentry not receiving events

**Check**:
1. DSN ถูกต้อง?
2. Environment = production?
3. Network ไม่ block Sentry?
4. `initSentry()` ถูกเรียกแล้ว?

**Test manually**:
```typescript
import { captureMessage } from './utils/sentry';

captureMessage('Test message from EZBOQ', 'info');
```

---

### Uptime monitor false positives

**Solutions**:
- เพิ่ม timeout (จาก 30s → 60s)
- ใช้ multiple monitoring locations
- ตรวจสอบ cold start time ของ Edge Functions

---

### Alert fatigue (too many alerts)

**Solutions**:
- เพิ่ม threshold (จาก 5% → 10%)
- เพิ่ม time window (จาก 5min → 10min)
- ใช้ alert grouping/batching
- Ignore known errors (ใน Sentry)

---

## 9️⃣ Cost Optimization

### Sentry Free Tier

- **5,000 errors/month** (usually enough for small apps)
- **10,000 performance units/month**
- **1 project**

**Tips**:
- Set `tracesSampleRate: 0.1` (10% sampling)
- Ignore noisy errors (`ignoreErrors` config)
- Use `beforeSend` to filter events

---

### UptimeRobot Free Tier

- **50 monitors**
- **5-minute intervals**
- **Unlimited alerts**

---

## 🎉 Summary

ตอนนี้คุณมี:

✅ **Sentry** - Frontend + Edge error tracking  
✅ **UptimeRobot** - /livez monitoring  
✅ **Error Rate Alerts** - ≥5% in 5 minutes  
✅ **Performance Monitoring** - P95 response time  
✅ **Custom Dashboard** - Real-time metrics  
✅ **Multi-channel Alerts** - Email + Slack + Line  

**Next Steps**:
1. Deploy with Sentry DSN
2. Test error reporting
3. Verify alerts working
4. Monitor for 1 week
5. Tune alert thresholds

---

**Created by**: EZBOQ Development Team  
**Last Updated**: 28 January 2025  
**Version**: 1.1.0  
**Release**: ezboq@1.1.0
