import { useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '@/constants/theme';

interface ClinicalIntakeModalProps {
  visible: boolean;
  originalQuestion: string;
  onCancel: () => void;
  onSubmit: (structuredAnswer: string) => void;
}

const associatedOptions = ['บวม', 'แดง', 'ร้อน', 'ชา', 'อ่อนแรง', 'มีไข้', 'เดินลงน้ำหนักไม่ได้', 'ไม่มีอาการเหล่านี้'] as const;
const emergencyOptions = ['หายใจลำบาก', 'เจ็บหน้าอก', 'หน้ามืด', 'หมดสติ', 'ไม่มีอาการเหล่านี้'] as const;

function toggleExclusiveOption(current: string[], option: string) {
  const noneOption = 'ไม่มีอาการเหล่านี้';
  if (option === noneOption) return current.includes(option) ? [] : [noneOption];
  const withoutNone = current.filter((item) => item !== noneOption);
  return withoutNone.includes(option)
    ? withoutNone.filter((item) => item !== option)
    : [...withoutNone, option];
}

export function ClinicalIntakeModal({
  visible,
  originalQuestion,
  onCancel,
  onSubmit,
}: ClinicalIntakeModalProps) {
  const [locationSide, setLocationSide] = useState('');
  const [severity, setSeverity] = useState<number | null>(null);
  const [onsetDuration, setOnsetDuration] = useState('');
  const [sensation, setSensation] = useState('');
  const [trigger, setTrigger] = useState('');
  const [associated, setAssociated] = useState<string[]>([]);
  const [emergency, setEmergency] = useState<string[]>([]);
  const [tried, setTried] = useState('');
  const [additional, setAdditional] = useState('');
  const [showValidation, setShowValidation] = useState(false);

  const complete = Boolean(
    locationSide.trim() &&
      severity !== null &&
      onsetDuration.trim() &&
      sensation.trim() &&
      trigger.trim() &&
      associated.length &&
      emergency.length &&
      tried.trim(),
  );

  const submit = () => {
    if (!complete || severity === null) {
      setShowValidation(true);
      return;
    }
    const structuredAnswer = [
      'ข้อมูลอาการจากแบบฟอร์มที่ผู้ใช้ยืนยัน:',
      `คำถามเดิม: ${originalQuestion}`,
      `ตำแหน่งและข้างที่เป็น: ${locationSide.trim()}`,
      `ระดับความปวด: ${severity}/10`,
      `เริ่มเมื่อไรและเป็นมานานเท่าไร: ${onsetDuration.trim()}`,
      `ลักษณะอาการ: ${sensation.trim()}`,
      `เหตุการณ์หรือกิจกรรมก่อนเกิดอาการ: ${trigger.trim()}`,
      `อาการร่วม: ${associated.join(', ')}`,
      `สัญญาณฉุกเฉินที่ผู้ใช้เลือก: ${emergency.join(', ')}`,
      `สิ่งที่ลองทำแล้ว: ${tried.trim()}`,
      `ข้อมูลเพิ่มเติม: ${additional.trim() || 'ไม่มี'}`,
      'โปรดใช้ข้อมูลชุดนี้ร่วมกับโรคประจำตัว ประวัติแพ้ยา และรายการยาล่าสุด โดยอย่าเดาข้อมูลที่ไม่ได้ระบุ',
    ].join('\n');
    const hasEmergencySignal = emergency.some((option) => option !== 'ไม่มีอาการเหล่านี้');
    if (hasEmergencySignal) {
      Alert.alert(
        'อาจเป็นภาวะฉุกเฉิน',
        'กรุณาโทร 1669 หรือไปห้องฉุกเฉินทันที ไม่ต้องรอผลประเมินจาก AI และอย่าขับรถเอง',
        [{ text: 'รับทราบและส่งข้อมูล', onPress: () => onSubmit(structuredAnswer) }],
      );
      return;
    }
    onSubmit(structuredAnswer);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>แบบซักอาการก่อนประเมินเรื่องยา</Text>
            <Text style={styles.title}>ขอข้อมูลเพิ่มเติมเพื่อความปลอดภัย</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="ปิดแบบซักอาการ" hitSlop={8} onPress={onCancel} style={styles.closeButton}>
            <Text style={styles.closeText}>ปิด</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.questionCard}>
            <Text style={styles.questionLabel}>คำถามของคุณ</Text>
            <Text selectable style={styles.questionText}>{originalQuestion}</Text>
          </View>

          <Field label="ปวดหรือมีอาการตรงไหน ข้างเดียวหรือสองข้าง?" required>
            <TextInput
              accessibilityLabel="ตำแหน่งและข้างที่มีอาการ"
              style={styles.input}
              value={locationSide}
              onChangeText={setLocationSide}
              maxLength={120}
              placeholder="เช่น น่องขาขวา"
              placeholderTextColor={colors.muted}
            />
          </Field>

          <Field label="ระดับความปวด 0–10" hint="0 = ไม่ปวด, 10 = ปวดมากที่สุด" required>
            <View style={styles.scaleGrid}>
              {Array.from({ length: 11 }, (_, value) => (
                <TouchableOpacity
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: severity === value }}
                  accessibilityLabel={`ระดับความปวด ${value}`}
                  style={[styles.scaleButton, severity === value && styles.scaleButtonSelected]}
                  onPress={() => setSeverity(value)}
                >
                  <Text style={[styles.scaleText, severity === value && styles.scaleTextSelected]}>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="เริ่มมีอาการเมื่อไร และเป็นมานานเท่าไร?" required>
            <TextInput style={styles.input} value={onsetDuration} onChangeText={setOnsetDuration} maxLength={160} placeholder="เช่น เริ่มเมื่อวาน เป็นมา 1 วัน" placeholderTextColor={colors.muted} />
          </Field>

          <Field label="รู้สึกแบบไหน และเป็นตลอดหรือเป็น ๆ หาย ๆ?" required>
            <TextInput style={styles.input} value={sensation} onChangeText={setSensation} maxLength={160} placeholder="เช่น ปวดตื้อ เป็นตอนเดิน" placeholderTextColor={colors.muted} />
          </Field>

          <Field label="ก่อนเกิดอาการทำอะไรมาหรือมีอุบัติเหตุไหม?" hint="หากไม่มีให้พิมพ์ว่า ไม่มี" required>
            <TextInput style={styles.input} value={trigger} onChangeText={setTrigger} maxLength={180} placeholder="เช่น วิ่ง หกล้ม เดินทางนาน หรือไม่มี" placeholderTextColor={colors.muted} />
          </Field>

          <ChoiceField label="มีอาการร่วมข้อใดบ้าง?" options={associatedOptions} selected={associated} onToggle={(option) => setAssociated((current) => toggleExclusiveOption(current, option))} />

          <ChoiceField label="ขณะนี้มีสัญญาณฉุกเฉินข้อใดหรือไม่?" options={emergencyOptions} selected={emergency} danger onToggle={(option) => setEmergency((current) => toggleExclusiveOption(current, option))} />

          <Field label="ลองดูแลหรือใช้สิ่งใดไปแล้วบ้าง?" hint="หากยังไม่ได้ลองให้พิมพ์ว่า ยังไม่ได้ลอง" required>
            <TextInput style={styles.input} value={tried} onChangeText={setTried} maxLength={180} placeholder="เช่น พัก ประคบ หรือยังไม่ได้ลอง" placeholderTextColor={colors.muted} />
          </Field>

          <Field label="ข้อมูลเพิ่มเติม (ไม่บังคับ)">
            <TextInput style={[styles.input, styles.multiline]} value={additional} onChangeText={setAdditional} maxLength={300} placeholder="รายละเอียดอื่นที่อยากให้ Agent ทราบ" placeholderTextColor={colors.muted} multiline />
          </Field>

          {showValidation && !complete ? <Text accessibilityRole="alert" style={styles.validationText}>กรุณาตอบหัวข้อที่มีเครื่องหมาย * และเลือกอาการร่วม/สัญญาณฉุกเฉินให้ครบ</Text> : null}

          <View style={styles.notice}>
            <Text style={styles.noticeText}>หากเลือก “หายใจลำบาก”, “เจ็บหน้าอก”, “หน้ามืด” หรือ “หมดสติ” ระบบจะหยุดการประเมินยาและแนะนำความช่วยเหลือฉุกเฉินก่อน</Text>
          </View>

          <TouchableOpacity accessibilityRole="button" style={[styles.submitButton, !complete && styles.submitButtonDisabled]} onPress={submit}>
            <Text style={styles.submitText}>ส่งข้อมูลให้ AI Agent ประเมิน</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, hint, required = false, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    {children}
  </View>;
}

function ChoiceField({ label, options, selected, danger = false, onToggle }: { label: string; options: readonly string[]; selected: string[]; danger?: boolean; onToggle: (option: string) => void }) {
  return <Field label={label} required>
    <View style={styles.choices}>
      {options.map((option) => {
        const active = selected.includes(option);
        return <TouchableOpacity
          key={option}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: active }}
          style={[styles.choice, active && (danger && option !== 'ไม่มีอาการเหล่านี้' ? styles.choiceDanger : styles.choiceSelected)]}
          onPress={() => onToggle(option)}
        >
          <Text style={[styles.choiceText, active && styles.choiceTextSelected]}>{active ? '✓ ' : ''}{option}</Text>
        </TouchableOpacity>;
      })}
    </View>
  </Field>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  headerText: { flex: 1, gap: 2 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  closeButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.primary, fontWeight: '800' },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  questionCard: { padding: 14, gap: 4, borderRadius: 12, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border },
  questionLabel: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  questionText: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  field: { gap: 8 },
  label: { color: colors.text, fontSize: 15, fontWeight: '800' },
  required: { color: colors.danger },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, backgroundColor: colors.surface, fontSize: 15 },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  scaleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  scaleButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  scaleButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  scaleText: { color: colors.text, fontWeight: '800' },
  scaleTextSelected: { color: colors.surface },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  choiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  choiceText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  choiceTextSelected: { color: colors.surface },
  validationText: { color: colors.danger, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  notice: { padding: 14, borderRadius: 12, backgroundColor: colors.warningSoft },
  noticeText: { color: colors.warning, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  submitButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.primary },
  submitButtonDisabled: { opacity: 0.45 },
  submitText: { color: colors.surface, fontSize: 15, fontWeight: '900' },
});
