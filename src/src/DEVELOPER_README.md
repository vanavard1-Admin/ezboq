# 🛠️ Developer Guide - EZBOQ

## 📋 Table of Contents
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Development Setup](#development-setup)
- [Architecture Overview](#architecture-overview)
- [Key Features](#key-features)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Deployment](#deployment)

---

## 📁 Project Structure

```
ezboq/
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── LoginPage.tsx    # Authentication
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Navigation Menu.tsx
│   └── ...              # Feature components
│
├── pages/               # Page components
│   ├── BOQPage.tsx      # Bill of Quantities
│   ├── QuotationPage.tsx
│   ├── InvoicePage.tsx
│   ├── ReceiptPage.tsx
│   ├── CustomersPage.tsx
│   ├── PartnersPage.tsx
│   ├── ReportsPage.tsx
│   └── ...
│
├── utils/               # Utility functions
│   ├── api.ts           # API client
│   ├── calculations.ts  # BOQ calculations
│   ├── pdfExport.ts     # PDF generation
│   ├── debug.ts         # Debug logger
│   ├── downloadHelper.ts
│   ├── demoStorage.ts   # Demo mode utilities
│   └── supabase/        # Supabase client
│
├── data/                # Static data
│   └── catalog.ts       # 680+ materials catalog
│
├── types/               # TypeScript types
│   └── boq.ts           # BOQ-related types
│
├── supabase/            # Backend
│   └── functions/
│       └── server/      # Edge function
│           ├── index.tsx # API routes
│           └── kv_store.tsx # Data storage
│
├── public/              # Static assets
│   ├── robots.txt
│   └── sitemap.xml
│
└── styles/              # Global styles
    └── globals.css      # Tailwind + custom CSS
```

---

## 🔧 Tech Stack

### Frontend
- **React 18.3** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS 4.0** - Styling
- **shadcn/ui** - Component library

### Backend
- **Supabase** - Backend as a Service
  - Authentication
  - PostgreSQL Database
  - Edge Functions (Hono framework)
  - Key-Value Store

### Libraries
- **jsPDF** - PDF generation
- **html2canvas** - HTML to canvas rendering
- **Recharts** - Charts & graphs
- **Lucide React** - Icons
- **React Hook Form + Zod** - Forms & validation
- **Sonner** - Toast notifications
- **QRCode** - QR code generation
- **date-fns** - Date utilities

---

## 🚀 Development Setup

### Prerequisites
```bash
# Required
Node.js >= 18.x
npm >= 9.x

# Optional (for backend)
Supabase CLI
```

### Installation

1. **Clone & Install**
```bash
git clone https://github.com/your-repo/ezboq.git
cd ezboq
npm install
```

2. **Environment Setup**
```bash
# Copy environment file
cp .env.production.example .env.local

# Edit with your Supabase credentials
# Get from: https://app.supabase.com/project/YOUR_PROJECT/settings/api
```

3. **Start Development Server**
```bash
npm run dev
# Visit http://localhost:5173
```

4. **Start Supabase Locally** (Optional)
```bash
supabase start
supabase functions serve
```

---

## 🏗️ Architecture Overview

### Data Flow

```
User Interface (React)
    ↓
API Client (utils/api.ts)
    ↓
Supabase Edge Function (Hono server)
    ↓
Key-Value Store (PostgreSQL)
```

### State Management

**No global state library** - Using React's built-in hooks:
- `useState` - Local component state
- `useEffect` - Side effects & data fetching
- `localStorage` - Persistence (demo mode, settings)

### Authentication Flow

```
1. User visits site
2. Check localStorage for demo-mode
3. If demo: Load demo user
4. If not: Check Supabase session
5. Redirect to login if no session
```

### Demo Mode Architecture

```typescript
// Session isolation via localStorage
localStorage.setItem('demo-mode', 'true');
localStorage.setItem('demo-session-id', uniqueId);
localStorage.setItem('demo-user', JSON.stringify(user));

// Backend prefix for data isolation
prefix = `demo-${sessionId}-${key}`;
```

---

## 🎯 Key Features

### 1. 4-Step BOQ Workflow

```typescript
// State flow
BOQ → Quotation → Invoice → Receipt

// Each step inherits data from previous
Step 1: Material selection + quantities
Step 2: + Discount + margins
Step 3: + Payment terms + installments
Step 4: + Payment details + tax
```

### 2. Auto-Calculations

```typescript
// Located in: utils/calculations.ts

// Profit formula
cost = material + labor
markup = cost × (waste + operations + error + profit)
subtotal = cost + markup
vat = subtotal × 0.07
total = subtotal + vat
```

### 3. PDF Export

```typescript
// Located in: utils/pdfExport.ts

// Multi-page support
exportWorkflowToPDF(
  projectTitle,
  documentType: 'all' | 'boq' | 'quotation' | 'invoice' | 'receipt',
  onProgress?: (progress) => void
)

// Features:
- Thai font support
- A4/A3 formats
- Watermarks (optional)
- Page numbers (optional)
- Scroll-lock during export ✅
```

### 4. Material Catalog

```typescript
// Located in: data/catalog.ts

// 680+ items organized by category
export const buildingMaterialsCatalog = [
  {
    id: 1,
    category: 'วัสดุก่อสร้างหลัก',
    name: 'ปูนซีเมนต์',
    description: 'ปูนซีเมนต์ปอร์ตแลนด์',
    unit: 'ถุง',
    material: 120,
    labor: 0,
  },
  // ... 679 more items
];
```

---

## 💻 Development Workflow

### Adding a New Feature

1. **Create Component**
```typescript
// components/MyNewComponent.tsx
import React from 'react';
import { Button } from './components/ui/button';

export function MyNewComponent() {
  return (
    <div>
      <h1>My New Feature</h1>
      <Button>Click me</Button>
    </div>
  );
}
```

2. **Add Route** (if needed)
```typescript
// AppWithAuth.tsx
type View = 
  | 'existing-views'
  | 'my-new-feature';  // Add here

// In render:
{view === 'my-new-feature' && <MyNewComponent />}
```

3. **Add to Navigation**
```typescript
// components/NavigationMenu.tsx
const menuItems = [
  // ... existing items
  {
    icon: <MyIcon />,
    label: 'My Feature',
    view: 'my-new-feature' as View,
  },
];
```

4. **Add API Endpoint** (if needed)
```typescript
// supabase/functions/server/index.tsx
app.get("/make-server-6e95bca3/my-endpoint", async (c) => {
  try {
    const prefix = getKeyPrefix(c, "my-data:");
    const data = await kv.get(`${prefix}key`);
    return c.json({ data });
  } catch (error: any) {
    console.error("Error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});
```

5. **Test**
```bash
# Run dev server
npm run dev

# Test in browser
# Check console for errors
# Test responsive design
```

---

## 🧪 Testing

### Manual Testing Checklist

```bash
# Before each commit:
□ Test in Chrome
□ Test in Firefox  
□ Test in Safari (if possible)
□ Test on mobile (DevTools)
□ Check console for errors
□ Verify no TypeScript errors
□ Test demo mode
□ Test authentication flow
□ Test main workflows
```

### Type Checking
```bash
npm run type-check
```

### Build Test
```bash
npm run build
npm run preview
```

---

## 🚀 Deployment

### Quick Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### Manual Deploy

1. **Build**
```bash
npm run build:prod
```

2. **Deploy Frontend** (Choose one)
```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod

# Other hosting
# Upload dist/ folder
```

3. **Deploy Backend**
```bash
# Supabase Edge Function
npm run deploy:supabase

# Set ENV=production in Supabase Dashboard
```

4. **Configure Domain**
- Add EZBOQ.COM in hosting settings
- Update DNS records
- Wait for SSL certificate

---

## 🐛 Debugging

### Enable Debug Mode

```typescript
// In browser console
localStorage.setItem('DEBUG', 'true');
location.reload();

// Or use utility
import { enableDebug } from './utils/debug';
enableDebug();
```

### Common Issues

**1. "SUPABASE_URL is not defined"**
```bash
# Check .env.local exists
ls -la .env.local

# Check variable name matches
cat .env.local | grep VITE_SUPABASE_URL
```

**2. PDF Export Fails**
```typescript
// Check if export section exists
document.getElementById('boq-export-section'); // Should not be null

// Check console for detailed logs
// Enable debug mode to see full error stack
```

**3. Demo Data Not Persisting**
```typescript
// Check localStorage
console.log(localStorage.getItem('demo-mode'));
console.log(localStorage.getItem('demo-session-id'));

// Clear and restart
localStorage.clear();
location.reload();
```

---

## 📚 Code Style

### TypeScript
```typescript
// Use interfaces for objects
interface BOQItem {
  id: string;
  name: string;
  quantity: number;
}

// Use type for unions
type View = 'dashboard' | 'boq' | 'reports';

// Always type function parameters
function calculateTotal(items: BOQItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
```

### React Components
```typescript
// Functional components with TypeScript
interface Props {
  title: string;
  onSave: () => void;
}

export function MyComponent({ title, onSave }: Props) {
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onSave}>Save</button>
    </div>
  );
}
```

### Logging
```typescript
// Use debug utility instead of console.log
import { debug } from './utils/debug';

debug.log('Info message');     // Hidden in production
debug.error('Error message');   // Always shown
debug.warn('Warning message');  // Hidden in production
```

---

## 🔐 Security Notes

### Environment Variables
- Never commit `.env.local` or `.env.production`
- Use `.env.production.example` as template
- Rotate keys regularly

### API Keys
- Keep Supabase keys secure
- Use anon key in frontend
- Use service role key only in backend
- Never expose service role key to frontend

### Demo Mode
- Demo data isolated by session ID
- Auto-cleanup after 7 days
- No server persistence

---

## 📖 Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 🤝 Contributing

### Workflow
1. Create feature branch
2. Make changes
3. Test thoroughly
4. Create pull request
5. Code review
6. Merge to main

### Commit Messages
```bash
feat: Add new customer report page
fix: Resolve PDF export issue on mobile
docs: Update deployment guide
refactor: Optimize BOQ calculations
style: Format code with prettier
```

---

**Last Updated:** October 28, 2025
**Version:** 1.0.0
**Status:** Production Ready 🚀
