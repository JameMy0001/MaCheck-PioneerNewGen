"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

type View = "today" | "search" | "health" | "calendar" | "insights" | "agent" | "settings";
type Scenario = "before" | "due" | "late";
type DoseStatus = "pending" | "taken" | "late" | "missed" | "uncertain";
type ModalType = "complete" | "forgot" | "duplicate" | "doseAdvice" | null;
type AgentRunStatus = "ready" | "running";
type AgentTone = "ok" | "watch" | "review";

type PatientSnapshot = {
  version: number;
  updatedAt: string;
  changeReason: string;
  conditions: string[];
  allergies: Array<{ name: string; reaction: string; verified: boolean }>;
  weight: { current: number; previous: number; updatedAt: string };
  schedule: Array<{ time: string; medicines: string[] }>;
  cabinet: Array<{ name: string; dose: string; remaining: string; inSchedule: boolean }>;
};

type AgentSummaryRow = {
  id: string;
  category: string;
  latest: string;
  analysis: string;
  source: string;
  tone: AgentTone;
  status: string;
};

const medicines = [
  { id: "metformin", name: "เมทฟอร์มิน", en: "Metformin", dose: "500 mg", amount: "1 เม็ด", note: "หลังอาหารเช้า", time: "08:00", category: "ยาเบาหวาน", description: "ช่วยควบคุมระดับน้ำตาลในเลือด" },
  { id: "amlodipine", name: "แอมโลดิพีน", en: "Amlodipine", dose: "5 mg", amount: "1 เม็ด", note: "หลังอาหารเช้า", time: "08:00", category: "ยาความดัน", description: "ช่วยควบคุมความดันโลหิต" },
  { id: "atorvastatin", name: "อะทอร์วาสแตติน", en: "Atorvastatin", dose: "20 mg", amount: "1 เม็ด", note: "ก่อนนอน", time: "20:00", category: "ยาลดไขมัน", description: "ช่วยลดคอเลสเตอรอลและไตรกลีเซอไรด์" },
  { id: "paracetamol", name: "พาราเซตามอล", en: "Paracetamol", dose: "500 mg", amount: "ตามคำสั่ง", note: "เมื่อมีอาการ", time: "-", category: "ยาแก้ปวด/ลดไข้", description: "บรรเทาอาการปวดและลดไข้" },
  { id: "warfarin", name: "วาร์ฟาริน", en: "Warfarin", dose: "3 mg", amount: "ตามคำสั่งแพทย์", note: "เวลาเดิมทุกวัน", time: "18:00", category: "ยาต้านการแข็งตัวของเลือด", description: "ต้องติดตามค่า INR และใช้ตามคำสั่งแพทย์อย่างเคร่งครัด" },
];

const aliases: Record<string, string[]> = {
  metformin: ["เมทฟอมิน", "เม็ดฟอร์มิน", "เบาหวาน", "น้ำตาล"],
  amlodipine: ["แอมโล", "ความดัน", "amlodipin"],
  atorvastatin: ["อะทอ", "ไขมัน", "คอเลสเตอรอล"],
  paracetamol: ["พารา", "ปวดหัว", "ลดไข้", "แก้ปวด"],
  warfarin: ["วาฟาริน", "เลือด", "inr"],
};

const calendarEvents: Record<number, DoseStatus> = {
  1: "taken", 2: "taken", 3: "late", 4: "taken", 5: "taken", 6: "missed", 7: "taken",
  8: "taken", 9: "taken", 10: "taken", 11: "late", 12: "taken", 13: "taken", 14: "missed",
  15: "taken", 16: "taken", 17: "uncertain", 18: "taken", 19: "taken", 20: "pending",
};

const statusCopy: Record<DoseStatus, { label: string; className: string }> = {
  pending: { label: "รอบันทึก", className: "status-pending" },
  taken: { label: "ตรงเวลา", className: "status-taken" },
  late: { label: "กินช้า", className: "status-late" },
  missed: { label: "ลืมยา", className: "status-missed" },
  uncertain: { label: "ไม่แน่ใจ", className: "status-uncertain" },
};

const navItems: Array<{ id: View; label: string; short: string; icon: string }> = [
  { id: "today", label: "วันนี้", short: "วันนี้", icon: "01" },
  { id: "search", label: "Smart Search", short: "ค้นหา", icon: "02" },
  { id: "health", label: "Weekly Health", short: "สุขภาพ", icon: "03" },
  { id: "calendar", label: "ปฏิทินการกินยา", short: "ปฏิทิน", icon: "04" },
  { id: "insights", label: "Adherence Insights", short: "สรุป", icon: "05" },
  { id: "agent", label: "AI Care Agent", short: "Agent", icon: "06" },
  { id: "settings", label: "การช่วยเหลือ", short: "ตั้งค่า", icon: "07" },
];

function createInitialPatientSnapshot(): PatientSnapshot {
  return {
    version: 42,
    updatedAt: "20 ก.ค. 2569 · 14:30",
    changeReason: "ซิงก์ข้อมูลประจำวัน",
    conditions: ["เบาหวานชนิดที่ 2", "ความดันโลหิตสูง"],
    allergies: [{ name: "เพนิซิลลิน", reaction: "มีผื่น", verified: true }],
    weight: { current: 68.4, previous: 66.8, updatedAt: "20 ก.ค. 2569" },
    schedule: [
      { time: "08:00", medicines: ["เมทฟอร์มิน 500 mg", "แอมโลดิพีน 5 mg"] },
      { time: "20:00", medicines: ["อะทอร์วาสแตติน 20 mg"] },
    ],
    cabinet: [
      { name: "เมทฟอร์มิน", dose: "500 mg", remaining: "เหลือประมาณ 10 วัน", inSchedule: true },
      { name: "แอมโลดิพีน", dose: "5 mg", remaining: "เหลือประมาณ 18 วัน", inSchedule: true },
      { name: "อะทอร์วาสแตติน", dose: "20 mg", remaining: "เหลือประมาณ 12 วัน", inSchedule: true },
      { name: "พาราเซตามอล", dose: "500 mg", remaining: "หมดอายุ 31 ธ.ค. 2569", inSchedule: false },
    ],
  };
}

