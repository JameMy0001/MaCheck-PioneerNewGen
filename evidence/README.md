# Evidence Pack: MaCheck (NVIDIA RAPIDS & GCP Data Analytics)

โฟลเดอร์นี้ใช้สำหรับจัดเก็บหลักฐาน (Screenshot และเอกสาร) เพื่อทำการบีบอัด (ZIP) ส่งมอบให้กรรมการในขั้นตอนสุดท้ายของการประกวด Google Cloud 

กรุณานำภาพ Screenshot ของคุณมาวางไว้ในโฟลเดอร์นี้ และเปลี่ยนชื่อไฟล์ให้ตรงตามมาตรฐานด้านล่างนี้เพื่อให้ง่ายต่อการตรวจทานครับ:

## รายการภาพหลักฐานที่ต้องจัดเตรียม (Screenshot Checklist)

| ชื่อไฟล์ที่กำหนด (อิงตาม P0) | คำอธิบาย (สิ่งที่คุณต้องแคปเจอร์) | สถานะ |
|-------------------------|--------------------------------|---|
| `01_gcp_project_billing.png` | หน้าจอ Project Info ที่เห็น Project ID และสถานะ Billing ว่า Active | [ ] |
| `02_gcs_raw_bucket.png`      | หน้าจอ Cloud Storage Bucket ที่อัปโหลดไฟล์ `adherence_raw.csv` แล้ว | [ ] |
| `03_gcs_processed.png`       | หน้าจอ Cloud Storage Bucket ที่เห็นไฟล์รายงานผล หรือ CSV อื่นๆ | [ ] |
| `04_bq_dataset_schema.png`   | หน้าจอ BigQuery Console ที่เห็นตาราง Schema หรือผลรัน Query (Row count) | [ ] |
| `05_looker_dashboard.png`    | หน้าจอ Dashboard บน Looker Studio ที่แชร์ Public แล้ว (และมีลิงก์แนบ) | ✅ มีแล้ว |
| `06_cloud_run_deploy.png`    | (ถ้ามี) หน้าจอ Cloud Run Service ที่กำลังรัน FastAPI / Streamlit สำเร็จ | [ ] |

## เอกสาร Benchmark (Acceleration Evidence)

เอกสารผลการรันเปรียบเทียบ CPU กับ GPU (172x Speedup) ได้ถูกเตรียมไว้ให้แล้วในไฟล์:
👉 **`acceleration_report.md`** (อยู่ในโฟลเดอร์เดียวกันนี้)

---
> 💡 **Tip:** เมื่อรวบรวมไฟล์ภาพทั้งหมดและตั้งชื่อตามด้านบนครบถ้วนแล้ว ให้รวมโฟลเดอร์นี้เป็นไฟล์ ZIP (เช่น `MaCheck_Evidence.zip`) เพื่อความสะดวกในการอัปโหลดส่งงานครับ
