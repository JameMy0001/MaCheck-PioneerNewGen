import { useCallback, useState } from 'react';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Field, PrimaryButton, SectionCard, useFontMultiplier } from '@/components/ui';
import { colors } from '@/constants/theme';
import { searchMedicines } from '@/data/medicine-db';
import { useClinicalCatalogStore } from '@/store/use-clinical-catalog-store';
import { useAppStore } from '@/store/use-app-store';
import { t } from '@/utils/i18n';

export default function ScannerScreen() {
  const profile = useAppStore((state) => state.profile);
  const lang = profile?.language || 'th';
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [query, setQuery] = useState('');
  useClinicalCatalogStore((state) => state.revision);
  const multiplier = useFontMultiplier();
  const results = searchMedicines(query).slice(0, 8);

  useFocusEffect(useCallback(() => {
    setActive(true);
    return () => setActive(false);
  }, []));

  const handleScan = (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    setQuery(result.data);
  };

  if (!permission) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      {!permission.granted ? (
        <SectionCard title={t('camera_perm_title', lang)}>
          <Text selectable style={{ color: colors.muted, fontSize: 16 * multiplier, lineHeight: 24 }}>{t('camera_perm_desc', lang)}</Text>
          <PrimaryButton label={t('camera_perm_btn', lang)} onPress={() => void requestPermission()} />
        </SectionCard>
      ) : (
        <View style={{ height: 330, overflow: 'hidden', borderRadius: 22, borderCurve: 'continuous', backgroundColor: '#000000' }}>
          <CameraView
            active={active}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'datamatrix'] }}
            onBarcodeScanned={scanned ? undefined : handleScan}
            style={{ flex: 1 }}
          />
          <View pointerEvents="none" style={{ position: 'absolute', left: 36, right: 36, top: 92, height: 142, borderRadius: 18, borderCurve: 'continuous', borderWidth: 3, borderColor: '#FFFFFF' }} />
        </View>
      )}
      <SectionCard title={t('scanner_search_title', lang)}>
        <Field label={t('scanner_field_label', lang)} value={query} onChangeText={setQuery} placeholder={t('scanner_field_placeholder', lang)} />
        {scanned ? <PrimaryButton label={t('rescan_btn', lang)} tone="neutral" onPress={() => { setScanned(false); setQuery(''); }} /> : null}
        {query && results.length === 0 ? (
          <Text selectable style={{ color: colors.warning, lineHeight: 22 }}>
            {lang === 'en'
              ? `No matching drug found for “${query}”. Many barcodes are product IDs requiring extended catalog sync. Please search by name on label.`
              : `ยังไม่พบรายการตรงกับ “${query}” barcode ยาหลายชนิดเป็นรหัสผลิตภัณฑ์และต้องเชื่อมฐานทะเบียนยาเพิ่มเติม กรุณาค้นด้วยชื่อบนฉลาก`}
          </Text>
        ) : null}
        {results.map((item) => {
          const mainName = lang === 'en' ? item.nameEn : item.nameTh;
          const subName = lang === 'en' ? item.nameTh : item.nameEn;
          const category = lang === 'en' ? (item.categoryEn || item.category) : item.category;
          const description = lang === 'en' ? (item.descriptionEn || item.description) : item.description;

          return (
            <Pressable key={item.id} onPress={() => router.push({ pathname: '/add-medicine', params: { medicineId: item.id } })} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text selectable style={{ color: colors.text, fontSize: 17 * multiplier, fontWeight: '800' }}>{mainName}</Text>
              <Text selectable style={{ color: colors.muted }}>{subName} · {category}</Text>
              {description ? <Text selectable numberOfLines={2} style={{ color: colors.muted, fontSize: 13 * multiplier, lineHeight: 18 * multiplier }}>{description}</Text> : null}
            </Pressable>
          );
        })}
      </SectionCard>
    </ScrollView>
  );
}
