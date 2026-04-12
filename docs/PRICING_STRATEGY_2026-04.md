# EzBOQ Pricing Strategy

อัปเดต: 2026-04-05

## Recommended offer

แนะนำให้ใช้โครงสร้างราคา 3 ชั้นแบบนี้

| Tier | Price | สำหรับใคร | บทบาทใน funnel |
| --- | ---: | --- | --- |
| Free | ฿0 | ผู้ใช้ใหม่ที่อยากลอง workflow | acquisition + activation |
| Pro | ฿99/เดือน | เจ้าของกิจการหรือช่างที่ทำเอกสารคนเดียว | core revenue |
| Business | ฿279/เดือน | ทีมขาย/ทีมประสานงาน/กิจการที่มีหลายคนช่วยกันปิดงาน | expansion revenue |

หลักคิด:

- EzBOQ ไม่ควรพยายามชนะระบบบัญชีเต็มรูปแบบด้วยฟีเจอร์จำนวนมาก แต่ควรชนะด้วย `time-to-value` และ `price-to-value`
- ราคา `Pro 99` ยังต่ำพอให้ตัดสินใจง่ายสำหรับ SME ไทย และสูงพอให้ไม่กลายเป็นแพ็กเกจ low-intent
- ราคา `Business 279` ทำให้ cost per seat ประมาณ `฿93/คน` เมื่อใช้ครบ 3 คน จึงน่าสนใจกว่าคู่แข่งที่คิดราคาแบบระบบบัญชีเต็มชุด

## Competitor snapshot

ตรวจสอบจากหน้า official pricing เมื่อ 2026-04-05

| Brand | Public pricing snapshot | สิ่งที่เด่น | ข้อสรุปสำหรับ EzBOQ |
| --- | --- | --- | --- |
| FlowAccount | Free, Standard `฿165/เดือน`, Pro `฿249/เดือน`, Pro Business `฿457/เดือน` | เอกสาร + บัญชี + payroll + integrations | EzBOQ ควรชนะที่ความง่ายและราคาที่ต่ำกว่าอย่างชัดเจน |
| PEAK | Free, e-Document `฿2,500/ปี`, Basic `฿500/เดือน`, Pro `฿900/เดือน`, Pro Plus `฿1,200/เดือน` | accounting suite เต็มรูปแบบ, stock, bank reconciliation | EzBOQ ไม่ต้องสู้เรื่อง breadth แต่ควรสื่อว่า “เริ่มขายงานและเก็บเงินได้เร็วกว่า” |
| iTAX paystation | `ขั้นต่ำ ฿1,000/เดือน` สำหรับไม่เกิน 20 คน, `฿50/คน/เดือน` สำหรับ 21-100 คน | payroll + tax specialization | ไม่ใช่คู่แข่งตรงของเอกสารขาย แต่เป็น benchmark ว่า vertical SaaS ยังรับราคาสูงกว่า EzBOQ ได้มาก |

### Sources

- FlowAccount pricing: https://flowaccount.com/pricing
- PEAK pricing: https://www.peakaccount.com/
- iTAX paystation pricing: https://www.itax.in.th/paystation/

## Unit economics

ตัวเลขด้านล่างเป็น `assumption model` จากต้นทุน SaaS ลักษณะนี้ใน current stack ไม่ใช่ข้อมูลบัญชีจริง

### Assumptions per active account per month

| Cost item | Pro | Business |
| --- | ---: | ---: |
| Hosting, storage, PDF/export | ฿7 | ฿15 |
| Payment review + admin ops | ฿4 | ฿8 |
| Support / success time | ฿8 | ฿18 |
| Total variable cost | `฿19` | `฿41` |

### Contribution

| Tier | Price | Variable cost | Contribution | Gross margin |
| --- | ---: | ---: | ---: | ---: |
| Free | ฿0 | funnel cost only | negative by design | n/a |
| Pro | ฿99 | ฿19 | `฿80` | `81%` |
| Business | ฿279 | ฿41 | `฿238` | `85%` |

### Break-even model

สมมติ fixed operating cost สำหรับ pricing flow นี้ที่ `฿30,000/เดือน`

- ถ้าขาย Pro อย่างเดียว ต้องมีประมาณ `375 accounts`
- ถ้าขาย Business อย่างเดียว ต้องมีประมาณ `127 accounts`
- ถ้า mix เป็น `200 Pro + 60 Business` จะได้ contribution ราว `฿30,280/เดือน`

สรุป:

- `Pro` เหมาะเป็น volume plan
- `Business` คือ margin driver
- `Free` ต้องถูกใช้เพื่อดัน conversion ไป Pro ไม่ใช่เป็นปลายทางถาวร

## Value proposition by tier

### Free

- ลอง workflow ก่อนซื้อ
- ออกใบเสนอราคาเบื้องต้นได้
- เหมาะกับผู้ใช้ใหม่ที่ยังไม่มั่นใจ

### Pro

- ปิดงาน จ่ายบิล รับเงิน ได้ครบในแพ็กเดียว
- ไม่มีลายน้ำ พร้อมโลโก้และลายเซ็น
- ราคาใกล้เคียงค่าอาหาร 1 มื้อ แต่ช่วยให้งานเอกสารขายดูเป็นมืออาชีพขึ้นทั้งเดือน

### Business

- แชร์งานกันในทีมได้จริง
- คุมสิทธิ์สมาชิก ดู audit log และรายงาน
- ต้นทุนต่อที่นั่งต่ำมากเมื่อเทียบกับระบบบัญชีเต็มรูปแบบ

## Copy direction

ใช้ข้อความขายสั้นและตรงผลลัพธ์

- Headline: `เริ่มจาก Free แล้วค่อยขยับเป็น Pro หรือ Business เมื่อพร้อมปิดงานจริง`
- Pro: `ปิดงาน จ่ายบิล รับเงิน ได้ครบในแพ็กเดียว`
- Business: `แชร์งานในทีม ดูสถานะเดียวกัน และควบคุมสิทธิ์ได้`
- Proof line: `ถ้าปิดงานเพิ่มได้เพียง 1 งานต่อเดือน ค่าสมาชิกก็คืนทุนแล้ว`

## Product note

ตอนนี้ web app ยังมี subscription gate ที่บล็อก unpaid users ก่อนเข้า flow หลักทั้งหมด

ผลกระทบ:

- เราสามารถสื่อสาร `Free` บนหน้า pricing ได้
- แต่ยังไม่สามารถปล่อย `Free self-serve in-app` ได้เต็มรูปแบบจนกว่าจะปรับ gate ให้สอดคล้องกับสิทธิ์แพ็ก FREE

ดังนั้นรอบนี้ถือว่าเสร็จในเชิง `pricing strategy + sales copy`
และควรมีงาน follow-up ถ้าต้องการเปิด Free tier แบบใช้งานจริงในเว็บ
