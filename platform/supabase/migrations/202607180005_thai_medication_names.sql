begin;

create temp table thai_medication_names_20260718 (
  code text primary key,
  name_th text not null check (nullif(btrim(name_th), '') is not null),
  evidence_method text not null check (evidence_method in ('thai_fda_pil', 'transliteration', 'direct_translation'))
) on commit drop;

insert into thai_medication_names_20260718 (code, name_th, evidence_method)
values
  ('albumin', 'อัลบูมิน', 'transliteration'),
  ('alteplase', 'อัลทีเพลส', 'transliteration'),
  ('ascorbic_acid', 'กรดแอสคอร์บิก', 'direct_translation'),
  ('atropine', 'อะโทรพีน', 'transliteration'),
  ('benzoic_acid_salicylic_acid', 'ยารักษากลากเกลื้อนและน้ำกัดเท้า (กรดเบนโซอิก + กรดซาลิไซลิก)', 'thai_fda_pil'),
  ('benzoyl_peroxide', 'เบนโซอิลเปอร์ออกไซด์', 'transliteration'),
  ('benzylpenicillin_penicillin_g', 'เบนซิลเพนิซิลลิน โซเดียม (เพนิซิลลิน จี)', 'transliteration'),
  ('bethamethasone_dipropionate', 'เบตาเมทาโซน ไดโพรพิโอเนต', 'transliteration'),
  ('bisacodyl', 'บิซาโคดิล', 'transliteration'),
  ('calamine_zinc_oxide', 'คาลาไมน์ + ซิงค์ออกไซด์', 'thai_fda_pil'),
  ('calcium_acetate_magnesium', 'แคลเซียมแอซีเทต + แมกนีเซียมคาร์บอเนต', 'thai_fda_pil'),
  ('calcium_lactate', 'แคลเซียมแลคเตต', 'transliteration'),
  ('carbamazepine', 'คาร์บามาซีพีน', 'transliteration'),
  ('carbidopa_levodopa', 'คาร์บิโดปา + ลีโวโดปา', 'thai_fda_pil'),
  ('cefazolin', 'เซฟาโซลิน', 'transliteration'),
  ('cefoperazone_sulbactam', 'เซโฟเพอราโซน + ซัลแบคแทม', 'thai_fda_pil'),
  ('chlorhexidine', 'คลอร์เฮกซิดีน กลูโคเนต', 'transliteration'),
  ('chlorhexidine_cetrimide', 'คลอร์เฮกซิดีน แอซีเทต + เซทริไมด์', 'transliteration'),
  ('chlorobutanol_clove_oil', 'คลอโรบิวทานอล + น้ำมันกานพลู', 'thai_fda_pil'),
  ('citric_acid_sodium_bicarbonate_sodium_carbonate', 'ยาผงฟู่ซิตริกแอซิด-โซเดียมไบคาร์บอเนต-โซเดียมคาร์บอเนต', 'thai_fda_pil'),
  ('clindamycin', 'คลินดามัยซิน ฟอสเฟต', 'transliteration'),
  ('co_trimoxazole_trimethoprim_sulfamethoxazole', 'โคไตรม็อกซาโซล (ไทรเมโทพริม + ซัลฟาเมทอกซาโซล)', 'thai_fda_pil'),
  ('dextran', 'เดกซ์แทรน', 'transliteration'),
  ('dextromethorphan_hydrobromide', 'เดกซ์โทรเมทอร์แฟน ไฮโดรโบรไมด์', 'transliteration'),
  ('dipotassium', 'ไดโพแทสเซียมฟอสเฟต', 'transliteration'),
  ('docusate', 'โดคิวเสต โซเดียม', 'transliteration'),
  ('econazole', 'อีโคนาโซล', 'transliteration'),
  ('erythromycin', 'อีรีโทรไมซิน', 'thai_fda_pil'),
  ('estradiol', 'เอสตราไดออล', 'transliteration'),
  ('ethinylestradiol_chlormadinone', 'เอทินิลเอสทราดิออล + คลอร์มาไดโนน', 'thai_fda_pil'),
  ('ethinylestradiol_cyproterone', 'เอทินิลเอสทราดิออล + ไซโปรเทอโรน', 'thai_fda_pil'),
  ('ethinylestradiol_d_norgestrel', 'เอทินิลเอสทราดิออล + ดี-นอร์เจสเทรล', 'thai_fda_pil'),
  ('ethinylestradiol_desogestrel', 'เอทินิลเอสทราดิออล + ดีโซเจสเทรล', 'thai_fda_pil'),
  ('ethinylestradiol_drospirenone', 'เอทินิลเอสทราดิออล + ดรอสไพรีโนน', 'thai_fda_pil'),
  ('ethinylestradiol_gestodene', 'เอทินิลเอสทราดิออล + เจสโทดีน', 'thai_fda_pil'),
  ('ethinylestradiol_levonorgestrel', 'เอทินิลเอสทราดิออล + เลโวนอร์เจสเทรล', 'thai_fda_pil'),
  ('ethyl_ester_of_iodinated_fatty_acids_of_poppy_seed_oil', 'เอทิลเอสเทอร์ของกรดไขมันไอโอดิเนตจากน้ำมันเมล็ดป๊อปปี้', 'direct_translation'),
  ('eucalyptus_oil', 'น้ำมันยูคาลิปตัส', 'direct_translation'),
  ('felodipine', 'เฟโลดิพีน', 'transliteration'),
  ('ferrous', 'เฟอร์รัสฟูมาเรต', 'transliteration'),
  ('fluocinolone_acetonide', 'ฟลูโอซิโนโลน แอซีโทไนด์', 'transliteration'),
  ('fluoxetine', 'ฟลูออกซีทีน ไฮโดรคลอไรด์', 'transliteration'),
  ('flupentixol_melitracen', 'ฟลูเพนทิซอล + เมลิทราเซน', 'thai_fda_pil'),
  ('follitropin_alfa', 'ฟอลลิโทรพิน แอลฟา', 'transliteration'),
  ('gentamicin_betamethasone_dipropionate', 'เจนตามัยซิน ซัลเฟต + เบตาเมทาโซน ไดโพรพิโอเนต', 'transliteration'),
  ('gliclazide', 'กลิคลาไซด์', 'transliteration'),
  ('glucose', 'กลูโคส', 'transliteration'),
  ('glucose_monohydrate_and', 'กลูโคสโมโนไฮเดรต + โซเดียมคลอไรด์', 'transliteration'),
  ('glycerol', 'กลีเซอรอล', 'transliteration'),
  ('hydrocortisone_benzocaine_zinc_oxide', 'ไฮโดรคอร์ติโซน แอซีเทต + เบนโซเคน + ซิงค์ออกไซด์', 'thai_fda_pil'),
  ('hydrocortisone_cinchocaine', 'ไฮโดรคอร์ทิโซน + ซินคอเคนไฮโดรคลอไรด์', 'thai_fda_pil'),
  ('hydrogen_peroxide', 'ไฮโดรเจนเปอร์ออกไซด์', 'direct_translation'),
  ('hydroquinone', 'ไฮโดรควิโนน', 'transliteration'),
  ('indapamide', 'อินดาพาไมด์', 'transliteration'),
  ('insulin', 'อินซูลิน', 'transliteration'),
  ('intermittent_peritoneal_dialysis', 'น้ำยาล้างไตทางช่องท้องแบบเป็นช่วง', 'direct_translation'),
  ('iobitridol', 'ไอโอบิทริดอล', 'transliteration'),
  ('itraconazole', 'ไอทราโคนาโซล', 'transliteration'),
  ('lavender_oil', 'น้ำมันลาเวนเดอร์', 'direct_translation'),
  ('lenograstim', 'เลโนกราสทิม', 'transliteration'),
  ('levodopa_benserazide', 'เลโวโดปา + เบนเซอราไซด์', 'thai_fda_pil'),
  ('lidocaine', 'ลิโดเคน ไฮโดรคลอไรด์', 'transliteration'),
  ('liquid_paraffin', 'พาราฟินเหลว', 'direct_translation'),
  ('magnesium', 'แมกนีเซียมซัลเฟต', 'transliteration'),
  ('magnesium_trisilicate', 'แมกนีเซียมไตรซิลิเกต', 'transliteration'),
  ('mannitol', 'แมนนิทอล', 'transliteration'),
  ('mefenamic_acid', 'กรดเมเฟนามิก', 'direct_translation'),
  ('menthol_eucalyptus_oil', 'เมนทอล + น้ำมันยูคาลิปตัส', 'direct_translation'),
  ('methocarbamol', 'เมโทคาร์บามอล', 'transliteration'),
  ('methylprednisolone', 'เมทิลเพรดนิโซโลน โซเดียมซักซิเนต', 'transliteration'),
  ('miconazole', 'ไมโคนาโซล', 'transliteration'),
  ('miconazole_hydrocortisone', 'ไมโคนาโซล ไนเตรต + ไฮโดรคอร์ติโซน', 'transliteration'),
  ('mucopolysaccharide_polysulphate', 'มิวโคโพลีแซ็กคาไรด์ โพลีซัลเฟต', 'transliteration'),
  ('multivitamin', 'วิตามินรวมสำหรับเด็ก 6-11 เดือน', 'thai_fda_pil'),
  ('multivitamins', 'วิตามินรวม', 'thai_fda_pil'),
  ('nimodipine', 'นิโมดิพีน', 'transliteration'),
  ('norethisterone_ethinylestradiol', 'นอร์เอทิสเทอโรน + เอทินิลเอสทราดิออล', 'transliteration'),
  ('oxytetracycline', 'ออกซีเตตราไซคลีน', 'transliteration'),
  ('peppermint_water', 'น้ำเปปเปอร์มินต์', 'direct_translation'),
  ('phenol', 'ฟีนอล', 'transliteration'),
  ('phenoxymethylpenicillin_penicillin_v', 'ฟีนอกซีเมทิลเพนิซิลลิน โพแทสเซียม (เพนิซิลลิน วี)', 'transliteration'),
  ('ranitidine', 'รานิทิดีน', 'transliteration'),
  ('rifampicin', 'ไรแฟมพิซิน', 'transliteration'),
  ('simethicone', 'ไซเมทิโคน', 'thai_fda_pil'),
  ('sodium_bicarbonate_peppermint_oil', 'โซดามินท์ (โซเดียมไบคาร์บอเนต + น้ำมันเปปเปอร์มินต์)', 'thai_fda_pil'),
  ('sodium_dihydrogen', 'โซเดียมไดไฮโดรเจนฟอสเฟต', 'transliteration'),
  ('sodium_phosphate', 'โซเดียมฟอสเฟต', 'transliteration'),
  ('sodium_phosphate_sodium_biphosphate', 'โซเดียมฟอสเฟต + โซเดียมไบฟอสเฟต', 'thai_fda_pil'),
  ('sodium_valproate', 'โซเดียมวาลโพรเอต', 'transliteration'),
  ('sublimed_sulphur', 'ขี้ผึ้งกำมะถัน', 'thai_fda_pil'),
  ('teicoplanin', 'ทีโคพลานิน', 'transliteration'),
  ('tenoxicam', 'เทน็อกซิแคม', 'transliteration'),
  ('thyrothricin_benzocaine', 'ไทโรทริซิน + เบนโซเคน', 'transliteration'),
  ('tretinoin', 'เทรทิโนอิน', 'transliteration'),
  ('trifluoperazine', 'ไตรฟลูโอเพอราซีน ไฮโดรคลอไรด์', 'transliteration'),
  ('trimethoprim_sulfamethoxazole', 'ไทรเมโทพริม + ซัลฟาเมทอกซาโซล', 'thai_fda_pil'),
  ('vitamin_b_complex', 'วิตามินบีรวม', 'thai_fda_pil'),
  ('vitamin_b1_b6_b12', 'วิตามินบี1-6-12', 'thai_fda_pil'),
  ('vitamin_c', 'วิตามินซี', 'thai_fda_pil'),
  ('water_for_injection', 'น้ำสำหรับฉีด', 'direct_translation'),
  ('zidovudine', 'ซิโดวูดีน', 'transliteration');

