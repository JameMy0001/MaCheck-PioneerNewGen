begin;

-- Primary user-facing therapeutic category for the 262 imported draft records.
-- Classification follows the formulation/primary indication in the referenced
-- Thai FDA PIL/SmPC and the WHO ATC principle of one primary use per product.
-- Thai FDA source index: https://drug.fda.moph.go.th/drug-information
-- WHO ATC principles: https://www.who.int/tools/atc-ddd-toolkit/atc-classification
create temp table medication_categories_20260718 (
  code text primary key,
  category text not null check (nullif(btrim(category), '') is not null)
) on commit drop;

insert into medication_categories_20260718 (code, category)
values
  ('acetylcysteine', 'ยาละลายเสมหะ'),
  ('aciclovir', 'ยาต้านไวรัส'),
  ('activated_charcoal', 'ยาแก้ท้องเสีย'),
  ('albendazole', 'ยาถ่ายพยาธิ'),
  ('albumin', 'สารทดแทนปริมาตรเลือด'),
  ('alteplase', 'ยาละลายลิ่มเลือด'),
  ('aluminium_hydroxide', 'ยาลดกรด'),
  ('aluminium_hydroxide_magnesium_hydroxide', 'ยาลดกรด'),
  ('aluminium_hydroxide_magnesium_hydroxide_simethicone', 'ยาลดกรด/ขับลม'),
  ('ambroxol', 'ยาละลายเสมหะ'),
  ('amikacin', 'ยาปฏิชีวนะ'),
  ('amino_acid', 'สารอาหารทางหลอดเลือด'),
  ('aminophylline', 'ยาขยายหลอดลม'),
  ('amitriptyline', 'ยาต้านซึมเศร้า'),
  ('amoxicillin', 'ยาปฏิชีวนะ'),
  ('amoxicillin_trihydrate_potassium_clavulanate', 'ยาปฏิชีวนะ'),
  ('ampicillin', 'ยาปฏิชีวนะ'),
  ('amyl_metacresol_2_4_dichloro_benzyl_alcohol_ascorbic_acid', 'ยาอมฆ่าเชื้อ/บรรเทาเจ็บคอ'),
  ('asafoetida_tincture', 'ยาบรรเทาท้องอืด'),
  ('ascorbic_acid', 'วิตามิน/แร่ธาตุ'),
  ('atropine', 'ยาแก้เกร็งทางเดินอาหาร'),
  ('benzoic_acid_salicylic_acid', 'ยาต้านเชื้อราใช้ภายนอก'),
  ('benzoyl_peroxide', 'ยารักษาสิว'),
  ('benzyl_benzoate', 'ยารักษาหิด/เหา'),
  ('benzylpenicillin_penicillin_g', 'ยาปฏิชีวนะ'),
  ('betahistine', 'ยาแก้เวียนศีรษะ'),
  ('bethamethasone_dipropionate', 'ยาสเตียรอยด์ใช้ภายนอก'),
  ('bisacodyl', 'ยาระบาย'),
  ('bisoprolol', 'ยาความดัน/หัวใจ'),
  ('bromhexine', 'ยาละลายเสมหะ'),
  ('bromocriptine', 'ยาพาร์กินสัน/ฮอร์โมนโปรแลคติน'),
  ('calamine_zinc_oxide', 'ยาทาผิวหนังบรรเทาอาการคัน'),
  ('calcium_acetate_magnesium', 'ยาจับฟอสเฟต'),
  ('calcium_folinate', 'ยาแก้พิษ/เสริมเคมีบำบัด'),
  ('calcium_lactate', 'วิตามิน/แร่ธาตุ'),
  ('captopril', 'ยาความดัน/หัวใจ'),
  ('carbamazepine', 'ยากันชัก'),
  ('carbidopa_levodopa', 'ยาพาร์กินสัน'),
  ('carbocisteine', 'ยาละลายเสมหะ'),
  ('carboplatin', 'ยาเคมีบำบัด'),
  ('cefaclor', 'ยาปฏิชีวนะ'),
  ('cefadroxil', 'ยาปฏิชีวนะ'),
  ('cefalexin', 'ยาปฏิชีวนะ'),
  ('cefazolin', 'ยาปฏิชีวนะ'),
  ('cefdinir', 'ยาปฏิชีวนะ'),
  ('cefoperazone', 'ยาปฏิชีวนะ'),
  ('cefoperazone_sulbactam', 'ยาปฏิชีวนะ'),
  ('cefuroxime', 'ยาปฏิชีวนะ'),
  ('cefuroxime_axetil', 'ยาปฏิชีวนะ'),
  ('chloramphenicol', 'ยาปฏิชีวนะสำหรับตา'),
  ('chlorhexidine', 'ยาฆ่าเชื้อใช้ภายนอก'),
  ('chlorhexidine_cetrimide', 'ยาฆ่าเชื้อใช้ภายนอก'),
  ('chlorobutanol_clove_oil', 'ยาแก้ปวดฟันเฉพาะที่'),
  ('chloroxylenol', 'ยาฆ่าเชื้อใช้ภายนอก'),
  ('chlorpheniramine', 'ยาแก้แพ้'),
  ('chlorpromazine', 'ยารักษาโรคจิต'),
  ('cholestyramine', 'ยาลดไขมัน'),
  ('cimetidine', 'ยาลดกรด/รักษาแผลทางเดินอาหาร'),
  ('cinnarizine', 'ยาแก้เวียนศีรษะ/เมารถ'),
  ('citric_acid_sodium_bicarbonate_sodium_carbonate', 'ยาลดกรด'),
  ('clarithromycin', 'ยาปฏิชีวนะ'),
  ('clindamycin', 'ยาปฏิชีวนะ'),
  ('clobetasol_propionate', 'ยาสเตียรอยด์ใช้ภายนอก'),
  ('clonidine', 'ยาความดัน'),
  ('clotrimazole', 'ยาต้านเชื้อรา'),
  ('cloxacillin', 'ยาปฏิชีวนะ'),
  ('co_trimoxazole_trimethoprim_sulfamethoxazole', 'ยาปฏิชีวนะ'),
  ('coal_tar', 'ยารักษาโรคผิวหนัง'),
  ('colchicine', 'ยารักษาโรคเกาต์'),
  ('cyanocobalamin', 'วิตามิน/แร่ธาตุ'),
  ('cyclophosphamide', 'ยาต้านมะเร็ง/กดภูมิคุ้มกัน'),
  ('cyproheptadine', 'ยาแก้แพ้'),
  ('dequalinium', 'ยาฆ่าเชื้อช่องคลอด'),
  ('dexamethasone', 'ยาสเตียรอยด์'),
  ('dextran', 'สารทดแทนปริมาตรเลือด'),
  ('dextromethorphan_hydrobromide', 'ยาแก้ไอ'),
  ('dicloxacillin', 'ยาปฏิชีวนะ'),
  ('dicycloverine', 'ยาแก้เกร็งทางเดินอาหาร'),
  ('diltiazem', 'ยาหัวใจ'),
  ('dimenhydrinate', 'ยาแก้เมารถ/คลื่นไส้'),
  ('diphenhydramine', 'ยาแก้แพ้'),
  ('dipotassium', 'สารน้ำและอิเล็กโทรไลต์'),
  ('disulfiram', 'ยารักษาภาวะติดสุรา'),
  ('dobutamine', 'ยากระตุ้นการทำงานของหัวใจ'),
  ('docusate', 'ยาระบาย'),
  ('domperidone', 'ยาแก้คลื่นไส้อาเจียน'),
  ('doxorubicin', 'ยาเคมีบำบัด'),
  ('doxycycline_hyclate', 'ยาปฏิชีวนะ'),
  ('econazole', 'ยาต้านเชื้อราใช้ภายนอก'),
  ('ergocalciferol', 'วิตามิน/แร่ธาตุ'),
  ('erythromycin', 'ยาปฏิชีวนะ'),
  ('estradiol', 'ฮอร์โมนเพศหญิง'),
  ('ethinylestradiol_chlormadinone', 'ยาคุมกำเนิด'),
  ('ethinylestradiol_cyproterone', 'ยาคุมกำเนิด/ฮอร์โมนเพศหญิง'),
  ('ethinylestradiol_d_norgestrel', 'ยาคุมกำเนิด'),
  ('ethinylestradiol_desogestrel', 'ยาคุมกำเนิด'),
  ('ethinylestradiol_drospirenone', 'ยาคุมกำเนิด'),
  ('ethinylestradiol_gestodene', 'ยาคุมกำเนิด'),
  ('ethinylestradiol_levonorgestrel', 'ยาคุมกำเนิด'),
  ('ethyl_alcohol', 'ยาฆ่าเชื้อใช้ภายนอก'),
  ('ethyl_ester_of_iodinated_fatty_acids_of_poppy_seed_oil', 'สารทึบรังสี'),
  ('etoricoxib', 'ยาแก้ปวด NSAID'),
  ('eucalyptus_oil', 'ยาสมุนไพรบรรเทาไอ/ปวดกล้ามเนื้อ'),
  ('famotidine', 'ยาลดกรด/รักษาแผลทางเดินอาหาร'),
  ('felodipine', 'ยาความดัน'),
  ('fenofibrate', 'ยาลดไขมัน'),
  ('ferrous', 'วิตามิน/แร่ธาตุ'),
  ('flavoxate', 'ยาระบบทางเดินปัสสาวะ'),
  ('fluocinolone_acetonide', 'ยาสเตียรอยด์ใช้ภายนอก'),
  ('fluorouracil', 'ยาเคมีบำบัด'),
  ('fluoxetine', 'ยาต้านซึมเศร้า'),
  ('flupentixol_melitracen', 'ยาจิตเวช/ต้านซึมเศร้า'),
  ('folic_acid', 'วิตามิน/แร่ธาตุ'),
  ('follitropin_alfa', 'ยารักษาภาวะมีบุตรยาก'),
  ('gemfibrozil', 'ยาลดไขมัน'),
  ('gentamicin', 'ยาปฏิชีวนะใช้ภายนอก'),
  ('gentamicin_betamethasone_dipropionate', 'ยาผิวหนังผสมยาปฏิชีวนะ/สเตียรอยด์'),
  ('gentian_violet', 'ยาต้านเชื้อราใช้ภายนอก'),
  ('gliclazide', 'ยาเบาหวาน'),
  ('glucose', 'สารน้ำและโภชนบำบัด'),
  ('glucose_monohydrate_and', 'สารน้ำและอิเล็กโทรไลต์'),
  ('glycerin', 'ยาระบาย'),
  ('glycerol', 'ยาระบาย'),
  ('griseofulvin', 'ยาต้านเชื้อรา'),
  ('guaifenesin', 'ยาขับเสมหะ'),
  ('haloperidol', 'ยารักษาโรคจิต'),
  ('hydrochlorothiazide_amiloride', 'ยาขับปัสสาวะ/ความดัน'),
  ('hydrocortisone', 'ยาสเตียรอยด์ใช้ภายนอก'),
  ('hydrocortisone_benzocaine_zinc_oxide', 'ยารักษาริดสีดวงทวาร'),
  ('hydrocortisone_cinchocaine', 'ยารักษาริดสีดวงทวาร'),
  ('hydrogen_peroxide', 'ยาฆ่าเชื้อใช้ภายนอก'),
  ('hydroquinone', 'ยารักษาฝ้า/รอยดำ'),
  ('hydroxyzine', 'ยาแก้แพ้'),
  ('hyoscine_n_butylbromide', 'ยาแก้เกร็งทางเดินอาหาร/ปัสสาวะ'),
  ('imipramine', 'ยาต้านซึมเศร้า'),
  ('indapamide', 'ยาขับปัสสาวะ/ความดัน'),
  ('indomethacin', 'ยาแก้ปวด NSAID'),
  ('insulin', 'ยาเบาหวาน'),
  ('intermittent_peritoneal_dialysis', 'น้ำยาล้างไตทางช่องท้อง'),
  ('iobitridol', 'สารทึบรังสี'),
  ('isoniazid', 'ยารักษาวัณโรค'),
  ('isopropyl_alcohol', 'ยาฆ่าเชื้อใช้ภายนอก'),
  ('isosorbide_dinitrate', 'ยาหัวใจ'),
  ('isosorbide_mononitrate', 'ยาหัวใจ'),
  ('ispaghula_husk', 'ยาระบาย'),
  ('itraconazole', 'ยาต้านเชื้อรา'),
  ('ketoconazole', 'ยาต้านเชื้อราใช้ภายนอก'),
  ('ketotifen', 'ยาแก้แพ้'),
  ('lansoprazole', 'ยาลดกรด/รักษาแผลทางเดินอาหาร'),
  ('lavender_oil', 'ยาสมุนไพรบรรเทาอาการทางเดินหายใจ'),
  ('lenograstim', 'ยากระตุ้นเม็ดเลือดขาว'),
  ('levodopa_benserazide', 'ยาพาร์กินสัน'),
  ('lidocaine', 'ยาชาเฉพาะที่'),
  ('lincomycin', 'ยาปฏิชีวนะ'),
  ('liquid_paraffin', 'ยาระบาย'),
  ('lisinopril', 'ยาความดัน/หัวใจ'),
  ('lithium', 'ยาควบคุมอารมณ์'),
  ('loperamide', 'ยาแก้ท้องเสีย'),
  ('magnesium', 'สารน้ำและอิเล็กโทรไลต์'),
  ('magnesium_hydroxide', 'ยาระบาย'),
  ('magnesium_trisilicate', 'ยาลดกรด'),
  ('mannitol', 'ยาขับปัสสาวะออสโมติก'),
  ('mebendazole', 'ยาถ่ายพยาธิ'),
  ('mebeverine', 'ยาแก้เกร็งทางเดินอาหาร'),
  ('mebhydrolin', 'ยาแก้แพ้'),
  ('medroxyprogesterone', 'ยาคุมกำเนิด'),
  ('mefenamic_acid', 'ยาแก้ปวด NSAID'),
  ('menthol_eucalyptus_oil', 'ยาบรรเทาอาการคัดจมูก/ไอ'),
  ('methimazole_thiamazole', 'ยาไทรอยด์'),
  ('methocarbamol', 'ยาคลายกล้ามเนื้อ'),
  ('methotrexate', 'ยาต้านมะเร็ง/กดภูมิคุ้มกัน'),
  ('methyldopa', 'ยาความดัน'),
  ('methylergometrine', 'ยาป้องกัน/รักษาตกเลือดหลังคลอด'),
  ('methylprednisolone', 'ยาสเตียรอยด์'),
  ('metoclopramide', 'ยาแก้คลื่นไส้อาเจียน'),
  ('metronidazole', 'ยาต้านแบคทีเรีย/โปรโตซัว'),
  ('mianserin', 'ยาต้านซึมเศร้า'),
  ('miconazole', 'ยาต้านเชื้อรา'),
  ('miconazole_hydrocortisone', 'ยาผิวหนังผสมยาต้านเชื้อรา/สเตียรอยด์'),
  ('milk_of_magnesia', 'ยาระบาย'),
  ('minoxidil', 'ยารักษาผมร่วง'),
  ('mucopolysaccharide_polysulphate', 'ยาทาภายนอกลดบวม/ฟกช้ำ'),
  ('multivitamin', 'วิตามิน/แร่ธาตุ'),
  ('multivitamins', 'วิตามิน/แร่ธาตุ'),
  ('niclosamide', 'ยาถ่ายพยาธิ'),
  ('nicotinic_acid', 'ยาลดไขมัน'),
  ('nimodipine', 'ยาขยายหลอดเลือดสมอง'),
  ('norethisterone_ethinylestradiol', 'ยาคุมกำเนิด/ฮอร์โมนเพศหญิง'),
  ('norfloxacin', 'ยาปฏิชีวนะ'),
  ('nortriptyline', 'ยาต้านซึมเศร้า'),
  ('nystatin', 'ยาต้านเชื้อรา'),
  ('ofloxacin', 'ยาปฏิชีวนะ'),
  ('oral_rehydration_salt', 'สารน้ำและอิเล็กโทรไลต์'),
  ('oxytetracycline', 'ยาปฏิชีวนะ'),
  ('peppermint_water', 'ยาบรรเทาท้องอืด'),
  ('perphenazine', 'ยารักษาโรคจิต'),
  ('phenol', 'ยารักษาริดสีดวงทวาร'),
  ('phenoxymethylpenicillin', 'ยาปฏิชีวนะ'),
  ('phenoxymethylpenicillin_penicillin_v', 'ยาปฏิชีวนะ'),
  ('phenoxymethylpenicillin_potassium_penicillin_v', 'ยาปฏิชีวนะ'),
  ('pimozide', 'ยารักษาโรคจิต'),
  ('piroxicam', 'ยาแก้ปวด NSAID'),
  ('pizotifen_malate', 'ยาป้องกันไมเกรน'),
  ('potassium_chloride', 'สารน้ำและอิเล็กโทรไลต์'),
  ('povidone_iodine', 'ยาฆ่าเชื้อใช้ภายนอก'),
  ('prazosin', 'ยาความดัน'),
  ('procaterol', 'ยาขยายหลอดลม'),
  ('progesterone', 'ฮอร์โมนเพศหญิง'),
  ('progesterone_vaginal', 'ยารักษาภาวะมีบุตรยาก/ป้องกันคลอดก่อนกำหนด'),
  ('propofol', 'ยานำสลบ/ยาระงับประสาท'),
  ('propranolol', 'ยาความดัน/หัวใจ'),
  ('propylthiouracil', 'ยาไทรอยด์'),
  ('pyridoxine', 'วิตามิน/แร่ธาตุ'),
  ('pyrimethamine', 'ยาต้านโปรโตซัว'),
  ('quinine', 'ยาต้านมาลาเรีย'),
  ('ranitidine', 'ยาลดกรด/รักษาแผลทางเดินอาหาร'),
  ('retinol', 'วิตามิน/แร่ธาตุ'),
  ('riboflavin', 'วิตามิน/แร่ธาตุ'),
  ('rifampicin', 'ยารักษาวัณโรค'),
  ('roxithromycin', 'ยาปฏิชีวนะ'),
  ('salbutamol', 'ยาขยายหลอดลม'),
  ('simethicone', 'ยาขับลม'),
  ('sodium_alginate_sodium_bicarbonate_calcium_carbonate', 'ยาลดกรด/กรดไหลย้อน'),
  ('sodium_bicarbonate', 'ยาลดกรด'),
  ('sodium_bicarbonate_peppermint_oil', 'ยาลดกรด/ขับลม'),
  ('sodium_chloride', 'น้ำเกลือล้างแผล'),
  ('sodium_dihydrogen', 'ยาระบายชนิดสวน'),
  ('sodium_phosphate', 'ยาระบายชนิดสวน'),
  ('sodium_phosphate_sodium_biphosphate', 'ยาระบาย/เตรียมลำไส้'),
  ('sodium_thiosulfate', 'ยาต้านเชื้อราใช้ภายนอก'),
  ('sodium_valproate', 'ยากันชัก'),
  ('sublimed_sulphur', 'ยารักษาหิด'),
  ('sucralfate', 'ยารักษาแผลทางเดินอาหาร'),
  ('sulfasalazine', 'ยาต้านอักเสบลำไส้'),
  ('tamoxifen', 'ยาต้านมะเร็งแบบฮอร์โมน'),
  ('teicoplanin', 'ยาปฏิชีวนะ'),
  ('tenoxicam', 'ยาแก้ปวด NSAID'),
  ('terbutaline', 'ยาขยายหลอดลม'),
  ('tetracycline', 'ยาปฏิชีวนะ'),
  ('theophylline', 'ยาขยายหลอดลม'),
  ('thiamine', 'วิตามิน/แร่ธาตุ'),
  ('thimerosal', 'ยาฆ่าเชื้อใช้ภายนอก'),
  ('thioridazine', 'ยารักษาโรคจิต'),
  ('thyrothricin_benzocaine', 'ยาอมฆ่าเชื้อ/บรรเทาเจ็บคอ'),
  ('timolol', 'ยารักษาต้อหิน'),
  ('tinidazole', 'ยาต้านแบคทีเรีย/โปรโตซัว'),
  ('tocopherol', 'วิตามิน/แร่ธาตุ'),
  ('trazodone', 'ยาต้านซึมเศร้า'),
  ('tretinoin', 'ยารักษาสิว'),
  ('triamcinolone_acetonide', 'ยาสเตียรอยด์ใช้ภายนอก'),
  ('trifluoperazine', 'ยารักษาโรคจิต'),
  ('trihexyphenidyl', 'ยาพาร์กินสัน'),
  ('trimethoprim_sulfamethoxazole', 'ยาปฏิชีวนะ'),
  ('vancomycin', 'ยาปฏิชีวนะ'),
  ('verapamil', 'ยาความดัน/หัวใจ'),
  ('vitamin_b_complex', 'วิตามิน/แร่ธาตุ'),
  ('vitamin_b1_b6_b12', 'วิตามิน/แร่ธาตุ'),
  ('vitamin_c', 'วิตามิน/แร่ธาตุ'),
  ('water_for_injection', 'ตัวทำละลายสำหรับยาฉีด'),
  ('zidovudine', 'ยาต้านไวรัส'),
  ('zinc', 'วิตามิน/แร่ธาตุ'),
  ('zinc_oxide', 'ยาทาผิวหนังปกป้องผิว');

