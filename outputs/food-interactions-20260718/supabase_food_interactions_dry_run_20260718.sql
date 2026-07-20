-- YaCheck / MaCheck central database: clinically reviewable food-interaction draft
-- Generated 2026-07-18 from Thai FDA PIL/SmPC evidence.
-- This file NEVER publishes records. Clinical review is required before status changes.
-- DRY RUN: all writes are rolled back.

BEGIN;

CREATE TEMP TABLE tmp_food_interactions_ready (
  code text PRIMARY KEY,
  food_th text NOT NULL,
  keywords text[] NOT NULL,
  medicine_codes text[] NOT NULL,
  disease_codes text[] NOT NULL,
  severity text NOT NULL,
  description_th text NOT NULL,
  dataset_version int4 NOT NULL,
  reviewed_at date,
  status text NOT NULL,
  source_references text[] NOT NULL,
  review_notes text NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_food_interactions_ready
  (code, food_th, keywords, medicine_codes, disease_codes, severity, description_th,
   dataset_version, reviewed_at, status, source_references, review_notes)
VALUES
  ('evidence_alcohol_severe_v3', 'แอลกอฮอล์/เครื่องดื่มแอลกอฮอล์', ARRAY['แอลกอฮอล์', 'สุรา', 'เหล้า', 'เบียร์', 'ไวน์', 'alcohol']::text[], ARRAY['disulfiram', 'gliclazide', 'glipizide', 'tramadol']::text[], ARRAY[]::text[], 'severe', 'ห้ามดื่มแอลกอฮอล์หรือใช้ผลิตภัณฑ์ที่มีแอลกอฮอล์ร่วมกับยาที่ระบุ และควรสอบถามแพทย์หรือเภสัชกรก่อนใช้', 3, NULL::date, 'draft', ARRAY['https://drug.fda.moph.go.th/media.php?id=810072772666597376&name=SMPC_Disulfiram_Tablets.pdf#page=1', 'https://drug.fda.moph.go.th/media.php?id=810072772666597376&name=SMPC_Disulfiram_Tablets.pdf#page=3', 'https://drug.fda.moph.go.th/media.php?id=810072772666597376&name=SMPC_Disulfiram_Tablets.pdf#page=4', 'https://drug.fda.moph.go.th/media.php?id=810072772666597376&name=SMPC_Disulfiram_Tablets.pdf#page=6', 'https://drug.fda.moph.go.th/media.php?id=862918386374549504&name=42.Disulfiram_Tablets_PIL.pdf#page=1', 'https://drug.fda.moph.go.th/media.php?id=810175347420176384&name=SMPC_Gliclazide_Modified-release Tablets.pdf#page=7', 'https://drug.fda.moph.go.th/media.php?id=810175662185914368&name=SMPC_Gliclazide_Tablets.pdf#page=6', 'https://drug.fda.moph.go.th/media.php?id=810176024078852096&name=SMPC_Glipizide_Tablets.pdf#page=5', 'https://drug.fda.moph.go.th/media.php?id=810483663501402112&name=SMPC_Tramadol_Capsules.pdf#page=8', 'https://drug.fda.moph.go.th/media.php?id=810484035766853632&name=SMPC_Tramadol_solution for injection or infusion.pdf#page=9']::text[], 'ตรวจ QA ทิศทางคำแนะนำและแยกระดับความรุนแรงแล้วเมื่อ 2026-07-18; ยังรอ Clinical reviewer ยืนยันก่อนเผยแพร่'),
  ('evidence_alcohol_caution_v3', 'แอลกอฮอล์/เครื่องดื่มแอลกอฮอล์', ARRAY['แอลกอฮอล์', 'สุรา', 'เหล้า', 'เบียร์', 'ไวน์', 'alcohol']::text[], ARRAY['atropine', 'cyclophosphamide', 'dextromethorphan_hydrobromide', 'diphenhydramine', 'doxycycline_hyclate', 'fenofibrate', 'fluoxetine', 'griseofulvin', 'haloperidol', 'hydroxyzine', 'isoniazid', 'mefenamic_acid', 'metformin', 'methocarbamol', 'methotrexate', 'metoclopramide', 'metronidazole', 'mianserin', 'niclosamide', 'nortriptyline', 'paracetamol', 'pimozide', 'piroxicam', 'pizotifen_malate', 'propofol', 'simvastatin', 'theophylline', 'tinidazole', 'trazodone']::text[], ARRAY[]::text[], 'moderate', 'ควรหลีกเลี่ยงเครื่องดื่มแอลกอฮอล์ระหว่างใช้ยาที่ระบุ และสอบถามแพทย์หรือเภสัชกรหากไม่แน่ใจ', 3, NULL::date, 'draft', ARRAY['https://drug.fda.moph.go.th/media.php?id=809657437689880576&name=SMPC_Atropine_Tablets.pdf#page=4', 'https://drug.fda.moph.go.th/media.php?id=809693226402455552&name=SMPC_Cyclophosphamide_Powders for solutions for injections or infusions.pdf#page=12', 'https://drug.fda.moph.go.th/media.php?id=809693226402455552&name=SMPC_Cyclophosphamide_Powders for solutions for injections or infusions.pdf#page=17', 'https://drug.fda.moph.go.th/media.php?id=862918391248330752&name=11. Cyclophosphamide_inj_PIL_final.pdf#page=1', 'https://drug.fda.moph.go.th/media.php?id=862918393693609984&name=12.Cyclophosphamide_Tablets_PIL_final.pdf#page=1', 'https://drug.fda.moph.go.th/media.php?id=810067905235525632&name=SMPC_Dextromethorphan_Lozenge.pdf#page=3', 'https://drug.fda.moph.go.th/media.php?id=810068299789508608&name=SMPC_Dextromethorphan_Syrup.pdf#page=3', 'https://drug.fda.moph.go.th/media.php?id=862918394234675200&name=30. Diphenhydramine_tablet_PIL_Final.pdf#page=1', 'https://drug.fda.moph.go.th/media.php?id=810074802814590976&name=SMPC_Doxycycline_Tablet.pdf#page=9', 'https://drug.fda.moph.go.th/media.php?id=808542706069544960&name=Fenofibrate_capsule, tablet_PIL.pdf#page=1', 'https://drug.fda.moph.go.th/media.php?id=810173242932338688&name=SMPC_Fluoxetine_Capsules.pdf#page=12', 'https://drug.fda.moph.go.th/media.php?id=810180959625420800&name=SMPC_Griseofulvin_Film-coated tablet.pdf#page=6', 'https://drug.fda.moph.go.th/media.php?id=808571302360260608&name=SmPC - Haloperidol ORAL SOLUTION.pdf#page=11', 'https://drug.fda.moph.go.th/media.php?id=810382200729116672&name=SMPC_Hydroxyzine_Film-coated tablets.pdf#page=6', 'https://drug.fda.moph.go.th/media.php?id=862918388467507200&name=33. isoniazid_tablets_PIL_final.pdf#page=1', 'https://drug.fda.moph.go.th/media.php?id=810410734201741312&name=SMPC_Mefenamic acid_Capsules.pdf#page=6', 'https://drug.fda.moph.go.th/media.php?id=810411685197258752&name=SMPC_Metformin_Film-coated Tablet.pdf#page=7', 'https://drug.fda.moph.go.th/media.php?id=810412334496489472&name=SMPC_Methocarbamol_Film-coated Tablet.pdf#page=4', 'https://drug.fda.moph.go.th/media.php?id=862918389411225600&name=15.Methotrexate_Inj_PIL_final.pdf#page=1', 'https://drug.fda.moph.go.th/media.php?id=810414829838934016&name=SMPC_Metoclopramide_Tablets.pdf#page=7', 'https://drug.fda.moph.go.th/media.php?id=810415338977107968&name=SMPC_Metoclopramide_solution for infusion.pdf#page=10', 'https://drug.fda.moph.go.th/media.php?id=810416020589256704&name=SMPC_Metoclopramide_Oral Solution.pdf#page=6', 'https://drug.fda.moph.go.th/media.php?id=810416555195244544&name=SMPC_Metronidazole_Tablets.pdf#page=7', 'https://drug.fda.moph.go.th/media.php?id=810416973254107136&name=SMPC_Metronidazole_Solutions for injections or infusions.pdf#page=8', 'https://drug.fda.moph.go.th/media.php?id=810417450431684608&name=SMPC_Mianserin_Tablets.pdf#page=6', 'https://drug.fda.moph.go.th/media.php?id=862918387754475520&name=36.Niclosamide_Tablets_PIL_final.pdf#page=1', 'https://drug.fda.moph.go.th/media.php?id=810424052261986304&name=SMPC_Nortriptyline_Film-coated Tablet.pdf#page=9', 'https://drug.fda.moph.go.th/media.php?id=810427720377966592&name=SMPC_Paracetamol_Capsules.pdf#page=2', 'https://drug.fda.moph.go.th/media.php?id=810427720377966592&name=SMPC_Paracetamol_Capsules.pdf#page=4', 'https://drug.fda.moph.go.th/media.php?id=810427720377966592&name=SMPC_Paracetamol_Capsules.pdf#page=7', 'https://drug.fda.moph.go.th/media.php?id=810428236826812416&name=SMPC_Paracetamol_Elixir.pdf#page=2', 'https://drug.fda.moph.go.th/media.php?id=810428236826812416&name=SMPC_Paracetamol_Elixir.pdf#page=4', 'https://drug.fda.moph.go.th/media.php?id=810428236826812416&name=SMPC_Paracetamol_Elixir.pdf#page=7', 'https://drug.fda.moph.go.th/media.php?id=810428697118121984&name=SMPC_Paracetamol_Solutions for injections or infusions.pdf#page=5', 'https://drug.fda.moph.go.th/media.php?id=810428697118121984&name=SMPC_Paracetamol_Solutions for injections or infusions.pdf#page=6', 'https://drug.fda.moph.go.th/media.php?id=810428697118121984&name=SMPC_Paracetamol_Solutions for injections or infusions.pdf#page=9', 'https://drug.fda.moph.go.th/media.php?id=810429112165474304&name=SMPC_Paracetamol_Syrup.pdf#page=2', 'https://drug.fda.moph.go.th/media.php?id=810429112165474304&name=SMPC_Paracetamol_Syrup.pdf#page=4', 'https://drug.fda.moph.go.th/media.php?id=810429112165474304&name=SMPC_Paracetamol_Syrup.pdf#page=7', 'https://drug.fda.moph.go.th/media.php?id=810429959502962688&name=SMPC_Paracetamol_suspension.pdf#page=2', 'https://drug.fda.moph.go.th/media.php?id=810429959502962688&name=SMPC_Paracetamol_suspension.pdf#page=4', 'https://drug.fda.moph.go.th/media.php?id=810429959502962688&name=SMPC_Paracetamol_suspension.pdf#page=7', 'https://drug.fda.moph.go.th/media.php?id=810430466103582720&name=SMPC_Paracetamol_Tablet.pdf#page=2', 'https://drug.fda.moph.go.th/media.php?id=810430466103582720&name=SMPC_Paracetamol_Tablet.pdf#page=4', 'https://drug.fda.moph.go.th/media.php?id=810430466103582720&name=SMPC_Paracetamol_Tablet.pdf#page=7', 'https://drug.fda.moph.go.th/media.php?id=810432738745262080&name=SMPC_Pimozide_Tablet.pdf#page=9', 'https://drug.fda.moph.go.th/media.php?id=862918387037249536&name=38.Pimozide_Tablets_PIL_final.pdf#page=1', 'https://drug.fda.moph.go.th/media.php?id=810433390829510656&name=SMPC_Piroxicam_Capsules.pdf#page=4', 'https://drug.fda.moph.go.th/media.php?id=808604508509839360&name=Pizotifen_sugarcoatedtablet-syrup_PIL.pdf#page=1', 'https://drug.fda.moph.go.th/media.php?id=904966130077147136&name=4. Ref SmPC_PROPOFOL.pdf#page=11', 'https://drug.fda.moph.go.th/media.php?id=904966130077147136&name=4. Ref SmPC_PROPOFOL.pdf#page=12', 'https://drug.fda.moph.go.th/media.php?id=808610458117480448&name=simvastatin_PIL.pdf#page=1', 'https://drug.fda.moph.go.th/media.php?id=808611857748336640&name=Theophylline_compressedTablet_PIL.pdf#page=1', 'https://drug.fda.moph.go.th/media.php?id=810482703316164608&name=SMPC_Tinidazole_Film-coated Tablet.pdf#page=6', 'https://drug.fda.moph.go.th/media.php?id=810482703316164608&name=SMPC_Tinidazole_Film-coated Tablet.pdf#page=7', 'https://drug.fda.moph.go.th/media.php?id=810484413367459840&name=SMPC_Trazodone_Tablets.pdf#page=11', 'https://drug.fda.moph.go.th/media.php?id=862918385716043776&name=47.Trazodone_tablet_PIL.pdf#page=1']::text[], 'ตรวจ QA ทิศทางคำแนะนำและแยกระดับความรุนแรงแล้วเมื่อ 2026-07-18; ยังรอ Clinical reviewer ยืนยันก่อนเผยแพร่'),
  ('evidence_calcium_cipro_v3', 'เครื่องดื่มเสริมแคลเซียม', ARRAY['เครื่องดื่มเสริมแคลเซียม', 'น้ำส้มเสริมแคลเซียม', 'calcium-fortified drink', 'calcium-fortified orange juice']::text[], ARRAY['ciprofloxacin']::text[], ARRAY[]::text[], 'moderate', 'ไม่ควรรับประทานยาที่ระบุพร้อมเครื่องดื่มเสริมแคลเซียม ให้ตรวจช่วงเวลาตามฉลากหรือสอบถามแพทย์หรือเภสัชกร', 3, NULL::date, 'draft', ARRAY['https://drug.fda.moph.go.th/media.php?id=842359238230679552&name=SmPC Ciprofloxacin film-coated tablets.pdf#page=15', 'https://drug.fda.moph.go.th/media.php?id=842360112483016704&name=SmPC Ciprofloxacin hydrochloride tablet.pdf#page=17']::text[], 'ตรวจ QA ทิศทางคำแนะนำและแยกระดับความรุนแรงแล้วเมื่อ 2026-07-18; ยังรอ Clinical reviewer ยืนยันก่อนเผยแพร่'),
  ('evidence_meal_rifampicin_v3', 'มื้ออาหาร/การรับประทานยาขณะท้องว่าง', ARRAY['มื้ออาหาร', 'กินพร้อมอาหาร', 'รับประทานพร้อมอาหาร', 'ท้องว่าง', 'with food', 'without food', 'fasting']::text[], ARRAY['rifampicin']::text[], ARRAY[]::text[], 'moderate', 'ให้รับประทานยาที่ระบุตามเวลาที่ฉลากหรือแพทย์กำหนด และสอบถามแพทย์หรือเภสัชกรก่อนเปลี่ยนเวลารับประทานยา', 3, NULL::date, 'draft', ARRAY['https://drug.fda.moph.go.th/media.php?id=810448559467012096&name=SMPC_Rifampicin_Tablets.pdf#page=18']::text[], 'ตรวจ QA ทิศทางคำแนะนำและแยกระดับความรุนแรงแล้วเมื่อ 2026-07-18; ยังรอ Clinical reviewer ยืนยันก่อนเผยแพร่'),
  ('evidence_grapefruit_v3', 'เกรปฟรุต/น้ำเกรปฟรุต', ARRAY['เกรปฟรุต', 'น้ำเกรปฟรุต', 'grapefruit', 'grapefruit juice']::text[], ARRAY['colchicine', 'felodipine']::text[], ARRAY[]::text[], 'moderate', 'ไม่ควรรับประทานเกรปฟรุตหรือน้ำเกรปฟรุตร่วมกับยาที่ระบุ และควรสอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน', 3, NULL::date, 'draft', ARRAY['https://drug.fda.moph.go.th/media.php?id=809692129914920960&name=SMPC_Colchicine_Tablets.pdf#page=6', 'https://drug.fda.moph.go.th/media.php?id=810078823658954752&name=SMPC_Felodipine_prolonged release tablets.pdf#page=5']::text[], 'ตรวจ QA ทิศทางคำแนะนำและแยกระดับความรุนแรงแล้วเมื่อ 2026-07-18; ยังรอ Clinical reviewer ยืนยันก่อนเผยแพร่'),
  ('evidence_high_protein_v3', 'อาหารหรือมื้ออาหารโปรตีนสูง', ARRAY['อาหารโปรตีนสูง', 'มื้ออาหารโปรตีนสูง', 'high-protein meal', 'high protein diet']::text[], ARRAY['carbidopa_levodopa']::text[], ARRAY[]::text[], 'moderate', 'ควรหลีกเลี่ยงการรับประทานยาที่ระบุพร้อมอาหารโปรตีนสูงมาก และสอบถามแพทย์หรือเภสัชกรเรื่องช่วงเวลาที่เหมาะสม', 3, NULL::date, 'draft', ARRAY['https://drug.fda.moph.go.th/media.php?id=904601732791803904&name=8. ref PIL_Carbidopa+Levodopa.pdf#page=1', 'https://drug.fda.moph.go.th/media.php?id=904601733693579264&name=8. Ref SmPC_Carbidopa+Levodopa.pdf#page=10']::text[], 'ตรวจ QA ทิศทางคำแนะนำและแยกระดับความรุนแรงแล้วเมื่อ 2026-07-18; ยังรอ Clinical reviewer ยืนยันก่อนเผยแพร่'),
  ('evidence_milk_dairy_v3', 'นมและผลิตภัณฑ์จากนม', ARRAY['นม', 'ผลิตภัณฑ์นม', 'โยเกิร์ต', 'ชีส', 'milk', 'dairy']::text[], ARRAY['bisacodyl', 'ciprofloxacin', 'ferrous', 'oxytetracycline', 'tetracycline', 'zinc']::text[], ARRAY[]::text[], 'moderate', 'ไม่ควรรับประทานนมหรือผลิตภัณฑ์นมพร้อมยาที่ระบุ ให้ตรวจช่วงเวลาตามฉลากหรือสอบถามแพทย์หรือเภสัชกร', 3, NULL::date, 'draft', ARRAY['https://drug.fda.moph.go.th/media.php?id=809660019980247040&name=SMPC_Bisacodyl_Gastro-resistant tablets.pdf#page=4', 'https://drug.fda.moph.go.th/media.php?id=842359238230679552&name=SmPC Ciprofloxacin film-coated tablets.pdf#page=5', 'https://drug.fda.moph.go.th/media.php?id=842359238230679552&name=SmPC Ciprofloxacin film-coated tablets.pdf#page=15', 'https://drug.fda.moph.go.th/media.php?id=842360112483016704&name=SmPC Ciprofloxacin hydrochloride tablet.pdf#page=17', 'https://drug.fda.moph.go.th/media.php?id=810081060158316544&name=SMPC_Ferrous sulfate_film-coated tablets.pdf#page=5', 'https://drug.fda.moph.go.th/media.php?id=810426784758767616&name=SMPC_Oxytetracycline_Capsules.pdf#page=4', 'https://drug.fda.moph.go.th/media.php?id=810426784758767616&name=SMPC_Oxytetracycline_Capsules.pdf#page=6', 'https://drug.fda.moph.go.th/media.php?id=810426784758767616&name=SMPC_Oxytetracycline_Capsules.pdf#page=9', 'https://drug.fda.moph.go.th/media.php?id=810426784758767616&name=SMPC_Oxytetracycline_Capsules.pdf#page=10', 'https://drug.fda.moph.go.th/media.php?id=810476861875429376&name=SMPC_Tetracycline_Tablets.pdf#page=2', 'https://drug.fda.moph.go.th/media.php?id=810476861875429376&name=SMPC_Tetracycline_Tablets.pdf#page=6', 'https://drug.fda.moph.go.th/media.php?id=810476861875429376&name=SMPC_Tetracycline_Tablets.pdf#page=11', 'https://drug.fda.moph.go.th/media.php?id=810495775787327488&name=SMPC_Zinc sulfate_hardcapsules.pdf#page=3']::text[], 'ตรวจ QA ทิศทางคำแนะนำและแยกระดับความรุนแรงแล้วเมื่อ 2026-07-18; ยังรอ Clinical reviewer ยืนยันก่อนเผยแพร่'),
  ('evidence_potassium_severe_v3', 'อาหารโพแทสเซียมสูง/เกลือทดแทนที่มีโพแทสเซียม', ARRAY['โพแทสเซียมสูง', 'เกลือทดแทน', 'เกลือโพแทสเซียม', 'potassium-rich', 'potassium salt substitute']::text[], ARRAY['enalapril', 'hydrochlorothiazide_amiloride']::text[], ARRAY[]::text[], 'severe', 'ห้ามใช้เกลือทดแทนหรือผลิตภัณฑ์เสริมโพแทสเซียม และไม่ควรเพิ่มอาหารโพแทสเซียมสูงร่วมกับยาเองโดยไม่ปรึกษาแพทย์หรือเภสัชกร', 3, NULL::date, 'draft', ARRAY['https://drug.fda.moph.go.th/media.php?id=810075899746721792&name=SMPC_Enalapril_Tablets.pdf#page=10', 'https://drug.fda.moph.go.th/media.php?id=810075899746721792&name=SMPC_Enalapril_Tablets.pdf#page=12', 'https://drug.fda.moph.go.th/media.php?id=810380894354415616&name=SMPC_Amiloride+Hydrochlorothiazide _Tablets.pdf#page=3']::text[], 'ตรวจ QA ทิศทางคำแนะนำและแยกระดับความรุนแรงแล้วเมื่อ 2026-07-18; ยังรอ Clinical reviewer ยืนยันก่อนเผยแพร่'),
  ('evidence_potassium_caution_v3', 'อาหารโพแทสเซียมสูง/เกลือทดแทนที่มีโพแทสเซียม', ARRAY['โพแทสเซียมสูง', 'เกลือทดแทน', 'เกลือโพแทสเซียม', 'potassium-rich', 'potassium salt substitute']::text[], ARRAY['lisinopril']::text[], ARRAY[]::text[], 'moderate', 'ควรหลีกเลี่ยงหรือจำกัดอาหารโพแทสเซียมสูงและเกลือทดแทนตามคำแนะนำของแพทย์หรือเภสัชกร', 3, NULL::date, 'draft', ARRAY['https://drug.fda.moph.go.th/media.php?id=810405133153345536&name=SMPC_Lisinopril_Tablets.pdf#page=14']::text[], 'ตรวจ QA ทิศทางคำแนะนำและแยกระดับความรุนแรงแล้วเมื่อ 2026-07-18; ยังรอ Clinical reviewer ยืนยันก่อนเผยแพร่'),
  ('evidence_tea_iron_v3', 'ชา', ARRAY['ชา', 'น้ำชา', 'tea']::text[], ARRAY['ferrous']::text[], ARRAY[]::text[], 'moderate', 'ไม่ควรดื่มชาพร้อมยาธาตุเหล็ก ให้ตรวจช่วงเวลาตามฉลากหรือสอบถามแพทย์หรือเภสัชกร', 3, NULL::date, 'draft', ARRAY['https://drug.fda.moph.go.th/media.php?id=810079316368039936&name=SMPC_Ferrous fumarate_Tablets.pdf#page=4', 'https://drug.fda.moph.go.th/media.php?id=810079681742249984&name=SMPC_Ferrous fumarate_ syrup.pdf#page=4', 'https://drug.fda.moph.go.th/media.php?id=810081060158316544&name=SMPC_Ferrous sulfate_film-coated tablets.pdf#page=5']::text[], 'ตรวจ QA ทิศทางคำแนะนำและแยกระดับความรุนแรงแล้วเมื่อ 2026-07-18; ยังรอ Clinical reviewer ยืนยันก่อนเผยแพร่');

DO $$
DECLARE
  expected_count constant int := 10;
BEGIN
  IF (SELECT count(*) FROM tmp_food_interactions_ready) <> expected_count THEN
    RAISE EXCEPTION 'Expected % staged rows', expected_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM tmp_food_interactions_ready
    WHERE severity NOT IN ('moderate', 'severe')
       OR status <> 'draft'
       OR reviewed_at IS NOT NULL
       OR cardinality(keywords) = 0
       OR cardinality(medicine_codes) = 0
       OR cardinality(source_references) = 0
       OR btrim(description_th) = ''
  ) THEN
    RAISE EXCEPTION 'Validation failed: severity/status/reviewed_at/arrays/description';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM tmp_food_interactions_ready f
    CROSS JOIN LATERAL unnest(f.medicine_codes) mc(code)
    LEFT JOIN public.medications m ON m.code = mc.code
    WHERE m.code IS NULL OR m.status::text <> 'published'
  ) THEN
    RAISE EXCEPTION 'A referenced medication is missing or not published';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM tmp_food_interactions_ready f
    JOIN public.food_interactions existing USING (code)
    WHERE existing.status::text IN ('published', 'archived')
  ) THEN
    RAISE EXCEPTION 'Target code collides with a published/archived food_interactions row';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM tmp_food_interactions_ready a
    JOIN tmp_food_interactions_ready b ON a.code < b.code AND a.keywords && b.keywords
    CROSS JOIN LATERAL unnest(a.medicine_codes) mc(code)
    WHERE mc.code = ANY(b.medicine_codes) AND a.severity <> b.severity
  ) THEN
    RAISE EXCEPTION 'Same medicine would receive conflicting severities for overlapping keywords';
  END IF;
