// YaCheck — ระบบผู้ช่วย AI อัจฉริยะ (Care Agent Web Prototype)
// พัฒนาด้วยจาวาสคริปต์ดิบ (Vanilla JS) สำหรับทดสอบระบบจำลองภายในเบราว์เซอร์

const Agent = {
  // สถานะเริ่มต้นของโมดูล
  state: {
    runStatus: 'idle', // 'idle' | 'loading_snapshot' | 'running_rules' | 'calling_llm' | 'validating_evidence' | 'completed' | 'failed'
    currentStepIndex: 0,
    outageMode: false, // โหมดจำลองระบบล้มเหลว
    systemPrompt: `คุณคือผู้ช่วย AI ดูแลสุขภาพ (YaCheck Care Agent) หน้าที่หลักคือสรุปประวัติสุขภาพ ยาในตู้ ตารางการทานยา และวิเคราะห์ความสม่ำเสมอในการทานยา (Adherence)
หลักการสำคัญ:
1. ให้ข้อมูลตามจริงจาก Snapshot ข้อมูลคนไข้เท่านั้น ห้ามแต่งข้อมูลขึ้นมาเอง (No Hallucination)
2. หากพบความเสี่ยงหรือข้อมูลไม่ครบถ้วน ให้เตือนและแนะนำให้ปรึกษาแพทย์หรือเภสัชกร
3. ห้ามสั่งเพิ่ม ลด หรือหยุดยาด้วยตัวเองโดยเด็ดขาด`,
    selectedModel: 'meta/llama-3.1-70b-instruct',
    nvidiaApiKey: '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',
    temperature: 0.2,
    messages: [
      { sender: 'agent', text: 'สวัสดีครับ ผมคือผู้ช่วย AI เช็คสุขภาพและยา (YaCheck Care Agent) ยินดีต้อนรับเข้าสู่ระบบทดลองเล่นครับ คุณสามารถกดเริ่มวิเคราะห์ประวัติสุขภาพ หรือพิมพ์คุยสอบถามข้อมูลเกี่ยวกับยาและร่างกายของคุณได้จากกล่องข้อความด้านล่างครับ' }
    ],
    lastRunSnapshot: null,
    lastRunSummary: null,
    previousSummary: null,
    showEvidenceId: null, // โชว์ Evidence รายแถว
    reviewRequested: false, // สถานะส่งคำขอคำแนะนำแพทย์
    showConfirmModal: false // โชว์ Modal ยืนยันการขอรีวิว
  },

  // ดึงประวัติต่างๆ จากแอปหลัก
  buildSnapshot() {
    const appState = App.getState();
    
    // คัดลอกรายการยาและโรค
    const user = {
      name: appState.user.name || 'คุณผู้ไข้',
      role: appState.currentRole || 'patient',
      diseases: appState.user.diseases || [],
      allergies: appState.allergyLog || [],
      weight: appState.user.weight || '',
      height: appState.user.height || ''
    };

    const medicines = appState.myMedicines || [];
    const todayLog = appState.todayLog || { date: '', taken: {} };

    return {
      version: Date.now(),
      asOf: new Date().toISOString(),
      user,
      medicines,
      todayLog
    };
  },

  // คำนวณ Adherence ประจำวัน
  calculateAdherence(snapshot) {
    const medicines = snapshot.medicines;
    const taken = snapshot.todayLog.taken;

    // ยาที่กินประจำ (type === 'regular')
    const activeRegularMeds = medicines.filter(m => m.type === 'regular');
    
    let expectedCount = 0;
    let takenCount = 0;

    activeRegularMeds.forEach(med => {
      const slots = med.timeSlots || [];
      expectedCount += slots.length;
      slots.forEach(slot => {
        const logKey = `${med.id}_${slot}`;
        if (taken[logKey]) {
          takenCount++;
        }
      });
    });

    const rate = expectedCount > 0 ? Math.round((takenCount / expectedCount) * 100) : 100;
    return { rate, expectedCount, takenCount };
  },

  // เช็คยาตีกันตาม MedicineDB ของแอป
  checkDrugInteractions(snapshot) {
    const medicines = snapshot.medicines;
    const conflicts = [];

    // วนลูปจับคู่ยาเช็คกับ MedicineDB.interactions
    for (let i = 0; i < medicines.length; i++) {
      for (let j = i + 1; j < medicines.length; j++) {
        const med1 = medicines[i].medicineId;
        const med2 = medicines[j].medicineId;

        const conflict = MedicineDB.interactions.find(inter => 
          (inter.drug1 === med1 && inter.drug2 === med2) ||
          (inter.drug1 === med2 && inter.drug2 === med1)
        );

        if (conflict) {
          const advice = conflict.severity === 'severe'
            ? 'อย่าปรับหรือหยุดยาที่ใช้อยู่เอง ให้ติดต่อแพทย์หรือเภสัชกรทันที'
            : 'อย่ารับประทานยาคู่นี้ร่วมกันจนกว่าจะได้รับคำแนะนำจากแพทย์หรือเภสัชกร';
          conflicts.push({
            med1Name: MedicineDB.medicines.find(m => m.id === med1)?.nameTh || med1,
            med2Name: MedicineDB.medicines.find(m => m.id === med2)?.nameTh || med2,
            severity: conflict.severity,
            advice: [advice]
          });
        }
      }
    }

    return conflicts;
  },

  // เช็คยาที่คนไข้แพ้
  checkAllergyConflicts(snapshot) {
    const medicines = snapshot.medicines;
    const allergies = snapshot.user.allergies; // รายการแพ้ยาในประวัติ
    const conflicts = [];

    medicines.forEach(med => {
      const dbMed = MedicineDB.medicines.find(m => m.id === med.medicineId);
      const nameTh = dbMed?.nameTh || '';
      const nameEn = dbMed?.nameEn || '';

      allergies.forEach(allergy => {
        const allergen = allergy.medicineName.toLowerCase();
        if (
          (nameTh && nameTh.toLowerCase().includes(allergen)) ||
          (nameEn && nameEn.toLowerCase().includes(allergen)) ||
          med.medicineId.toLowerCase().includes(allergen)
        ) {
          conflicts.push({
            medicineName: dbMed?.nameTh || med.medicineId,
            allergySeverity: allergy.severity,
            symptoms: allergy.symptoms || 'ไม่ระบุอาการ'
          });
        }
      });
    });

    return conflicts;
  },



  // ฟังก์ชันส่วนกลางสำหรับเรียกใช้ LLM ผ่าน Vercel Serverless Proxy (และ Fallback Direct call)
  async fetchLLM(payload) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: payload.model,
        messages: payload.messages,
        temperature: payload.temperature,
        max_tokens: payload.max_tokens,
        apiKey: this.state.nvidiaApiKey
      })
    });
    if (!response.ok) {
      throw new Error('Proxy returned status ' + response.status);
    }
    return await response.json();
  },

  // เริ่มรันวิเคราะห์ AI (State Machine Animation)
  startRun() {
    if (this.state.runStatus === 'loading_snapshot' || this.state.runStatus === 'running_rules' || this.state.runStatus === 'calling_llm' || this.state.runStatus === 'validating_evidence') return;

    this.state.runStatus = 'loading_snapshot';
    this.state.currentStepIndex = 1;
    this.render();

    // ขั้นที่ 1: โหลด Snapshot (จำลองดีเลย์ 700ms)
    setTimeout(() => {
      const snapshot = this.buildSnapshot();
      this.state.lastRunSnapshot = snapshot;
      this.state.runStatus = 'running_rules';
      this.state.currentStepIndex = 2;
      this.render();

      // ขั้นที่ 2: รัน Clinical Rules (ดีเลย์ 900ms)
      setTimeout(() => {
        const adherence = this.calculateAdherence(snapshot);
        const interactions = this.checkDrugInteractions(snapshot);
        const allergies = this.checkAllergyConflicts(snapshot);

        this.state.runStatus = 'calling_llm';
        this.state.currentStepIndex = 3;
        this.render();

        // ขั้นที่ 3: เรียกโมเดล LLM หรือ Fail
        setTimeout(async () => {
          if (this.state.outageMode) {
            // โหมด LLM ล้มเหลว -> ตกไปที่ Fallback Mode
            this.state.runStatus = 'failed';
            const summary = this.generateFallbackSummary(snapshot, adherence, interactions, allergies);
            summary.llmPersonalizedAdvice = '⚠️ [โหมดความปลอดภัยแบบจำกัด] แสดงข้อมูลการวิเคราะห์เฉพาะแบบออฟไลน์เนื่องจากเซิร์ฟเวอร์ AI ขัดข้อง';
            this.state.lastRunSummary = summary;
            Utils.showToast('LLM ขัดข้อง! ระบบสลับไปใช้โหมดประเมินผลความปลอดภัยแบบดั้งเดิม', 'error', 3000);
            this.render();
            return;
          }

          let personalizedAdvice = '';
          try {
            const contextPrompt = `คุณคือผู้ช่วย AI ดูแลสุขภาพ (YaCheck Care Agent)
ข้อมูลคนไข้ปัจจุบัน:
- ชื่อคนไข้: ${snapshot.user.name}
- ยาในตู้ยา: ${snapshot.medicines.map(m => `- ${m.customName || m.medicineId} (${m.dosageMg}mg) [${m.status === 'stopped' ? 'หยุดใช้' : 'กำลังใช้'}]`).join('\n')}
- โรคประจำตัว: ${snapshot.user.diseases.join(', ') || 'ไม่มีข้อมูล'}
- ประวัติแพ้ยา: ${snapshot.user.allergies.map(a => `${a.medicineName} (ระดับความรุนแรง: ${a.severity})`).join(', ') || 'ไม่มีข้อมูล'}
- ความสม่ำเสมอในการกินยา (Adherence) วันนี้: ${adherence.rate}%
- ข้อมูลยาตีกัน (Drug Interactions) ในระบบ: ${interactions.length > 0 ? interactions.map(i => `${i.med1Name} กับ ${i.med2Name} (${i.severity})`).join(', ') : 'ไม่พบความเสี่ยง'}

คำสั่งควบคุม AI:
กรุณาเขียนบทวิเคราะห์สุขภาพและความปลอดภัยของการใช้ยาโดยสรุปแบบส่วนบุคคลของคนไข้คนนี้ ความยาว 2-3 ประโยคสั้นๆ เน้นความอบอุ่น เป็นกันเอง ปลอดภัย และชี้ให้เห็นจุดเสี่ยงสำคัญ (เช่น การลืมทานยา หรือยาตีกันถ้ามี) ตอบเป็นภาษาไทยอย่างสุภาพ ห้ามแนะนำให้เริ่มทานยาตัวใหม่ที่ไม่เกี่ยวข้องด้วยตนเอง`;

            const resJson = await this.fetchLLM({
              model: this.state.selectedModel,
              messages: [{ role: 'user', content: contextPrompt }],
              temperature: this.state.temperature,
              max_tokens: 300
            });
            personalizedAdvice = resJson.choices[0].message.content;
          } catch (e) {
            console.warn('[AI Agent] เรียก NVIDIA NIM สำหรับรายงานส่วนบุคคลล้มเหลว:', e);
            personalizedAdvice = 'วิเคราะห์ประวัติทั่วไปสำเร็จ: คนไข้มีรายการยาในตู้ ' + snapshot.medicines.length + ' รายการ ความสม่ำเสมอทานยา ' + adherence.rate + '% (ระบบเชื่อมต่อ AI มีความล่าช้าชั่วคราว)';
          }

          this.state.runStatus = 'validating_evidence';
          this.state.currentStepIndex = 4;
          this.render();

          // ขั้นที่ 4: ตรวจสอบความถูกต้องและหลักฐานอ้างอิง (ดีเลย์ 600ms)
          setTimeout(() => {
            const summary = this.generateAgentSummary(snapshot, adherence, interactions, allergies);
            summary.llmPersonalizedAdvice = personalizedAdvice;

            if (this.state.lastRunSummary) {
              this.state.previousSummary = this.state.lastRunSummary;
            }

            this.state.lastRunSummary = summary;
            this.state.runStatus = 'completed';
            this.state.currentStepIndex = 5;
            this.render();
            Utils.showToast('วิเคราะห์ประวัติสุขภาพเสร็จสมบูรณ์', 'success', 2000);
          }, 600);

        }, 1200);

      }, 900);

    }, 700);
  },

  // สร้างรายงานสรุปประวัติ V2 (โครงสร้าง 7 หมวด)
  generateAgentSummary(snapshot, adherence, interactions, allergies) {
    const rows = [];
    let overallStatus = 'ok';

    // 1. โรคประจำตัว (Conditions)
    const diseases = snapshot.user.diseases;
    let diseasesStatus = 'ok';
    let diseasesFinding = 'ข้อมูลประวัติโรคเรียบร้อยดี';
    if (diseases.length === 0) {
      diseasesStatus = 'needs_data';
      diseasesFinding = 'ไม่ระบุประวัติโรคประจำตัวในระบบ หากมีประวัติโรคควรตั้งค่าเพิ่มเติม';
    } else {
      diseasesFinding = `พบประวัติโรคประจำตัว: ${diseases.join(', ')}`;
    }
    rows.push({
      category: 'conditions',
      label: 'โรคประจำตัว',
      latestData: diseases.length > 0 ? diseases.join(', ') : 'ไม่มีข้อมูล',
      finding: diseasesFinding,
      status: diseasesStatus,
      completeness: diseases.length > 0 ? 100 : 50,
      updatedAt: new Date().toISOString(),
      evidenceRefs: [
        { type: 'patient_entity', id: 'userProfile.diseases', description: 'ข้อมูลประวัติโรคจากฟอร์มตั้งค่าคนไข้' }
      ]
    });

    // 2. ประวัติแพ้ยา (Allergies)
    const allergyList = snapshot.user.allergies;
    let allergyStatus = 'ok';
    let allergyFinding = 'ไม่มีประวัติแพ้ยาที่บันทึกไว้';
    if (allergyList.length > 0) {
      allergyFinding = `พบประวัติการแพ้ยา ${allergyList.length} รายการ`;
      allergyStatus = allergyList.some(a => a.severity === 'severe') ? 'critical' : 'needs_attention';
    }
    rows.push({
      category: 'allergies',
      label: 'ประวัติแพ้ยา',
      latestData: allergyList.length > 0 ? allergyList.map(a => `${a.medicineName} (${a.severity === 'severe' ? 'รุนแรง' : 'ทั่วไป'})`).join(', ') : 'ไม่มีข้อมูลแพ้ยา',
      finding: allergyFinding,
      status: allergyStatus,
      completeness: 100,
      updatedAt: new Date().toISOString(),
      evidenceRefs: [
        { type: 'patient_entity', id: 'allergyLog', description: 'ประวัติแพ้ยาที่บันทึกโดยผู้ป่วย/ผู้ดูแล' }
      ]
    });

    // 3. ยาตีกัน (Drug Interactions & Risks)
    let interactStatus = 'ok';
    let interactFinding = 'ยาทุกตัวในตู้ยาสามารถใช้ร่วมกันได้ตามปกติ';
    if (interactions.length > 0) {
      const severeCount = interactions.filter(i => i.severity === 'severe').length;
      interactStatus = severeCount > 0 ? 'critical' : 'needs_attention';
      interactFinding = `ตรวจพบยาตีกันคู่ที่เป็นอันตราย ${interactions.length} คู่: ${interactions.map(i => `${i.med1Name} 🗙 ${i.med2Name}`).join(', ')}`;
    }
    rows.push({
      category: 'drug_interactions',
      label: 'ยาตีกันและความเสี่ยงจากยา',
      latestData: interactions.length > 0 ? `${interactions.length} คู่ขัดแย้ง` : 'ปลอดภัย',
      finding: interactFinding,
      status: interactStatus,
      completeness: 100,
      updatedAt: new Date().toISOString(),
      evidenceRefs: [
        { type: 'clinical_rule', id: 'MedicineDB.interactions', description: 'ฐานข้อมูลอันตรกิริยาระหว่างยาของระบบ YaCheck' }
      ]
    });

    // 4. ตารางกินยา (Medication Schedule)
    const schedulesCount = snapshot.medicines.reduce((sum, m) => sum + (m.timeSlots ? m.timeSlots.length : 0), 0);
    let scheduleStatus = 'ok';
    let scheduleFinding = `มีรายการเวลาทานยารวมทั้งหมด ${schedulesCount} ครั้งต่อวัน`;
    if (schedulesCount === 0) {
      scheduleStatus = 'needs_data';
      scheduleFinding = 'ไม่มียาที่กำหนดช่วงเวลาทานยาไว้ในตารางกินยาประจำวัน';
    }
    rows.push({
      category: 'medication_schedule',
      label: 'ตารางกินยา',
      latestData: `${schedulesCount} ช่วงเวลา/วัน`,
      finding: scheduleFinding,
      status: scheduleStatus,
      completeness: schedulesCount > 0 ? 100 : 30,
      updatedAt: new Date().toISOString(),
      evidenceRefs: [
        { type: 'patient_entity', id: 'myMedicines.timeSlots', description: 'ข้อมูลแผนการทานยาของคนไข้' }
      ]
    });

    // 5. ยาในตู้ยา (Medicine Cabinet)
    const medsCount = snapshot.medicines.length;
    let cabinetStatus = 'ok';
    let cabinetFinding = `มียารวมทั้งหมด ${medsCount} ตัวบันทึกไว้ในตู้ยา`;
    if (medsCount === 0) {
      cabinetStatus = 'needs_data';
      cabinetFinding = 'ตู้ยาว่างเปล่า ไม่พบประวัติยาประจำตัวในระบบ';
    }
    rows.push({
      category: 'medicine_cabinet',
      label: 'ยาในตู้ยา',
      latestData: `${medsCount} รายการยา`,
      finding: cabinetFinding,
      status: cabinetStatus,
      completeness: medsCount > 0 ? 100 : 20,
      updatedAt: new Date().toISOString(),
      evidenceRefs: [
        { type: 'patient_entity', id: 'myMedicines', description: 'รายการยาที่อยู่ระหว่างการใช้งานปัจจุบัน' }
      ]
    });

    // 6. ประวัติการทานยา (Medication Adherence)
    let adherenceStatus = 'ok';
    let adherenceFinding = `อัตราความสม่ำเสมอทานยาในวันนี้อยู่ที่ ${adherence.rate}%`;
    if (adherence.rate < 80) {
      adherenceStatus = 'needs_attention';
      adherenceFinding += ' (ต่ำกว่าเป้าหมาย 80% ควรทานยาให้ตรงเวลามากขึ้น)';
    }
    rows.push({
      category: 'adherence',
      label: 'ประวัติการทานยาและ Adherence',
      latestData: `${adherence.rate}% (ทานแล้ว ${adherence.takenCount}/${adherence.expectedCount} โดส)`,
      finding: adherenceFinding,
      status: adherenceStatus,
      completeness: 100,
      updatedAt: new Date().toISOString(),
      evidenceRefs: [
        { type: 'calculation', id: 'adherence_rate', description: 'สูตรประเมินสัดส่วนการกินยาจริง เทียบกับ แผนการทานยาวันนี้' }
      ]
    });

    // 7. น้ำหนักและข้อมูลร่างกาย (Body Metrics)
    const weight = snapshot.user.weight;
    let weightStatus = 'ok';
    let weightFinding = `น้ำหนักปัจจุบันที่บันทึกไว้: ${weight ? weight + ' กิโลกรัม' : 'ยังไม่ระบุ'}`;
    if (!weight) {
      weightStatus = 'needs_data';
      weightFinding = 'ไม่มีประวัติน้ำหนักคนไข้ในระบบ ซึ่งจำเป็นต่อการคำนวณและปรับปริมาณยาระยะยาว';
    }
    rows.push({
      category: 'body_metrics',
      label: 'น้ำหนักและข้อมูลร่างกาย',
      latestData: weight ? `${weight} kg` : 'ไม่มีข้อมูล',
      finding: weightFinding,
      status: weightStatus,
      completeness: weight ? 100 : 40,
      updatedAt: new Date().toISOString(),
      evidenceRefs: [
        { type: 'patient_entity', id: 'userProfile.weight', description: 'ข้อมูลน้ำหนักระบุโดยผู้ใช้/การซิงค์ข้อมูลภายนอก' }
      ]
    });

    // ค้นหาสถานะภาพรวม (หาอันที่รุนแรงที่สุด)
    const statuses = rows.map(r => r.status);
    if (statuses.includes('critical')) overallStatus = 'critical';
    else if (statuses.includes('needs_attention')) overallStatus = 'needs_attention';
    else if (statuses.includes('needs_data')) overallStatus = 'needs_data';

    return {
      schemaVersion: '1.0',
      summaryId: Utils.generateId(),
      snapshotVersion: snapshot.version,
      generatedAt: new Date().toISOString(),
      overallStatus,
      rows
    };
  },

  // สร้างรายงานสรุปประชากรกรณี LLM ล้มเหลว (Fallback Mode — แสดงผลเฉพาะข้อมูลทางกฎความปลอดภัยตรงตัว)
  generateFallbackSummary(snapshot, adherence, interactions, allergies) {
    const summary = this.generateAgentSummary(snapshot, adherence, interactions, allergies);
    
    // แปลงให้เหลือเฉพาะแถวที่สำคัญต่อความปลอดภัยสูงสุด (ยาตีกัน, แพ้ยา, Adherence)
    summary.rows = summary.rows.map(row => {
      if (row.category === 'drug_interactions' || row.category === 'allergies') {
        return row;
      }
      return {
        ...row,
        finding: `[โหมดความปลอดภัยแบบจำกัด] แสดงข้อมูลตรงตัว: ${row.latestData} (ข้ามระบบวิเคราะห์คำสรุปจาก LLM)`,
        evidenceRefs: [{ type: 'clinical_rule', id: 'fallback_mode', description: 'รันข้อมูลโดยไม่ใช้ AI สรุปผล' }]
      };
    });
    
    return summary;
  },

  // พิมพ์ตั้งคำถามจำลองและให้ผู้ช่วยจำลองวิเคราะห์ตอบสด
  async askQuestion(text) {
    if (!text.trim()) return;

    // เพิ่มข้อความคนไข้
    this.state.messages.push({ sender: 'user', text });
    this.render();

    // ดึง Snapshot เพื่อนำมาตอบจริง
    const snapshot = this.buildSnapshot();
    const adherence = this.calculateAdherence(snapshot);
    const interactions = this.checkDrugInteractions(snapshot);
    const allergies = this.checkAllergyConflicts(snapshot);

    // เลื่อนกล่องแชทไปล่าสุด
    setTimeout(() => {
      const chatBody = document.querySelector('.agent-chat-body');
      if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
    }, 50);

    try {
      if (this.state.outageMode) {
        throw new Error('Forced Outage Mode Enabled');
      }

      // เตรียมชุดข้อความสำหรับส่งให้ LLM
      const contextPrompt = `คุณคือผู้ช่วย AI ดูแลสุขภาพ (YaCheck Care Agent)
ข้อมูลคนไข้ปัจจุบัน:
- ชื่อคนไข้: ${snapshot.user.name}
- ยาในตู้ยา: ${snapshot.medicines.map(m => `- ${m.customName || m.medicineId} (${m.dosageMg}mg) ทานช่วง ${m.timeSlots?.join(', ')} (สถานะ: ${m.status})`).join('\n')}
- โรคประจำตัว: ${snapshot.user.diseases.join(', ') || 'ไม่มีข้อมูล'}
- ประวัติแพ้ยา: ${snapshot.user.allergies.map(a => `- ${a.medicineName} อาการ: ${a.symptoms || 'ไม่ระบุ'} (${a.severity})`).join('\n')}
- ความสม่ำเสมอในการทานยา (Adherence) วันนี้: ${adherence.rate}% (ทานแล้ว ${adherence.takenCount}/${adherence.expectedCount} โดส)
- ข้อมูลยาตีกัน (Drug Interactions) ที่พบในตู้ยา: ${interactions.length > 0 ? interactions.map(i => `- ${i.med1Name} ตีกับ ${i.med2Name} (${i.severity})`).join('\n') : 'ไม่พบยาตีกัน'}
- ประวัติแพ้ยาที่มีในตู้ยา: ${allergies.length > 0 ? allergies.map(a => `- พบประวัติแพ้ยา ${a.medicineName} ในตู้ยา`).join('\n') : 'ไม่พบยาทีแพ้ในตู้ยา'}

คำสั่งควบคุม AI:
${this.state.systemPrompt}

ตอบคำถามของคนไข้ด้านล่างนี้ โดยให้ข้อมูลที่เป็นจริงตามประวัติ และเน้นความปลอดภัยเป็นสำคัญที่สุด ห้ามจ่ายยาหรือสั่งลด/เพิ่มยาเองโดยเด็ดขาด ตอบเป็นภาษาไทยอย่างเป็นกันเองและสุภาพ`;
      const messages = [
        { role: 'system', content: contextPrompt }
      ];

      // ดึงประวัติการคุย 4 ข้อความหลังสุด
      const recentMsgs = this.state.messages.slice(-5, -1);
      recentMsgs.forEach(m => {
        messages.push({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        });
      });

      messages.push({ role: 'user', content: text });

      const resData = await this.fetchLLM({
        model: this.state.selectedModel,
        messages: messages,
        temperature: this.state.temperature,
        max_tokens: 1024
      });
      const reply = resData.choices[0].message.content;

      this.state.messages.push({ sender: 'agent', text: reply });
      this.render();
    } catch (err) {
      console.warn('[AI Agent] เรียก NVIDIA NIM API ล้มเหลว กำลังใช้การตอบกลับแบบออฟไลน์:', err);
      
      // Fallback ตอบกลับออฟไลน์ตามความเร็วเดิม
      let reply = '';
      const promptLower = text.toLowerCase();
      if (promptLower.includes('ยาในตู้') || promptLower.includes('มียาอะไร') || promptLower.includes('ยาของฉัน')) {
        if (snapshot.medicines.length === 0) {
          reply = 'จากการวิเคราะห์ ไม่พบรายการยาในตู้ยาของคุณเลยครับ สามารถเพิ่มประวัติได้ที่แท็บ "เพิ่มยา" ครับ';
        } else {
          reply = `ปัจจุบันคุณมียาในตู้ทั้งหมด ${snapshot.medicines.length} ตัว ได้แก่:\n` +
            snapshot.medicines.map((m, i) => {
              const dbMed = MedicineDB.medicines.find(x => x.id === m.medicineId);
              return `${i + 1}. ${m.customName || dbMed?.nameTh || m.medicineId} (${m.dosageMg}mg) - กินมื้อ ${m.timeSlots.map(s => s === 'morning' ? 'เช้า' : s === 'noon' ? 'กลางวัน' : s === 'evening' ? 'เย็น' : 'ก่อนนอน').join(', ')}`;
            }).join('\n') + 
            '\n\n*โปรดรับประทานยาตามหน้าซองและคำสั่งแพทย์อย่างเคร่งครัดนะครับ*';
        }
      } else if (promptLower.includes('แพ้ยา') || promptLower.includes('ประวัติแพ้')) {
        if (snapshot.user.allergies.length === 0) {
          reply = 'ระบบไม่พบข้อมูลการแพ้ยาของคุณครับ หากคุณเคยแพ้ยาใด ๆ สามารถอัปเดตเพื่อความปลอดภัยได้ในแท็บ "ตั้งค่า" เสมอนะครับ';
        } else {
          reply = `คุณมีประวัติแพ้ยาที่ลงทะเบียนไว้ ${snapshot.user.allergies.length} ตัวครับ:\n` +
            snapshot.user.allergies.map((a, i) => `- ${a.medicineName} อาการ: ${a.symptoms || 'ไม่ระบุ'} (ระดับความรุนแรง: ${a.severity === 'severe' ? 'รุนแรงมาก' : 'ปานกลาง'})`).join('\n') +
            '\n\n*หากมีอาการแพ้ยาใหม่เกิดขึ้น ให้หยุดยาทันทีและรีบไปพบแพทย์ครับ*';
        }
      } else if (promptLower.includes('ยาตีกัน') || promptLower.includes('ตีกันไหม') || promptLower.includes('อันตราย')) {
        if (interactions.length === 0) {
          reply = 'จากการเช็คฐานข้อมูล ยาในตู้ยาของคุณปัจจุบันไม่มีความเสี่ยงคู่ยาตีกัน (Drug Interaction) ครับ อย่างไรก็ดี หากทานอาหารเสริมเพิ่มควรสอบถามเภสัชกรด้วยนะครับ';
        } else {
          reply = `⚠️ ตรวจพบความเสี่ยงยาตีกันในระบบของคุณ ${interactions.length} คู่ครับ:\n` +
            interactions.map((inter, i) => `${i + 1}. ${inter.med1Name} กับ ${inter.med2Name} (ความรุนแรง: ${inter.severity === 'severe' ? 'ห้ามทานร่วมกันเด็ดขาด' : 'ระมัดระวังเป็นพิเศษ'})\n   คำแนะนำ: ${inter.advice.join(', ')}`).join('\n') +
            '\n\n*ห้ามปรับหรือหยุดยาด้วยตัวเอง ให้ปรึกษาเภสัชกรหรือแพทย์ผู้สั่งยาโดยเร็วที่สุดครับ*';
        }
      } else if (promptLower.includes('ลืมกินยา') || promptLower.includes('กินยาไม่ครบ') || promptLower.includes('ลืมยา')) {
        reply = `วันนี้คุณกินยาไปแล้วคิดเป็นความสม่ำเสมอ ${adherence.rate}% (กินแล้ว ${adherence.takenCount}/${adherence.expectedCount} ครั้ง)\n\nหากคุณลืมกินยา ให้กินทันทีที่นึกได้ภายในหน้าต่างเวลา 1-2 ชั่วโมง แต่หากเลยเวลามาใกล้กับรอบถัดไปแล้ว "ห้ามเบิ้ลยาเป็นสองเท่าเด็ดขาด" ให้ข้ามโดสนั้นไปแล้วกินรอบหน้าตามปกติได้เลยครับ`;
      } else if (promptLower.includes('น้ำหนัก') || promptLower.includes('หนักเท่าไหร่')) {
        if (snapshot.user.weight) {
          reply = `น้ำหนักของคุณที่บันทึกไว้คือ ${snapshot.user.weight} กิโลกรัม ครับ หากน้ำหนักของคุณมีการเปลี่ยนแปลงอย่างรวดเร็ว (เช่น เพิ่มหรือลดเกิน 2 กิโลกรัมใน 1 สัปดาห์) อาจส่งผลต่อการตอบสนองต่อยาบางชนิดได้ครับ`;
        } else {
          reply = 'ปัจจุบันคุณยังไม่ได้ระบุน้ำหนักในหน้าตั้งค่าครับ แนะนำให้ระบุน้ำหนักเพื่อให้ผู้ช่วย AI ประเมินปริมาณและความเหมาะสมของยาได้อย่างรอบด้านมากขึ้นครับ';
        }
      } else {
        reply = `จากการตรวจสอบประวัติสุขภาพของคุณ ปัจจุบันมีตัวยาในระบบ ${snapshot.medicines.length} รายการ และประวัติโรคคือ [${snapshot.user.diseases.join(', ') || 'ไม่ได้ระบุ'}]. \n\nสำหรับข้อคำถามของคุณ: "${text}" แนะนำให้ปรึกษาแพทย์ผู้รักษาหรือเภสัชกรประจำร้านยาเพื่อยืนยันแนวทางปฏิบัติที่ปลอดภัยที่สุดครับ`;
      }

      this.state.messages.push({ sender: 'agent', text: reply });
      this.render();
    } finally {
      // เลื่อนกล่องแชทไปล่าสุด
      setTimeout(() => {
        const chatBody = document.querySelector('.agent-chat-body');
        if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
      }, 50);
    }
  },

  // ดึงคลาสสีตามระดับความปลอดภัย
  getStatusClass(status) {
    switch (status) {
      case 'critical': return 'status-critical';
      case 'needs_attention': return 'status-attention';
      case 'needs_data': return 'status-needs-data';
      default: return 'status-ok';
    }
  },

  // ดึงป้ายข้อความไทยตามระดับความปลอดภัย
  getStatusLabel(status) {
    switch (status) {
      case 'critical': return 'อันตรายรุนแรง';
      case 'needs_attention': return 'ควรระมัดระวัง';
      case 'needs_data': return 'ขาดข้อมูลสำคัญ';
      default: return 'ข้อมูลเรียบร้อยดี';
    }
  },

  // ดึงไอคอนตามสถานะ
  getStatusIcon(status) {
    switch (status) {
      case 'critical': return Utils.getIconSvg('emergency', 'icon-sm');
      case 'needs_attention': return Utils.getIconSvg('alertTriangle', 'icon-sm');
      case 'needs_data': return Utils.getIconSvg('help', 'icon-sm');
      default: return Utils.getIconSvg('checkCircle', 'icon-sm');
    }
  },

  // วาดหน้าจอ UI
  render() {
    const container = document.querySelector('#page-agent .page-content');
    if (!container) return;

    let mainContentHtml = '';

    if (this.state.runStatus === 'idle') {
      // หน้าจอเริ่มต้นก่อนวิเคราะห์
      mainContentHtml = `
        <div class="agent-idle-container" style="text-align: center; padding: var(--space-xl) var(--space-md); animation: fadeIn 0.4s ease;">
          <div style="background-color: rgba(19, 61, 51, 0.08); width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
            <div style="color: var(--color-primary); transform: scale(1.8);">${Utils.getIconSvg('sparkles')}</div>
          </div>
          <h2 style="font-family: 'Prompt', sans-serif; font-weight: 700; color: var(--color-primary); font-size: 1.6rem; margin-bottom: 8px;">YaCheck Care Agent</h2>
          <p class="text-secondary" style="font-size: 1rem; line-height: 1.5; max-width: 480px; margin: 0 auto var(--space-xl);">
            ระบบวิเคราะห์ประวัติผู้ป่วย ตารางเวลาทานยา และวิเคราะห์ยาตีกันเพื่อประเมินความปลอดภัยร่วมกับ AI ก่อนส่งแผนให้บุคลากรการแพทย์
          </p>
          <button class="btn btn-primary" onclick="Agent.startRun()" style="width: 100%; max-width: 260px; height: 50px; font-size: 1.1rem; border-radius: 25px; box-shadow: var(--shadow-md);">
            เริ่มวิเคราะห์ประวัติสุขภาพ
          </button>
        </div>
      `;
    } else if (
      this.state.runStatus === 'loading_snapshot' ||
      this.state.runStatus === 'running_rules' ||
      this.state.runStatus === 'calling_llm' ||
      this.state.runStatus === 'validating_evidence'
    ) {
      // หน้าจออยู่ระหว่างโหลด (State Machine Progress)
      const steps = [
        { label: 'รวบรวมประวัติสุขภาพ & ยาในระบบ', desc: 'ดึงข้อมูล Snapshot ล่าสุดของคนไข้' },
        { label: 'รันตรวจสอบความปลอดภัยทางคลินิก', desc: 'เรียกเช็คคู่ยาตีกันและแพ้ยาผ่าน Rule Engine' },
        { label: 'ประมวลผลสรุปโดย AI Agent', desc: 'เรียก LLM สรุปประวัติ 7 หมวดหลักและตรวจ Diff' },
        { label: 'ตรวจสอบความถูกต้องของข้ออ้างอิง', desc: 'จับคู่ข้อสรุปเข้ากับหลักฐานเชิงประจักษ์ (Evidence)' }
      ];

      let stepsHtml = '';
      steps.forEach((step, idx) => {
        const stepNum = idx + 1;
        let stepClass = 'step-pending';
        let stepIcon = `<span class="step-num-circle">${stepNum}</span>`;

        if (this.state.currentStepIndex > stepNum) {
          stepClass = 'step-done';
          stepIcon = `<div style="color:var(--color-primary);">${Utils.getIconSvg('checkCircle', 'icon-sm')}</div>`;
        } else if (this.state.currentStepIndex === stepNum) {
          stepClass = 'step-active';
          stepIcon = `<span class="step-loader"></span>`;
        }

        stepsHtml += `
          <div class="progress-step-item ${stepClass}" style="display: flex; gap: 16px; margin-bottom: var(--space-lg); align-items: flex-start;">
            <div class="step-status-icon" style="flex-shrink:0; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">
              ${stepIcon}
            </div>
            <div style="flex: 1;">
              <h4 style="font-size:1.05rem; font-weight:700; color:var(--color-text); margin-bottom: 2px;">${step.label}</h4>
              <p class="text-secondary" style="font-size:0.85rem;">${step.desc}</p>
            </div>
          </div>
        `;
      });

      mainContentHtml = `
        <div class="agent-progress-container" style="padding: var(--space-lg); animation: fadeIn 0.4s ease;">
          <h3 style="font-family: 'Prompt', sans-serif; font-size:1.25rem; font-weight:700; color:var(--color-primary); margin-bottom: var(--space-lg); text-align:center;">
            กำลังดำเนินการวิเคราะห์ตามแผนความปลอดภัย...
          </h3>
          <div class="progress-steps-list" style="max-width: 440px; margin: 0 auto;">
            ${stepsHtml}
          </div>
        </div>
      `;
    } else {
      // หน้าจอผลลัพธ์ (Completed หรือ Failed)
      const summary = this.state.lastRunSummary;
      const isFailed = this.state.runStatus === 'failed';
      
      const overallClass = isFailed ? 'status-failed' : this.getStatusClass(summary.overallStatus);
      const overallTitle = isFailed ? 'โหมดความปลอดภัยฉุกเฉิน (LLM Outage)' : this.getStatusLabel(summary.overallStatus);
      const overallIcon = isFailed ? Utils.getIconSvg('emergency', 'icon-sm') : this.getStatusIcon(summary.overallStatus);

      let rowsHtml = '';
      summary.rows.forEach(row => {
        const rowColorClass = this.getStatusClass(row.status);
        const rowIcon = this.getStatusIcon(row.status);
        const hasEvidence = this.state.showEvidenceId === row.category;

        rowsHtml += `
          <div class="summary-card-row" style="background-color: var(--color-surface); border: 1.5px solid var(--color-border); border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 10px; box-shadow: var(--shadow-sm); animation: slideUp 0.3s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
              <strong style="font-size: 1.05rem; color: var(--color-primary); font-family: 'Prompt', sans-serif;">${row.label}</strong>
              <div class="badge-status ${rowColorClass}" style="display:inline-flex; align-items:center; gap:6px; font-size:0.8rem; font-weight:700; padding:4px 10px; border-radius:12px;">
                ${rowIcon}
                ${this.getStatusLabel(row.status)}
              </div>
            </div>
            <p style="font-size: 0.95rem; color: var(--color-text); line-height: 1.4; margin-bottom: 8px;">
              ${row.finding}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1.2px solid var(--color-border); padding-top: 8px; font-size: 0.8rem;">
              <span class="text-secondary">ข้อมูลล่าสุด: <strong>${row.latestData}</strong></span>
              <button class="btn btn-ghost" onclick="Agent.toggleEvidence('${row.category}')" style="height: auto; padding: 4px 8px; font-size: 0.8rem; display: flex; align-items: center; gap: 4px; color: var(--color-primary); border: none; background: none; font-weight: 700;">
                ${Utils.getIconSvg('help', 'icon-xs')}
                ${hasEvidence ? 'ปิดหลักฐานอ้างอิง' : 'เปิดหลักฐานอ้างอิง'}
              </button>
            </div>
            ${hasEvidence ? `
              <div class="evidence-sheet-box" style="margin-top: 10px; background-color: var(--color-bg); border-radius: var(--radius-sm); padding: 10px 12px; border-left: 3.5px solid var(--color-primary); animation: fadeIn 0.3s ease;">
                <div style="font-weight: 700; color: var(--color-primary); margin-bottom: 4px; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
                  ${Utils.getIconSvg('checkCircle', 'icon-xs')}
                  หลักฐานตรวจสอบเชิงคลินิก
                </div>
                ${row.evidenceRefs.map(ev => `
                  <div style="font-size: 0.8rem; line-height: 1.4; color: var(--color-text);">
                    • <strong>ประเภทข้อมูล:</strong> ${ev.type === 'clinical_rule' ? 'กฎความปลอดภัยออฟไลน์' : ev.type === 'patient_entity' ? 'ข้อมูลในระบบคนไข้' : 'การคำนวณสูตรคณิตศาสตร์'} <br>
                    • <strong>แหล่งที่มาอ้างอิง:</strong> <code>${ev.id}</code> <br>
                    • <strong>รายละเอียด:</strong> ${ev.description}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      });

      // ตรวจสอบเช็ค Diff ยาล่าสุด
      let diffHtml = '';
      if (this.state.previousSummary) {
        diffHtml = `
          <div class="agent-diff-banner alert-card alert-warning" style="margin-bottom: var(--space-md); padding: 12px 14px; border-radius: var(--radius-md); font-size: 0.9rem; animation: slideUp 0.4s ease;">
            <div style="display:flex; align-items:center; gap:8px; font-weight:700; color:#E65100; margin-bottom:4px;">
              ${Utils.getIconSvg('alertTriangle', 'icon-sm')}
              ความเปลี่ยนแปลงจากผลสรุปครั้งก่อน
            </div>
            <div style="font-size:0.85rem; line-height:1.4; color: var(--color-text);">
              พบการอัปเดตข้อมูลตารางยาหรือค่าน้ำหนักร่างกายใหม่ในระบบ AI Agent จึงประเมินชุดหลักฐานแวดล้อมใหม่
            </div>
          </div>
        `;
      }

      mainContentHtml = `
        <div class="agent-result-container" style="animation: fadeIn 0.4s ease;">
          
          <!-- แบนเนอร์ผลประเมินความปลอดภัยภาพรวม -->
          <div class="overall-status-banner ${overallClass}" style="display:flex; align-items:center; gap:12px; padding:16px; border-radius:var(--radius-md); margin-bottom:var(--space-md); box-shadow:var(--shadow-sm);">
            <div style="transform: scale(1.4); flex-shrink: 0;">${overallIcon}</div>
            <div>
              <h3 style="font-size:1.15rem; font-weight:900; margin-bottom: 2px; font-family: 'Prompt', sans-serif;">ผลประเมิน: ${overallTitle}</h3>
              <p style="font-size:0.85rem; line-height:1.3; opacity:0.9;">
                ${isFailed ? 'ระบบตรวจพบความขัดข้องชั่วคราว จึงปิดกั้นคำแนะนำ LLM และดึงข้อมูลความปลอดภัยพื้นฐานจากเครื่อง' : 'ข้ออธิบายด้านสุขภาพอิงตามข้อมูลแวดล้อมและกฎคลินิกที่ผ่านการลงทะเบียนแล้ว'}
              </p>
            </div>
          </div>

          ${diffHtml}

          <!-- ผลวิเคราะห์สุขภาพส่วนบุคคลจากโมเดล AI (NVIDIA NIM Live) -->
          <div class="card" style="padding:16px; margin-bottom:var(--space-md); border-radius:var(--radius-md); background:linear-gradient(135deg, rgba(33, 110, 99, 0.05) 0%, rgba(242, 166, 90, 0.05) 100%); border: 1.5px solid var(--color-primary-light); box-shadow:var(--shadow-sm); animation: slideUp 0.3s ease;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
              <div style="color:var(--color-primary);">${Utils.getIconSvg('sparkles', 'icon-sm')}</div>
              <strong style="color:var(--color-primary); font-size:1.05rem; font-family:'Prompt',sans-serif;">บทวิเคราะห์สุขภาพโดยผู้ช่วย AI (NVIDIA NIM Live)</strong>
            </div>
            <p style="font-size:0.95rem; color:var(--color-text); line-height:1.55; white-space:pre-line; margin:0;">
              ${summary.llmPersonalizedAdvice || 'กำลังจัดทำคำปรึกษา...'}
            </p>
          </div>

          <!-- ปุ่มกระตุ้นยืนยันส่งแพทย์/เภสัชกร -->
          <div class="card" style="padding:14px; margin-bottom:var(--space-md); border-radius:var(--radius-md); background:var(--color-surface); box-shadow:var(--shadow-sm); display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; border-left:4px solid var(--color-primary);">
            <div style="flex:1; min-width:200px;">
              <strong style="color:var(--color-primary); font-size:0.95rem; font-family:'Prompt',sans-serif;">ส่งสรุปแพทย์เพื่อขอรับคำแนะนำส่วนบุคคล</strong>
              <p class="text-secondary" style="font-size:0.8rem; margin-top:2px;">ข้อมูลประวัติยาและ Adherence จะถูกรวมเป็นคำขอสำหรับส่งตรวจ</p>
            </div>
            <button class="btn btn-primary" onclick="Agent.openConfirmModal()" ${this.state.reviewRequested ? 'disabled' : ''} style="height:36px; padding:0 12px; font-size:0.85rem; border-radius:18px;">
              ${this.state.reviewRequested ? 'ส่งคำขอแล้ว ✓' : 'ขอคำแนะนำ'}
            </button>
          </div>

          <!-- ตารางสรุป 7 หมวด -->
          <div style="margin-bottom: var(--space-lg);">
            <h4 style="font-family: 'Prompt', sans-serif; font-size: 1.1rem; font-weight: 700; color: var(--color-primary); margin-bottom: 12px;">ตารางสรุปผล 7 หมวด</h4>
            ${rowsHtml}
          </div>

          <button class="btn btn-secondary btn-full" onclick="Agent.startRun()" style="margin-bottom:var(--space-xl); display:flex; align-items:center; justify-content:center; gap:6px;">
            ${Utils.getIconSvg('sparkles', 'icon-sm')}
            วิเคราะห์ประวัติใหม่อีกครั้ง
          </button>
        </div>
      `;
    }

    // แผงกล่องแชททดสอบ Playground
    let chatHtml = `
      <div class="agent-chat-container card" style="padding:16px; margin-top:var(--space-xl); border-radius:var(--radius-lg); background:var(--color-surface); border:1.5px solid var(--color-border); box-shadow:var(--shadow-md);">
        <div style="display:flex; align-items:center; gap:8px; border-bottom:1.5px solid var(--color-border); padding-bottom:10px; margin-bottom:12px;">
          <div style="color:var(--color-primary);">${Utils.getIconSvg('sparkles', 'icon-md')}</div>
          <h3 style="font-family:'Prompt',sans-serif; font-size:1.15rem; font-weight:700; color:var(--color-primary); margin:0;">ทดลองคุยกับ YaCheck Care Agent</h3>
        </div>

        <div class="agent-chat-body" style="height:250px; overflow-y:auto; border-radius:var(--radius-sm); background:var(--color-bg); padding:12px; margin-bottom:12px; border:1px solid var(--color-border); display:flex; flex-direction:column; gap:10px;">
          ${this.state.messages.map(msg => `
            <div class="chat-bubble-wrapper" style="display:flex; justify-content:${msg.sender === 'user' ? 'flex-end' : 'flex-start'};">
              <div class="chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-agent'}" style="max-width:85%; padding:10px 14px; border-radius:18px; font-size:0.92rem; line-height:1.45; word-wrap:break-word; white-space:pre-line; ${
                msg.sender === 'user' 
                  ? 'background-color: var(--color-primary); color:#FFFFFF; border-bottom-right-radius:4px;' 
                  : 'background-color: var(--color-surface); color:var(--color-text); border-top-left-radius:4px; border:1px solid var(--color-border); box-shadow:var(--shadow-sm);'
              }">
                ${msg.text}
              </div>
            </div>
          `).join('')}
        </div>

        <form onsubmit="Agent.handleChatSubmit(event)" style="display:flex; gap:8px;">
          <input type="text" id="agent-chat-input" placeholder="พิมพ์ถามผู้ช่วย AI... เช่น 'ฉันแพ้ยาอะไร?', 'ยาในตู้มีอะไรบ้าง?'" required style="flex:1; height:42px; border:1.5px solid var(--color-border); border-radius:var(--radius-md); padding:0 12px; font-size:0.95rem; background-color:var(--color-bg); color:var(--color-text);">
          <button type="submit" class="btn btn-primary" style="height:42px; width:60px; display:inline-flex; align-items:center; justify-content:center; padding:0; border-radius:var(--radius-md);">
            ส่ง
          </button>
        </form>
      </div>
    `;

    // แผงตั้งค่าจำลอง Sandbox (Playground Sidebar Control)
    let playgroundControlHtml = `
      <div class="playground-control-panel card" style="padding:16px; margin-bottom:var(--space-lg); border-radius:var(--radius-lg); background:#1e293b; color:#f8fafc; border:none; box-shadow:var(--shadow-md);">
        <div style="display:flex; align-items:center; gap:8px; border-bottom:1px solid #334155; padding-bottom:8px; margin-bottom:12px;">
          <div style="color:#f59e0b;">${Utils.getIconSvg('settings', 'icon-md')}</div>
          <h3 style="font-family:'Prompt',sans-serif; font-size:1.15rem; font-weight:700; color:#f59e0b; margin:0;">AI Agent Playground & Control Panel</h3>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px;">
          <!-- เปิด/ปิด Outage -->
          <div style="display:flex; align-items:center; justify-content:between; gap:12px;">
            <div style="flex:1;">
              <strong style="font-size:0.92rem; color:#f8fafc; display:block;">จำลอง LLM ขัดข้อง (Outage)</strong>
              <span style="font-size:0.75rem; color:#94a3b8;">เปิดสวิตช์นี้เพื่อบังคับให้เกิดความล้มเหลวขณะเรียก AI เพื่อทดสอบ Deterministic Fallback UI</span>
            </div>
            <label class="switch-container" style="position:relative; display:inline-block; width:46px; height:24px; flex-shrink:0;">
              <input type="checkbox" id="outage-toggle" ${this.state.outageMode ? 'checked' : ''} onchange="Agent.toggleOutage(this.checked)" style="opacity:0; width:0; height:0;">
              <span class="slider-round" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#475569; transition:0.3s; border-radius:24px; ${this.state.outageMode ? 'background-color:#f59e0b;' : ''}"></span>
              <span class="slider-circle" style="position:absolute; height:18px; width:18px; left:3px; bottom:3px; background-color:white; transition:0.3s; border-radius:50%; ${this.state.outageMode ? 'transform:translateX(22px);' : ''}"></span>
            </label>
          </div>

          <!-- แก้ไข System Prompt -->
          <div>
            <label style="font-size:0.92rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:4px;">System Prompt (คำสั่งควบคุม AI)</label>
            <textarea id="playground-prompt-editor" onchange="Agent.updateSystemPrompt(this.value)" style="width:100%; height:80px; background:#0f172a; border:1px solid #334155; border-radius:4px; padding:8px; font-size:0.8rem; color:#f1f5f9; font-family:monospace; resize:none;">${this.state.systemPrompt}</textarea>
          </div>

          <!-- แก้ไข API Key -->
          <div>
            <label style="font-size:0.92rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:4px;">NVIDIA API Key</label>
            <input type="password" id="playground-api-key" value="${this.state.nvidiaApiKey}" onchange="Agent.updateApiKey(this.value)" style="width:100%; height:32px; background:#0f172a; border:1px solid #334155; border-radius:4px; padding:0 8px; font-size:0.8rem; color:#f1f5f9; width: 100%;" placeholder="ใส่คีย์ NVIDIA API ที่นี่...">
          </div>

          <div style="display:grid; grid-template-columns:1fr 1.2fr; gap:12px;">
            <!-- เลือกรุ่น Model -->
            <div>
              <label style="font-size:0.85rem; color:#cbd5e1; display:block; margin-bottom:3px;">NVIDIA NIM Model</label>
              <select id="playground-model-select" onchange="Agent.updateModel(this.value)" style="width:100%; height:32px; background:#0f172a; border:1px solid #334155; border-radius:4px; font-size:0.8rem; color:#f1f5f9; padding:0 4px;">
                <option value="meta/llama-3.1-8b-instruct" ${this.state.selectedModel === 'meta/llama-3.1-8b-instruct' ? 'selected' : ''}>Llama 3.1 8B (Fast)</option>
                <option value="meta/llama-3.1-70b-instruct" ${this.state.selectedModel === 'meta/llama-3.1-70b-instruct' ? 'selected' : ''}>Llama 3.1 70B (Smart)</option>
                <option value="nvidia/llama-3.1-nemotron-70b-instruct" ${this.state.selectedModel === 'nvidia/llama-3.1-nemotron-70b-instruct' ? 'selected' : ''}>Nemotron 70B (Pro)</option>
              </select>
            </div>
            <!-- ปรับ Temp -->
            <div>
              <label style="font-size:0.85rem; color:#cbd5e1; display:block; margin-bottom:3px;">Temperature: <span id="temp-val">${this.state.temperature}</span></label>
              <input type="range" min="0" max="1" step="0.1" value="${this.state.temperature}" oninput="Agent.updateTemperature(this.value)" style="width:100%; height:32px;">
            </div>
          </div>
        </div>
      </div>
    `;

    // วาดโครงสร้างทั้งหมดลง Container
    container.innerHTML = `
      <div class="agent-page-wrapper" style="display:flex; flex-direction:column; gap:var(--space-md);">
        
        <!-- ส่วนหัวข้อของหน้า -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
          <div>
            <h2 class="page-title" style="display: flex; align-items: center; gap: var(--space-sm); font-family: 'Prompt', sans-serif; margin-bottom:4px;">
              <svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-primary); width:26px; height:26px;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              ระบบผู้ช่วย AI (Care Agent)
            </h2>
            <p class="text-secondary" style="font-size:0.95rem;">จำลองการวิเคราะห์ข้อมูลประวัติสุขภาพ ยาตีกัน และตารางกินยา</p>
          </div>
        </div>

        <!-- แผงควบคุม Sandbox -->
        ${playgroundControlHtml}

        <!-- เนื้อหาหลัก (สรุป / สถานะวิเคราะห์) -->
        ${mainContentHtml}

        <!-- กล่องแชทคุยทดสอบ -->
        ${chatHtml}

        <!-- Modal ยืนยันขอคำแนะนำจากแพทย์ -->
        ${this.state.showConfirmModal ? this.renderConfirmModal() : ''}

      </div>
    `;
  },

  // วาด Modal ยืนยันการขอรับคำปรึกษาแพทย์
  renderConfirmModal() {
    return `
      <div class="confirm-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="confirm-modal-box card" style="width:100%; max-width:400px; padding:24px; border-radius:var(--radius-lg); background:var(--color-surface); box-shadow:var(--shadow-lg); text-align:center; animation: scaleUp 0.3s ease;">
          <div style="color:var(--color-primary); margin-bottom:14px;">${Utils.getIconSvg('hospital', 'icon-xl')}</div>
          <h3 style="font-family:'Prompt',sans-serif; font-size:1.25rem; font-weight:700; color:var(--color-primary); margin-bottom:8px;">ยืนยันคำขอรีวิวประวัติการทานยา</h3>
          <p class="text-secondary" style="font-size:0.92rem; line-height:1.45; margin-bottom:20px;">
            คุณต้องการส่งชุดสรุปข้อมูลและประวัติการทานยา (Medication History) นี้ไปยังแพทย์/เภสัชกรเครือข่ายของแอปเพื่อตรวจทานคำแนะนำและการใช้ยาที่ปลอดภัยใช่หรือไม่?
          </p>
          <div style="display:flex; gap:12px;">
            <button class="btn btn-secondary" onclick="Agent.closeConfirmModal()" style="flex:1; height:44px; font-weight:700;">ยกเลิก</button>
            <button class="btn btn-primary" onclick="Agent.submitReviewRequest()" style="flex:1; height:44px; font-weight:700;">ยืนยันส่งข้อมูล</button>
          </div>
        </div>
      </div>
    `;
  },

  // ฟังก์ชันควบคุม Actions บนปุ่ม
  toggleEvidence(categoryId) {
    if (this.state.showEvidenceId === categoryId) {
      this.state.showEvidenceId = null;
    } else {
      this.state.showEvidenceId = categoryId;
    }
    this.render();
  },

  toggleOutage(checked) {
    this.state.outageMode = checked;
    this.render();
  },

  updateApiKey(val) {
    this.state.nvidiaApiKey = val;
  },

  updateSystemPrompt(val) {
    this.state.systemPrompt = val;
  },

  updateModel(val) {
    this.state.selectedModel = val;
  },

  updateTemperature(val) {
    this.state.temperature = parseFloat(val);
    const tempValSpan = document.getElementById('temp-val');
    if (tempValSpan) tempValSpan.innerText = val;
  },

  openConfirmModal() {
    this.state.showConfirmModal = true;
    this.render();
  },

  closeConfirmModal() {
    this.state.showConfirmModal = false;
    this.render();
  },

  submitReviewRequest() {
    this.state.reviewRequested = true;
    this.state.showConfirmModal = false;
    this.render();
    Utils.showToast('บันทึกส่งคำขอคำปรึกษาไปยังแพทย์และเภสัชกรในระบบเรียบร้อยแล้ว', 'success', 3000);
  },

  handleChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('agent-chat-input');
    if (input && input.value.trim()) {
      const question = input.value;
      input.value = '';
      this.askQuestion(question);
    }
  }
};
