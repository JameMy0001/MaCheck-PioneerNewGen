import { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';

import { Field, PrimaryButton, SectionCard } from '@/components/ui';
import { colors } from '@/constants/theme';
import { loginWithUsername, recoverWithCode, registerWithUsername } from '@/services/auth';
import { useAppStore } from '@/store/use-app-store';

type Mode = 'register' | 'login' | 'recover';

export default function RegisterScreen() {
  const register = useAppStore((state) => state.register);
  const setAuthState = useAppStore((state) => state.setAuthState);
  const [mode, setMode] = useState<Mode>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [issuedRecoveryCode, setIssuedRecoveryCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const handle = username.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]{5,23}$/.test(handle)) {
      setError('username ต้องยาว 6–24 ตัว เริ่มด้วย a-z และใช้ได้เฉพาะ a-z, 0-9, _');
      return;
    }
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('รหัสผ่านต้องยาวอย่างน้อย 10 ตัว และมีทั้งตัวอักษรกับตัวเลข');
      return;
    }
    if (mode !== 'login' && password !== confirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }
    if (mode === 'recover' && !recoveryCode.trim()) {
      setError('กรุณากรอกรหัสกู้คืน');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const result = mode === 'register'
        ? await registerWithUsername(handle, password)
        : mode === 'login'
          ? await loginWithUsername(handle, password)
          : await recoverWithCode(handle, recoveryCode, password);
      register({ username: result.username, displayName: result.username, role: 'patient' });
      setAuthState(true, true);
      if (result.recovery_code) setIssuedRecoveryCode(result.recovery_code);
      else router.replace('/home');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'เชื่อมต่อระบบบัญชีไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  if (issuedRecoveryCode) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 18 }}>
        <SectionCard title="บันทึกรหัสกู้คืนเดี๋ยวนี้">
          <Text selectable style={{ color: colors.muted, fontSize: 16, lineHeight: 24 }}>ระบบจะแสดงรหัสนี้เพียงครั้งเดียว ใช้ตั้งรหัสผ่านใหม่เมื่อคุณลืมรหัสผ่าน ห้ามส่งให้ผู้อื่น</Text>
          <View style={{ backgroundColor: colors.primarySoft, padding: 16, borderRadius: 14 }}>
            <Text selectable style={{ color: colors.primaryDark, textAlign: 'center', fontSize: 20, fontWeight: '900', letterSpacing: 1 }}>{issuedRecoveryCode}</Text>
          </View>
          <PrimaryButton label="ฉันบันทึกรหัสไว้อย่างปลอดภัยแล้ว" onPress={() => router.replace('/home')} />
        </SectionCard>
      </ScrollView>
    );
  }

  const title = mode === 'register' ? 'สร้างบัญชี' : mode === 'login' ? 'เข้าสู่ระบบ' : 'ตั้งรหัสผ่านใหม่';
  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 40 }}>
        <View style={{ gap: 8, paddingVertical: 8 }}>
          <Text selectable style={{ color: colors.primaryDark, fontSize: 30, fontWeight: '900' }}>ยินดีต้อนรับสู่ MaCheck</Text>
          <Text selectable style={{ color: colors.muted, fontSize: 16, lineHeight: 24 }}>สมัครด้วย username และรหัสผ่านเท่านั้น เราไม่ขอชื่อจริง เบอร์โทร อีเมล หรือวันเกิด</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([['register', 'สมัคร'], ['login', 'เข้าสู่ระบบ'], ['recover', 'กู้คืน']] as const).map(([value, label]) => (
            <Pressable key={value} onPress={() => { setMode(value); setError(''); }} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: mode === value ? colors.primary : colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: mode === value ? '#fff' : colors.text, textAlign: 'center', fontWeight: '800' }}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <SectionCard title={title}>
          <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" placeholder="เช่น somchai_01" />
          {mode === 'recover' ? <Field label="รหัสกู้คืน" value={recoveryCode} onChangeText={setRecoveryCode} autoCapitalize="characters" autoCorrect={false} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" /> : null}
          <Field label={mode === 'recover' ? 'รหัสผ่านใหม่' : 'รหัสผ่าน'} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          {mode !== 'login' ? <Field label="ยืนยันรหัสผ่าน" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" /> : null}
          {error ? <Text selectable style={{ color: colors.danger, fontWeight: '700', lineHeight: 21 }}>{error}</Text> : null}
          <PrimaryButton label={busy ? 'กำลังเชื่อมต่อ…' : title} onPress={submit} disabled={busy} />
        </SectionCard>
        <Text selectable style={{ color: colors.muted, lineHeight: 20, textAlign: 'center' }}>ข้อมูลยา โรคประจำตัว และประวัติแพ้ยาเป็นข้อมูลสุขภาพที่อ่อนไหว ระบบเข้ารหัสระหว่างส่งและจำกัดสิทธิ์ด้วยบัญชีของคุณ</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