do $$
declare
  staging_count integer;
  target_count integer;
begin
  select count(*) into staging_count from thai_medication_names_20260718;
  if staging_count <> 101 then
    raise exception 'Thai medication name staging count must be 101, got %', staging_count;
  end if;

  select count(*) into target_count
  from public.medications as medication
  join thai_medication_names_20260718 as staged using (code)
  where medication.status = 'draft'
    and (medication.name_th ilike '%รอตรวจสอบ%' or nullif(btrim(medication.name_th), '') is null);

  if target_count <> 101 then
    raise exception 'Expected 101 draft placeholder targets, got %; no rows were changed', target_count;
  end if;
end;
$$;

update public.medications as medication
set
  name_th = staged.name_th,
  review_notes = concat_ws(
    E'\n',
    nullif(medication.review_notes, ''),
    'Thai name batch thai_names_20260718_v1: ' || staged.evidence_method || '; ตรวจจากชื่อสามัญและเอกสารอ้างอิง อย.; ยังคงเป็น Draft จนกว่าจะผ่าน Clinical review'
  )
from thai_medication_names_20260718 as staged
where medication.code = staged.code
  and medication.status = 'draft'
  and (medication.name_th ilike '%รอตรวจสอบ%' or nullif(btrim(medication.name_th), '') is null);

do $$
declare
  updated_count integer;
  remaining_placeholders integer;
begin
  select count(*) into updated_count
  from public.medications
  where review_notes like '%thai_names_20260718_v1%';

  if updated_count <> 101 then
    raise exception 'Expected 101 updated Thai names, got %', updated_count;
  end if;

  select count(*) into remaining_placeholders
  from public.medications
  where status = 'draft'
    and (name_th ilike '%รอตรวจสอบ%' or nullif(btrim(name_th), '') is null);

  if remaining_placeholders <> 0 then
    raise exception 'Draft Thai-name placeholders remain: %', remaining_placeholders;
  end if;
end;
$$;

select
  count(*) as updated_names,
  count(*) filter (where evidence_method = 'thai_fda_pil') as from_thai_fda_pil,
  count(*) filter (where evidence_method = 'transliteration') as transliterated,
  count(*) filter (where evidence_method = 'direct_translation') as directly_translated
from thai_medication_names_20260718;

commit;