END $$;

INSERT INTO public.food_interactions
  (code, food_th, keywords, medicine_codes, disease_codes, severity, description_th,
   dataset_version, reviewed_at, status, source_references, review_notes)
SELECT
  code, food_th, keywords, medicine_codes, disease_codes,
  severity::interaction_severity, description_th, dataset_version, reviewed_at,
  status::clinical_record_status, source_references, review_notes
FROM tmp_food_interactions_ready
ON CONFLICT (code) DO UPDATE SET
  food_th = EXCLUDED.food_th,
  keywords = EXCLUDED.keywords,
  medicine_codes = EXCLUDED.medicine_codes,
  disease_codes = EXCLUDED.disease_codes,
  severity = EXCLUDED.severity,
  description_th = EXCLUDED.description_th,
  dataset_version = EXCLUDED.dataset_version,
  reviewed_at = EXCLUDED.reviewed_at,
  status = EXCLUDED.status,
  source_references = EXCLUDED.source_references,
  review_notes = EXCLUDED.review_notes
WHERE public.food_interactions.status::text IN ('draft', 'in_review');

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.food_interactions f
    JOIN tmp_food_interactions_ready t USING (code)
    WHERE f.status::text = 'draft' AND f.dataset_version = 3
  ) <> 10 THEN
    RAISE EXCEPTION 'Post-upsert check failed: expected 10 draft rows';
  END IF;
END $$;

ROLLBACK;
