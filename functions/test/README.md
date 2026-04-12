# LINE Webhook Signature Test

## 1) Set secret
```bash
export LINE_CHANNEL_SECRET="(your secret here)"
```

## 2) Generate signature
```bash
SIG=$(node functions/test/sign_payload.js)
echo $SIG
```

## 3) Send signed request
```bash
curl -i -X POST "https://<YOUR_FUNCTION_URL>/line/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Line-Signature: $SIG" \
  --data-binary @functions/test/payload.json
```

---

## เช็คผลที่ถูกต้อง

* ถ้าลายเซ็นถูก: ควรได้ **200** และ `{ ok: true }` (ตาม MVP ที่คุณทำ)
* ถ้าลายเซ็นผิด/ไม่มี: ควรได้ **400/401** (แล้วแต่คุณ return)

---

## IMPORTANT: ทำไมของคุณเคย 404 แล้วตอนนี้ไม่ควร 404

* ก่อนหน้านี้คุณยิงไป `GET /line/webhook` เลยได้ 404 (ถูกแล้ว)
* LINE webhook ต้องเป็น `POST /line/webhook`
* เวลา test ให้ใช้ curl แบบด้านบนเท่านั้น

---

## ขั้น "C" ต่อจากนี้ (หลัง B ผ่าน)

1. เอา `replyToken` จริงจาก LINE event แล้วลอง “reply” กลับด้วย access token
2. ใส่ routing ใน webhook ให้เรียก parser/draft สร้าง summary แล้ว reply

---

## ทำไม LINE Verify ยังขึ้น 500 (สรุปสาเหตุ)

จากอาการทั้งหมด + โค้ดที่คุณใช้ ฟันธงได้เลยว่าเกิดจาก signature verification โยน exception

ถ้า `crypto.timingSafeEqual` ถูกเรียกด้วย buffer ที่ยาวไม่เท่ากัน จะ throw และตอบ 500 — ต้องกัน length ก่อน

ตัวอย่างการ verify ที่ทนทาน (แนวคิด):

```js
try {
  const sig = req.get('x-line-signature');
  if (!sig) return res.status(401).send('Missing signature');

  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('base64');
  const sigBuf = Buffer.from(sig, 'base64');
  const expBuf = Buffer.from(expected, 'base64');

  if (sigBuf.length !== expBuf.length) return res.status(401).send('Bad signature');
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return res.status(401).send('Bad signature');
} catch (err) {
  console.error('LINE webhook error:', err);
  return res.status(200).json({ ok: true });
}
```

---

## ลำดับที่ควรทำตอนนี้

1. `gcloud auth login` (ถ้ายังไม่ได้ login)
2. ถ้าโค้ดยังไม่กัน length-check ให้แก้ตามตัวอย่างด้านบน
3. `firebase deploy --only functions`
4. กลับไปกด Verify ใน LINE Developers — ควรขึ้น Success