-- Collapse overly specific review labels into a stable set that remains useful
-- for searching/filtering in both apps. The code-level mapping above preserves
-- the clinical reasoning while this step prevents hundreds of one-off labels.
update medication_categories_20260718
set category = case
  when category in (
    'ยาละลายเสมหะ', 'ยาขับเสมหะ', 'ยาแก้ไอ', 'ยาขยายหลอดลม',
    'ยาบรรเทาอาการคัดจมูก/ไอ', 'ยาสมุนไพรบรรเทาอาการทางเดินหายใจ',
    'ยาสมุนไพรบรรเทาไอ/ปวดกล้ามเนื้อ', 'ยาอมฆ่าเชื้อ/บรรเทาเจ็บคอ'
  ) then 'ยาระบบทางเดินหายใจ'
  when category in (
    'ยาลดกรด', 'ยาลดกรด/ขับลม', 'ยาลดกรด/กรดไหลย้อน',
    'ยาลดกรด/รักษาแผลทางเดินอาหาร', 'ยารักษาแผลทางเดินอาหาร'
  ) then 'ยาลดกรด/แผลทางเดินอาหาร'
  when category in ('ยาระบาย', 'ยาระบายชนิดสวน', 'ยาระบาย/เตรียมลำไส้') then 'ยาระบาย'
  when category in (
    'ยาแก้เกร็งทางเดินอาหาร', 'ยาแก้เกร็งทางเดินอาหาร/ปัสสาวะ',
    'ยาขับลม', 'ยาบรรเทาท้องอืด'
  ) then 'ยาแก้เกร็ง/ขับลม'
  when category in (
    'ยาแก้คลื่นไส้อาเจียน', 'ยาแก้เมารถ/คลื่นไส้',
    'ยาแก้เวียนศีรษะ', 'ยาแก้เวียนศีรษะ/เมารถ'
  ) then 'ยาแก้คลื่นไส้/เวียนศีรษะ'
  when category in ('ยาถ่ายพยาธิ', 'ยารักษาหิด', 'ยารักษาหิด/เหา', 'ยาต้านโปรโตซัว') then 'ยาต้านปรสิต'
  when category in (
    'สารทดแทนปริมาตรเลือด', 'ยากระตุ้นเม็ดเลือดขาว'
  ) then 'ยาโลหิตวิทยา/สารทดแทนเลือด'
  when category in (
    'ยาปฏิชีวนะ', 'ยาปฏิชีวนะใช้ภายนอก', 'ยาปฏิชีวนะสำหรับตา'
  ) then 'ยาปฏิชีวนะ'
  when category in (
    'ยาฆ่าเชื้อใช้ภายนอก', 'ยาฆ่าเชื้อช่องคลอด', 'น้ำเกลือล้างแผล'
  ) then 'ผลิตภัณฑ์ฆ่าเชื้อ/ดูแลแผล'
  when category in (
    'ยาต้านเชื้อรา', 'ยาต้านเชื้อราใช้ภายนอก'
  ) then 'ยาต้านเชื้อรา'
  when category in (
    'ยาทาผิวหนังบรรเทาอาการคัน', 'ยาทาภายนอกลดบวม/ฟกช้ำ',
    'ยารักษาสิว', 'ยารักษาผมร่วง', 'ยารักษาฝ้า/รอยดำ',
    'ยารักษาโรคผิวหนัง', 'ยาทาผิวหนังปกป้องผิว',
    'ยาผิวหนังผสมยาต้านเชื้อรา/สเตียรอยด์',
    'ยาผิวหนังผสมยาปฏิชีวนะ/สเตียรอยด์'
  ) then 'ยาผิวหนัง'
  when category in ('ยาสเตียรอยด์', 'ยาสเตียรอยด์ใช้ภายนอก') then 'ยาสเตียรอยด์'
  when category in ('ยาความดัน', 'ยาความดัน/หัวใจ', 'ยาหัวใจ', 'ยากระตุ้นการทำงานของหัวใจ', 'ยาขยายหลอดเลือดสมอง') then 'ยาความดัน/หัวใจ'
  when category in ('ยาขับปัสสาวะ/ความดัน', 'ยาขับปัสสาวะออสโมติก') then 'ยาขับปัสสาวะ'
  when category in (
    'ยาต้านซึมเศร้า', 'ยารักษาโรคจิต', 'ยาจิตเวช/ต้านซึมเศร้า',
    'ยาควบคุมอารมณ์', 'ยารักษาภาวะติดสุรา', 'ยาป้องกันไมเกรน'
  ) then 'ยาจิตเวช/ระบบประสาท'
  when category in ('ยาพาร์กินสัน', 'ยาพาร์กินสัน/ฮอร์โมนโปรแลคติน') then 'ยาพาร์กินสัน'
  when category in (
    'ยาเคมีบำบัด', 'ยาต้านมะเร็ง/กดภูมิคุ้มกัน', 'ยาต้านมะเร็งแบบฮอร์โมน'
  ) then 'ยาต้านมะเร็ง/กดภูมิคุ้มกัน'
  when category in (
    'ยาคุมกำเนิด', 'ยาคุมกำเนิด/ฮอร์โมนเพศหญิง', 'ฮอร์โมนเพศหญิง'
  ) then 'ฮอร์โมน/ยาคุมกำเนิด'
  when category in (
    'ยารักษาภาวะมีบุตรยาก', 'ยารักษาภาวะมีบุตรยาก/ป้องกันคลอดก่อนกำหนด',
    'ยาป้องกัน/รักษาตกเลือดหลังคลอด'
  ) then 'ยาสูติกรรม/ภาวะมีบุตรยาก'
  when category in ('ยาชาเฉพาะที่', 'ยานำสลบ/ยาระงับประสาท') then 'ยาชา/ยานำสลบ'
  when category = 'วิตามิน/แร่ธาตุ' then 'วิตามิน/แร่ธาตุ'
  when category in ('สารน้ำและโภชนบำบัด', 'สารอาหารทางหลอดเลือด') then 'สารน้ำ/โภชนบำบัด'
  when category = 'ตัวทำละลายสำหรับยาฉีด' then 'สารช่วยทางเภสัชกรรม'
  when category in ('ยาแก้ปวดฟันเฉพาะที่', 'ยาคลายกล้ามเนื้อ', 'ยารักษาโรคเกาต์') then 'ยาระบบกล้ามเนื้อ/กระดูก'
  when category = 'ยารักษาต้อหิน' then 'ยาตา'
  else category
