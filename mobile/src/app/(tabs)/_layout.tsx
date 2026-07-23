import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/use-app-store';
import { t } from '@/utils/i18n';

export default function TabsLayout() {
  const profile = useAppStore((state) => state.profile);
  const lang = profile.language || 'th';

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      blurEffect="systemChromeMaterialLight"
      disableTransparentOnScrollEdge
      iconColor={{ default: colors.muted, selected: colors.primary }}
      labelStyle={{ default: { color: colors.muted, fontSize: 10 }, selected: { color: colors.primary, fontSize: 10, fontWeight: '700' } }}
      labelVisibilityMode="labeled"
      minimizeBehavior="never"
      shadowColor={colors.border}
      tintColor={colors.primary}
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>{lang === 'en' ? 'Today' : 'วันนี้'}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(cabinet)">
        <NativeTabs.Trigger.Icon sf={{ default: 'pills', selected: 'pills.fill' }} md="medication" />
        <NativeTabs.Trigger.Label>{lang === 'en' ? 'Cabinet' : 'ตู้ยา'}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(add)">
        <NativeTabs.Trigger.Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} md="add_circle" />
        <NativeTabs.Trigger.Label>{lang === 'en' ? 'Add Rx' : 'เพิ่มยา'}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(safety)">
        <NativeTabs.Trigger.Icon sf={{ default: 'shield', selected: 'shield.fill' }} md="health_and_safety" />
        <NativeTabs.Trigger.Label>{lang === 'en' ? 'Safety' : 'ปลอดภัย'}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(more)" role="more">
        <NativeTabs.Trigger.Icon sf="ellipsis" md="more_horiz" />
        <NativeTabs.Trigger.Label>{lang === 'en' ? 'More' : 'เพิ่มเติม'}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
