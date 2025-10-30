# 🗺️ EZBOQ Development Roadmap

## ลำดับถัดไป: Performance, Query Optimization & RLS Migration

**Current Version**: 1.1.0  
**Last Updated**: 28 January 2025

---

## ✅ สิ่งที่ทำเสร็จแล้ว (v1.0.0 → v1.1.0)

### Phase 1: Backend Security & Health ✅
- Health/Version endpoints (`/livez`, `/readyz`, `/version`)
- Idempotency protection
- RLS security guide

### Phase 2: P1 System Stability ✅
- Input validation (Zod schemas)
- Rate limiting (100 req/min)
- Document number schema (sequential)
- XSS protection (sanitization)
- Unique constraints
- Rounding policy (ROUND_HALF_UP)
- Concurrent storm testing
- Sentry monitoring setup

### Phase 2.1: Validation Schema Fixes ✅
- Fixed overly strict validation schemas
- Made boqItems.description optional
- Changed company.website from URL to string
- Made partner and discount nullable
- Removed duplicate client-side validation
- **Result**: Users can now save documents with partial data

---

## 🎯 Phase 3: React Query + Performance (2-3 ชั่วโมง)

### 3.1 React Query Implementation

**จุดประสงค์**: ลดการเรียก API ที่ไม่จำเป็น + Caching + Optimistic Updates

**Features**:
- ✅ React Query setup
- ✅ Query caching (5 minutes default)
- ✅ Automatic refetch on window focus
- ✅ Optimistic updates (instant UI feedback)
- ✅ Infinite scroll (for large lists)
- ✅ Prefetching (anticipate user actions)

**Implementation**:

```typescript
// utils/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query: Get documents (with caching)
export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get('/documents'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Mutation: Create document (with optimistic update)
export function useCreateDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => api.post('/documents', data),
    onMutate: async (newDoc) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: ['documents'] });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData(['documents']);
      
      // Optimistically update UI
      queryClient.setQueryData(['documents'], (old: any) => ({
        ...old,
        documents: [...old.documents, newDoc],
      }));
      
      return { previous };
    },
    onError: (err, newDoc, context) => {
      // Rollback on error
      queryClient.setQueryData(['documents'], context.previous);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
```

**หมายเหตุ**: เรียก API เฉพาะเมื่อจำเป็น (ไม่ใช่ทุก render)

---

### 3.2 Offline Queue

**จุดประสงค์**: รองรับการทำงาน offline + Sync เมื่อกลับมา online

**Features**:
- ✅ Queue failed requests
- ✅ Auto-retry when online
- ✅ Persist queue in IndexedDB
- ✅ Conflict resolution

**Implementation**:

```typescript
// utils/offlineQueue.ts
import { openDB } from 'idb';

class OfflineQueue {
  async add(request: { url: string; method: string; data: any }) {
    const db = await openDB('ezboq-queue', 1);
    await db.add('queue', {
      ...request,
      timestamp: Date.now(),
      id: crypto.randomUUID(),
    });
  }
  
  async processQueue() {
    const db = await openDB('ezboq-queue', 1);
    const items = await db.getAll('queue');
    
    for (const item of items) {
      try {
        await api.request(item.method, item.url, item.data);
        await db.delete('queue', item.id);
      } catch (error) {
        console.error('Failed to process queue item:', error);
      }
    }
  }
}

// Listen for online event
window.addEventListener('online', () => {
  queue.processQueue();
});
```

---

### 3.3 Virtualization (รายการ 680+ items)

**จุดประสงค์**: Render เฉพาะ items ที่เห็นบนหน้าจอ (ลด DOM nodes)

**ใช้**: `@tanstack/react-virtual`

**Implementation**:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function CatalogList({ items }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length, // 680+ items
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // height per item
    overscan: 5, // render 5 extra items above/below
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index].description}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**ผลลัพธ์**:
- เดิม: Render 680 DOM nodes
- ใหม่: Render ~20 DOM nodes (visible items only)
- Performance: ⚡ 30x faster

---

### 3.4 Performance Budget

**Target**: JS Bundle < 250KB (gzipped)

**Current Bundle Size** (ต้องตรวจสอบ):
```bash
npm run build
```

**Optimization Strategies**:

1. **Code Splitting**:
```typescript
// Lazy load pages
const BOQPage = lazy(() => import('./pages/BOQPage'));
const InvoicePage = lazy(() => import('./pages/InvoicePage'));
```

2. **Tree Shaking**:
```typescript
// ❌ Bad - imports everything
import _ from 'lodash';

// ✅ Good - imports only what's needed
import debounce from 'lodash/debounce';
```

3. **Dynamic Imports**:
```typescript
// Import PDF library only when needed
const exportPDF = async () => {
  const { jsPDF } = await import('jspdf');
  // ... use jsPDF
};
```

4. **Bundle Analysis**:
```bash
npm install -D vite-bundle-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'vite-bundle-visualizer';

export default {
  plugins: [
    visualizer({ open: true })
  ]
};
```

**Target Breakdown**:
- React + React DOM: ~130KB
- Vendor libraries: ~80KB
- Application code: ~40KB
- **Total**: ~250KB

---

## 🎯 Phase 4: RLS & Auth Migration (3-4 ชั่วโมง)

### 4.1 Database Migration (KV → Postgres)

**เหตุผล**:
- ✅ Proper relational data model
- ✅ Row-Level Security (RLS)
- ✅ Better query performance
- ✅ ACID transactions
- ✅ Backup & recovery

**Migration Plan**:

**Step 1**: Create Postgres Schema

