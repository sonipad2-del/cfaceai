import React, { useEffect, useState } from 'react';
import { UserCheck, UserX, AlertTriangle, X, DollarSign, Clock } from 'lucide-react';
import { employeesAPI } from '../services/api';

const PendingEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approveModal, setApproveModal] = useState(null);
  const [approveForm, setApproveForm] = useState({
    base_rate: '', employment_type: 'monthly', position: '', department: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const data = await employeesAPI.getPending();
      setEmployees(data);
    } catch {
      setError('ไม่สามารถเรียกข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const openApprove = (emp) => {
    setApproveForm({
      base_rate: emp.base_rate || '',
      employment_type: emp.employment_type || 'monthly',
      position: emp.position || '',
      department: emp.department || '',
    });
    setApproveModal(emp);
  };

  const handleApprove = async () => {
    if (!approveModal) return;
    if (!approveForm.base_rate || isNaN(parseFloat(approveForm.base_rate))) {
      alert('กรุณากรอกอัตราค่าจ้าง');
      return;
    }
    setSaving(true);
    try {
      await employeesAPI.approve(approveModal.id, {
        base_rate: parseFloat(approveForm.base_rate),
        employment_type: approveForm.employment_type,
        position: approveForm.position || null,
        department: approveForm.department || null,
      });
      setApproveModal(null);
      await fetchPending();
    } catch {
      alert('เกิดข้อผิดพลาดในการอนุมัติ');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (emp) => {
    if (!window.confirm(`ปฏิเสธ "${emp.full_name}" ใช่หรือไม่?`)) return;
    try {
      await employeesAPI.reject(emp.id);
      await fetchPending();
    } catch {
      alert('เกิดข้อผิดพลาด');
    }
  };

  const formatDate = (s) => {
    if (!s) return '-';
    return new Date(s).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) + ' น.';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>กำลังโหลดรายชื่อพนักงานรอการอนุมัติ...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">พนักงานรอการอนุมัติ</h1>
          <p className="page-subtitle">ตรวจสอบและอนุมัติพนักงานที่ลงทะเบียนใหม่ผ่านฟอร์มสมัครงาน</p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {employees.length === 0 ? (
        <div className="card glass" style={{ padding: 60, textAlign: 'center' }}>
          <UserCheck size={48} style={{ color: 'var(--border)', marginBottom: 16 }} />
          <p style={{ color: 'var(--text-muted)' }}>ไม่มีพนักงานรอการอนุมัติในขณะนี้</p>
        </div>
      ) : (
        <div className="pending-list">
          {employees.map((emp) => (
            <div key={emp.id} className="pending-card glass">
              <div className="pending-card-body">
                <div className="pending-avatar">
                  {emp.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="pending-info">
                  <div className="pending-name">{emp.full_name}</div>
                  <div className="pending-meta">
                    {emp.position && <span className="meta-tag">{emp.position}</span>}
                    {emp.department && <span className="meta-tag">{emp.department}</span>}
                    {emp.phone && <span className="meta-tag">📞 {emp.phone}</span>}
                    {emp.email && <span className="meta-tag">✉️ {emp.email}</span>}
                  </div>
                  <div className="pending-date">
                    <Clock size={12} /> ลงทะเบียนเมื่อ {formatDate(emp.created_at)}
                  </div>
                </div>
                <div className="pending-actions">
                  <button className="approve-btn" onClick={() => openApprove(emp)}>
                    <UserCheck size={16} /> อนุมัติ
                  </button>
                  <button className="reject-btn" onClick={() => handleReject(emp)}>
                    <UserX size={16} /> ปฏิเสธ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <div className="modal-overlay" onClick={() => setApproveModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>อนุมัติพนักงาน: {approveModal.full_name}</h3>
              <button className="modal-close" onClick={() => setApproveModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <label className="form-label">ประเภทการจ้าง</label>
              <select className="form-input" value={approveForm.employment_type} onChange={e => setApproveForm({ ...approveForm, employment_type: e.target.value })}>
                <option value="monthly">รายเดือน</option>
                <option value="daily">รายวัน</option>
                <option value="hourly">รายชั่วโมง</option>
              </select>

              <label className="form-label" style={{ marginTop: 16 }}>อัตราค่าจ้าง (บาท) *</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="100"
                  style={{ paddingLeft: 36 }}
                  placeholder="เช่น 15000"
                  value={approveForm.base_rate}
                  onChange={e => setApproveForm({ ...approveForm, base_rate: e.target.value })}
                />
              </div>

              <label className="form-label" style={{ marginTop: 16 }}>ตำแหน่ง</label>
              <input className="form-input" placeholder="เช่น พนักงานขาย" value={approveForm.position} onChange={e => setApproveForm({ ...approveForm, position: e.target.value })} />

              <label className="form-label" style={{ marginTop: 16 }}>แผนก</label>
              <input className="form-input" placeholder="เช่น ฝ่ายขาย" value={approveForm.department} onChange={e => setApproveForm({ ...approveForm, department: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setApproveModal(null)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleApprove} disabled={saving}>
                {saving ? 'กำลังอนุมัติ...' : '✅ อนุมัติพนักงาน'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .pending-list { display: flex; flex-direction: column; gap: 12px; }
        .pending-card { border-radius: 14px; padding: 0; overflow: hidden; }
        .pending-card-body { display: flex; align-items: center; gap: 16px; padding: 20px 24px; }
        .pending-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--primary-hover)); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 800; color: #fff; flex-shrink: 0; }
        .pending-info { flex: 1; min-width: 0; }
        .pending-name { font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 6px; }
        .pending-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
        .meta-tag { background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: var(--text-muted); padding: 2px 10px; border-radius: 20px; font-size: 0.78rem; }
        .pending-date { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; color: var(--text-muted); }
        .pending-actions { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
        .approve-btn { display: flex; align-items: center; gap: 6px; background: rgba(6,214,160,0.12); border: 1px solid rgba(6,214,160,0.3); color: #06d6a0; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; white-space: nowrap; }
        .approve-btn:hover { background: rgba(6,214,160,0.2); }
        .reject-btn { display: flex; align-items: center; gap: 6px; background: rgba(239,71,111,0.1); border: 1px solid rgba(239,71,111,0.25); color: var(--error); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; white-space: nowrap; }
        .reject-btn:hover { background: rgba(239,71,111,0.18); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: #1a1530; border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 480px; overflow: hidden; animation: fadeIn 0.2s ease; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); }
        .modal-header h3 { font-size: 1rem; font-weight: 600; color: #fff; margin: 0; }
        .modal-close { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 6px; }
        .modal-body { padding: 24px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid var(--border); }
        .btn-secondary { background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text-muted); padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; }
        .btn-primary { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); border: none; color: #fff; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .form-label { display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px; font-weight: 500; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default PendingEmployees;
