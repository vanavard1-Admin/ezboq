# EzBOQ Project Memory VPS Upload Runbook

Last updated: 2026-04-09

เอกสารนี้อธิบายแบบสั้นและตรงว่า ตอนนี้ `project memory` ของ EzBOQ บน VPS ทำงานยังไง, มี cron อะไรบ้าง, และไฟล์สำคัญอยู่ตรงไหน

## สรุปสั้นที่สุด

ตอนนี้มี flow แบบนี้:

1. VPS อ่านข้อมูลจาก repo หลักที่ `/root/projects/ezboq`
2. ดึง Gemma exports จาก `/root/projects/gemma-discord/exports`
3. สคริปต์รวมข้อมูลออกมาเป็น `project-memory-ingest.json`
4. สคริปต์อัปโหลดไฟล์นี้ขึ้น GCS ที่:
   - `gs://ezdoc-v1-th.firebasestorage.app/project-memory/latest.json`
   - `gs://ezdoc-v1-th.firebasestorage.app/project-memory/latest.summary.json`
5. function `projectMemoryRefreshScheduled` ที่ `asia-southeast1` จะอ่านไฟล์นี้ไป refresh Firestore ต่อ

สรุปอีกแบบ:

- VPS ตอนนี้ทำหน้าที่ `generate + upload`
- Firebase scheduled function ทำหน้าที่ `read from GCS + ingest into Firestore`

## ทำไมต้องทำแบบนี้

ก่อนหน้านี้เรามี ingest จากเครื่อง local ได้ แต่ยังไม่มีทางให้ VPS อัปเดต memory แบบสม่ำเสมอเอง

เลยเพิ่ม 2 ส่วน:

- สคริปต์สร้าง payload บน VPS
- cron ให้ VPS อัปโหลด payload ขึ้น bucket ทุกวัน

ข้อดีคือ:

- memory ไม่ผูกกับเครื่อง local อย่างเดียว
- scheduler ฝั่ง Firebase ใช้ object เดิมได้ทันที
- แก้ path ให้รองรับ repo กับ Gemma exports ที่อยู่คนละโฟลเดอร์บน VPS

## ไฟล์สำคัญ

ใน repo:

- [scripts/ingest_project_memory.py](/Users/l168/Documents/ใบเสนอราคา/scripts/ingest_project_memory.py)
- [scripts/upload_project_memory.sh](/Users/l168/Documents/ใบเสนอราคา/scripts/upload_project_memory.sh)
- [scripts/project_memory_upload.env.example](/Users/l168/Documents/ใบเสนอราคา/scripts/project_memory_upload.env.example)

บน VPS:

- repo root: `/root/projects/ezboq`
- Gemma exports: `/root/projects/gemma-discord/exports`
- env จริง: `/root/projects/ezboq/scripts/project_memory_upload.env`
- output dir: `/root/projects/ezboq/scripts/outputs`
- log file: `/var/log/project-memory-upload.log`

## Cron บน VPS ตอนนี้มีอะไรบ้าง

ตอนนี้ root crontab มี 2 รายการ:

1. health check เดิมของ Discord bots
   - `*/5 * * * * /root/projects/discord-bots/health-check.sh`
   - รันทุก 5 นาที

2. EzBOQ project memory upload
   - `CRON_TZ=Asia/Bangkok`
   - `15 3 * * * flock -n /tmp/project-memory-upload.lock /root/projects/ezboq/scripts/upload_project_memory.sh >> /var/log/project-memory-upload.log 2>&1`
   - รันทุกวันเวลา 03:15 น. ตามเวลาไทย
   - ใช้ `flock` กัน job ซ้อน

## สคริปต์ upload ทำอะไร

ไฟล์ `/root/projects/ezboq/scripts/upload_project_memory.sh` ทำแค่นี้:

1. โหลด env จาก `project_memory_upload.env`
2. ตั้ง path หลัก:
   - `PROJECT_MEMORY_REPO_ROOT=/root/projects/ezboq`
   - `GEMMA_EXPORTS_DIR=/root/projects/gemma-discord/exports`
   - `PROJECT_MEMORY_OUTPUT_DIR=/root/projects/ezboq/scripts/outputs`
3. รัน `python3 scripts/ingest_project_memory.py`

ตัว `ingest_project_memory.py` จะ:

1. รวม knowledge entries
2. สร้าง code index
3. ดึง test observations
4. ดึง issue จาก live Paperclip board ของ VPS โดยตรง
5. เขียนไฟล์ output ลง `scripts/outputs`
6. อัปโหลดขึ้น GCS

## Auth ตอนนี้ใช้แบบไหน

อันนี้สำคัญ

ตอนแรกติดตั้ง `gcloud` บน VPS แล้ว แต่ auth แบบ `gcloud auth login` ไม่เสถียรสำหรับ cron เพราะโดน Google บังคับ `reauth`

และ org policy ของโปรเจกต์บล็อกการสร้าง `service account key` แบบ JSON ตรง ๆ ด้วย

ดังนั้นตอนนี้ upload path ใช้วิธีนี้แทน:

1. อ่าน `refresh_token` ของ admin จากไฟล์
   - `/root/projects/ezboq/scripts/firebase_cli_token.json`