```sql
-- Create tables with RLS enabled
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  tax_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own customers
CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own customers
CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Step 2**: Migrate KV Data to Postgres

```typescript
// Migration script
async function migrateCustomersToPostgres() {
  const supabase = createClient();
  
  // Get all customers from KV
  const kvCustomers = await kv.getByPrefix('customer:');
  
  // Insert into Postgres
  for (const customer of kvCustomers) {
    await supabase.from('customers').insert({
      ...customer,
      user_id: customer.userId, // Map to auth.uid()
    });
  }
}
```

**Step 3**: Update API calls

```typescript
// Before (KV)
const customers = await kv.getByPrefix('customer:');

// After (Postgres)
const { data: customers } = await supabase
  .from('customers')
  .select('*')
  .eq('user_id', auth.uid());
```

---

### 4.2 RLS Policies

**Customers Table**:

```sql
-- SELECT policy
CREATE POLICY "users_select_own_customers"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT policy
CREATE POLICY "users_insert_own_customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
CREATE POLICY "users_update_own_customers"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy
CREATE POLICY "users_delete_own_customers"
  ON customers FOR DELETE
  USING (auth.uid() = user_id);
```

**Documents Table**:

```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  document_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  project_title TEXT NOT NULL,
  total_amount DECIMAL(15, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_crud_own_documents"
  ON documents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 4.3 Demo Mode vs Production

**Demo Mode** (ยังใช้ KV + prefix):
- ไม่ต้อง login
- ข้อมูลแยกด้วย `demo-{sessionId}-` prefix
- Auto-expire หลัง 24 ชม.

**Production** (ใช้ Postgres + RLS):
- ต้อง login
- ข้อมูลแยกด้วย `auth.uid()`
- Persistent data

**Implementation**:

```typescript
// utils/storage.ts
export function getStorageAdapter() {
  const isDemoMode = !isAuthenticated();
  
  if (isDemoMode) {
    return new KVStorageAdapter(); // Use KV with prefix
  } else {
    return new PostgresStorageAdapter(); // Use Postgres with RLS
  }
}

// Usage
const storage = getStorageAdapter();
await storage.getCustomers(); // Auto-routes to correct storage
```

---

## 📊 Timeline & Effort Estimate

| Phase | Features | Time | Priority |
|-------|----------|------|----------|
| **Phase 3.1** | React Query | 1 hr | High |
| **Phase 3.2** | Offline Queue | 1 hr | Medium |
| **Phase 3.3** | Virtualization | 30 min | High |
| **Phase 3.4** | Performance Budget | 30 min | High |
| **Phase 4.1** | DB Migration | 2 hrs | Critical |
| **Phase 4.2** | RLS Policies | 1 hr | Critical |
| **Phase 4.3** | Demo/Production Split | 1 hr | High |
| **Total** | | **7 hrs** | |

---

## 🎯 Success Metrics

### Phase 3 (Performance)

- [ ] API calls reduced by 70%
- [ ] Initial load time < 3s
- [ ] JS bundle < 250KB gzipped
- [ ] Lighthouse score > 90
- [ ] Catalog scroll 60 FPS
- [ ] Offline queue working

### Phase 4 (RLS & Auth)

- [ ] All data in Postgres
- [ ] RLS policies tested
- [ ] User isolation verified
- [ ] Demo mode still working
- [ ] Auth flow complete
- [ ] Migration successful

---

## 🚀 Deployment Checklist

### Before Migration

- [ ] Backup all KV data
- [ ] Test Postgres schema locally
- [ ] Test RLS policies
- [ ] Create migration script
- [ ] Plan rollback strategy

### During Migration

- [ ] Enable maintenance mode
- [ ] Run migration script
- [ ] Verify data integrity
- [ ] Test critical flows
- [ ] Monitor error rates

### After Migration

- [ ] Verify RLS working
- [ ] Test multi-user scenarios
- [ ] Check performance
- [ ] Update documentation
- [ ] Remove old KV code (after 1 week)

---

## 📝 Notes

### React Query หมายเหตุ

- ใช้ `staleTime` เพื่อลดการ refetch
- ใช้ `cacheTime` เพื่อเก็บ cache นานขึ้น
- ใช้ `refetchOnWindowFocus: false` สำหรับ pages ที่ไม่ต้องการ auto-refetch

### Offline Queue หมายเหตุ

- ใช้ IndexedDB (ไม่ใช่ localStorage เพราะมี size limit)
- ต้องมี conflict resolution strategy
- Test ใน Chrome DevTools → Network → Offline

### Virtualization หมายเหตุ

- ใช้สำหรับ list > 100 items เท่านั้น
- ต้อง set `estimateSize` ให้ถูกต้อง
- Test กับ catalog 680+ items

### RLS หมายเหตุ

- Test policies ก่อน enable RLS
- ใช้ `USING` สำหรับ read
- ใช้ `WITH CHECK` สำหรับ write
- Test กับ multiple users

---

## 🔗 Related Documents

- [MONITORING_GUIDE.md](./MONITORING_GUIDE.md) - Sentry & Alerts
- [SECURITY_RLS_GUIDE.md](./SECURITY_RLS_GUIDE.md) - RLS Setup
- [TEST_P1_FEATURES.md](./TEST_P1_FEATURES.md) - Testing
- [API_SECURITY_GUIDE.md](./API_SECURITY_GUIDE.md) - Security

---

**Ready to start Phase 3?** 🚀

พิมพ์: "เริ่ม Phase 3: React Query" เพื่อเริ่มทำต่อ!

---

**Created by**: EZBOQ Development Team  
**Last Updated**: 28 January 2025  
**Version**: 1.1.0
