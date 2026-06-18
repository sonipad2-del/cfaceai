import React from 'react';

const Terms = () => {
  return (
    <div className="terms-container">
      <div className="terms-content glass">
        <h1>ข้อตกลงในการให้บริการ (Terms of Service)</h1>
        <p className="last-updated">อัปเดตล่าสุด: 17 มิถุนายน 2026</p>
        
        <section>
          <h2>1. บทนำ</h2>
          <p>ข้อตกลงในการให้บริการนี้เป็นสัญญาระหว่างคุณกับ Nova7 โดยการเข้าใช้งานระบบ Nova7 คุณยอมรับที่จะปฏิบัติตามข้อตกลงและเงื่อนไขเหล่านี้ทั้งหมด</p>
        </section>

        <section>
          <h2>2. การใช้งานระบบ</h2>
          <p>ระบบนี้ใช้สำหรับบันทึกเวลาทำงาน ตรวจสอบการเข้างาน และการสื่อสารภายในองค์กร</p>
          <p>ผู้ใช้งานตกลงที่จะให้ข้อมูลที่เป็นความจริงและถูกต้องในการลงทะเบียน รวมถึงการบันทึกภาพถ่ายเพื่อยืนยันตัวตน (Face ID)</p>
        </section>

        <section>
          <h2>3. ข้อมูล ข่าวสาร และโฆษณา</h2>
          <p>เพื่อเป็นการรักษามาตรฐานในการให้บริการโดยไม่คิดค่าใช้จ่ายในบางฟีเจอร์ ระบบอาจแสดงข้อมูล ข่าวสาร ข้อเสนอพิเศษ หรือโปรโมชั่นภายในระบบเป็นครั้งคราว</p>
        </section>

        <section>
          <h2>4. การแก้ไขเปลี่ยนแปลง</h2>
          <p>เราขอสงวนสิทธิ์ในการแก้ไขข้อตกลงนี้ได้ตลอดเวลา การเปลี่ยนแปลงจะมีผลทันทีเมื่อมีการประกาศในหน้าเว็บไซต์นี้</p>
        </section>
      </div>

      <style>{`
        .terms-container {
          min-height: 100vh;
          padding: 40px 20px;
          background: linear-gradient(135deg, #090714 0%, #150f2e 100%);
          display: flex;
          justify-content: center;
        }
        .terms-content {
          max-width: 800px;
          width: 100%;
          padding: 40px;
          border-radius: 12px;
          color: #e2e8f0;
          line-height: 1.6;
        }
        .terms-content h1 {
          color: #fff;
          margin-bottom: 10px;
        }
        .last-updated {
          color: #a0aec0;
          font-size: 0.9rem;
          margin-bottom: 30px;
        }
        .terms-content section {
          margin-bottom: 25px;
        }
        .terms-content h2 {
          color: var(--primary-light, #e0aaff);
          margin-bottom: 15px;
          font-size: 1.3rem;
        }
        .terms-content p {
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
};

export default Terms;