2. ขอ user access token ผ่าน OAuth token endpoint
3. ใช้ user token นี้ไปเรียก IAM Credentials API เพื่อ mint access token ของ service account นี้:
   - `project-memory-uploader@ezdoc-v1-th.iam.gserviceaccount.com`
4. ใช้ access token ของ service account ไปอัปโหลดไฟล์เข้า GCS ผ่าน JSON API

แปลว่า:

- `gcloud` ติดตั้งไว้แล้ว
- แต่ cron ไม่ได้พึ่ง `gcloud auth login` เป็นหลัก
- cron ไม่ได้ใช้ Gemini OAuth ตรง ๆ แล้ว
- upload runtime ตอนนี้วิ่งในนาม service account ผ่าน impersonation
- ไม่ต้องเก็บ service account key ไฟล์บน VPS

## สิ่งที่ทดสอบแล้ว

ทดสอบผ่านแล้ว:

- ติดตั้ง `google-cloud-cli` บน VPS
- manual run ของ `upload_project_memory.sh`
- cron-equivalent run ผ่าน `flock`
- object metadata บน GCS อัปเดตจริง

สถานะล่าสุดตอนทดสอบ:

- `project-memory/latest.json` ถูกอัปเดตล่าสุดที่ `2026-04-09T14:23:09Z`
- payload จาก VPS live board มี `586` entries
  - `project_memory=252`
  - `code_index=320`
  - `test_observations=5`
  - `project_issues=9`

หมายเหตุ:

- ตอนนี้ VPS ไม่พึ่ง snapshot file แล้ว
- source incident/issues มาจาก live Paperclip board ของ VPS โดยตรง
- env สำคัญคือ:
  - `PAPERCLIP_COMPANY_ID=a32b722a-e5ea-4e1c-b802-1187a47f7ecc`
  - `PROJECT_MEMORY_PAPERCLIP_INCLUDE_ALL_ISSUES=true`
- ถ้า Paperclip API ตอบได้ สคริปต์จะใช้ live board ก่อนเสมอ
- snapshot จะถูกใช้เป็น fallback เฉพาะกรณีที่ตั้ง `PROJECT_MEMORY_INCIDENTS_FILE` และ live board ใช้งานไม่ได้
- issue ที่ไม่ใช่ incident จะถูกเขียนลง `project_issue_entries`
- จำนวน incident/issues บน VPS อาจไม่เท่ารอบ local เดิม เพราะ company บน VPS เป็นบอร์ด `EZB-*` คนละชุดกับ local board ที่เคยใช้ทำ snapshot
- scheduled refresh ใช้ deterministic IDs + stale deactivation แล้ว ดังนั้นรอบ sync ถัดไปจะไม่สะสม duplicate active docs แบบเดิม

## คำสั่งเช็กเร็ว

เช็ก crontab:

```bash
ssh root@194.233.88.67 'crontab -l'
```

เช็ก log ล่าสุด:

```bash
ssh root@194.233.88.67 'tail -n 50 /var/log/project-memory-upload.log'
```

รัน upload เอง 1 รอบ:

```bash
ssh root@194.233.88.67 '/root/projects/ezboq/scripts/upload_project_memory.sh'
```

เช็ก output summary:

```bash
ssh root@194.233.88.67 'cat /root/projects/ezboq/scripts/outputs/project-memory-ingest.summary.json'
```

เช็กว่า GCS กับ Firestore sync กันแค่ไหน:

```bash
PROJECT_MEMORY_GCS_URI=gs://ezdoc-v1-th.firebasestorage.app/project-memory/latest.json \
GOOGLE_OAUTH_CLIENT_ID=563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com \
GOOGLE_OAUTH_CLIENT_SECRET=j9iVZfS8kkCEFUPaAeJV0sAi \
GOOGLE_OAUTH_REFRESH_TOKEN_FILE=/Users/l168/.config/configstore/firebase-tools.json \
python3 scripts/verify_project_memory_sync.py
```

## ข้อควรแก้รอบถัดไป

ของที่ควรปรับให้ production-friendly กว่านี้:

1. ถ้าต้องการลดการเก็บ user refresh token บน VPS ต่ออีกขั้น ต้องย้ายไป workload identity / broker flow
2. ถ้าต้องการ taxonomy ลึกกว่านี้ ค่อยแตก `project_issue_entries` เป็นกลุ่ม roadmap / bug / release task เพิ่ม
3. ถ้าต้องการตรวจ health อัตโนมัติ ให้ผูก verify script เข้ากับ heartbeat/report เพิ่มอีกชั้น

## สรุปแบบคนใช้งาน

ถ้าถามว่า "ตอนนี้ VPS ทำอะไรให้แล้ว"

คำตอบคือ:

- ทุกวันตอนตี 3:15 VPS จะสร้างไฟล์ memory payload ใหม่
- แล้วอัปโหลดขึ้น bucket ของโปรเจกต์ให้อัตโนมัติ
- ไฟล์นี้คือแหล่งที่ scheduler ฝั่ง Firebase จะใช้ไปอัปเดต memory ของเว็บต่อ
