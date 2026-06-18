import React, { useState } from 'react';
import { Clock, UserCheck } from 'lucide-react';
import { employeesAPI } from '../services/api';

const EmployeeRegister = () => {
  const [form, setForm] = useState({
    full_name: '', join_code: '', phone: '', email: '', position: '', department: ''
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.join_code.trim()) {
      setError('กรุณากรอกชื่อ-นามสกุล และรหัสเข้าร่วมบริษัท');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await employeesAPI.selfRegister(form);
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.detail || 'เกิดข้อผิดพลาด กรุณาตรวจสอบรหัสเข้าร่วมอีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="reg-container">
        <div className="reg-card">
          <div className="reg-success-icon"><UserCheck size={48} /></div>
          <h2>ลงทะเบียนสำเร็จ!</h2>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.8 }}>
            ข้อมูลของคุณถูกส่งให้ผู้ดูแลระบบเรียบร้อยแล้ว<br />
            กรุณารอการอนุมัติและติดต่อหัวหน้างานของคุณ
          </p>
        </div>
        <style>{regStyle}</style>
      </div>
    );
  }

  return (
    <div className="reg-container">
      <div className="reg-card">
        <div className="reg-brand">
          <Clock size={28} className="reg-brand-icon" />
          <span className="reg-brand-name">Nova7</span>
        </div>
        <h2 className="reg-title">สมัครพนักงานใหม่</h2>
        <p className="reg-subtitle">กรอกข้อมูลเพื่อสมัครเข้าร่วมบริษัท รอการอนุมัติจากผู้ดูแล</p>

        {error && <div className="reg-error">{error}</div>}

        <form onSubmit={handleSubmit} className="reg-form">
          <div className="reg-field">
            <label className="reg-label">ชื่อ-นามสกุล *</label>
            <input className="reg-input" placeholder="ชื่อ นามสกุล" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div className="reg-field">
            <label className="reg-label">รหัสเข้าร่วมบริษัท *</label>
            <input className="reg-input" placeholder="รหัส 6 ตัว เช่น H29J0N" value={form.join_code} onChange={e => setForm({ ...form, join_code: e.target.value.toUpperCase() })} required maxLength={10} />
          </div>
          <div className="reg-grid">
            <div className="reg-field">
              <label className="reg-label">เบอร์โทรศัพท์</label>
              <input className="reg-input" placeholder="0XX-XXX-XXXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="reg-field">
              <label className="reg-label">อีเมล</label>
              <input className="reg-input" type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="reg-field">
              <label className="reg-label">ตำแหน่งงาน</label>
              <input className="reg-input" placeholder="เช่น พนักงานขาย" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="reg-field">
              <label className="reg-label">แผนก</label>
              <input className="reg-input" placeholder="เช่น ฝ่ายขาย" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="reg-submit" disabled={loading}>
            {loading ? 'กำลังส่งข้อมูล...' : 'ส่งข้อมูลสมัครงาน'}
          </button>
        </form>
      </div>
      <style>{regStyle}</style>
    </div>
  );
};

const regStyle = `
  .reg-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg, #0f0c1e); padding: 24px; }
  .reg-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 40px; width: 100%; max-width: 520px; }
  .reg-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
  .reg-brand-icon { color: #9d4edd; }
  .reg-brand-name { font-size: 1.4rem; font-weight: 800; background: linear-gradient(135deg, #fff 0%, #c77dff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .reg-title { font-size: 1.4rem; font-weight: 700; color: #fff; margin: 0 0 8px; }
  .reg-subtitle { font-size: 0.9rem; color: rgba(255,255,255,0.5); margin: 0 0 24px; line-height: 1.6; }
  .reg-error { background: rgba(239,71,111,0.1); border: 1px solid rgba(239,71,111,0.3); color: #ef476f; padding: 10px 16px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 16px; }
  .reg-form { display: flex; flex-direction: column; gap: 16px; }
  .reg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .reg-field { display: flex; flex-direction: column; gap: 6px; }
  .reg-label { font-size: 0.85rem; color: rgba(255,255,255,0.6); font-weight: 500; }
  .reg-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 11px 14px; border-radius: 10px; font-size: 0.95rem; outline: none; transition: border 0.2s; }
  .reg-input:focus { border-color: #9d4edd; }
  .reg-input::placeholder { color: rgba(255,255,255,0.25); }
  .reg-submit { background: linear-gradient(135deg, #7b2d8b 0%, #9d4edd 100%); border: none; color: #fff; padding: 14px; border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
  .reg-submit:hover { box-shadow: 0 4px 20px rgba(157,78,221,0.4); }
  .reg-submit:disabled { opacity: 0.6; cursor: not-allowed; }
  .reg-success-icon { color: #06d6a0; margin-bottom: 16px; }
  .reg-card h2 { color: #fff; margin: 0 0 12px; }
`;

export default EmployeeRegister;
