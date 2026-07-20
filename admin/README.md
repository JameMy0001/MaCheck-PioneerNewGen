# YaCheck / MaCheck Clinical Admin

เว็บหลังบ้านสำหรับดูแลฐานข้อมูลทางคลินิกกลางที่ YaCheck และ MaCheck ใช้ร่วมกัน โดยล็อกอินด้วย username และรหัสผ่านเดียวกับแอป แต่จะเข้าได้เฉพาะบัญชีที่มีสิทธิ์ Admin เท่านั้น

## ความสามารถหลัก

- Dashboard แสดงจำนวนข้อมูลยา ยาตีกัน อาหาร–ยา งานรอตรวจ และตัวชี้วัดคุณภาพข้อมูล
- เพิ่ม แก้ไข ค้นหา กรอง และจัดสถานะข้อมูลยา คู่ยาตีกัน และอาหาร/สมุนไพร
- Workflow `Draft → In review → Published → Archived`
- เลือกหลายรายการแล้วส่งตรวจหรือเผยแพร่พร้อมกันได้ โดยรายการยาจะเปิดให้ทั้งสองแอปค้นหาในธุรกรรมเดียว
- บังคับให้ข้อมูลที่จะ Published มีแหล่งอ้างอิงอย่างน้อย 1 รายการที่ระดับฐานข้อมูล
- แยกสิทธิ์ Owner, Clinical editor, Clinical reviewer และ Auditor
- ดูบัญชีเป็นข้อมูลสรุปเฉพาะ username โดยไม่แสดงยา โรค หรือประวัติสุขภาพรายบุคคล
- Audit log เก็บข้อมูลก่อน/หลังการแก้ไข ผู้แก้ไข และเวลาโดยอัตโนมัติ
- Responsive ใช้ได้ทั้งคอมพิวเตอร์ แท็บเล็ต และมือถือ

## สิทธิ์ของแต่ละบทบาท

| บทบาท | ทำอะไรได้ |
| --- | --- |
| Owner | ทุกอย่าง รวมถึงลบข้อมูลและจัดการทีม Admin |
| Clinical editor | สร้าง Draft แก้ Draft/In review และส่งให้ตรวจ |
| Clinical reviewer | ตรวจทาน แก้ไข และ Published/Archived |
| Auditor | อ่านข้อมูล Dashboard และ Audit log เท่านั้น |

ระบบป้องกันการลดสิทธิ์หรือปิด Owner คนสุดท้าย เพื่อไม่ให้ทีมล็อกตัวเองออกจากระบบ

## เปิดใช้งานในเครื่อง

1. ติดตั้ง dependency ด้วย `npm install`
2. คัดลอก `.env.example` เป็น `.env`
3. ใส่ `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY`
4. รัน `npm run dev`

ไฟล์ `.env` ถูก ignore และห้ามนำ service-role key มาใส่ในเว็บ Admin

## ตรวจสอบก่อนปล่อย

```bash
npm run typecheck
npm run build
npm run preview
```

ผล build อยู่ในโฟลเดอร์ `dist/` และ `vercel.json` เตรียม SPA rewrite ไว้แล้วสำหรับ Vercel

## เปิดสิทธิ์ Owner คนแรก

ต้องเป็น username ที่สมัคร YaCheck หรือ MaCheck แล้ว และควรรันจาก Supabase SQL Editor/Management API เท่านั้น:

```sql
select private.bootstrap_admin('username_ที่ต้องการ');
```

หลังมี Owner คนแรกแล้ว การเพิ่มหรือเปลี่ยนสิทธิ์คนอื่นทำได้จากหน้า “ทีมแอดมิน” ไม่ต้องรัน SQL อีก

## หลักความปลอดภัย

- เว็บใช้ publishable/anon key เท่านั้น; ความปลอดภัยจริงบังคับด้วย Supabase RLS
- ผู้ใช้ทั่วไปอ่านได้เฉพาะ Clinical record ที่เป็น Published
- Editor ไม่สามารถ Published, Archived หรือลบข้อมูล
- เฉพาะ Owner จัดการสิทธิ์ Admin ได้
- หน้า Accounts ไม่อ่านข้อมูลสุขภาพรายบุคคล
- ทุกการเปลี่ยน Clinical record ถูกบันทึกใน `clinical_change_log`
- การเผยแพร่หลายรายการจำกัดครั้งละ 500 รายการ ตรวจสิทธิ์ แหล่งอ้างอิง ความครบถ้วน และความพร้อมของยาที่คู่ยาตีกันอ้างถึงก่อน Commit
- ห้ามใส่ข้อมูลระบุตัวผู้ป่วยลงในช่องอ้างอิงหรือหมายเหตุการตรวจทาน

## ไฟล์สำคัญ

- `src/pages/Overview.tsx` — Dashboard
- `src/pages/Medications.tsx` — รายการยา
- `src/pages/Interactions.tsx` — คู่ยาตีกัน
- `src/pages/FoodInteractions.tsx` — อาหาร/สมุนไพรกับยา
- `src/pages/Admins.tsx` — จัดการทีมและสิทธิ์
- `src/pages/Audit.tsx` — ประวัติการแก้ไข
- `../platform/supabase/migrations/202607180001_admin_console.sql` — schema, RLS และ workflow
- `../platform/supabase/migrations/202607180002_admin_quality_and_audit.sql` — data-quality gate และ Audit RPC
