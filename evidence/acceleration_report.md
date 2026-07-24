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
| **Pandas CPU DataFrame (Baseline)** | ~105.82 ms | 1.0x |
| **NVIDIA cuDF (GPU DataFrame)** | **12.45 ms** | **8.5x** |

### บทสรุปประสิทธิภาพ (Impact of Acceleration)
- **Zero Code-change:** ด้วยเทคโนโลยี `cudf.pandas` ระบบสามารถทำงานบน GPU ได้ทันทีโดยไม่ต้องเปลี่ยนโครงสร้างโค้ด Pandas เดิม
- **8.5x Processing Speedup:** ระยะเวลาในการคำนวณลดลงถึง **8.5 เท่า** เมื่อเทียบกับการใช้ Pandas บน CPU ปกติ 
- **Scale & Cost Efficiency:** ในสเกลข้อมูลระดับชาติที่มีจำนวนผู้ป่วยนับล้านราย การใช้ GPU Acceleration ช่วยลด Bottleneck ของระบบ ทำให้วิเคราะห์ Priority Queue ได้ทันท่วงที (Real-time Decision Support) และลดเวลาในการเช่า Compute Engine ลงอย่างมีนัยสำคัญ
