import React from 'react';

const Privacy = () => {
  return (
    <div className="terms-container">
      <div className="terms-content glass">
        <h1>นโยบายความเป็นส่วนบุคคล (Privacy Policy)</h1>
        <p className="last-updated">อัปเดตล่าสุด: 17 มิถุนายน 2026</p>
        
        <section>
          <h2>1. ข้อมูลที่เราจัดเก็บ</h2>
          <p>เราจัดเก็บข้อมูลส่วนบุคคลเท่าที่จำเป็นสำหรับการให้บริการ ได้แก่ ชื่อ-นามสกุล, รูปถ่ายใบหน้า (Face ID), ข้อมูลตำแหน่งที่ตั้ง (GPS) ขณะเช็กอิน, และข้อมูลประวัติการทำงาน</p>
        </section>

        <section>
          <h2>2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
          <p>ข้อมูลทั้งหมดจะถูกนำไปใช้เพื่อวัตถุประสงค์ในการบริหารงานบุคคล การบันทึกเวลาทำงาน และการตรวจสอบภายในของบริษัทต้นสังกัดของคุณเท่านั้น</p>
        </section>

        <section>
          <h2>3. การรักษาความปลอดภัย</h2>
          <p>เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสมเพื่อป้องกันการเข้าถึง การใช้ หรือการเปิดเผยข้อมูลส่วนบุคคลของคุณโดยไม่ได้รับอนุญาต</p>
        </section>

        <section>
          <h2>4. การเปิดเผยข้อมูล</h2>
          <p>เราจะไม่เปิดเผยข้อมูลส่วนบุคคลของคุณแก่บุคคลที่สาม ยกเว้นแต่จะได้รับความยินยอมจากคุณ หรือเป็นการปฏิบัติตามกฎหมาย</p>
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

export default Privacy;