end;

do $$
declare
  staged_count integer;
  target_count integer;
  missing_codes text;
begin
  select count(*) into staged_count from medication_categories_20260718;
  if staged_count <> 262 then
    raise exception 'Medication category staging count must be 262, got %', staged_count;
  end if;

  if exists (
    select 1
    from medication_categories_20260718
    where category = 'รอตรวจสอบ'
       or nullif(btrim(category), '') is null
  ) then
    raise exception 'Staged categories contain an unresolved label';
  end if;

  select count(*) into target_count
  from public.medications as medication
  join medication_categories_20260718 as staged using (code)
  where medication.status = 'draft'
    and medication.category = 'รอตรวจสอบ';

  if target_count <> 262 then
    select string_agg(staged.code, ', ' order by staged.code)
    into missing_codes
    from medication_categories_20260718 as staged
    left join public.medications as medication using (code)
    where medication.code is null
       or medication.status <> 'draft'
       or medication.category <> 'รอตรวจสอบ';

    raise exception 'Expected 262 draft category targets, got %. Non-matching codes: %', target_count, coalesce(missing_codes, 'none');
  end if;
end;
$$;

update public.medications as medication
set
  category = staged.category,
  review_notes = concat_ws(
    E'\n',
    nullif(medication.review_notes, ''),
    'Category batch medication_categories_20260718_v1: หมวดหลักตามรูปแบบยาและข้อบ่งใช้ในเอกสาร อย. โดยใช้หลักการ WHO ATC; ยังคงเป็น Draft จนกว่าจะผ่าน Clinical review'
  )
from medication_categories_20260718 as staged
where medication.code = staged.code
  and medication.status = 'draft'
  and medication.category = 'รอตรวจสอบ';

do $$
declare
  updated_count integer;
  remaining_placeholders integer;
  accidentally_published integer;
begin
  select count(*) into updated_count
  from public.medications
  where review_notes like '%medication_categories_20260718_v1%';

  if updated_count <> 262 then
    raise exception 'Expected 262 updated medication categories, got %', updated_count;
  end if;

  select count(*) into remaining_placeholders
  from public.medications
  where category = 'รอตรวจสอบ';

  if remaining_placeholders <> 0 then
    raise exception 'Medication category placeholders remain: %', remaining_placeholders;
  end if;

  select count(*) into accidentally_published
  from public.medications
  where review_notes like '%medication_categories_20260718_v1%'
    and (status <> 'draft' or active);

  if accidentally_published <> 0 then
    raise exception 'Category batch changed publication state for % records', accidentally_published;
  end if;
end;
$$;

select
  count(*) as updated_categories,
  count(distinct category) as distinct_categories
from medication_categories_20260718;

commit;