function buildAgentSummary(snapshot: PatientSnapshot, doseStatus: DoseStatus): AgentSummaryRow[] {
  const hasKidneyCondition = snapshot.conditions.some((condition) => condition.includes("ไต"));
  const hasUnscheduledMedicine = snapshot.cabinet.some((medicine) => !medicine.inSchedule && medicine.name !== "พาราเซตามอล");
  const weightChange = snapshot.weight.current - snapshot.weight.previous;
  const scheduledMedicineCount = snapshot.schedule.reduce((total, slot) => total + slot.medicines.length, 0);

  return [
    {
      id: "conditions",
      category: "โรคประจำตัว",
      latest: snapshot.conditions.join(" · "),
      analysis: hasKidneyCondition
        ? "พบโรคใหม่ที่อาจกระทบการประเมินยา Agent พักผลคาดการณ์ขนาดยาไว้จนกว่าจะมีข้อมูลประกอบครบ"
        : "ตรวจรายการยากับโรคที่บันทึกแล้ว ยังไม่มีเหตุให้เปลี่ยนตารางยาในข้อมูลจำลอง",
      source: `โปรไฟล์สุขภาพ · ${snapshot.updatedAt}`,
      tone: hasKidneyCondition ? "review" : "ok",
      status: hasKidneyCondition ? "ต้องทบทวน" : "ตรวจแล้ว",
    },
    {
      id: "allergies",
      category: "ข้อมูลแพ้ยา",
      latest: snapshot.allergies.map((allergy) => `${allergy.name} — ${allergy.reaction}`).join(" · "),
      analysis: "Agent เปรียบเทียบประวัติแพ้ยากับชื่อและตัวยาในตู้ทุกครั้งที่รายการยาเปลี่ยน",
      source: `ผู้ใช้ยืนยัน ${snapshot.allergies.filter((allergy) => allergy.verified).length} รายการ`,
      tone: "ok",
      status: "ข้อมูลยืนยันแล้ว",
    },
    {
      id: "interactions",
      category: "ยาตีกัน/ข้อควรระวัง",
      latest: hasKidneyCondition
        ? "พบ 1 ประเด็นต้องตรวจยากับโรคใหม่ และรอข้อมูลการทำงานของไต"
        : hasUnscheduledMedicine
          ? "พบยาใหม่ในตู้ที่ยังไม่ผ่าน Medication Reconciliation"
          : "ตรวจยาที่ใช้อยู่ 3 รายการกับโรคและประวัติแพ้ยา",
      analysis: hasKidneyCondition || hasUnscheduledMedicine
        ? "ส่งเข้า Safety Review และไม่สร้างคำแนะนำเปลี่ยนยาอัตโนมัติ"
        : "ไม่พบสัญญาณระดับเร่งด่วนในชุดข้อมูลจำลอง ผลจริงต้องอ้างอิงฐานข้อมูลยาที่ผ่านการตรวจสอบ",
      source: "Interaction Engine · reviewed catalog v1.8",
      tone: hasKidneyCondition || hasUnscheduledMedicine ? "review" : "ok",
      status: hasKidneyCondition || hasUnscheduledMedicine ? "รอตรวจเพิ่ม" : "ไม่พบเหตุเร่งด่วน",
    },
    {
      id: "schedule",
      category: "ตารางกินยา",
      latest: snapshot.schedule.map((slot) => `${slot.time} ${slot.medicines.length} รายการ`).join(" · "),
      analysis: `รวม ${scheduledMedicineCount} รายการ · รอบเช้าวันนี้สถานะ “${statusCopy[doseStatus].label}” ตารางเดิมยังไม่ถูกแก้ไข`,
      source: "Medication Schedule · อัปเดตวันนี้",
      tone: doseStatus === "missed" || doseStatus === "uncertain" ? "watch" : "ok",
      status: doseStatus === "pending" ? "รอบันทึกรอบเช้า" : statusCopy[doseStatus].label,
    },
    {
      id: "cabinet",
      category: "ยาในตู้ยา",
      latest: `${snapshot.cabinet.length} รายการ · ${snapshot.cabinet.filter((medicine) => medicine.inSchedule).length} รายการอยู่ในตาราง`,
      analysis: hasUnscheduledMedicine
        ? "พบยาใหม่ที่ยังไม่อยู่ในตาราง Agent แยกรายการไว้และขอให้ตรวจสอบก่อนใช้"
        : "เมทฟอร์มินเหลือประมาณ 10 วัน · พาราเซตามอลไม่ได้อยู่ในตารางประจำ",
      source: `Medicine Cabinet · Snapshot v${snapshot.version}`,
      tone: hasUnscheduledMedicine ? "watch" : "ok",
      status: hasUnscheduledMedicine ? "มีรายการใหม่" : "ตรวจครบ",
    },
    {
      id: "body",
      category: "น้ำหนัก/การเปลี่ยนแปลงร่างกาย",
      latest: `${snapshot.weight.current.toFixed(1)} kg · เปลี่ยน ${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg`,
      analysis: Math.abs(weightChange) >= 3
        ? "น้ำหนักเปลี่ยนถึงเกณฑ์ทบทวน Agent สร้างคำขอประเมินใหม่ แต่ยังไม่คำนวณหรือเปลี่ยนขนาดยาเอง"
        : "บันทึกเป็นข้อมูลล่าสุดสำหรับการประเมินครั้งถัดไป ตารางยายังทำงานตามเดิม",
      source: `Weekly Health · ${snapshot.weight.updatedAt}`,
      tone: Math.abs(weightChange) >= 3 ? "watch" : "ok",
      status: Math.abs(weightChange) >= 3 ? "ควรประเมินใหม่" : "ข้อมูลล่าสุด",
    },
  ];
}

function StatusPill({ status }: { status: DoseStatus }) {
  return <span className={`status-pill ${statusCopy[status].className}`}>{statusCopy[status].label}</span>;
}

