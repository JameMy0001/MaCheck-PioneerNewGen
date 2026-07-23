import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Field, PrimaryButton, SectionCard, useFontMultiplier } from '@/components/ui';
import { colors, diseaseOptions } from '@/constants/theme';
import { useAppStore } from '@/store/use-app-store';
import { signOut } from '@/services/auth';
import type { FontScale } from '@/types/models';
import { t, getDiseaseLabel } from '@/utils/i18n';
import { useAgentStore } from '@/store/use-agent-store';

export default function SettingsScreen() {
  const profile = useAppStore((state) => state.profile);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const setFontScale = useAppStore((state) => state.setFontScale);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const lang = profile.language || 'th';

  const toggleDisease = useAppStore((state) => state.toggleDisease);
  const addAllergy = useAppStore((state) => state.addAllergy);
  const removeAllergy = useAppStore((state) => state.removeAllergy);
  const reset = useAppStore((state) => state.reset);

  const isBubbleVisible = useAgentStore((state) => state.isBubbleVisible);
  const setBubbleVisible = useAgentStore((state) => state.setBubbleVisible);

  const multiplier = useFontMultiplier();
  const [allergy, setAllergy] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  const resetAll = () => Alert.alert(
    t('reset_confirm_title', lang),
    t('reset_confirm_desc', lang),
    [
      { text: t('cancel', lang), style: 'cancel' },
      { text: t('confirm_delete', lang), style: 'destructive', onPress: () => { void signOut().finally(() => { reset(); router.replace('/register'); }); } },
    ]
  );

  const logOut = () => Alert.alert(
    t('logout_confirm_title', lang),
    t('logout_confirm_desc', lang),
    [
      { text: t('cancel', lang), style: 'cancel' },
      {
        text: t('confirm_logout', lang),
        onPress: () => {
          setLoggingOut(true);
          void signOut()
            .then(() => {
              reset();
              router.replace('/register');
            })
            .catch((error) => Alert.alert(t('logout_btn', lang), error instanceof Error ? error.message : 'Error'))
            .finally(() => setLoggingOut(false));
        },
      },
    ]
  );

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 44 }}>
      <SectionCard title={t('profile_section', lang)}>
        <Field label="Username" value={profile.username} editable={false} />
        <Field label={t('display_name_label', lang)} value={profile.displayName} onChangeText={(displayName) => updateProfile({ displayName })} />
        <Field
          label={t('weight_label', lang)}
          value={profile.weightKg ? String(profile.weightKg) : ''}
          onChangeText={(val) => {
            const num = parseFloat(val);
            updateProfile({ weightKg: isNaN(num) ? undefined : num });
          }}
          placeholder="e.g. 65"
          keyboardType="numeric"
        />
        <Text selectable style={{ color: colors.muted, lineHeight: 20 }}>{t('profile_help', lang)}</Text>
      </SectionCard>

      <SectionCard title={t('diseases_section', lang)}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {diseaseOptions.map((item) => {
            const active = profile.diseases.includes(item.id);
            return (
              <Pressable key={item.id} onPress={() => toggleDisease(item.id)} style={{ paddingHorizontal: 13, paddingVertical: 10, borderRadius: 999, backgroundColor: active ? colors.primary : colors.surface, borderWidth: 1, borderColor: active ? colors.primary : colors.border }}>
                <Text style={{ color: active ? '#FFFFFF' : colors.text, fontWeight: '700' }}>{getDiseaseLabel(item.id, lang)}</Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title={t('allergies_section', lang)}>
        <Field label={t('allergy_input_label', lang)} value={allergy} onChangeText={setAllergy} placeholder="e.g. Penicillin" />
        <PrimaryButton label={t('add_allergy_btn', lang)} tone="neutral" onPress={() => { addAllergy(allergy); setAllergy(''); }} disabled={!allergy.trim()} />
        {profile.allergies.map((item) => (
          <View key={item} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 11, backgroundColor: colors.dangerSoft, borderRadius: 12, borderCurve: 'continuous' }}>
            <Text selectable style={{ color: colors.danger, fontWeight: '800', fontSize: 16 * multiplier }}>{item}</Text>
            <Pressable accessibilityRole="button" onPress={() => removeAllergy(item)}>
              <Text style={{ color: colors.danger, fontWeight: '900' }}>{t('delete', lang)}</Text>
            </Pressable>
          </View>
        ))}
      </SectionCard>

      <SectionCard title={t('emergency_section', lang)}>
        <Field label={t('emergency_name_label', lang)} value={profile.emergencyName} onChangeText={(emergencyName) => updateProfile({ emergencyName })} />
        <Field label={t('emergency_phone_label', lang)} value={profile.emergencyPhone} onChangeText={(emergencyPhone) => updateProfile({ emergencyPhone })} keyboardType="phone-pad" />
      </SectionCard>

      <SectionCard title={t('language_section', lang)}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([['th', '🇹🇭 ภาษาไทย (Thai)'], ['en', '🇬🇧 English (US)']] as const).map(([value, label]) => (
            <Pressable key={value} onPress={() => setLanguage(value as 'th' | 'en')} style={{ flex: 1, padding: 13, borderRadius: 12, borderCurve: 'continuous', backgroundColor: lang === value ? colors.primary : colors.surface, borderWidth: 1, borderColor: lang === value ? colors.primary : colors.border }}>
              <Text style={{ color: lang === value ? '#FFFFFF' : colors.text, fontWeight: '800', textAlign: 'center' }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard title={t('accessibility_section', lang)}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([['normal', t('font_normal', lang)], ['large', t('font_large', lang)], ['xlarge', t('font_xlarge', lang)]] as const).map(([value, label]) => (
            <Pressable key={value} onPress={() => setFontScale(value as FontScale)} style={{ flex: 1, padding: 11, borderRadius: 12, borderCurve: 'continuous', backgroundColor: profile.fontScale === value ? colors.primary : colors.surface, borderWidth: 1, borderColor: profile.fontScale === value ? colors.primary : colors.border }}>
              <Text style={{ color: profile.fontScale === value ? '#FFFFFF' : colors.text, fontWeight: '800', textAlign: 'center' }}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text selectable style={{ color: colors.text, fontSize: 17 * multiplier, fontWeight: '800' }}>{t('ai_bubble_label', lang)}</Text>
            <Text selectable style={{ color: colors.muted }}>{t('ai_bubble_desc', lang)}</Text>
          </View>
          <Switch value={isBubbleVisible} onValueChange={(val) => setBubbleVisible(val)} trackColor={{ true: colors.primary }} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text selectable style={{ color: colors.text, fontSize: 17 * multiplier, fontWeight: '800' }}>{t('sound_alert_label', lang)}</Text>
            <Text selectable style={{ color: colors.muted }}>{t('sound_alert_desc', lang)}</Text>
          </View>
          <Switch value={profile.soundEnabled} onValueChange={(soundEnabled) => updateProfile({ soundEnabled })} trackColor={{ true: colors.primary }} />
        </View>
      </SectionCard>

      <PrimaryButton label={t('reset_data_btn', lang)} tone="danger" onPress={resetAll} />
      <PrimaryButton label={loggingOut ? t('logout_logging_out', lang) : t('logout_btn', lang)} tone="neutral" onPress={logOut} disabled={loggingOut} />
      <Text selectable style={{ color: colors.muted, textAlign: 'center', lineHeight: 20 }}>{t('logout_help', lang)}</Text>
    </ScrollView>
  );
}
