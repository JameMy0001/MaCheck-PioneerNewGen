import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { FeatureIcon } from '@/components/feature-icon';
import { colors, fontMultipliers } from '@/constants/theme';
import { useAppStore } from '@/store/use-app-store';

export function useFontMultiplier() {
  const scale = useAppStore((state) => state.profile.fontScale);
  return fontMultipliers[scale];
}

export function SectionCard({ children, title }: PropsWithChildren<{ title?: string }>) {
  const multiplier = useFontMultiplier();
  return (
    <View style={styles.card}>
      {title ? <Text selectable style={[styles.cardTitle, { fontSize: 19 * multiplier }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled = false, tone = 'primary', icon }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'danger' | 'neutral';
  icon?: ReactNode;
}) {
  const multiplier = useFontMultiplier();
  const backgroundColor = tone === 'danger' ? colors.danger : tone === 'neutral' ? colors.surface : colors.primary;
  const textColor = tone === 'neutral' ? colors.text : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
        {icon}
        <Text style={[styles.buttonText, { color: textColor, fontSize: 17 * multiplier }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function ActionTile({ icon, title, subtitle, onPress }: { icon: ReactNode; title: string; subtitle: string; onPress: () => void }) {
  const multiplier = useFontMultiplier();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.72 : 1 }]}>
      <View style={styles.tileIcon}>{icon}</View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text selectable style={[styles.tileTitle, { fontSize: 18 * multiplier }]}>{title}</Text>
        <Text selectable style={[styles.tileSubtitle, { fontSize: 14 * multiplier }]}>{subtitle}</Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 24 }}>›</Text>
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const multiplier = useFontMultiplier();
  return (
    <View style={{ gap: 7 }}>
      <Text style={[styles.label, { fontSize: 15 * multiplier }]}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor="#8A9692"
        style={[styles.input, { fontSize: 17 * multiplier }, props.style]}
      />
      {error ? <Text selectable style={{ color: colors.danger, fontSize: 14 * multiplier }}>{error}</Text> : null}
    </View>
  );
}

export function SafetyBanner({ severity, title, description }: { severity: 'safe' | 'info' | 'moderate' | 'severe'; title: string; description: string }) {
  const multiplier = useFontMultiplier();
  const palette = severity === 'severe'
    ? { background: colors.dangerSoft, foreground: colors.danger, icon: 'interaction-directory' as const }
    : severity === 'moderate'
      ? { background: colors.warningSoft, foreground: colors.warning, icon: 'medication-safety' as const }
      : { background: colors.successSoft, foreground: colors.success, icon: 'success' as const };
  return (
    <View style={[styles.banner, { backgroundColor: palette.background, borderColor: palette.foreground }]}> 
      <FeatureIcon name={palette.icon} size={34} accessibilityLabel={severity === 'severe' ? 'คำเตือนรุนแรง' : severity === 'moderate' ? 'ข้อควรระวัง' : 'ผลการตรวจ'} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text selectable style={{ color: palette.foreground, fontWeight: '800', fontSize: 17 * multiplier }}>{title}</Text>
        <Text selectable style={{ color: colors.text, lineHeight: 21 * multiplier, fontSize: 14 * multiplier }}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 18, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border, padding: 17, gap: 13 },
  cardTitle: { color: colors.text, fontWeight: '800' },
  button: { minHeight: 52, borderRadius: 15, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontWeight: '800', textAlign: 'center' },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, borderCurve: 'continuous', padding: 15 },
  tileIcon: { width: 48, height: 48, borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { color: colors.text, fontWeight: '800' },
  tileSubtitle: { color: colors.muted, lineHeight: 20 },
  label: { color: colors.text, fontWeight: '700' },
  input: { minHeight: 50, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 14, paddingVertical: 10 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderRadius: 16, borderCurve: 'continuous', borderWidth: 1, padding: 14 },
});
