# YaCheck Mobile

แอป Expo/React Native แบบ local-first ที่เชื่อมบัญชีและข้อมูลสุขภาพกับฐาน Supabase กลางชุดเดียวกับ MaCheck

## เริ่มใช้งาน

ต้องใช้ Node.js 20.19 ขึ้นไป

```bash
npm install
cp .env.example .env
# ใส่ EXPO_PUBLIC_SUPABASE_URL และ EXPO_PUBLIC_SUPABASE_ANON_KEY
npm run typecheck
npm run lint
npm start
```

เปิดด้วย Expo Go บนอุปกรณ์จริงเพื่อทดสอบกล้องและ local notifications

## iOS signing สำหรับเครื่องทดสอบ

- `Debug` ใช้ `ios/YaCheck/YaCheckDebug.entitlements` เพื่อให้ Apple Personal Team ติดตั้งลง iPhone/iPad ได้ โดยไม่ขอสิทธิ์ APNs
- `Release` ใช้ `ios/YaCheck/YaCheck.entitlements` และคง `aps-environment` สำหรับ EAS/App Store build ที่มี Apple Developer Program และ Push credentials
- Debug แบบบัญชีฟรียังใช้ local medication notifications, กระดิ่ง, กล่องข้อความ และ Realtime ขณะเปิดแอปได้ แต่ remote push ขณะปิดแอปต้องใช้ Release signing ที่รองรับ APNs
- หลีกเลี่ยง `expo prebuild --clean` โดยไม่ตรวจสองไฟล์ entitlements และค่า `CODE_SIGN_ENTITLEMENTS` เพราะคำสั่งดังกล่าวอาจสร้างโปรเจกต์ native ใหม่

## ฟังก์ชันที่ทำงานบนเครื่องแล้ว

- สมัคร/เข้าสู่ระบบด้วย username และ password โดยไม่ขอชื่อจริง เบอร์ อีเมล หรือวันเกิด
- session token และ health cache บน native เก็บใน SecureStore แบบแบ่ง chunk พร้อม migration จาก AsyncStorage เดิม
- ซิงก์โรค แพ้ยา ตู้ยา และ dose events ผ่าน Supabase RLS
- ตู้ยาและตารางกินยาแบบ persistent offline
- บันทึกการกินยารายวันและคำนวณ adherence
- ตรวจ drug-drug interaction และ food-drug/disease clash
- สแกน barcode/QR ด้วยกล้องจริงและค้นยาด้วยชื่อ
- ตั้ง local notification ตามช่วงเวลาที่เลือก
- ประวัติแพ้ยาและโทรหาผู้ติดต่อฉุกเฉิน
- ผู้ดูแลระยะไกลแบบมี consent: เชิญด้วย username, ยอมรับ/ปฏิเสธ, ดูตู้ยาและประวัติย้อนหลัง, ส่งข้อความทั่วไปหรือข้อความเตือน, แจ้งเตือนผ่าน Realtime/Expo Push และเพิกถอนสิทธิ์ได้ทั้งสองฝ่าย
- ชุดภาพไอคอน YaCheck แบบ custom 16 ภาพแทนอิโมจิ ใช้ภาษาภาพและสีเดียวกับโลโก้หลักทั้ง iOS และ Android

## ก่อนนำขึ้น production

ต้อง deploy โฟลเดอร์ `../platform`, ให้เภสัชกรรับรองฐานข้อมูล interaction, จัดทำนโยบายความเป็นส่วนตัว/consent, เพิ่ม automated tests/monitoring และกำหนด EAS project/app signing ขององค์กร ดูรายการเต็มใน `PRODUCTION_CHECKLIST.md`
