# YaCheck Project

Repository นี้มีสองส่วน:

- เว็บต้นแบบเดิมอยู่ที่ root (`index.html`, `css/`, `js/`) เก็บไว้เป็นเอกสารอ้างอิงและเปรียบเทียบ feature
- แอป Expo/React Native อยู่ที่ [`mobile/`](./mobile) และเป็นฐานพัฒนาหลักต่อจากนี้

## เปิดแอป

```bash
cd mobile
npm install
npm run typecheck
npm run lint
npm start
```

ใช้ Expo Go บนอุปกรณ์จริงเพื่อทดสอบกล้องและ local notifications ดูรายละเอียดใน [`mobile/README.md`](./mobile/README.md)

## สถานะ

Native local-first MVP ทำงานแล้วและ build bundle สำหรับ Android/iOS ได้ แต่ยังไม่ควรเผยแพร่เป็นผลิตภัณฑ์ทางการแพทย์ก่อนปิดรายการใน [`mobile/PRODUCTION_CHECKLIST.md`](./mobile/PRODUCTION_CHECKLIST.md)

