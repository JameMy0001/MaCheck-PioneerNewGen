// หน้าวิเคราะห์และแจ้งเตือนเมื่อมียาตีกัน เพื่อความปลอดภัยของผู้ใช้งาน
const Analysis = {

  // วาดหน้าจอวิเคราะห์ผลลัพธ์
  render() {
    const container = document.querySelector('#page-analysis .page-content');
    if (!container) return;

    const interactions = App._lastInteractions || [];
    const addedMed = App._lastAddedMed || null;
    const state = App.getState();

    if (interactions.length === 0) {
      // เคสที่ 1: ปลอดภัย ไม่พบยาตีกัน
      container.innerHTML = this.renderSafeResult(addedMed);
    } else {
      // เคสที่ 2: พบยาตีกันคู่ที่เป็นอันตราย
      container.innerHTML = this.renderDangerResult(interactions, addedMed, state);
    }
  },

  // หน้าจอกรณียาทุกตัวปลอดภัยดี
  renderSafeResult(addedMed) {
    return `
      <div class="analysis-content">
        <div class="alert-card alert-safe" style="animation: slideUp 0.5s ease">
          <div class="alert-icon" style="color: var(--color-safe);">${Utils.getIconSvg('checkCircle', 'icon-lg')}</div>
          <h2 class="alert-title">ยังไม่พบคู่ยาที่ตรงกัน</h2>
          <p class="alert-body">ไม่พบรายการยาตีกันในข้อมูลปัจจุบัน แต่ผลนี้ไม่ใช่การยืนยันว่ายาปลอดภัยสำหรับทุกคน</p>
          <p class="alert-body">ใช้ยาตามฉลากหรือคำสั่งแพทย์ และสอบถามเภสัชกรเมื่อไม่แน่ใจ</p>
        </div>
        <button class="btn btn-primary btn-full mt-lg" onclick="App.navigate('dashboard')" style="display: flex; align-items: center; justify-content: center; gap: var(--space-sm);">
          ${Utils.getIconSvg('home', 'icon-sm')}
          กลับหน้าแรก
        </button>
      </div>
    `;
  },

  // หน้าจอกรณีมียาตีกันอันตราย
  renderDangerResult(interactions, addedMed, state) {
    let html = '<div class="analysis-content">';

    interactions.forEach(({ interaction, otherMed }) => {
      // โหลดข้อมูลชื่อยาเทียบกับฐานข้อมูล
      const newDbMed = MedicineDB.medicines.find(
        m => m.id === (addedMed?.medicineId || interaction.drug1)
      );
      const otherDbMed = MedicineDB.medicines.find(
        m => m.id === otherMed.medicineId
      );

      // เช็คระดับความเสี่ยงเพื่อจัดหน้ากากแสดงผลสีเตือนภัย
      const isSevere = interaction.severity === 'severe';
      const isModerate = interaction.severity === 'moderate';
      const alertClass = isSevere ? 'alert-danger' : (isModerate ? 'alert-warning' : 'alert-safe');
      const alertIcon = isSevere ? Utils.getIconSvg('emergency', 'icon-lg') : (isModerate ? Utils.getIconSvg('alertTriangle', 'icon-lg') : Utils.getIconSvg('sparkles', 'icon-lg'));
      
      const severityLabel = isSevere ? 'อันตราย! ห้ามกินร่วมกัน' : (isModerate ? 'ข้อควรระวัง' : 'ข้อมูลเพิ่มเติม');
      const displayTitle = isSevere ? 'ตรวจพบยาตีกันรุนแรง' : 'ควรปรึกษาแพทย์ก่อนทานร่วมกัน';
      const displayDesc = isSevere
        ? 'ห้ามรับประทานยาคู่นี้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย'
        : 'อย่ารับประทานยาคู่นี้ร่วมกันจนกว่าจะสอบถามแพทย์หรือเภสัชกร ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย';

      // จัดการรายการคำแนะนำความปลอดภัยที่ทั่วไปและไม่ระบุกลไกอันตรายเพื่อป้องกันการนำไปใช้ในทางที่ไม่ดี
      const safeAdvice = isSevere ? [
        'ห้ามรับประทานยาทั้งสองตัวนี้ร่วมกันโดยเด็ดขาด',
        'อย่าปรับหรือหยุดยาที่ใช้อยู่เอง',
        'ติดต่อแพทย์หรือเภสัชกรทันที'
      ] : [
        'อย่ารับประทานยาทั้งสองตัวนี้ร่วมกันในตอนนี้',
        'สอบถามแพทย์หรือเภสัชกรให้แน่ใจก่อน',
        'อย่าปรับเวลา ขนาด หรือหยุดยาเอง'
      ];

      const adviceHtml = safeAdvice.map((advice, i) =>
        `<li><span class="rec-num">${i + 1}.</span> ${advice}</li>`
      ).join('');

      html += `
        <div class="alert-card ${alertClass}" style="animation: slideUp 0.5s ease">
          <div class="alert-icon">${alertIcon}</div>
          <h2 class="alert-title">${severityLabel}</h2>
          <h3 class="alert-subtitle">${displayTitle}</h3>

          <div class="interaction-pair">
            <div class="med-pill">
              <div class="pill-circle" style="background-color: ${newDbMed?.pillColor || '#ccc'}; display: flex; align-items: center; justify-content: center; color: #FFFFFF;">
                ${Utils.getIconSvg('pill', 'icon-sm')}
              </div>
              <span>${newDbMed?.nameTh || 'ยาใหม่'}</span>
            </div>
            <span class="cross-icon" style="display: inline-flex; align-items: center; justify-content: center; color: var(--color-danger);">
              ${Utils.getIconSvg('cross', 'icon-md')}
            </span>
            <div class="med-pill">
              <div class="pill-circle" style="background-color: ${otherDbMed?.pillColor || '#ccc'}; display: flex; align-items: center; justify-content: center; color: #FFFFFF;">
                ${Utils.getIconSvg('pill', 'icon-sm')}
              </div>
              <span>${otherDbMed?.nameTh || 'ยาเดิม'}</span>
            </div>
          </div>

          <p class="alert-body">${displayDesc}</p>

          <div class="recommendation-section">
            <h4 style="display: flex; align-items: center; gap: 6px;">
              ${Utils.getIconSvg('sparkles', 'icon-sm', 'color: var(--color-primary)')}
              ข้อควรปฏิบัติเพื่อความปลอดภัย:
            </h4>
            <ul class="recommendation-list">
              ${adviceHtml}
            </ul>
          </div>
        </div>
      `;
    });

    // แผงปุ่มช่วยเหลือฉุกเฉินด่วนด้านล่าง
    html += `
      <div class="emergency-section">
        <a href="tel:1669" class="btn btn-emergency btn-full" style="display: flex; align-items: center; justify-content: center; gap: var(--space-sm);">
          ${Utils.getIconSvg('phone', 'icon-sm')}
          โทร 1669 สายด่วนการแพทย์
        </a>
        <button class="btn btn-outline btn-full mt-md" onclick="Analysis.shareToLine()" style="display: flex; align-items: center; justify-content: center; gap: var(--space-sm);">
          ${Utils.getIconSvg('user', 'icon-sm')}
          แจ้งลูกหลาน / ผู้ดูแล
        </button>
      </div>

      <button class="btn btn-ghost btn-full mt-md" onclick="App.navigate('dashboard')">
        กลับหน้าแรก
      </button>
    </div>`;

    return html;
  },

  // ส่งแจ้งเตือนเตือนยาตีกันเข้าไลน์ผู้ดูแล
  shareToLine() {
    const state = App.getState();
    const interactions = App._lastInteractions || [];
    if (interactions.length === 0) return;

    // พิมพ์ข้อความเตรียมส่งต่อที่ปลอดภัยและไม่เปิดเผยรายละเอียดที่นำไปใช้ในทางที่ไม่ดีได้
    const interactionTitles = interactions
      .map(({ interaction }) => interaction.severity === 'severe' ? 'ตรวจพบยาตีกันรุนแรง (ห้ามรับประทานร่วมกัน)' : 'ตรวจพบยามีข้อควรระวังในการใช้ร่วมกัน')
      .join('\n');

    const message = [
      'แจ้งเตือนจาก MaCheck',
      `${state.user.name} พบยาตีกัน!`,
      interactionTitles,
      'กรุณาติดต่อโดยด่วน'
    ].join('\n');

    // เด้งเข้าแอปไลน์ ถ้าเปิดไม่ได้ให้เซฟลงคลิปบอร์ดแทน
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;

    try {
      window.open(lineUrl, '_blank');
    } catch (err) {
      // ก็อปข้อความเก็บไว้กรณีเด้งเข้าไลน์ไม่สำเร็จ
      if (navigator.clipboard) {
        navigator.clipboard.writeText(message);
        Utils.showToast('คัดลอกข้อความแล้ว', 'info');
      }
    }
  }
};
