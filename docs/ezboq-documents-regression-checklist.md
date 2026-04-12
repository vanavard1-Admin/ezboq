# EzBOQ Documents Regression Checklist

ใช้เช็กหลัง merge ว่าโมดูล `Documents` ทำงานครบภายใน EzBOQ และยังคุยกับ backend/document pipeline เดิมได้ตามคาด

## 1. Entry + Navigation

- เปิด EzBOQ แล้วเห็น service card `Documents` ในหน้า Home และกดเข้า `/docs` ได้
- top navigation highlight ที่ `Documents` ถูกต้องทั้ง `/docs`, `/docs/new`, `/docs/edit/:id`
- จาก `/docs` กดกลับ `BOQ Workspace` แล้ว route กลับ `/workspace` ได้

## 2. Token + Branding

- `apps/web` และ `apps/portal` import token จาก `shared/styles/ezboq-tokens.css`
- หน้า `Documents` ฝั่ง EzBOQ ใช้ stone palette, spacing, และ typography เดียวกับ EzBOQ shell
- `apps/portal` metadata/dashboard hero แสดงชื่อ `EzBOQ Documents` แทน branding เดิมที่แยกเป็น product

## 3. Auth + Business Bootstrap

- ผู้ใช้ที่มี Firebase session บน EzBOQ เปิด `/docs` แล้วอ่านข้อมูลได้ทันที
- ผู้ใช้ที่ยังไม่มี `activeBusinessId` ถูก bootstrap ธุรกิจอัตโนมัติก่อนเรียกเอกสาร
- กรณีไม่มี Firebase cloud session, `/docs` แสดง guard state ชัดเจน ไม่พังทั้งหน้า

## 4. Documents List

- รายการเอกสารโหลดได้จาก backend `/v1/documents`
- filter ประเภทเอกสาร และ filter สถานะเอกสารทำงาน
- search จากเลขเอกสาร, ลูกค้า, หัวข้อ, สถานะ ใช้งานได้
- action `เปิด`, `สร้าง PDF`, `LINE` ใช้งานได้ตามสถานะเอกสาร

## 5. Document Editor

- สร้างเอกสารใหม่จาก `/docs/new` ได้
- step 1 บังคับเลือกลูกค้าและหัวข้อก่อนสร้าง draft
- สร้าง draft แล้ว editor เปลี่ยนเป็น edit mode พร้อม doc id จริง
- auto-save ทำงานเมื่อแก้ field ใน draft
- step รายการคำนวณ amount ต่อแถวถูกต้อง
- step สรุปยอดคำนวณ subtotal, discount, extra fee, VAT, WHT, net receive ถูกต้อง
- เอกสาร `BILL` จัดการ payment milestones ได้

## 6. Issue + Delivery

- กด `สร้าง PDF` แล้ว backend รับงาน generate PDF ได้
- กด `ยืนยันและออกเอกสาร` แล้ว flow `ready -> confirm` สำเร็จ
- หลัง issue แล้วกลับ list พร้อม notice success
- กด `LINE` ส่งเอกสารโดยใช้ `activeBusinessId` ปัจจุบันได้

## 7. Infra / Security

- `apps/web/index.html` CSP อนุญาต `connect-src` และ `frame-src` สำหรับ `doc.ezboq.com` และ storage URL ที่ใช้ preview PDF
- `functions/src/api/index.ts` CORS allowlist มี `https://ezboq.com` และ `https://www.ezboq.com`

## 8. Verification Commands

- `npm run typecheck --workspace=apps/web`
- `npm run build:web`
- `npm run lint --workspace=apps/web`

## 9. Known Gap To Verify Separately

- `apps/portal` build ตอนนี้ติดปัญหา dependency ของ Next (`../server/require-hook` ไม่พบ) ซึ่งเป็นปัญหาสภาพแวดล้อมเดิมของ workspace นี้ ไม่ใช่ syntax error จากงาน merge รอบนี้
