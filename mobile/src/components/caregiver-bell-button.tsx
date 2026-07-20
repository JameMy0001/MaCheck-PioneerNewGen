import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { FeatureIcon } from '@/components/feature-icon';
import { colors } from '@/constants/theme';
import { selectUnreadCaregiverMessageCount, useCaregiverInboxStore } from '@/store/use-caregiver-inbox-store';

export function CaregiverBellButton() {
  const unread = useCaregiverInboxStore(selectUnreadCaregiverMessageCount);
  const label = unread ? `ข้อความจากผู้ดูแลที่ยังไม่ได้อ่าน ${unread} ข้อความ` : 'ข้อความจากผู้ดูแล';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => router.push('/caregiver-messages')}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
        opacity: pressed ? 0.62 : 1,
      })}
    >
      <SymbolView
        name={{ ios: unread ? 'bell.badge.fill' : 'bell.fill', android: unread ? 'notifications_unread' : 'notifications' }}
        fallback={<FeatureIcon name="remote-caregiver" size={27} />}
        size={25}
        tintColor={colors.primaryDark}
        style={{ width: 28, height: 28 }}
      />
      {unread ? (
        <View
          style={{
            position: 'absolute',
            right: 1,
            top: 1,
            minWidth: 19,
            height: 19,
            paddingHorizontal: 4,
            borderRadius: 10,
            backgroundColor: colors.danger,
            borderWidth: 2,
            borderColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 10, lineHeight: 12, fontWeight: '900' }}>
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
