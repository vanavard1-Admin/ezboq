# Lazada Procurement Integration

BOQ → Lazada price comparison and PO generation for the Procurement pipeline step.

## Features

1. **จัดซื้อ (Procurement) Tab** — in the BOQ editor, a second tab shows all purchasable materials from the BOQ with columns: วัสดุ | จำนวน | หน่วย | ราคาประมาณ.

2. **Lazada Price Comparison** — for each material, fetch comparable offers from Lazada showing: ร้าน | ราคา | รีวิว | ส่งฟรี? with an "เปิดใน Lazada" link (tracking kept internal when enabled).

3. **Smart PO Generator** — select best offers per material, then generate a PO summary grouped by vendor with totals. Supports copy-to-clipboard and text export.

## Environment Variables

Set these in your `.env` or `.env.local` file under `apps/web/`:

| Variable | Required | Description |
|---|---|---|
| `VITE_LAZADA_APP_KEY` | Yes (for live) | Lazada Open Platform App Key |
| `VITE_LAZADA_APP_SECRET` | Yes (for live) | Lazada Open Platform App Secret |
| `VITE_LAZADA_ACCESS_TOKEN` | Yes (for live) | Lazada seller/affiliate access token |
| `VITE_LAZADA_AFFILIATE_ID` | No | Tracking ID appended to product URLs when tracking is enabled |
| `VITE_ENABLE_LAZADA_AFFILIATE_TRACKING` | No (default: true) | `true/false` to control whether tracking params are appended |

### Search Mode (No Live API)

If required live API env vars are not set, the system automatically runs in **search mode**:
- show direct "เปิดใน Lazada" search links built from item names
- no mock store/price cards are shown
- optional note: "ไม่มีข้อมูลราคาแบบ real-time"
- service/non-product rows show: "รายการบริการ/งานหน้างาน — ไม่แนะนำซื้อผ่าน marketplace"

## Setup Path

1. Register a Lazada Open Platform account at https://open.lazada.com
2. Create an app to get `app_key` and `app_secret`
3. Complete OAuth to obtain an `access_token`
4. Copy `.env.example` to `.env.local` and fill in the values
5. Restart the dev server

## File Structure

```
apps/web/src/
├── types/procurement.ts       # TypeScript interfaces
├── utils/lazadaClient.ts      # API client + search fallback
└── components/
    ├── ProcurementPanel.tsx    # Main procurement UI
    └── AdvancedQuotationEditor.tsx  # Modified: added จัดซื้อ tab
```

## Architecture Notes

- Materials are derived from `QuotationItem[]` — items with a dotted `no` field, positive quantity, and non-zero unit cost are included.
- The Lazada client is a thin wrapper; in live mode it calls the Lazada REST API and maps to `LazadaOffer`. Without API config it falls back to plain Lazada search links.
- PO suggestions group selected offers by vendor (`sellerName`) and compute per-vendor subtotals.
- All UI is mobile-responsive using Tailwind responsive classes.
