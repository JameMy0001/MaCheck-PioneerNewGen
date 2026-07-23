// MaCheck — Firebase Firestore Client สำหรับโปรเจกต์ gen-lang-client-0740402744
// ใช้งานผ่าน Firestore REST API โดยตรง เพื่อรองรับ Vanilla JS แบบไม่ต้องลง Build Tool

const FirebaseDB = {
  projectId: 'gen-lang-client-0740402744',
  authDomain: 'gen-lang-client-0740402744.firebaseapp.com',
  storageBucket: 'gen-lang-client-0740402744.appspot.com',
  apiKey: '', // สามารถใส่ Web API Key จาก Firebase Console (ถ้ากำหนด Security Rules เพิ่มเติม)

  getBaseUrl() {
    return `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
  },

  // ดึงข้อมูลเอกสารทั้งหมดจาก Collection บน Firestore
  async getCollection(collectionName) {
    try {
      const url = `${this.getBaseUrl()}/${collectionName}${this.apiKey ? `?key=${this.apiKey}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[Firebase] ดึงข้อมูลจาก Collection ${collectionName} ไม่สำเร็จ (Status ${res.status})`);
        return [];
      }
      const json = await res.json();
      const docs = json.documents || [];
      return docs.map(doc => this._parseFirestoreFields(doc));
    } catch (e) {
      console.error(`[Firebase Error] ล้มเหลวในการดึงคลังข้อมูล ${collectionName}:`, e);
      return [];
    }
  },

  // บันทึก/อัปเดตเอกสารลง Firestore (Upsert)
  async setDocument(collectionName, docId, data) {
    try {
      const url = `${this.getBaseUrl()}/${collectionName}/${docId}${this.apiKey ? `?key=${this.apiKey}` : ''}`;
      const fields = this._encodeFirestoreFields(data);

      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });

      if (res.ok) {
        console.log(`[Firebase] ซิงค์เอกสาร ${collectionName}/${docId} ลง Firebase สำเร็จ!`);
        return true;
      } else {
        console.warn(`[Firebase Note] ซิงค์เอกสาร ${collectionName}/${docId} ตอบกลับสถานะ ${res.status}`);
        return false;
      }
    } catch (e) {
      console.error(`[Firebase Error] ไม่สามารถซิงค์เอกสารลง Firebase:`, e);
      return false;
    }
  },

  // ลบเอกสารจาก Firestore
  async deleteDocument(collectionName, docId) {
    try {
      const url = `${this.getBaseUrl()}/${collectionName}/${docId}${this.apiKey ? `?key=${this.apiKey}` : ''}`;
      const res = await fetch(url, { method: 'DELETE' });
      return res.ok;
    } catch (e) {
      console.error(`[Firebase Error] ลบเอกสารไม่สำเร็จ:`, e);
      return false;
    }
  },

  // Helper สำหรับแปลงรูปแบบฟิลด์ของ Firestore REST API เป็น JavaScript Object
  _parseFirestoreFields(doc) {
    const fields = doc.fields || {};
    const id = doc.name.split('/').pop();
    const result = { id };
    for (const [k, v] of Object.entries(fields)) {
      if ('stringValue' in v) result[k] = v.stringValue;
      else if ('integerValue' in v) result[k] = Number(v.integerValue);
      else if ('doubleValue' in v) result[k] = Number(v.doubleValue);
      else if ('booleanValue' in v) result[k] = v.booleanValue;
      else if ('arrayValue' in v) {
        result[k] = (v.arrayValue.values || []).map(item => item.stringValue || item.integerValue || item);
      }
    }
    return result;
  },

  // Helper สำหรับแปลง JavaScript Object เป็นฟิลด์ของ Firestore REST API
  _encodeFirestoreFields(obj) {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'string') fields[k] = { stringValue: v };
      else if (typeof v === 'number') fields[k] = { doubleValue: v };
      else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
      else if (Array.isArray(v)) {
        fields[k] = {
          arrayValue: {
            values: v.map(item => ({ stringValue: String(item) }))
          }
        };
      }
    }
    return fields;
  }
};

if (typeof window !== 'undefined') {
  window.FirebaseDB = FirebaseDB;
}
