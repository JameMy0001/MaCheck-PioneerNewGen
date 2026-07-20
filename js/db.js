// YaCheck — ระบบจัดการฐานข้อมูล IndexedDB แบบออฟไลน์ 100%
// เขียนด้วยภาษาจาวาสคริปต์ดิบ (Vanilla JS) แบบไม่มี dependencies

const DB = {
  dbName: 'yacheck_db',
  dbVersion: 1,
  db: null,

  // เริ่มต้นเปิดฐานข้อมูล
  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error('[DB] เกิดข้อผิดพลาดในการเปิด IndexedDB:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[DB] เปิดฐานข้อมูล IndexedDB สำเร็จ');
        
        // รันฟังก์ชันย้ายข้อมูลและใส่ข้อมูลเริ่มต้น (Seed Data)
        this.seedAndMigrate()
          .then(() => resolve(this.db))
          .catch(err => reject(err));
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('[DB] ตรวจพบการอัปเกรด Schema ฐานข้อมูล...');

        // สร้าง Object Stores
        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('medicines')) {
          db.createObjectStore('medicines', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('interactions')) {
          db.createObjectStore('interactions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('myMedicines')) {
          db.createObjectStore('myMedicines', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('allergyLog')) {
          db.createObjectStore('allergyLog', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('scanHistory')) {
          db.createObjectStore('scanHistory', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('todayLog')) {
          db.createObjectStore('todayLog', { keyPath: 'date' });
        }
      };
    });
  },

  // เขียนข้อมูลลง Object Store (Insert/Update)
  put(storeName, data) {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('ฐานข้อมูลยังไม่ได้เปิดใช้งาน'));
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // ดึงข้อมูลตาม Key
  get(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('ฐานข้อมูลยังไม่ได้เปิดใช้งาน'));
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // ดึงข้อมูลทั้งหมดใน Store
  getAll(storeName) {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('ฐานข้อมูลยังไม่ได้เปิดใช้งาน'));
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // ลบข้อมูลตาม Key
  delete(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('ฐานข้อมูลยังไม่ได้เปิดใช้งาน'));
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // ล้างข้อมูลทั้งหมดใน Store
  clear(storeName) {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('ฐานข้อมูลยังไม่ได้เปิดใช้งาน'));
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // ตรวจจับการย้ายคลังข้อมูลและโหลดข้อมูลเริ่มต้น (Seeding & Migration)
  async seedAndMigrate() {
    // 1. ตรวจสอบว่าต้องใส่ข้อมูลยาเริ่มต้นหรือไม่
    const medsCount = (await this.getAll('medicines')).length;
    if (medsCount === 0 && typeof MedicineDB !== 'undefined') {
      console.log('[DB] กำลังบันทึกข้อมูลยาสามัญเริ่มต้นลงฐานข้อมูล...');
      for (const med of MedicineDB.medicines) {
        await this.put('medicines', med);
      }
    }

    const intersCount = (await this.getAll('interactions')).length;
    if (intersCount === 0 && typeof MedicineDB !== 'undefined') {
      console.log('[DB] กำลังบันทึกกฎยาตีกันเริ่มต้นลงฐานข้อมูล...');
      for (const inter of MedicineDB.interactions) {
        const copy = { ...inter };
        copy.id = copy.id || `${copy.drug1}_${copy.drug2}`;
        await this.put('interactions', copy);
      }
    }

    // 2. ทำระบบย้ายข้อมูลดึงจาก LocalStorage (Migration Path)
    const oldStateStr = localStorage.getItem('yacheck_state');
    if (oldStateStr) {
      try {
        const parsed = JSON.parse(oldStateStr);
        if (parsed && !parsed.migratedToIdb) {
          console.log('[DB] ตรวจพบข้อมูลเดิมใน LocalStorage กำลังย้ายข้อมูลไป IndexedDB...');
          
          if (parsed.user) {
            await this.put('userProfile', { key: 'name', value: parsed.user.name || 'คุณ...' });
            await this.put('userProfile', { key: 'fontSize', value: parsed.user.fontSize || 'normal' });
            await this.put('userProfile', { key: 'weight', value: parsed.user.weight || '' });
            await this.put('userProfile', { key: 'height', value: parsed.user.height || '' });
          }
          if (parsed.currentRole) await this.put('userProfile', { key: 'currentRole', value: parsed.currentRole });
          if (parsed.currentUser) await this.put('userProfile', { key: 'currentUser', value: parsed.currentUser });
          if (parsed.emergencyContact) await this.put('userProfile', { key: 'emergencyContact', value: parsed.emergencyContact });
          if (parsed.lineToken) await this.put('userProfile', { key: 'lineToken', value: parsed.lineToken || '' });
          if (parsed.soundEnabled !== undefined) await this.put('userProfile', { key: 'soundEnabled', value: parsed.soundEnabled });
          if (parsed.accounts) await this.put('userProfile', { key: 'accounts', value: parsed.accounts });

          if (parsed.myMedicines && Array.isArray(parsed.myMedicines)) {
            for (const m of parsed.myMedicines) {
              await this.put('myMedicines', m);
            }
          }

          if (parsed.allergyLog && Array.isArray(parsed.allergyLog)) {
            for (const a of parsed.allergyLog) {
              await this.put('allergyLog', a);
            }
          }

          if (parsed.scanHistory && Array.isArray(parsed.scanHistory)) {
            for (const s of parsed.scanHistory) {
              await this.put('scanHistory', s);
            }
          }

          if (parsed.todayLog) {
            await this.put('todayLog', parsed.todayLog);
          }

          if (parsed.customMedicines && Array.isArray(parsed.customMedicines)) {
            for (const cm of parsed.customMedicines) {
              await this.put('medicines', cm);
            }
          }
          
          if (parsed.customInteractions && Array.isArray(parsed.customInteractions)) {
            for (const ci of parsed.customInteractions) {
              const copy = { ...ci };
              copy.id = copy.id || `${copy.drug1}_${copy.drug2}`;
              await this.put('interactions', copy);
            }
          }

          parsed.migratedToIdb = true;
          localStorage.setItem('yacheck_state', JSON.stringify(parsed));
          console.log('[DB] ย้ายข้อมูลจาก LocalStorage เข้าสู่ IndexedDB เสร็จสิ้น!');
        }
      } catch (e) {
        console.error('[DB] เกิดความล้มเหลวระหว่างดึงข้อมูลจาก LocalStorage:', e);
      }
    }
  },

  // ส่งออกข้อมูลทั้งหมดของฐานข้อมูลเป็นไฟล์ JSON (สำหรับ RAG AI & Sync Backup)
  async exportDatabaseJSON() {
    const backup = {
      version: this.dbVersion,
      exportedAt: new Date().toISOString(),
      userProfile: await this.getAll('userProfile'),
      myMedicines: await this.getAll('myMedicines'),
      allergyLog: await this.getAll('allergyLog'),
      scanHistory: await this.getAll('scanHistory'),
      todayLog: await this.getAll('todayLog'),
      customMedicines: (await this.getAll('medicines')).filter(m => {
        if (typeof MedicineDB === 'undefined') return true;
        return !MedicineDB.medicines.some(x => x.id === m.id);
      }),
      customInteractions: (await this.getAll('interactions')).filter(i => {
        if (typeof MedicineDB === 'undefined') return true;
        return !MedicineDB.interactions.some(x => 
          (x.drug1 === i.drug1 && x.drug2 === i.drug2) || 
          (x.drug1 === i.drug2 && x.drug2 === i.drug1)
        );
      })
    };
    return JSON.stringify(backup, null, 2);
  },

  // นำเข้าข้อมูลฐานข้อมูลจาก JSON (Restore / Sync)
  async importDatabaseJSON(jsonStr) {
    try {
      const backup = JSON.parse(jsonStr);
      if (!backup) throw new Error('ไฟล์ข้อมูลไม่ถูกต้อง');

      if (backup.userProfile && Array.isArray(backup.userProfile)) {
        for (const up of backup.userProfile) {
          await this.put('userProfile', up);
        }
      }

      if (backup.myMedicines && Array.isArray(backup.myMedicines)) {
        await this.clear('myMedicines');
        for (const m of backup.myMedicines) {
          await this.put('myMedicines', m);
        }
      }

      if (backup.allergyLog && Array.isArray(backup.allergyLog)) {
        await this.clear('allergyLog');
        for (const a of backup.allergyLog) {
          await this.put('allergyLog', a);
        }
      }

      if (backup.scanHistory && Array.isArray(backup.scanHistory)) {
        await this.clear('scanHistory');
        for (const s of backup.scanHistory) {
          await this.put('scanHistory', s);
        }
      }

      if (backup.todayLog && Array.isArray(backup.todayLog)) {
        await this.clear('todayLog');
        for (const tl of backup.todayLog) {
          await this.put('todayLog', tl);
        }
      }

      if (backup.customMedicines && Array.isArray(backup.customMedicines)) {
        for (const cm of backup.customMedicines) {
          await this.put('medicines', cm);
        }
      }

      if (backup.customInteractions && Array.isArray(backup.customInteractions)) {
        for (const ci of backup.customInteractions) {
          const copy = { ...ci };
          copy.id = copy.id || `${copy.drug1}_${copy.drug2}`;
          await this.put('interactions', copy);
        }
      }

      console.log('[DB] นำเข้าฐานข้อมูลจากข้อมูลสำรอง JSON สำเร็จ');
      return true;
    } catch (e) {
      console.error('[DB] เกิดข้อผิดพลาดในการโหลดข้อมูลนำเข้า:', e);
      throw e;
    }
  }
};
