import { useCallback, useState } from 'react';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Field, PrimaryButton, SectionCard, useFontMultiplier } from '@/components/ui';
import { colors } from '@/constants/theme';
import { searchMedicines } from '@/data/medicine-db';
import { useClinicalCatalogStore } from '@/store/use-clinical-catalog-store';

export default function ScannerScreen() {
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
        <SectionCard title="ต้องใช้สิทธิ์กล้อง">
          <Text selectable style={{ color: colors.muted, fontSize: 16 * multiplier, lineHeight: 24 }}>YaCheck ใช้กล้องเฉพาะตอนสแกนฉลากหรือ barcode ภาพไม่ถูกอัปโหลดโดยอัตโนมัติ</Text>
          <PrimaryButton label="อนุญาตให้ใช้กล้อง" onPress={() => void requestPermission()} />
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
      <SectionCard title="ค้นจากผลสแกน ชื่อ หรือสรรพคุณ">
        <Field label="ข้อความบนฉลาก ชื่อยา หรือสรรพคุณ" value={query} onChangeText={setQuery} placeholder="เช่น พาราเซตามอล หรือแก้ปวดลดไข้" />
        {scanned ? <PrimaryButton label="สแกนอีกครั้ง" tone="neutral" onPress={() => { setScanned(false); setQuery(''); }} /> : null}
        {query && results.length === 0 ? <Text selectable style={{ color: colors.warning, lineHeight: 22 }}>ยังไม่พบรายการตรงกับ “{query}” barcode ยาหลายชนิดเป็นรหัสผลิตภัณฑ์และต้องเชื่อมฐานทะเบียนยาเพิ่มเติม กรุณาค้นด้วยชื่อบนฉลาก</Text> : null}
        {results.map((item) => (
          <Pressable key={item.id} onPress={() => router.push({ pathname: '/add-medicine', params: { medicineId: item.id } })} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text selectable style={{ color: colors.text, fontSize: 17 * multiplier, fontWeight: '800' }}>{item.nameTh}</Text>
            <Text selectable style={{ color: colors.muted }}>{item.nameEn} · {item.category}</Text>
            {item.description ? <Text selectable numberOfLines={2} style={{ color: colors.muted, fontSize: 13 * multiplier, lineHeight: 18 * multiplier }}>{item.description}</Text> : null}
          </Pressable>
        ))}
      </SectionCard>
    </ScrollView>
  );
}
