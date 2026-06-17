import React, { useEffect, useState } from 'react';
import { Trash2, Search, UserMinus, AlertTriangle, Pencil, X, DollarSign } from 'lucide-react';
import { employeesAPI } from '../services/api';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', status: 'active', employment_type: 'monthly', base_rate: 0 });
  const [saving, setSaving] = useState(false);

  const fetchEmployees = async () => {
    try {
      const data = await employeesAPI.getAll();
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees list', err);
      setError('ไม่สามารถเรียกข้อมูลรายชื่อพนักงานได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleDelete = async (id, name) => {
    if (window.confirm(`คุณต้องการลบพนักงาน "${name}" ออกจากระบบใช่หรือไม่?`)) {
      try {
        await employeesAPI.delete(id);
        setEmployees(employees.filter(emp => emp.id !== id));
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการลบพนักงาน');
      }
    }
  };

  const openEdit = (emp) => {
    setEditForm({ full_name: emp.full_name, status: emp.status, employment_type: emp.employment_type || 'monthly', base_rate: emp.base_rate || 0 });
    setEditModal(emp);
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await employeesAPI.update(editModal.id, editForm);
      await fetchEmployees();
      setEditModal(null);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
    emp.chat_id.includes(search)
  );

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' น.';
  };

  const formatEmploymentType = (type) => {
    switch(type) {
      case 'monthly': return 'รายเดือน';
      case 'daily': return 'รายวัน';
      case 'hourly': return 'รายชั่วโมง';
      default: return type;
    }
  };

  const fmtNum = (n) => (n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const fmtMoney = (n) => (n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Summary stats
  const totalFaceRegistered = employees.filter(e => e.face_registered).length;
  const totalNotRegistered = employees.length - totalFaceRegistered;
  const totalMonthlySalary = employees.reduce((sum, e) => sum + (e.monthly_salary || 0), 0);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>กำลังโหลดรายชื่อพนักงาน...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">จัดการรายชื่อพนักงาน</h1>
          <p className="page-subtitle">จัดการสิทธิ์ ค่าจ้าง และสรุปเงินเดือนพนักงานทั้งหมด</p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="emp-summary-grid">
        <div className="emp-summary-card">
          <span className="emp-sum-label">พนักงานทั้งหมด</span>
          <span className="emp-sum-value">{employees.length} คน</span>
        </div>
        <div className="emp-summary-card">
          <span className="emp-sum-label">Face ID ลงทะเบียนแล้ว</span>
          <span className="emp-sum-value" style={{color: 'var(--success)'}}>{totalFaceRegistered} คน</span>
        </div>
        <div className="emp-summary-card">
          <span className="emp-sum-label">ยังไม่ลงทะเบียน Face ID</span>
          <span className="emp-sum-value" style={{color: 'var(--warning)'}}>{totalNotRegistered} คน</span>
        </div>
        <div className="emp-summary-card">
          <span className="emp-sum-label">ค่าจ้างรวม (เดือนนี้)</span>
          <span className="emp-sum-value" style={{color: 'var(--accent)'}}>{fmtMoney(totalMonthlySalary)} ฿</span>
        </div>
      </div>

      <div className="card glass employees-card">
        <div className="table-filter-bar">
          <div className="search-box">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="form-input search-input"
              placeholder="ค้นหาพนักงานด้วยชื่อ หรือ Chat ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="employees-count">
            แสดง: <strong>{filteredEmployees.length}</strong> / {employees.length} คน
          </div>
        </div>

        <div className="table-container">
          {filteredEmployees.length === 0 ? (
            <div className="no-data-employees">
              <UserMinus className="no-data-icon" size={48} />
              <p>{search ? 'ไม่พบพนักงานที่ตรงกับเงื่อนไขการค้นหา' : 'ยังไม่มีพนักงานมาลงทะเบียนผ่านทางบอท'}</p>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>Chat ID</th>
                  <th>วันที่ลงทะเบียน</th>
                  <th>Face ID</th>
                  <th>ประเภทการจ้าง</th>
                  <th>อัตราจ้าง</th>
                  <th>ชม.งาน (เดือนนี้)</th>
                  <th>เงินเดือน (เดือนนี้)</th>
                  <th>สถานะ</th>
                  <th style={{ textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, index) => (
                  <tr key={emp.id}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{emp.full_name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.85rem' }}>{emp.chat_id}</td>
                    <td style={{ fontSize: '0.85rem' }}>{formatDate(emp.created_at)}</td>
                    <td>
                      <span className={`badge ${emp.face_registered ? 'badge-success' : 'badge-warning'}`}>
                        {emp.face_registered ? '✅ ลงทะเบียนแล้ว' : '⏳ รอลงทะเบียน'}
                      </span>
                    </td>
                    <td>{formatEmploymentType(emp.employment_type)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtNum(emp.base_rate)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtNum(emp.monthly_hours)} ชม.</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{fmtMoney(emp.monthly_salary)} ฿</td>
                    <td>
                      <span className={`badge ${emp.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                        {emp.status === 'active' ? 'ใช้งานได้' : 'ระงับ'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="action-btn edit-btn" onClick={() => openEdit(emp)} title="แก้ไข">
                        <Pencil size={16} />
                      </button>
                      <button className="action-btn delete-btn" onClick={() => handleDelete(emp.id, emp.full_name)} title="ลบ">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>แก้ไขข้อมูลพนักงาน</h3>
              <button className="modal-close" onClick={() => setEditModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <label className="form-label">ชื่อ-นามสกุล</label>
              <input className="form-input" value={editForm.full_name} onChange={(e) => setEditForm({...editForm, full_name: e.target.value})} />

              <label className="form-label" style={{marginTop: 16}}>สถานะ</label>
              <select className="form-input" value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value})}>
                <option value="active">ใช้งานได้ (Active)</option>
                <option value="inactive">ระงับการใช้งาน (Inactive)</option>
              </select>

              <label className="form-label" style={{marginTop: 16}}>ประเภทการจ้าง</label>
              <select className="form-input" value={editForm.employment_type} onChange={(e) => setEditForm({...editForm, employment_type: e.target.value})}>
                <option value="monthly">รายเดือน (Monthly)</option>
                <option value="daily">รายวัน (Daily)</option>
                <option value="hourly">รายชั่วโมง (Hourly)</option>
              </select>

              <label className="form-label" style={{marginTop: 16}}>อัตราจ้าง (บาท)</label>
              <div style={{position: 'relative'}}>
                <DollarSign size={16} style={{position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} />
                <input className="form-input" type="number" step="0.01" min="0" style={{paddingLeft: 36}} value={editForm.base_rate} onChange={(e) => setEditForm({...editForm, base_rate: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditModal(null)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .employees-card { padding: 24px; }
        .table-filter-bar { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 24px; }
        .search-box { position: relative; width: 100%; max-width: 400px; }
        .search-input { padding-left: 44px; }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
        .employees-count { font-size: 0.95rem; color: var(--text-muted); }
        .employees-count strong { color: var(--accent); }
        .no-data-employees { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; color: var(--text-muted); gap: 16px; }
        .no-data-icon { color: var(--border); }
        .action-btn { background: transparent; border: none; cursor: pointer; padding: 6px; border-radius: 8px; transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; }
        .edit-btn { color: var(--text-muted); margin-right: 4px; }
        .edit-btn:hover { color: var(--primary-light); background: rgba(157, 78, 221, 0.1); }
        .delete-btn { color: var(--text-muted); }
        .delete-btn:hover { color: var(--error); background: rgba(239, 71, 111, 0.1); }

        .emp-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .emp-summary-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; gap: 4px; }
        .emp-sum-label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .emp-sum-value { font-size: 1.3rem; font-weight: 700; color: #fff; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: #1a1530; border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 480px; overflow: hidden; animation: fadeIn 0.2s ease; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); }
        .modal-header h3 { font-size: 1.1rem; font-weight: 600; color: #fff; margin: 0; }
        .modal-close { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 6px; }
        .modal-close:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .modal-body { padding: 24px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid var(--border); }
        .btn-secondary { background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text-muted); padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
        .btn-secondary:hover { color: #fff; background: rgba(255,255,255,0.1); }
        .btn-primary { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); border: none; color: #fff; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.2s; }
        .btn-primary:hover { box-shadow: 0 4px 15px var(--primary-glow); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .form-label { display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px; font-weight: 500; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default Employees;
