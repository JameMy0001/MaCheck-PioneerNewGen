# วิธีติดตั้งและอัปเดต YaCheck ผ่าน Xcode

## โหมดที่ควรใช้ตามปกติ: `YaCheck`

โหมดนี้รวม JavaScript และไฟล์ที่แอปต้องใช้ไว้ในตัวแอปแล้ว จึงเปิด YaCheck บน iPhone/iPad ได้โดยไม่ต้องเปิด Metro และไม่ต้องให้ Mac ออนไลน์หรือเปิดค้างไว้

1. เสียบ iPhone หรือ iPad เข้ากับ Mac และปลดล็อกหน้าจอ
2. เปิดไฟล์ `ios/YaCheck.xcworkspace` ด้วย Xcode
3. ที่แถบด้านบน เลือก Scheme ชื่อ `YaCheck`
4. เลือก iPhone/iPad ของคุณเป็นอุปกรณ์ปลายทาง
5. กดปุ่ม Run รูปสามเหลี่ยม หรือกด `Command + R`
6. รอจน Xcode แสดง `Build Succeeded` และเปิดแอปบนอุปกรณ์

หลังแก้โค้ด ให้ทำขั้นตอนเดิมและกด Run อีกครั้ง Xcode จะ build และติดตั้งเวอร์ชันใหม่ทับแอปเดิม โดยข้อมูลภายในแอปจะไม่ถูกลบตามปกติ

> ต้องเปิดไฟล์ `.xcworkspace` ไม่ใช่ `.xcodeproj` เพราะ YaCheck ใช้ CocoaPods

## Scheme ที่มีในโปรเจกต์

- `YaCheck` — ใช้ติดตั้งจริงด้วย Apple Personal Team เปิดแอปได้โดยไม่พึ่ง Metro
- `YaCheck Dev` — ใช้พัฒนาแบบเร็ว ต้องเปิด Metro บน Mac
- `YaCheck Production` — สำหรับบัญชี Apple Developer แบบเสียเงินในอนาคต และความสามารถที่ต้องใช้ entitlement เช่น remote push notification

## ข้อจำกัดที่ควรรู้

- ตัวแอปเปิดได้โดยไม่ต้องต่อ Mac แต่ฟังก์ชันที่อ่านหรือบันทึกข้อมูลบน Supabase ยังต้องใช้อินเทอร์เน็ต
- แอปที่เซ็นด้วย Apple Personal Team มีวันหมดอายุตาม provisioning profile ของ Apple เมื่อหมดอายุให้เสียบสายแล้วกด Run ใหม่
- Apple Personal Team ไม่รองรับ remote push notification บน iOS การแจ้งเตือนกินยาที่ตั้งไว้ในเครื่องยังใช้ local notification ได้
- ถ้า Xcode แจ้งเรื่อง Signing ให้เปิด Target `YaCheck` > `Signing & Capabilities` แล้วตรวจว่า Team เป็นบัญชีของคุณและเปิด `Automatically manage signing`

## ถ้า Build มีปัญหา

1. ตรวจว่าเลือก Scheme `YaCheck` และเลือกอุปกรณ์จริงถูกเครื่อง
2. เลือกเมนู `Product > Clean Build Folder`
3. ปิด Xcode แล้วเปิด `ios/YaCheck.xcworkspace` ใหม่
4. กด Run อีกครั้ง

