# YaCheck Production Checklist

## สถานะปัจจุบัน

แอปเป็น native local-first MVP ที่เชื่อม Supabase กลางแล้ว: username auth, recovery code, SecureStore session, RLS, shared medication cabinet, dose events, กล้อง/สแกน barcode, local notifications, adherence, interaction, food clash, allergy, emergency contact, ผู้ดูแลระยะไกลแบบมี consent และ accessibility settings ทำงานในโค้ดแล้ว

คำว่า “ทำงานแล้ว” ไม่เท่ากับ “พร้อมเปิดบริการทางการแพทย์” รายการด้านล่างเป็น release gate ไม่ใช่ nice-to-have

## P0 — ต้องเสร็จก่อน pilot กับผู้ใช้จริง

- [x] เชื่อม Supabase Auth ผ่าน username gateway และเก็บ session token ใน SecureStore
- [x] สร้าง Edge Functions สำหรับ auth และไม่ใช้ service-role key ใน mobile bundle
- [x] ออกแบบตาราง profile, caregiver links, cabinet, dose events, activity logs และ clinical catalogue พร้อม RLS
- [x] ตัดชื่อจริง เบอร์โทร อีเมลจริง และวันเกิดออกจากข้อมูลสมัครสมาชิกและ cloud profile
- [x] เพิ่ม authenticated account-deletion endpoint ที่ลบ auth user และข้อมูลลูกด้วย foreign-key cascade
- [x] ให้ YaCheck และ MaCheck ดึง clinical catalogue จาก Supabase กลาง โดยมี bundled fallback เมื่อออฟไลน์
- [x] ตัด scanner/alert/time demo ของ MaCheck และป้องกันยาที่ผู้ใช้เพิ่มเองถูกจัดว่า “ปลอดภัย” โดยอัตโนมัติ
- [x] ย้าย session และ health cache ฝั่ง native ไป SecureStore แบบแบ่ง chunk พร้อม migration จาก AsyncStorage เดิม
- [x] Deploy migrations/functions ไปยัง Supabase Free project และผ่าน remote live test สำหรับ auth, recovery, account deletion, clinical catalogue, RLS isolation, profile, cabinet และ dose events
- [x] เพิ่มคำเชิญผู้ดูแลที่หมดอายุใน 7 วัน ต้องยอมรับก่อนอ่านข้อมูล และให้ทั้งสองฝ่ายเพิกถอนสิทธิ์ได้
- [x] รองรับข้อความทั่วไปจากผู้ดูแล พร้อมตรวจสิทธิ์ จำกัดความยาว/อัตราส่ง และบล็อกคำสั่งเพิ่ม หยุด เปลี่ยน หรือระบุขนาดยาที่ server
- [x] เพิ่มกล่องข้อความ กระดิ่งพร้อมจำนวนที่ยังไม่ได้อ่าน Realtime และ Expo Push ผ่าน Supabase Edge Function
- [x] ผ่าน remote live test ว่าก่อนยอมรับอ่านไม่ได้ หลังยอมรับอ่านได้ และหลังเพิกถอนอ่านไม่ได้อีก
- [ ] ทดสอบ sync จริงข้ามอุปกรณ์ iOS/Android สองเครื่อง
- [ ] ทำ consent, privacy notice, retention/deletion flow และ data export ให้สอดคล้อง PDPA
- [ ] ให้เภสัชกรตรวจฐานยา interaction, allergy และ food clash ทุก record พร้อม source, reviewer, reviewed_at และ dataset version
- [ ] กำหนดข้อความเตือนและเส้นทางฉุกเฉินร่วมกับบุคลากรทางการแพทย์
- [ ] เพิ่ม crash reporting, structured logs, uptime monitor และ incident response owner
- [ ] ทดสอบกล้อง notification deep link และ background behavior บนอุปกรณ์ iOS/Android จริง

## P1 — ก่อน public release

- [ ] Unit tests สำหรับ safety engine, date rollover, adherence และ persisted-state migration
- [ ] Integration tests สำหรับ auth/sync/conflict resolution/offline queue
- [ ] E2E tests สำหรับ onboarding, เพิ่มยา, แจ้งเตือน, หยุดยา, caregiver revoke และลบบัญชี
- [ ] เพิ่ม schema validation ที่ขอบเขต API และ migration strategy สำหรับ local/remote data
- [ ] ตรวจ accessibility ด้วย screen reader, Dynamic Type, contrast, target size และภาษาไทยขนาดใหญ่
- [ ] จัดทำ icon/splash/Store screenshots, privacy labels และ support URL
- [ ] ตั้ง EAS project ขององค์กร, signing credentials, development/preview/production profiles และ release channels
- [ ] ตัดสินใจ source of truth ของ MaCheck iOS ระหว่าง native project กับ CNG/prebuild และบังคับ config-drift check ใน CI
- [ ] ทำ CI ให้บังคับ `typecheck`, `lint`, tests, Expo Doctor และ production bundle ทุก pull request
- [ ] แก้หรือรับความเสี่ยง dependency advisory ที่ยังเป็น transitive dependency ของ Expo toolchain พร้อมบันทึกเหตุผล
- [ ] archive/เขียนใหม่เอกสารต้นแบบใน MaCheck `presentation-materials/` และ `.agents/skills/` ที่ยังกล่าวถึง Gemini, LAN backend และ demo flow เพื่อไม่ให้ปะปนกับเอกสาร production

## P2 — ประสิทธิภาพและการขยายระบบ

- [ ] ใช้ incremental sync และ idempotency keys แทนการเขียนรายการทั้งหมดซ้ำ
- [ ] รองรับ conflict resolution ระหว่างผู้ป่วย/ผู้ดูแลหลายเครื่อง
- [ ] เพิ่ม barcode mapping จากฐานทะเบียนยาที่มีสิทธิ์ใช้งานและมีรอบอัปเดต
- [ ] แยก clinical dataset ออกจาก app bundle เพื่ออัปเดตแบบ signed/versioned
- [ ] ทำ analytics แบบไม่เก็บข้อมูลสุขภาพเกินจำเป็น พร้อม opt-out
- [ ] วัด startup time, screen render, memory, bundle size และ notification delivery reliability

## เกณฑ์ Go/No-Go

อนุญาตให้ pilot เมื่อ P0 ครบ มีผลทดสอบบนเครื่องจริง และ clinical reviewer ลงนามชุดข้อมูลเวอร์ชันที่จะใช้ อนุญาตให้ public release เมื่อ P1 ครบและมี rollback/incident plan ที่ทดลองแล้ว