function Metric({ value, label, tone = "teal" }: { value: string; label: string; tone?: "teal" | "amber" | "red" | "blue" }) {
  return (
    <div className={`metric metric-${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("agent");
  const [scenario, setScenario] = useState<Scenario>("due");
  const [doseStatus, setDoseStatus] = useState<DoseStatus>("pending");
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedMeds, setSelectedMeds] = useState<Record<string, boolean>>({ metformin: true, amlodipine: true });
  const [barrier, setBarrier] = useState("ไม่ได้ยินการเตือน");
  const [searchQuery, setSearchQuery] = useState("เมทฟอมิน");
  const [selectedMedicine, setSelectedMedicine] = useState(medicines[0]);
  const [weeklyValid, setWeeklyValid] = useState(true);
  const [weight, setWeight] = useState("68.4");
  const [adviceRequestStatus, setAdviceRequestStatus] = useState<"idle" | "pending">("idle");
  const [adviceConfirmed, setAdviceConfirmed] = useState(false);
  const [selectedDay, setSelectedDay] = useState(17);
  const [calendarFilter, setCalendarFilter] = useState("all");
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(true);
  const [caregiverEnabled, setCaregiverEnabled] = useState(false);
  const [mlMode, setMlMode] = useState<"silent" | "adaptive">("silent");
  const [patientSnapshot, setPatientSnapshot] = useState<PatientSnapshot>(createInitialPatientSnapshot);
  const [agentStatus, setAgentStatus] = useState<AgentRunStatus>("ready");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    if (agentStatus !== "running") return;
    const timer = window.setTimeout(() => setAgentStatus("ready"), 720);
    return () => window.clearTimeout(timer);
  }, [agentStatus, patientSnapshot.version]);

  const searchResults = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return medicines;
    return medicines.filter((medicine) => {
      const haystack = [medicine.name, medicine.en, medicine.category, medicine.description, ...(aliases[medicine.id] ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized) || normalized.split(/\s+/).every((term) => haystack.includes(term));
    });
  }, [searchQuery]);

  const scenarioText = scenario === "before" ? "07:40 - ก่อนเวลา" : scenario === "due" ? "08:00 - ถึงเวลา" : "08:35 - เลยเวลา";
  const actionAvailable = scenario !== "before";
  const riskScore = doseStatus === "missed" ? 86 : doseStatus === "uncertain" ? 91 : 78;
  const previousWeight = 66.8;
  const parsedWeight = Number(weight.replace(",", "."));
  const hasValidWeight = Number.isFinite(parsedWeight) && parsedWeight >= 30 && parsedWeight <= 250;
  const weightChange = hasValidWeight ? parsedWeight - previousWeight : 0;
  const currentDose = 500;
  const predictedDose = weightChange > 1.5 ? 750 : weightChange < -1.5 ? 250 : 500;
  const doseDelta = predictedDose - currentDose;
  const doseDeltaLabel = doseDelta > 0 ? `+${doseDelta} mg` : `${doseDelta} mg`;
  const agentRows = useMemo(() => buildAgentSummary(patientSnapshot, doseStatus), [patientSnapshot, doseStatus]);
  const agentFindings = agentRows.filter((row) => row.tone !== "ok");
  const hasKidneyCondition = patientSnapshot.conditions.some((condition) => condition.includes("ไต"));
  const hasNewCabinetMedicine = patientSnapshot.cabinet.some((medicine) => medicine.name === "วาร์ฟาริน");
  const hasLargeWeightChange = Math.abs(patientSnapshot.weight.current - patientSnapshot.weight.previous) >= 3;

  const openAction = (type: Exclude<ModalType, null>) => {
    setModal(type);
    if (type === "complete") setSelectedMeds({ metformin: true, amlodipine: true });
  };

  const confirmComplete = () => {
    const count = Object.values(selectedMeds).filter(Boolean).length;
    if (!count) {
      setToast("กรุณาเลือกยาอย่างน้อย 1 รายการ");
      return;
    }
    setDoseStatus(scenario === "late" ? "late" : "taken");
    setPatientSnapshot((current) => ({ ...current, version: current.version + 1, updatedAt: "20 ก.ค. 2569 · 15:05", changeReason: "ผู้ใช้บันทึกว่ากินยาแล้ว" }));
    setAgentStatus("running");
    setModal(null);
    setToast(`บันทึกแล้ว ${count} รายการ`);
  };

  const confirmForgot = () => {
    setDoseStatus("missed");
    setPatientSnapshot((current) => ({ ...current, version: current.version + 1, updatedAt: "20 ก.ค. 2569 · 15:05", changeReason: "บันทึกเหตุการณ์ลืมยา" }));
    setAgentStatus("running");
    setModal(null);
    setAdaptiveEnabled(true);
    setToast("บันทึกการลืมยาและปรับแผนสัปดาห์ถัดไปแล้ว");
  };

  const confirmDuplicate = () => {
    setDoseStatus("uncertain");
    setPatientSnapshot((current) => ({ ...current, version: current.version + 1, updatedAt: "20 ก.ค. 2569 · 15:05", changeReason: "บันทึกเหตุการณ์อาจกินยาซ้ำ" }));
    setAgentStatus("running");
    setModal(null);
    setToast("ระงับการเตือนให้กินซ้ำในช่วงนี้แล้ว");
  };

  const saveHealth = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasValidWeight) {
      setToast("กรุณากรอกน้ำหนักระหว่าง 30–250 kg");
      return;
    }
    setWeeklyValid(true);
    setAdviceRequestStatus("idle");
    setPatientSnapshot((current) => ({
      ...current,
      version: current.version + 1,
      updatedAt: "20 ก.ค. 2569 · 15:05",
      changeReason: `Weekly Health อัปเดตน้ำหนักเป็น ${parsedWeight.toFixed(1)} kg`,
      weight: { current: parsedWeight, previous: current.weight.current, updatedAt: "20 ก.ค. 2569" },
    }));
    setAgentStatus("running");
    setToast("AI วิเคราะห์น้ำหนักแล้ว ตารางยายังไม่เปลี่ยน");
  };

  const openDoseAdvice = () => {
    setAdviceConfirmed(false);
    setModal("doseAdvice");
  };

  const confirmDoseAdvice = () => {
    if (!adviceConfirmed) return;
    setAdviceRequestStatus("pending");
    setModal(null);
    setToast("ส่งคำขอแล้ว · รอผู้เชี่ยวชาญยืนยัน ตารางยาเดิมยังไม่เปลี่ยน");
  };

  const runAgentUpdate = (event: "refresh" | "condition" | "weight" | "cabinet") => {
    setAgentStatus("running");
    setPatientSnapshot((current) => {
      const next: PatientSnapshot = {
        ...current,
        version: current.version + 1,
        updatedAt: "20 ก.ค. 2569 · 15:05",
        conditions: [...current.conditions],
        weight: { ...current.weight },
        cabinet: current.cabinet.map((medicine) => ({ ...medicine })),
      };

      if (event === "condition" && !next.conditions.some((condition) => condition.includes("ไต"))) {
        next.conditions.push("โรคไตเรื้อรัง · ข้อมูลใหม่");
        next.changeReason = "เพิ่มโรคประจำตัวใหม่";
      } else if (event === "weight") {
        next.weight.current = 70.2;
        next.weight.updatedAt = "20 ก.ค. 2569";
        next.changeReason = "น้ำหนักเปลี่ยนเป็น 70.2 kg";
      } else if (event === "cabinet" && !next.cabinet.some((medicine) => medicine.name === "วาร์ฟาริน")) {
        next.cabinet.push({ name: "วาร์ฟาริน", dose: "3 mg", remaining: "เพิ่งเพิ่มเข้าตู้", inSchedule: false });
        next.changeReason = "พบยาใหม่ในตู้ยา";
      } else {
        next.changeReason = "สั่งวิเคราะห์ข้อมูลล่าสุดอีกครั้ง";
      }

      return next;
    });
    setToast("Agent รับข้อมูลใหม่และกำลังตรวจผลกระทบทุกโมดูล");
  };

  const resetAgentSnapshot = () => {
    setPatientSnapshot(createInitialPatientSnapshot());
    setAgentStatus("ready");
    setToast("คืนค่า Patient Snapshot เริ่มต้นแล้ว");
  };

  const resetDemo = () => {
    setScenario("due");
    setDoseStatus("pending");
    setWeeklyValid(true);
    setWeight("68.4");
    setAdviceRequestStatus("idle");
    setAdviceConfirmed(false);
    setAdaptiveEnabled(true);
    setMlMode("silent");
    setPatientSnapshot(createInitialPatientSnapshot());
    setAgentStatus("ready");
    setToast("รีเซ็ตข้อมูลจำลองแล้ว");
  };

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="เมนูหลัก">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true"><span>Y</span><i /></div>
          <div>
            <strong>YaCheck</strong>
            <small>AI Prototype Lab</small>
          </div>
        </div>

        <nav className="side-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "nav-item active" : "nav-item"}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
              data-testid={`nav-${item.id}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="prototype-note">
          <span>TEST MODE</span>
          <p>ข้อมูลทั้งหมดเป็นข้อมูลจำลอง ไม่มีผลต่อแอปหลัก</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">ADHERENCE INTELLIGENCE</p>
            <h1>{navItems.find((item) => item.id === view)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <label className="scenario-control">
              <span>เวลาจำลอง</span>
              <select value={scenario} onChange={(event) => setScenario(event.target.value as Scenario)} aria-label="เลือกเวลาจำลอง" data-testid="scenario-select">
                <option value="before">07:40 - ก่อนเวลา</option>
                <option value="due">08:00 - ถึงเวลา</option>
                <option value="late">08:35 - เลยเวลา</option>
              </select>
            </label>
            <button className="icon-button" onClick={resetDemo} aria-label="รีเซ็ตข้อมูลจำลอง">↻</button>
            <div className="avatar">ก</div>
          </div>
        </header>

        <div className="content-area">
          {view === "today" && (
            <div className="page-grid today-page">
              <section className="hero-panel">
                <div className="hero-copy">
                  <span className="date-chip">จันทร์ 20 กรกฎาคม 2569</span>
                  <h2>{scenario === "before" ? "อีก 20 นาทีถึงเวลากินยา" : scenario === "due" ? "ถึงเวลากินยาช่วงเช้า" : "เลยเวลากินยา 35 นาที"}</h2>
                  <p>{scenario === "before" ? "ปุ่มบันทึกเหตุการณ์จะปรากฏเมื่อถึงเวลา 08:00" : "ตรวจรายการยาแล้วเลือกสถานะที่ตรงกับสิ่งที่เกิดขึ้น"}</p>
                </div>
                <div className="hero-time">
                  <small>เวลาจำลอง</small>
                  <strong>{scenarioText.split(" - ")[0]}</strong>
                  <span>{scenarioText.split(" - ")[1]}</span>
                </div>
              </section>

              <section className="card medication-card">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">ช่วงเช้า · 08:00</span>
                    <h3>รายการยารอบนี้</h3>
                  </div>
                  <StatusPill status={doseStatus} />
                </div>
                <div className="medicine-list">
                  {medicines.slice(0, 2).map((medicine) => (
                    <article className="medicine-row" key={medicine.id}>
                      <div className="medicine-icon">{medicine.name.slice(0, 1)}</div>
                      <div>
                        <strong>{medicine.name}</strong>
                        <p>{medicine.dose} · {medicine.amount} · {medicine.note}</p>
                      </div>
                      <span>{medicine.time}</span>
                    </article>
                  ))}
                </div>

                {!actionAvailable ? (
                  <div className="locked-actions" data-testid="actions-locked">
                    <span>ปุ่มจะเปิดเมื่อถึงเวลา</span>
                    <p>ก่อนเวลา ระบบจะแสดงเฉพาะรายการยาและเวลาที่กำหนด</p>
                  </div>
                ) : (
                  <div className="dose-actions" data-testid="dose-actions">
                    <button className="action-button action-complete" onClick={() => openAction("complete")} data-testid="action-complete">
                      <span>✓</span><strong>กินยาครบช่วงนี้แล้ว</strong><small>ตรวจรายการก่อนบันทึก</small>
                    </button>
                    <button className="action-button action-forgot" onClick={() => openAction("forgot")} data-testid="action-forgot">
                      <span>−</span><strong>ฉันลืมยา</strong><small>รับคำแนะนำเฉพาะรายการ</small>
                    </button>
                    <button className="action-button action-duplicate" onClick={() => openAction("duplicate")} data-testid="action-duplicate">
                      <span>?</span><strong>ฉันอาจกินยาซ้ำ</strong><small>หยุดเตือนและตรวจความปลอดภัย</small>
                    </button>
                  </div>
                )}
              </section>

              <aside className="side-stack">
                <section className="card risk-card">
                  <div className="section-heading compact">
                    <div><span className="section-kicker">ML RISK PREDICTION</span><h3>ความเสี่ยงลืมยาช่วงเย็น</h3></div>
                    <span className="model-badge">{mlMode === "silent" ? "Silent Mode" : "Adaptive"}</span>
                  </div>
                  <div className="risk-gauge" style={{ "--risk": `${riskScore}%` } as CSSProperties}>
                    <div><strong>{riskScore}%</strong><span>ความเสี่ยงสูง</span></div>
                  </div>
                  <ul className="reason-list">
                    <li>ลืมยาช่วงเย็น 2 ครั้งใน 14 วัน</li>
                    <li>ไม่ตอบการเตือนครั้งแรก 4 ครั้ง</li>
                    <li>วันจันทร์เป็นวันที่มีความเสี่ยงสูงสุด</li>
                  </ul>
                  <button className="text-button" onClick={() => setView("insights")}>ดูเหตุผลและแผนสัปดาห์หน้า →</button>
                </section>

                <section className={`card health-status ${weeklyValid ? "valid" : "expired"}`}>
                  <div className="health-status-icon">{weeklyValid ? "✓" : "!"}</div>
                  <div>
                    <span className="section-kicker">WEEKLY HEALTH CHECK</span>
                    <h3>{weeklyValid ? "ข้อมูลพร้อมวิเคราะห์" : "ข้อมูลหมดอายุ"}</h3>
                    <p>{weeklyValid ? "อัปเดตล่าสุดวันนี้ · ใช้ได้อีก 7 วัน" : "Precision Dosing ถูกล็อก แต่การเตือนยาทำงานตามปกติ"}</p>
                  </div>
                  <button onClick={() => setView("health")}>{weeklyValid ? "ดูข้อมูล" : "อัปเดตตอนนี้"}</button>
                </section>
              </aside>
            </div>
          )}

          {view === "search" && (
            <div className="search-layout">
              <section className="card search-panel">
                <div className="section-heading">
                  <div><span className="section-kicker">ทำงานในเครื่อง · OFFLINE</span><h2>ค้นหายาแบบเข้าใจความหมาย</h2></div>
                  <span className="secure-chip">Local catalog v1.8</span>
                </div>
                <label className="search-field">
                  <span aria-hidden="true">⌕</span>
                  <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ลองพิมพ์ เมทฟอมิน, เบาหวาน หรือ ปวดหัว" aria-label="ค้นหายา" data-testid="search-input" />
                  {searchQuery && <button onClick={() => setSearchQuery("")} aria-label="ล้างคำค้น">×</button>}
                </label>
                <div className="search-hints">
                  {['เมทฟอมิน', 'ยาเบาหวาน', 'ปวดหัว', 'ความดัน'].map((term) => <button key={term} onClick={() => setSearchQuery(term)}>{term}</button>)}
                </div>
                <p className="result-count">พบ {searchResults.length} รายการ · รองรับชื่อไทย อังกฤษ คำพ้อง และคำสะกดผิด</p>
                <div className="search-results">
                  {searchResults.length ? searchResults.map((medicine) => (
                    <button key={medicine.id} className={selectedMedicine.id === medicine.id ? "result-card selected" : "result-card"} onClick={() => setSelectedMedicine(medicine)}>
                      <div className="result-letter">{medicine.name.slice(0, 1)}</div>
                      <div><strong>{medicine.name}</strong><span>{medicine.en} · {medicine.category}</span><p>{medicine.description}</p></div>
                      <small>{medicine.dose}</small>
                    </button>
                  )) : <div className="empty-state"><strong>ไม่พบรายการยา</strong><p>ลองใช้ชื่อสามัญ ชื่อภาษาอังกฤษ หรือหมวดยา</p></div>}
                </div>
              </section>

              <aside className="card medicine-detail">
                <span className="section-kicker">เหตุผลที่พบรายการนี้</span>
                <h2>{selectedMedicine.name}</h2>
                <p className="english-name">{selectedMedicine.en}</p>
                <div className="match-reason">✓ ตรงกับคำสะกดใกล้เคียงและคำพ้องในแคตตาล็อก</div>
                <dl>
                  <div><dt>หมวดหมู่</dt><dd>{selectedMedicine.category}</dd></div>
                  <div><dt>ความแรงตัวอย่าง</dt><dd>{selectedMedicine.dose}</dd></div>
                  <div><dt>แหล่งข้อมูล</dt><dd>Clinical catalog · reviewed 18 ก.ค. 2569</dd></div>
                </dl>
                <div className="safety-copy"><strong>ก่อนเพิ่มเข้าตู้ยา</strong><p>ยืนยันชื่อ ความแรง รูปแบบยา และคำสั่งจากฉลากหรือผู้เชี่ยวชาญทุกครั้ง</p></div>
                <button className="primary-button" onClick={() => setToast(`เลือก ${selectedMedicine.name} สำหรับทดสอบแล้ว`)}>เลือกยานี้ในโหมดทดสอบ</button>
              </aside>
            </div>
          )}

          {view === "health" && (
            <div className="health-layout">
              <section className="card weekly-form-card">
                <div className="section-heading">
                  <div><span className="section-kicker">กรอกสัปดาห์ละครั้ง</span><h2>น้ำหนักประจำสัปดาห์</h2></div>
                  <StatusPill status={weeklyValid ? "taken" : "missed"} />
                </div>
                <p className="intro-copy">กรอกเฉพาะน้ำหนักล่าสุด AI จะสร้างผลคาดการณ์สำหรับส่งให้ผู้เชี่ยวชาญประเมิน โดยไม่แก้ขนาดยาให้อัตโนมัติ</p>
                <form className="health-form weight-only-form" onSubmit={saveHealth}>
                  <label className="weight-input"><span>น้ำหนักปัจจุบัน</span><div><input value={weight} onChange={(event) => setWeight(event.target.value)} inputMode="decimal" aria-label="น้ำหนักปัจจุบัน หน่วยกิโลกรัม" data-testid="weight-input" /><em>kg</em></div><small>กรอกได้ระหว่าง 30–250 kg</small></label>
                  <div className="weight-history" aria-label="เปรียบเทียบน้ำหนัก">
                    <div><span>สัปดาห์ก่อน</span><strong>{previousWeight.toFixed(1)} kg</strong></div>
                    <div><span>สัปดาห์นี้</span><strong>{hasValidWeight ? `${parsedWeight.toFixed(1)} kg` : "—"}</strong></div>
                    <div className={weightChange > 0 ? "up" : ""}><span>เปลี่ยนแปลง</span><strong>{hasValidWeight ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg` : "—"}</strong></div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => setWeeklyValid(false)}>จำลองข้อมูลหมดอายุ</button>
                    <button type="submit" className="primary-button" data-testid="analyze-weight">วิเคราะห์จากน้ำหนัก</button>
                  </div>
                </form>
              </section>

              <aside className="screening-stack">
                <section className={`card precision-card ${weeklyValid ? "" : "locked"}`}>
                  <div className="section-heading compact">
                    <div><span className="section-kicker">AI DOSE FORECAST · DEMO</span><h3>คาดการณ์การปรับขนาดยา</h3></div>
                    <span className={weeklyValid ? "screen-level level-yellow" : "screen-level level-lock"}>{weeklyValid ? "รอการยืนยัน" : "ล็อก"}</span>
                  </div>
                  {weeklyValid ? (
                    <>
                      <div className="dose-demo-warning">
                        <strong>น้ำหนักอย่างเดียวไม่เพียงพอสำหรับปรับยาจริง</strong>
                        <p>ตัวเลขด้านล่างเป็นผลจำลองเพื่อทดสอบหน้าจอ ต้องให้แพทย์หรือเภสัชกรตรวจข้อมูลสุขภาพและรายการยาก่อนเสมอ</p>
                      </div>
                      <div className="dose-medication"><span>ยาตัวอย่างที่กำลังประเมิน</span><strong>เมทฟอร์มิน · หลังอาหารเช้า</strong></div>
                      <div className="dose-comparison" aria-label="เปรียบเทียบขนาดยาปัจจุบันและผลคาดการณ์">
                        <div className="dose-box"><span>ขนาดยาปัจจุบัน</span><strong>{currentDose} mg</strong><small>ตารางยาที่ใช้อยู่</small></div>
                        <div className="dose-arrow" aria-hidden="true">→</div>
                        <div className="dose-box candidate"><span>AI คาดการณ์</span><strong>{predictedDose} mg</strong><small>{doseDeltaLabel} · เพื่อขอประเมิน</small></div>
                      </div>
                      <div className="ai-rationale"><strong>เหตุผลที่ AI แสดงผลนี้</strong><p>น้ำหนักเปลี่ยน {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg จากสัปดาห์ก่อน จึงสร้างค่าจำลองเพื่อส่งตรวจสอบ ไม่ใช่สูตรคำนวณทางการแพทย์</p></div>
                      <div className="no-auto-banner"><strong>ยังไม่ใช่ขนาดที่ให้รับประทาน</strong><span>ระบบจะไม่เปลี่ยนตารางยา จนกว่าจะผ่านการตรวจจากผู้เชี่ยวชาญและผู้ป่วยยืนยันในขั้นตอนถัดไป</span></div>
                      <button className="primary-button" data-testid="request-dose-advice" disabled={!hasValidWeight || adviceRequestStatus === "pending"} onClick={openDoseAdvice}>{adviceRequestStatus === "pending" ? "ส่งคำขอแล้ว · รอผู้เชี่ยวชาญยืนยัน" : "ขอคำแนะนำและตรวจสอบ"}</button>
                    </>
                  ) : (
                    <div className="precision-locked"><span>⌁</span><strong>ผลวิเคราะห์ถูกพักไว้</strong><p>กรอกน้ำหนักประจำสัปดาห์เพื่อเปิดผลใหม่ การแจ้งเตือนและตารางยายังทำงานตามเดิม</p></div>
                  )}
                </section>

                <section className="card source-card">
                  <span className="section-kicker">TRACEABLE RESULT</span>
                  <h3>ข้อมูลที่ใช้วิเคราะห์</h3>
                  <dl><div><dt>น้ำหนักล่าสุด</dt><dd>{weeklyValid && hasValidWeight ? `${parsedWeight.toFixed(1)} kg` : "หมดอายุ"}</dd></div><div><dt>น้ำหนักสัปดาห์ก่อน</dt><dd>{previousWeight.toFixed(1)} kg</dd></div><div><dt>โมเดลจำลอง</dt><dd>PD-WEIGHT-DEMO v0.1</dd></div><div><dt>สถานะตารางยา</dt><dd>ไม่มีการเปลี่ยนแปลง</dd></div></dl>
                  <p>ผลนี้เป็นตัวอย่าง UX ของ AI ไม่ใช่คำสั่งการรักษาหรือสูตรแนะนำขนาดยา</p>
                </section>
              </aside>
            </div>
          )}

          {view === "calendar" && (
            <div className="calendar-layout">
              <section className="card calendar-card">
                <div className="section-heading calendar-heading">
                  <div><span className="section-kicker">DOSE EVENT LEDGER</span><h2>กรกฎาคม 2569</h2></div>
                  <label><span>แสดง</span><select value={calendarFilter} onChange={(event) => setCalendarFilter(event.target.value)}><option value="all">ยาทั้งหมด</option><option value="metformin">เมทฟอร์มิน</option><option value="amlodipine">แอมโลดิพีน</option></select></label>
                </div>
                <div className="calendar-legend">
                  {(["taken", "late", "missed", "uncertain", "pending"] as DoseStatus[]).map((status) => <span key={status}><i className={statusCopy[status].className} />{statusCopy[status].label}</span>)}
                </div>
                <div className="calendar-grid weekday-row">{['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((day) => <span key={day}>{day}</span>)}</div>
                <div className="calendar-grid days-grid">
                  {[29, 30].map((day) => <span className="day muted" key={`prev-${day}`}>{day}</span>)}
                  {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
                    const status = calendarEvents[day];
                    return (
                      <button key={day} className={`day ${selectedDay === day ? "selected" : ""} ${status ? statusCopy[status].className : "future"}`} onClick={() => setSelectedDay(day)} aria-label={`${day} กรกฎาคม ${status ? statusCopy[status].label : "ยังไม่มีข้อมูล"}`}>
                        <span>{day}</span>{status && <i />}
                      </button>
                    );
                  })}
                  {[1, 2, 3].map((day) => <span className="day muted" key={`next-${day}`}>{day}</span>)}
                </div>
              </section>

              <aside className="card day-detail">
                <span className="section-kicker">รายละเอียดรายวัน</span>
                <h2>{selectedDay} กรกฎาคม 2569</h2>
                <div className="day-summary"><StatusPill status={calendarEvents[selectedDay] ?? "pending"} /><span>{calendarEvents[selectedDay] === "missed" ? "กินครบ 1 จาก 2 รายการ" : calendarEvents[selectedDay] === "uncertain" ? "มี 1 รายการที่ไม่แน่ใจ" : "กินครบ 2 จาก 2 รายการ"}</span></div>
                <div className="timeline">
                  <article><i className={calendarEvents[selectedDay] === "missed" ? "red" : "green"} /><div><strong>08:00 · ช่วงเช้า</strong><p>เมทฟอร์มิน 500 mg · แอมโลดิพีน 5 mg</p><small>{calendarEvents[selectedDay] === "missed" ? "ไม่ได้บันทึกภายใน dose window" : "บันทึกโดยผู้ใช้เวลา 08:07"}</small></div></article>
                  <article><i className={calendarEvents[selectedDay] === "uncertain" ? "orange" : "green"} /><div><strong>20:00 · ก่อนนอน</strong><p>อะทอร์วาสแตติน 20 mg</p><small>{calendarEvents[selectedDay] === "uncertain" ? "ผู้ใช้เลือก อาจกินยาซ้ำ" : "บันทึกโดยผู้ใช้เวลา 20:04"}</small></div></article>
                </div>
                <button className="secondary-button full" onClick={() => setToast("เปิด Dose Event Ledger ในโหมดทดสอบ")}>ดูบันทึกเหตุการณ์ทั้งหมด</button>
              </aside>
            </div>
          )}

          {view === "insights" && (
            <div className="insights-page">
              <section className="insights-hero card">
                <div><span className="section-kicker">WEEKLY ADHERENCE REVIEW</span><h2>สัปดาห์นี้ดีขึ้น 6%</h2><p>คุณกินยาครบ 18 จาก 21 ช่วง โดยลืมช่วงเย็นมากที่สุด</p></div>
                <div className="score-ring"><strong>86%</strong><span>adherence</span></div>
              </section>

              <section className="metric-grid">
                <Metric value="14" label="ตรงเวลา" />
                <Metric value="4" label="กินช้า" tone="amber" />
                <Metric value="2" label="ลืมยา" tone="red" />
                <Metric value="1" label="ไม่แน่ใจ" tone="blue" />
              </section>

              <div className="insight-columns">
                <section className="card pattern-card">
                  <div className="section-heading compact"><div><span className="section-kicker">พฤติกรรม 7 วัน</span><h3>ช่วงเวลาที่ต้องดูแลเพิ่ม</h3></div><span className="model-badge">Model v0.1</span></div>
                  <div className="bar-chart">
                    {[['จ', 58], ['อ', 92], ['พ', 84], ['พฤ', 96], ['ศ', 72], ['ส', 90], ['อา', 88]].map(([day, value]) => (
                      <div key={day}><div className="bar-track"><i style={{ height: `${value}%` }} className={Number(value) < 70 ? "risk" : ""} /></div><span>{day}</span></div>
                    ))}
                  </div>
                  <div className="insight-callout"><strong>รูปแบบที่พบ</strong><p>วันจันทร์และช่วงเย็นมี response delay สูงกว่าค่าเฉลี่ย ควรทดลองเพิ่ม follow-up หลังเวลา</p></div>
                </section>

                <section className="card adaptive-plan">
                  <div className="section-heading compact"><div><span className="section-kicker">แผนสัปดาห์ถัดไป</span><h3>Adaptive Reminder</h3></div><button className={`switch ${adaptiveEnabled ? "on" : ""}`} onClick={() => setAdaptiveEnabled(!adaptiveEnabled)} aria-pressed={adaptiveEnabled} aria-label="เปิดหรือปิด Adaptive Reminder"><i /></button></div>
                  <div className="plan-timeline">
                    <article><time>19:50</time><div><strong>เตือนล่วงหน้า</strong><p>เฉพาะวันจันทร์และศุกร์</p></div></article>
                    <article><time>20:00</time><div><strong>เตือนตามเวลาปกติ</strong><p>ทุกวันตามตารางเดิม</p></div></article>
                    <article><time>20:20</time><div><strong>Follow-up</strong><p>ส่งเมื่อยังไม่ได้บันทึกเท่านั้น</p></div></article>
                  </div>
                  <div className="safety-limit">สูงสุด 3 ข้อความต่อช่วง · เว้นอย่างน้อย 15 นาที</div>
                  <button className="primary-button" onClick={() => setToast("ยืนยันแผนการเตือนสัปดาห์ถัดไปแล้ว")}>ยืนยันแผนสัปดาห์หน้า</button>
                </section>

                <section className="card ml-explain">
                  <div className="section-heading compact"><div><span className="section-kicker">EXPLAINABLE ML</span><h3>เหตุผลของคะแนนความเสี่ยง</h3></div><span className="risk-chip">สูง {riskScore}%</span></div>
                  <div className="factor-list">
                    <div><span>ลืมช่วงเย็นย้อนหลัง</span><i style={{ width: "88%" }} /><strong>สูง</strong></div>
                    <div><span>ไม่ตอบการเตือนแรก</span><i style={{ width: "72%" }} /><strong>สูง</strong></div>
                    <div><span>จำนวนยาในช่วง</span><i style={{ width: "46%" }} /><strong>กลาง</strong></div>
                    <div><span>Weekly Health Check</span><i style={{ width: "20%" }} /><strong>ต่ำ</strong></div>
                  </div>
                  <div className="mode-selector"><button className={mlMode === "silent" ? "selected" : ""} onClick={() => setMlMode("silent")}><strong>Silent Mode</strong><span>คำนวณแต่ยังไม่ปรับเตือน</span></button><button className={mlMode === "adaptive" ? "selected" : ""} onClick={() => setMlMode("adaptive")}><strong>Adaptive</strong><span>ให้โมเดลเสนอแผนเตือน</span></button></div>
                </section>
              </div>
            </div>
          )}

          {view === "agent" && (
            <div className="agent-page">
              <section className={`card agent-hero ${agentStatus === "running" ? "is-running" : ""}`}>
                <div className="agent-identity">
                  <div className="agent-orb" aria-hidden="true">✦</div>
                  <div>
                    <span className="section-kicker">SUPERVISED MEDICATION AGENT · LOCAL PROTOTYPE</span>
                    <h2>AI Care Agent ตรวจข้อมูลล่าสุดให้แล้ว</h2>
                    <p>รวมข้อมูลจากทุกโมดูลเป็น Patient Snapshot เดียว ตรวจผลกระทบซ้ำเมื่อข้อมูลเปลี่ยน และไม่แก้การรักษาอัตโนมัติ</p>
                  </div>
                </div>
                <div className="agent-hero-status" aria-live="polite">
                  <span className={agentStatus === "running" ? "agent-live running" : "agent-live"}>{agentStatus === "running" ? "กำลังวิเคราะห์" : "วิเคราะห์เสร็จ"}</span>
                  <strong>Snapshot v{patientSnapshot.version}</strong>
                  <small>{patientSnapshot.updatedAt}</small>
                  <button className="secondary-button" onClick={() => runAgentUpdate("refresh")} disabled={agentStatus === "running"} data-testid="agent-refresh">วิเคราะห์ข้อมูลล่าสุดอีกครั้ง</button>
                </div>
              </section>

              <section className="agent-kpis" aria-label="สถานะ Agent">
                <article className="card"><span>แหล่งข้อมูลที่ตรวจ</span><strong>6</strong><small>ครบทุกโมดูล</small></article>
                <article className="card"><span>เรื่องที่ต้องดูต่อ</span><strong>{agentFindings.length}</strong><small>{agentFindings.length ? "จัดลำดับให้แล้ว" : "ไม่พบเหตุเร่งด่วน"}</small></article>
                <article className="card"><span>การเปลี่ยนอัตโนมัติ</span><strong>0</strong><small>ผู้ใช้ยังควบคุมทั้งหมด</small></article>
                <article className="card"><span>เหตุผลที่รันล่าสุด</span><strong className="reason-value">{patientSnapshot.changeReason}</strong><small>ตรวจสอบย้อนหลังได้</small></article>
              </section>

              <section className="card agent-table-card">
                <div className="section-heading agent-table-heading">
                  <div><span className="section-kicker">UNIFIED PATIENT SUMMARY</span><h2>ตารางสรุปข้อมูลล่าสุดทั้งหมด</h2><p>แต่ละแถวแสดงข้อมูลต้นทาง ผลที่ Agent วิเคราะห์ และสถานะที่ผู้ใช้ต้องทราบ</p></div>
                  <span className="snapshot-chip">Snapshot v{patientSnapshot.version} · ปัจจุบัน</span>
                </div>
                <div className="agent-table-wrap">
                  <table className="agent-summary-table" data-testid="agent-summary-table">
                    <thead><tr><th>หมวดข้อมูล</th><th>ข้อมูลล่าสุด</th><th>Agent วิเคราะห์</th><th>แหล่งข้อมูล</th><th>สถานะ</th></tr></thead>
                    <tbody>
                      {agentRows.map((row) => (
                        <tr key={row.id} className={`agent-row tone-${row.tone}`}>
                          <td data-label="หมวดข้อมูล"><strong>{row.category}</strong></td>
                          <td data-label="ข้อมูลล่าสุด">{row.latest}</td>
                          <td data-label="Agent วิเคราะห์">{row.analysis}</td>
                          <td data-label="แหล่งข้อมูล"><small>{row.source}</small></td>
                          <td data-label="สถานะ"><span className={`agent-result-chip tone-${row.tone}`}>{row.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="agent-lower-grid">
                <section className="card agent-events-card">
                  <div className="section-heading compact"><div><span className="section-kicker">LIVE DATA EVENTS · TEST MODE</span><h3>ลองป้อนข้อมูลใหม่ให้ Agent</h3></div><button className="text-button reset-agent" onClick={resetAgentSnapshot}>คืนค่าเริ่มต้น</button></div>
                  <p>กดเพื่อดูว่า Agent ระบุส่วนที่ได้รับผลกระทบและสร้างตารางฉบับใหม่อย่างไร</p>
                  <div className="agent-event-buttons">
                    <button onClick={() => runAgentUpdate("condition")} disabled={hasKidneyCondition || agentStatus === "running"} data-testid="agent-event-condition"><span>โรคใหม่</span><strong>เพิ่มโรคไตเรื้อรัง</strong><small>ตรวจยากับโรคและพักผลขนาดยาเดิม</small></button>
                    <button onClick={() => runAgentUpdate("weight")} disabled={hasLargeWeightChange || agentStatus === "running"} data-testid="agent-event-weight"><span>ร่างกายเปลี่ยน</span><strong>น้ำหนักเป็น 70.2 kg</strong><small>ประเมินผลกระทบต่อ Precision Dosing ใหม่</small></button>
                    <button onClick={() => runAgentUpdate("cabinet")} disabled={hasNewCabinetMedicine || agentStatus === "running"} data-testid="agent-event-cabinet"><span>ยาใหม่</span><strong>เพิ่มวาร์ฟารินในตู้</strong><small>แยกไว้จนกว่าจะตรวจและยืนยันรายการ</small></button>
                  </div>
                </section>

                <section className="card agent-conclusion-card">
                  <div className="section-heading compact"><div><span className="section-kicker">AGENT FINAL ANSWER</span><h3>คำตอบแบบชุดเดียวสำหรับผู้ใช้</h3></div><span className={agentFindings.length ? "screen-level level-yellow" : "screen-level agent-ok"}>{agentFindings.length ? `${agentFindings.length} เรื่องต้องดูต่อ` : "พร้อมใช้งาน"}</span></div>
                  <div className="agent-answer">
                    <strong>{agentFindings.length ? "Agent ตรวจพบข้อมูลที่ควรทบทวนจากการเปลี่ยนแปลงล่าสุด" : "ข้อมูลสุขภาพและรายการยาล่าสุดถูกตรวจครบทั้งระบบแล้ว"}</strong>
                    <ul>
                      <li>โรคประจำตัว {patientSnapshot.conditions.length} รายการ · ประวัติแพ้ยา {patientSnapshot.allergies.length} รายการ</li>
                      <li>ตารางยาวันนี้ {patientSnapshot.schedule.length} ช่วง · ยาในตู้ {patientSnapshot.cabinet.length} รายการ</li>
                      {hasKidneyCondition && <li className="important">พักผลคาดการณ์ขนาดยาเดิมและรอข้อมูลการทำงานของไต</li>}
                      {hasLargeWeightChange && <li className="important">น้ำหนักเปลี่ยนถึงเกณฑ์ทบทวน แต่ยังไม่มีการเปลี่ยนขนาดยา</li>}
                      {hasNewCabinetMedicine && <li className="important">พบวาร์ฟารินในตู้แต่ยังไม่อยู่ในตาราง จึงแยกไว้ให้ตรวจสอบก่อนใช้</li>}
                      {!agentFindings.length && <li>ไม่พบสัญญาณระดับเร่งด่วนในข้อมูลจำลอง ตารางยายังคงเดิม</li>}
                    </ul>
                  </div>
                  <div className="agent-safety-lock"><span aria-hidden="true">⌁</span><div><strong>Safety Lock ทำงานอยู่</strong><p>Agent สรุป ตรวจ และเตรียมคำขอได้ แต่ไม่เพิ่ม ลด หยุดยา หรือส่งข้อมูลออกจากเครื่องเอง</p></div></div>
                  <button className="primary-button full" onClick={() => setToast("เตรียมสรุป Snapshot สำหรับให้ผู้เชี่ยวชาญตรวจแล้ว")}>เตรียมสรุปให้ผู้เชี่ยวชาญตรวจ</button>
                </section>
              </div>

              <section className="card agent-trace-card">
                <div><span className="section-kicker">TRACEABLE AGENT RUN</span><h3>ขั้นตอนที่ Agent ใช้สร้างคำตอบนี้</h3></div>
                <ol className="agent-trace">
                  <li><span>1</span><div><strong>อ่าน Patient Snapshot</strong><small>เวอร์ชัน {patientSnapshot.version} · ตรวจแหล่งที่มาและเวลาล่าสุด</small></div></li>
                  <li><span>2</span><div><strong>ตรวจความสัมพันธ์ของข้อมูล</strong><small>โรค แพ้ยา ตารางยา ยาในตู้ และน้ำหนัก</small></div></li>
                  <li><span>3</span><div><strong>เรียก Safety Rules</strong><small>แยกข้อมูลใหม่และบล็อกการเปลี่ยนการรักษาอัตโนมัติ</small></div></li>
                  <li><span>4</span><div><strong>สร้างตารางและคำตอบสุดท้าย</strong><small>จัดลำดับเรื่องสำคัญพร้อมหลักฐานที่ตรวจย้อนหลังได้</small></div></li>
                </ol>
              </section>
            </div>
          )}

          {view === "settings" && (
            <div className="settings-layout">
              <section className="card settings-card">
                <span className="section-kicker">PERSONAL SUPPORT</span><h2>ตั้งค่าการช่วยเหลือ</h2>
                <div className="setting-row"><div><strong>Adaptive Reminder</strong><p>เพิ่มจุดเตือนตามความเสี่ยง โดยไม่เปลี่ยนตารางยา</p></div><button className={`switch ${adaptiveEnabled ? "on" : ""}`} onClick={() => setAdaptiveEnabled(!adaptiveEnabled)} aria-pressed={adaptiveEnabled} aria-label="เปิดหรือปิด Adaptive Reminder"><i /></button></div>
                <div className="setting-row"><div><strong>แจ้งผู้ดูแลเมื่อพลาดยาซ้ำ</strong><p>ส่งเฉพาะสถานะที่ได้รับ consent และเพิกถอนได้ทุกเมื่อ</p></div><button className={`switch ${caregiverEnabled ? "on" : ""}`} onClick={() => setCaregiverEnabled(!caregiverEnabled)} aria-pressed={caregiverEnabled} aria-label="เปิดหรือปิดการแจ้งผู้ดูแล"><i /></button></div>
                <div className="setting-row stacked"><div><strong>ช่วงเวลาห้ามรบกวน</strong><p>การแจ้งเตือนยาที่ถึงเวลาจริงยังคงแสดงตามระดับความสำคัญ</p></div><div className="time-fields"><label>เริ่ม<input type="time" defaultValue="22:30" /></label><label>สิ้นสุด<input type="time" defaultValue="06:30" /></label></div></div>
                <div className="setting-row stacked"><div><strong>เพดานการเตือน</strong><p>ป้องกัน alert fatigue ในแต่ละ dose window</p></div><input className="range" type="range" min="1" max="4" defaultValue="3" aria-label="จำนวนการเตือนสูงสุด" /><span className="range-value">สูงสุด 3 ครั้ง</span></div>
              </section>

              <section className="card caregiver-card">
                <div className="caregiver-avatar">น</div><div><span className="section-kicker">ผู้ดูแลที่เชื่อมต่อ</span><h3>นิด · สมาชิกครอบครัว</h3><p>{caregiverEnabled ? "อนุญาตให้รับสถานะพลาดยาซ้ำ" : "ยังไม่อนุญาตการแจ้งเหตุการณ์"}</p></div><span className={caregiverEnabled ? "connected" : "paused"}>{caregiverEnabled ? "Active" : "Paused"}</span>
              </section>

              <section className="card model-card">
                <span className="section-kicker">MODEL TRANSPARENCY</span><h3>Adherence Risk Model</h3>
                <dl><div><dt>โหมดปัจจุบัน</dt><dd>{mlMode === "silent" ? "Silent Mode" : "Adaptive"}</dd></div><div><dt>เวอร์ชัน</dt><dd>AR-0.1-prototype</dd></div><div><dt>ข้อมูลล่าสุด</dt><dd>20 ก.ค. 2569 · 08:00</dd></div><div><dt>การประมวลผล</dt><dd>Local simulation</dd></div></dl>
                <div className="model-notice">โมเดลต้นแบบคาดการณ์พฤติกรรมเท่านั้น ไม่คำนวณหรือปรับขนาดยา</div>
              </section>
            </div>
          )}
        </div>

        <nav className="mobile-nav" aria-label="เมนูมือถือ">
          {navItems.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span>{item.icon}</span>{item.short}</button>)}
        </nav>
      </section>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setModal(null); }}>
          <section className={`modal ${modal}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" data-testid={`modal-${modal}`}>
            <button className="modal-close" onClick={() => setModal(null)} aria-label="ปิดหน้าต่าง">×</button>
            {modal === "complete" && (
              <>
                <div className="modal-icon success">✓</div><span className="section-kicker">ตรวจสอบก่อนบันทึก</span><h2 id="modal-title">กินยาครบช่วงนี้แล้ว?</h2><p>เลือกเฉพาะรายการที่กินแล้วจริง ระบบจะบันทึกเวลา {scenarioText.split(" - ")[0]}</p>
                <div className="confirm-list">
                  {medicines.slice(0, 2).map((medicine) => <label key={medicine.id}><input type="checkbox" checked={Boolean(selectedMeds[medicine.id])} onChange={(event) => setSelectedMeds((current) => ({ ...current, [medicine.id]: event.target.checked }))} /><span><strong>{medicine.name} {medicine.dose}</strong><small>{medicine.amount} · {medicine.note}</small></span></label>)}
                </div>
                <div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>ย้อนกลับ</button><button className="primary-button" onClick={confirmComplete}>ยืนยันว่ากินแล้ว</button></div>
              </>
            )}
            {modal === "forgot" && (
              <>
                <div className="modal-icon warning">−</div><span className="section-kicker">MISSED DOSE CHECK-IN</span><h2 id="modal-title">บันทึกว่าลืมยา</h2><p>ระบบจะบันทึกเหตุการณ์และใช้ปรับรูปแบบการเตือน ไม่ควรกินเพิ่มเป็นสองเท่าโดยไม่มีคำแนะนำเฉพาะยา</p>
                <label className="select-field"><span>รายการที่ลืม</span><select><option>เมทฟอร์มิน 500 mg</option><option>แอมโลดิพีน 5 mg</option><option>ทั้งสองรายการ</option></select></label>
                <fieldset className="barrier-options"><legend>อะไรทำให้ลืมครั้งนี้?</legend>{['ไม่ได้ยินการเตือน', 'ไม่มียาอยู่กับตัว', 'ยุ่งหรือหลับอยู่', 'กังวลผลข้างเคียง', 'ยาหมด'].map((item) => <label key={item} className={barrier === item ? "selected" : ""}><input type="radio" name="barrier" value={item} checked={barrier === item} onChange={() => setBarrier(item)} /><span>{item}</span></label>)}</fieldset>
                <div className="info-banner"><strong>ขั้นตอนถัดไป</strong><p>แสดงคำแนะนำเฉพาะยาจากแหล่งที่ตรวจสอบแล้ว และเพิ่ม follow-up ในสัปดาห์หน้าเมื่อผู้ใช้ยืนยัน</p></div>
                <div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>ยกเลิก</button><button className="primary-button" onClick={confirmForgot}>บันทึกและดูแผนช่วยเหลือ</button></div>
              </>
            )}
            {modal === "duplicate" && (
              <>
                <div className="modal-icon danger">!</div><span className="section-kicker">MEDICATION SAFETY FLOW</span><h2 id="modal-title">อาจกินยาซ้ำ</h2><p>ระบบจะหยุดข้อความที่ชวนให้กินยาเพิ่มในช่วงนี้ และช่วยรวบรวมข้อมูลเพื่อประเมินความเร่งด่วน</p>
                <div className="urgent-banner"><strong>หากมีอาการรุนแรง ให้ขอความช่วยเหลือทันที</strong><p>หายใจลำบาก หมดสติ ชัก เจ็บหน้าอก หรืออาการทรุดเร็ว</p><div><a href="tel:1669">โทร 1669</a><a href="tel:1367">ศูนย์พิษวิทยา 1367</a></div></div>
                <div className="duplicate-grid"><label><span>ยาที่อาจกินซ้ำ</span><select><option>เมทฟอร์มิน 500 mg</option><option>แอมโลดิพีน 5 mg</option></select></label><label><span>จำนวนที่อาจกิน</span><select><option>ไม่แน่ใจ</option><option>2 เม็ด</option><option>มากกว่า 2 เม็ด</option></select></label><label><span>เวลาที่คาดว่าเกิด</span><input type="time" defaultValue="08:00" /></label><label><span>อาการตอนนี้</span><select><option>ยังไม่มีอาการ</option><option>มีอาการผิดปกติ</option></select></label></div>
                <div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>ย้อนกลับ</button><button className="danger-button" onClick={confirmDuplicate}>ระงับการเตือนและบันทึกเหตุการณ์</button></div>
              </>
            )}
            {modal === "doseAdvice" && (
              <>
                <div className="modal-icon warning">AI</div><span className="section-kicker">REQUEST PROFESSIONAL REVIEW</span><h2 id="modal-title">ยืนยันส่งคำขอคำแนะนำ?</h2><p>คุณกำลังส่งผลคาดการณ์ให้แพทย์หรือเภสัชกรตรวจสอบ ไม่ได้ยืนยันให้ระบบเปลี่ยนขนาดยา</p>
                <div className="advice-summary">
                  <div><span>น้ำหนักล่าสุด</span><strong>{parsedWeight.toFixed(1)} kg</strong></div>
                  <div><span>ขนาดยาปัจจุบัน</span><strong>{currentDose} mg</strong></div>
                  <div className="candidate"><span>AI คาดการณ์เพื่อขอประเมิน</span><strong>{predictedDose} mg ({doseDeltaLabel})</strong></div>
                </div>
                <div className="urgent-banner advice-warning"><strong>ห้ามปรับหรือหยุดยาเองจากผลนี้</strong><p>ผู้เชี่ยวชาญอาจต้องใช้ข้อมูลอื่น เช่น การทำงานของไต โรคร่วม ยาอื่น และอาการล่าสุด ก่อนให้คำแนะนำจริง</p></div>
                <label className="request-consent"><input type="checkbox" checked={adviceConfirmed} onChange={(event) => setAdviceConfirmed(event.target.checked)} /><span><strong>ฉันเข้าใจและต้องการส่งคำขอ</strong><small>ตารางยาเดิมจะยังคงอยู่จนกว่าจะได้รับคำแนะนำที่ตรวจสอบแล้ว</small></span></label>
                <div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>ยกเลิก</button><button className="primary-button" disabled={!adviceConfirmed} onClick={confirmDoseAdvice} data-testid="confirm-dose-advice">ยืนยันส่งคำขอ</button></div>
              </>
            )}
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}
