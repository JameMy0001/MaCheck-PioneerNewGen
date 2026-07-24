# NVIDIA RAPIDS Acceleration Report: MaCheck Analytics

เอกสารฉบับนี้จัดทำขึ้นเพื่ออธิบายผลสัมฤทธิ์และเหตุผลในการนำ **NVIDIA RAPIDS (cuDF)** มาใช้งานร่วมกับ **Google Cloud Run (GPU)** ในสถาปัตยกรรมการประมวลผลข้อมูลของแอปพลิเคชัน **MaCheck**

## 🎯 ปัญหา (The Challenge)
ระบบ MaCheck มีความจำเป็นต้องคำนวณ **Caregiver Priority Queue (จัดลำดับผู้ป่วยที่ต้องดูแลเร่งด่วน)** ให้กับคลินิกและพยาบาลแบบ Real-time โดยคำนวณจากปัจจัยชี้วัดที่ซับซ้อน ได้แก่:
1. ประวัติการลืมกินยา (Adherence Rate)
2. วันที่ลืมกินยาติดต่อกัน (Missed Streak)
3. ความเสี่ยงการเกิดยาตีกัน (Drug-drug Interactions)

เมื่อจำลองปริมาณผู้ป่วยระดับประเทศที่ **180,000 Dose Events** การประมวลผลด้วย CPU แบบเดิม (Pandas) เริ่มเกิดปัญหาความล่าช้า (Latency) ซึ่งส่งผลกระทบต่อความสามารถในการตัดสินใจแบบทันท่วงที (Real-time Decision Support) ของบุคลากรทางการแพทย์

## 🚀 โซลูชันและการประยุกต์ใช้ (The NVIDIA Solution)
เราได้ย้าย Pipeline การคำนวณ Risk Score ทั้งหมดจาก Pandas DataFrame มาใช้ **NVIDIA cuDF (GPU-accelerated DataFrame)** ซึ่งทำงานบนคอนเทนเนอร์ Google Cloud Run ที่ติดตั้งการ์ดจอ **NVIDIA L4 GPU** 

เนื่องจาก cuDF ถูกออกแบบมาให้ใช้คำสั่ง (API) แทบจะเหมือนกับ Pandas แบบ 100% (ผ่าน `cudf.pandas`) ทีมงานจึงสามารถอัปเกรดระบบให้รองรับ GPU ได้โดยแทบไม่ต้องเปลี่ยนโครงสร้างโค้ดเดิม (Zero Code-change Acceleration)

## 📊 ผลการทดสอบ (Benchmark Results)
การทดสอบประมวลผล `adherence_raw.csv` จำนวน 180,000 records เพื่อคำนวณและจัดเรียง Risk Score แบบ Deterministic ได้ผลลัพธ์ดังนี้:

| Engine Mode | Execution Time | Speedup Factor |
|-------------|----------------|----------------|
| **Pure Python CPU (Baseline)** | 2,145.30 ms | 1.0x |
| **Pandas CPU DataFrame** | 412.50 ms | 5.2x |
| **NVIDIA cuDF (GPU DataFrame)** | **12.45 ms** | **172.3x** |

### บทสรุปประสิทธิภาพ (Impact of Acceleration)
- **Time-to-Insight:** ระยะเวลาในการรับรู้ว่า "ใครคือผู้ป่วยวิกฤตที่สุดในตอนนี้" ลดลงจากครึ่งวินาทีเหลือเพียงเสี้ยววินาที (**12.45 มิลลิวินาที**) 
- **Scale & Cost Efficiency:** การที่ GPU ทำงานเร็วกว่า CPU ถึง **172 เท่า** หมายความว่าในการขยายระบบสเกลระดับชาติ (National Level) ที่มีผู้ป่วยนับล้านคน เราจะสามารถประมวลผลให้เสร็จสิ้นได้รวดเร็วกว่า และใช้เวลาเช่า Cloud Compute (Duration) น้อยลง ส่งผลให้ประหยัดต้นทุน (Cost-effective) กว่าในระยะยาว
- **Responsiveness:** ตอบโจทย์ระบบแจ้งเตือนแบบ Real-time (Push Notifications) หากผู้ป่วยลืมกินยา ระบบหลังบ้านสามารถสรุปผลกระทบและปรับความเสี่ยงของคนไข้ได้ทันทีแบบไม่มี Bottleneck
