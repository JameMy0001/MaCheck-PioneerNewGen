// Supabase Service for YaCheck Web App
// อัปเดตและจำลองการซิงค์ข้อมูลกับ Supabase คู่อริจินัลของแอปหลัก

const SupabaseService = {
  url: 'https://witsidzbewjkcnvnnapi.supabase.co',
  anonKey: 'sb_publishable_O3UAXFloKSQX6oeGFDfM_A_Qgo7zmjR',
  client: null,

  // เริ่มต้นตั้งค่าไคลเอนต์ Supabase
  init() {
    if (typeof supabase !== 'undefined') {
      this.client = supabase.createClient(this.url, this.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      });
      console.log('[Supabase] เริ่มต้นบริการ Supabase client สำเร็จ');
    } else {
      console.warn('[Supabase] ไม่พบตัวแปรไลบรารี supabase.js CDN ในหน้าเว็บ');
    }
  },

  // ดึงเซสชันการเข้าสู่ระบบ
  async getSession() {
    if (!this.client) return null;
    const { data } = await this.client.auth.getSession();
    return data.session;
  },

  // ฟังก์ชันยิงข้าม Gateway Edge Functions
  async callGateway(functionName, payload) {
    const response = await fetch(`${this.url}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'apikey': this.anonKey, 
        'Authorization': `Bearer ${this.anonKey}` 
      },
      body: JSON.stringify(payload),
    });
    
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || 'เชื่อมต่อระบบบัญชีไม่สำเร็จ');
    }
    
    // บันทึก Session เข้า Supabase Client ในเครื่อง
    const { error } = await this.client.auth.setSession({ 
      access_token: body.access_token, 
      refresh_token: body.refresh_token 
    });
    if (error) throw error;
    
    return body;
  },

  // สมัครสมาชิก
  async register(username, password) {
    return this.callGateway('register-username', { username, password });
  },

  // เข้าสู่ระบบ
  async login(username, password) {
    return this.callGateway('login-username', { username, password });
  },

  // ออกจากระบบ
  async logout() {
    if (!this.client) return;
    await this.client.auth.signOut();
  },

  // ลบบัญชี
  async deleteAccount() {
    if (!this.client) return;
    const { error } = await this.client.functions.invoke('delete-account', { body: {} });
    if (error) throw error;
    await this.client.auth.signOut();
  },

  // ดึงข้อมูล Snapshot ทั้งหมดจาก Supabase
  async pullYaCheckSnapshot() {
    if (!this.client) return null;
    const session = await this.getSession();
    if (!session) return null;

    const [profileResult, medicinesResult, dosesResult] = await Promise.all([
      this.client.from('app_profiles').select('role,diseases,allergies,font_scale,sound_enabled').single(),
      this.client.from('patient_medications').select('*'),
      this.client.from('dose_events').select('client_event_id,taken,event_date,patient_medication_client_id,slot'),
    ]);

    if (medicinesResult.error) throw medicinesResult.error;
    if (dosesResult.error) throw dosesResult.error;

    // เติมข้อมูลคลังยา (Cabinet)
    const cabinet = medicinesResult.data
      .filter(item => !item.deleted_at)
      .map(item => {
        let dosageMg = 0;
        if (item.dosage) {
          const match = item.dosage.match(/(\d+)/);
          if (match) dosageMg = parseInt(match[1]);
        }
        return {
          id: item.client_id,
          medicineId: item.medication_code || '',
          customName: item.custom_name || undefined,
          dosageMg: dosageMg,
          timeSlots: item.schedule || [], // แปลง schedules เป็น timeSlots ของฝั่งเว็ป
          mealTiming: item.meal_timing || 'any',
          status: item.status || 'active',
          createdAt: item.created_at,
          type: 'regular' // บังคับเป็นยาประจำตามแอปหลัก
        };
      });

    // เติมประวัติกินยา (Today Logs)
    const taken = {};
    const todayStr = new Date().toISOString().split('T')[0];
    if (dosesResult.data) {
      dosesResult.data.forEach(item => {
        // สนใจเฉพาะประวัติของวันปัจจุบันในแถบวันนี้
        if (item.taken && item.event_date === todayStr) {
          const logKey = `${item.patient_medication_client_id}_slot_${item.slot}`;
          taken[logKey] = Date.now(); // บันทึกเวลากินยาจำลอง
        }
      });
    }

    const profile = profileResult.data || {};
    const allergiesList = (profile.allergies || []).map(a => {
      return typeof a === 'string' ? a : (a.name || '');
    });

    return {
      user: {
        name: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'คุณผู้ใช้',
        diseases: profile.diseases || [],
        allergies: allergiesList,
        fontSize: profile.font_scale === 'large' ? 'large' : (profile.font_scale === 'xlarge' ? 'xlarge' : 'normal')
      },
      myMedicines: cabinet,
      todayLog: {
        date: todayStr,
        taken: taken
      },
      currentRole: profile.role || 'patient',
      soundEnabled: profile.sound_enabled !== undefined ? profile.sound_enabled : true,
    };
  },

  // อัปโหลด Snapshot ทั้งหมดขึ้น Supabase (Sync)
  async pushYaCheckSnapshot() {
    if (!this.client) return;
    const session = await this.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const state = App.getState();
    const todayStr = state.todayLog?.date || new Date().toISOString().split('T')[0];

    // 1. อัปเดต app_profiles
    const { error: profileError } = await this.client.from('app_profiles').upsert({
      user_id: userId,
      role: state.currentRole || 'patient',
      diseases: state.user.diseases || [],
      allergies: (state.user.allergies || []).map(name => ({ name, severity: 'moderate' })),
      font_scale: state.user.fontSize || 'normal',
      sound_enabled: state.soundEnabled !== undefined ? state.soundEnabled : true,
      source_app: 'yacheck_web',
    });
    if (profileError) throw profileError;

    // 2. อัปเดตรายการยาในตู้ (patient_medications)
    if (state.myMedicines && state.myMedicines.length) {
      const { error: medError } = await this.client.from('patient_medications').upsert(
        state.myMedicines.map(med => ({
          user_id: userId,
          client_id: med.id,
          medication_code: med.medicineId || null,
          custom_name: med.customName || null,
          dosage: `${med.dosageMg || 0} mg`,
          schedule: med.timeSlots || [],
          meal_timing: med.mealTiming || 'any',
          status: med.status || 'active',
          source_app: 'yacheck_web',
          deleted_at: null,
        })),
        { onConflict: 'user_id,client_id' }
      );
      if (medError) throw medError;
    }

    // 3. อัปเดตประวัติการกินยา (dose_events)
    const takenObj = state.todayLog?.taken || {};
    const doseEvents = Object.entries(takenObj).map(([key, timestamp]) => {
      // คีย์ในเครื่องเช่น "metformin_slot_morning"
      const match = key.match(/(.+)_slot_(.+)/);
      if (!match) return null;
      const medicineId = match[1];
      const slot = match[2];
      return {
        user_id: userId,
        client_event_id: `${todayStr}:${medicineId}:${slot}`,
        patient_medication_client_id: medicineId,
        slot: slot,
        event_date: todayStr,
        taken: !!timestamp,
        source_app: 'yacheck_web',
      };
    }).filter(Boolean);

    if (doseEvents.length) {
      const { error: doseError } = await this.client.from('dose_events').upsert(
        doseEvents,
        { onConflict: 'user_id,client_event_id' }
      );
      if (doseError) throw doseError;
    }
    console.log('[Supabase] ผลักข้อมูลขึ้นเซิร์ฟเวอร์เสร็จสิ้น');
  },

  // ลบยาจากระยะไกล
  async deleteRemoteMedication(clientId) {
    if (!this.client) return;
    const session = await this.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const { error } = await this.client.from('patient_medications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('client_id', clientId);
    if (error) throw error;
    console.log('[Supabase] ลบยาจากระบบหลังบ้านสำเร็จ:', clientId);
  }
};
