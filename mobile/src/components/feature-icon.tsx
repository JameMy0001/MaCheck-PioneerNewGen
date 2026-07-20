import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

export const featureIconAssets = {
  'home-today': require('../../assets/feature-icons/home-today.png'),
  'medicine-cabinet': require('../../assets/feature-icons/medicine-cabinet.png'),
  'add-medicine': require('../../assets/feature-icons/add-medicine.png'),
  'medication-safety': require('../../assets/feature-icons/medication-safety.png'),
  'medication-history': require('../../assets/feature-icons/medication-history.png'),
  'medicine-scanner': require('../../assets/feature-icons/medicine-scanner.png'),
  'remote-caregiver': require('../../assets/feature-icons/remote-caregiver.png'),
  settings: require('../../assets/feature-icons/settings.png'),
  morning: require('../../assets/feature-icons/morning.png'),
  noon: require('../../assets/feature-icons/noon.png'),
  evening: require('../../assets/feature-icons/evening.png'),
  bedtime: require('../../assets/feature-icons/bedtime.png'),
  'water-tracking': require('../../assets/feature-icons/water-tracking.png'),
  'drug-pair-check': require('../../assets/feature-icons/drug-pair-check.png'),
  'interaction-directory': require('../../assets/feature-icons/interaction-directory.png'),
  success: require('../../assets/feature-icons/success.png'),
} as const;

export type FeatureIconName = keyof typeof featureIconAssets;

export function FeatureIcon({
  name,
  size = 32,
  accessibilityLabel,
  style,
}: {
  name: FeatureIconName;
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      source={featureIconAssets[name]}
      contentFit="contain"
      transition={120}
      style={[{ width: size, height: size }, style]}
    />
  );
}
