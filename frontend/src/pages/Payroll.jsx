import React, { useEffect, useState, useCallback } from 'react';
import {
  DollarSign, AlertTriangle, FileText, Search, Plus, Trash2,
  ChevronDown, ChevronUp, X
} from 'lucide-react';
import { employeesAPI, payrollAPI } from '../services/api';

const EXTRA_TYPES = [
  { value: 'ot', label: 'ค่าล่วงเวลา (OT)' },
  { value: 'diligence', label: 'เบี้ยขยัน' },
  { value: 'bonus', label: 'โบนัส' },
  { value: 'food', label: 'ค่าอาหาร' },
  { value: 'fuel', label: 'ค่าน้ำมัน' },
  { value: 'other', label: 'อื่นๆ' },
];

const DEDUCTION_TYPES = [
  { value: 'social_security', label: 'ประกันสังคม' },
  { value: 'absent', label: 'ขาดงาน' },
  { value: 'late', label: 'มาสาย' },
  { value: 'loan', label: 'หักเงินกู้' },
  { value: 'advance', label: 'หักเงินสำรอง' },
  { value: 'other', label: 'อื่นๆ' },
];

const MONTHS_TH = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];

const now = new Date();

const Payroll = () => {
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [expanded, setExpanded] = useState({});
  const [addModal, setAddModal] = useState(null); // { employeeId, mode: 'extra'|'deduction' }
  const [addForm, setAddForm] = useState({ type: '', amount: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchPayroll = useCallback(async () => {
    try {
      setLoading(true);
      const data = await employeesAPI.getPayroll(month, year);
      setPayrollData(data);
      setError('');
    } catch (err) {
      setError('ไม่สามารถเรียกข้อมูลสรุปเงินเดือนได้');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const openAddModal = (employeeId, mode) => {
    setAddForm({ type: mode === 'extra' ? 'ot' : 'social_security', amount: '', description: '' });
    setAddModal({ employeeId, mode });
  };

  const handleAdd = async () => {
    if (!addModal || !addForm.amount || isNaN(parseFloat(addForm.amount))) return;
    setSaving(true);
    try {
      const payload = {
        employee_id: addModal.employeeId,
        type: addForm.type,
        amount: parseFloat(addForm.amount),
        description: addForm.description || null,
        month,
        year,
      };
      if (addModal.mode === 'extra') {
        await payrollAPI.addExtra(payload);
      } else {
        await payrollAPI.addDeduction(payload);
      }
      setAddModal(null);
      await fetchPayroll();
    } catch {
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveExtra = async (extraId) => {
    try {
      await payrollAPI.removeExtra(extraId);
      await fetchPayroll();
    } catch {
      alert('เกิดข้อผิดพลาดในการลบ');
    }
  };

  const handleRemoveDeduction = async (deductionId) => {
    try {
      await payrollAPI.removeDeduction(deductionId);
      await fetchPayroll();
    } catch {
      alert('เกิดข้อผิดพลาดในการลบ');
    }
  };

  const filteredPayroll = payrollData.filter(emp =>
    (emp.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const fmtMoney = (n) => (n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtEmpType = (t) => ({ monthly: 'รายเดือน', daily: 'รายวัน', hourly: 'รายชั่วโมง' }[t] || t);
  const fmtExtraType = (t) => EXTRA_TYPES.find(x => x.value === t)?.label || t;
  const fmtDeductType = (t) => DEDUCTION_TYPES.find(x => x.value === t)?.label || t;

  const totalNet = payrollData.reduce((sum, e) => sum + (e.net_income || 0), 0);
  const totalExtra = payrollData.reduce((sum, e) => sum + (e.extra_total || 0), 0);
  const totalDeduction = payrollData.reduce((sum, e) => sum + (e.deduction_total || 0), 0);

  const yearOptions = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) yearOptions.push(y);

  if (loading && payrollData.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>กำลังโหลดข้อมูลสรุปเงินเดือน...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">สรุปเงินเดือน (Payroll)</h1>
          <p className="page-subtitle">จัดการรายได้ รายหัก และสรุปเงินเดือนพนักงานแต่ละเดือน</p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Month/Year selector */}
      <div className="payroll-period-bar">
        <span className="period-label">เดือน:</span>
        <select className="period-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS_TH.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <select className="period-select" value={year} onChange={e => setYear(Number(e.target.value))}>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="period-badge">{MONTHS_TH[month - 1]} {year}</span>
      </div>

      {/* Summary Cards */}
      <div className="emp-summary-grid">
        <div className="emp-summary-card">
          <span className="emp-sum-label">พนักงานทั้งหมด</span>
          <span className="emp-sum-value">{payrollData.length} คน</span>
        </div>
        <div className="emp-summary-card">
          <span className="emp-sum-label">รายได้พิเศษรวม</span>
          <span className="emp-sum-value" style={{ color: 'var(--success)' }}>+{fmtMoney(totalExtra)} ฿</span>
        </div>
        <div className="emp-summary-card">
          <span className="emp-sum-label">รายหักรวม</span>
          <span className="emp-sum-value" style={{ color: 'var(--error)' }}>-{fmtMoney(totalDeduction)} ฿</span>
        </div>
        <div className="emp-summary-card">
          <span className="emp-sum-label">ยอดสุทธิรวม</span>
          <span className="emp-sum-value" style={{ color: 'var(--accent)' }}>{fmtMoney(totalNet)} ฿</span>
        </div>
      </div>

      <div className="card glass payroll-card">
        <div className="table-filter-bar">
          <div className="search-box">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="form-input search-input"
              placeholder="ค้นหาพนักงาน..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="employees-count">
            แสดง: <strong>{filteredPayroll.length}</strong> / {payrollData.length} คน
          </div>
        </div>

        {filteredPayroll.length === 0 ? (
          <div className="no-data-employees">
            <FileText className="no-data-icon" size={48} />
            <p>{search ? 'ไม่พบพนักงานที่ตรงกับเงื่อนไข' : 'ยังไม่มีข้อมูลสรุปเงินเดือน'}</p>
          </div>
        ) : (
          <div className="payroll-list">
            {filteredPayroll.map((emp, index) => (
              <div key={emp.id} className="payroll-row">
                <div className="payroll-row-header" onClick={() => toggleExpand(emp.id)}>
                  <div className="payroll-emp-info">
                    <span className="payroll-index">{index + 1}</span>
                    <div>
                      <div className="payroll-emp-name">{emp.full_name}</div>
                      <div className="payroll-emp-meta">
                        {fmtEmpType(emp.employment_type)}
                        {emp.position && <span className="payroll-emp-pos"> · {emp.position}</span>}
                        {emp.department && <span className="payroll-emp-pos"> · {emp.department}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="payroll-summary-inline">
                    <div className="payroll-col">
                      <span className="payroll-col-label">เงินเดือนฐาน</span>
                      <span className="payroll-col-val">{fmtMoney(emp.base_salary)} ฿</span>
                    </div>
                    <div className="payroll-col">
                      <span className="payroll-col-label">+รายได้พิเศษ</span>
                      <span className="payroll-col-val" style={{ color: 'var(--success)' }}>+{fmtMoney(emp.extra_total)} ฿</span>
                    </div>
                    <div className="payroll-col">
                      <span className="payroll-col-label">-รายหัก</span>
                      <span className="payroll-col-val" style={{ color: 'var(--error)' }}>-{fmtMoney(emp.deduction_total)} ฿</span>
                    </div>
                    <div className="payroll-col payroll-net">
                      <span className="payroll-col-label">ยอดสุทธิ</span>
                      <span className="payroll-col-val net-val">{fmtMoney(emp.net_income)} ฿</span>
                    </div>
                    {expanded[emp.id] ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </div>
                </div>

                {expanded[emp.id] && (
                  <div className="payroll-detail">
                    <div className="payroll-detail-stats">
                      <span>วันทำงาน: <strong>{emp.days_worked}</strong> วัน</span>
                      <span>ชม.ทำงาน: <strong>{emp.hours_worked}</strong> ชม.</span>
                      <span>อัตราจ้าง: <strong>{fmtMoney(emp.base_rate)}</strong> ฿</span>
                    </div>

                    <div className="payroll-two-col">
                      {/* Extras */}
                      <div className="payroll-section">
                        <div className="payroll-section-header">
                          <span className="payroll-section-title extra-title">รายได้พิเศษ</span>
                          <button className="add-item-btn" onClick={() => openAddModal(emp.id, 'extra')}>
                            <Plus size={14} /> เพิ่ม
                          </button>
                        </div>
                        {(emp.extras || []).length === 0 ? (
                          <div className="payroll-empty">ยังไม่มีรายการ</div>
                        ) : (
                          emp.extras.map(e => (
                            <div key={e.id} className="payroll-item">
                              <span className="item-type extra-badge">{fmtExtraType(e.type)}</span>
                              <span className="item-desc">{e.description || ''}</span>
                              <span className="item-amount extra-amount">+{fmtMoney(e.amount)}</span>
                              <button className="remove-btn" onClick={() => handleRemoveExtra(e.id)}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Deductions */}
                      <div className="payroll-section">
                        <div className="payroll-section-header">
                          <span className="payroll-section-title deduct-title">รายหัก</span>
                          <button className="add-item-btn" onClick={() => openAddModal(emp.id, 'deduction')}>
                            <Plus size={14} /> เพิ่ม
                          </button>
                        </div>
                        {(emp.deductions || []).length === 0 ? (
                          <div className="payroll-empty">ยังไม่มีรายการ</div>
                        ) : (
                          emp.deductions.map(d => (
                            <div key={d.id} className="payroll-item">
                              <span className="item-type deduct-badge">{fmtDeductType(d.type)}</span>
                              <span className="item-desc">{d.description || ''}</span>
                              <span className="item-amount deduct-amount">-{fmtMoney(d.amount)}</span>
                              <button className="remove-btn" onClick={() => handleRemoveDeduction(d.id)}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Extra / Deduction Modal */}
      {addModal && (
        <div className="modal-overlay" onClick={() => setAddModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{addModal.mode === 'extra' ? 'เพิ่มรายได้พิเศษ' : 'เพิ่มรายหัก'}</h3>
              <button className="modal-close" onClick={() => setAddModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <label className="form-label">ประเภท</label>
              <select className="form-input" value={addForm.type} onChange={e => setAddForm({ ...addForm, type: e.target.value })}>
                {(addModal.mode === 'extra' ? EXTRA_TYPES : DEDUCTION_TYPES).map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <label className="form-label" style={{ marginTop: 16 }}>จำนวนเงิน (บาท)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={addForm.amount}
                onChange={e => setAddForm({ ...addForm, amount: e.target.value })}
              />

              <label className="form-label" style={{ marginTop: 16 }}>หมายเหตุ (ไม่บังคับ)</label>
              <input
                className="form-input"
                placeholder="รายละเอียดเพิ่มเติม..."
                value={addForm.description}
                onChange={e => setAddForm({ ...addForm, description: e.target.value })}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setAddModal(null)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleAdd} disabled={saving || !addForm.amount}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .payroll-card { padding: 24px; }
        .payroll-period-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .period-label { font-size: 0.9rem; color: var(--text-muted); }
        .period-select { background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 0.9rem; cursor: pointer; }
        .period-select option { background: #1a1530; }
        .period-badge { background: rgba(157,78,221,0.15); border: 1px solid rgba(157,78,221,0.3); color: var(--primary-light); padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }

        .table-filter-bar { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 24px; }
        .search-box { position: relative; width: 100%; max-width: 400px; }
        .search-input { padding-left: 44px; }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
        .employees-count { font-size: 0.95rem; color: var(--text-muted); }
        .employees-count strong { color: var(--accent); }

        .payroll-list { display: flex; flex-direction: column; gap: 8px; }
        .payroll-row { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .payroll-row-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; cursor: pointer; transition: background 0.2s; gap: 12px; }
        .payroll-row-header:hover { background: rgba(255,255,255,0.02); }
        .payroll-emp-info { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .payroll-index { background: rgba(157,78,221,0.15); color: var(--primary-light); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
        .payroll-emp-name { font-weight: 600; font-size: 0.95rem; color: #fff; }
        .payroll-emp-meta { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }
        .payroll-emp-pos { color: var(--accent); }
        .payroll-summary-inline { display: flex; align-items: center; gap: 24px; flex-shrink: 0; }
        .payroll-col { display: flex; flex-direction: column; align-items: flex-end; }
        .payroll-col-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .payroll-col-val { font-size: 0.9rem; font-weight: 600; color: #fff; }
        .payroll-net .net-val { font-size: 1rem; font-weight: 800; color: var(--accent); }

        .payroll-detail { border-top: 1px solid var(--border); padding: 16px 20px; background: rgba(0,0,0,0.15); }
        .payroll-detail-stats { display: flex; gap: 24px; margin-bottom: 16px; font-size: 0.85rem; color: var(--text-muted); }
        .payroll-detail-stats strong { color: #fff; }
        .payroll-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .payroll-section { background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
        .payroll-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .payroll-section-title { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .extra-title { color: var(--success); }
        .deduct-title { color: var(--error); }
        .add-item-btn { display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text-muted); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.78rem; transition: all 0.2s; }
        .add-item-btn:hover { color: #fff; background: rgba(157,78,221,0.15); border-color: var(--primary); }
        .payroll-empty { font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 8px 0; }
        .payroll-item { display: flex; align-items: center; gap: 6px; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .payroll-item:last-child { border-bottom: none; }
        .item-type { font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; white-space: nowrap; }
        .extra-badge { background: rgba(6,214,160,0.12); color: #06d6a0; }
        .deduct-badge { background: rgba(239,71,111,0.12); color: var(--error); }
        .item-desc { font-size: 0.8rem; color: var(--text-muted); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .item-amount { font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
        .extra-amount { color: var(--success); }
        .deduct-amount { color: var(--error); }
        .remove-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 2px; border-radius: 4px; display: flex; align-items: center; }
        .remove-btn:hover { color: var(--error); }

        .emp-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .emp-summary-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; gap: 4px; }
        .emp-sum-label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .emp-sum-value { font-size: 1.3rem; font-weight: 700; color: #fff; }
        .no-data-employees { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; color: var(--text-muted); gap: 16px; }
        .no-data-icon { color: var(--border); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: #1a1530; border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 440px; overflow: hidden; animation: fadeIn 0.2s ease; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); }
        .modal-header h3 { font-size: 1.1rem; font-weight: 600; color: #fff; margin: 0; }
        .modal-close { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 6px; }
        .modal-close:hover { color: #fff; }
        .modal-body { padding: 24px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid var(--border); }
        .btn-secondary { background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text-muted); padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; }
        .btn-secondary:hover { color: #fff; }
        .btn-primary { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); border: none; color: #fff; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .form-label { display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px; font-weight: 500; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 900px) {
          .payroll-summary-inline { gap: 12px; }
          .payroll-two-col { grid-template-columns: 1fr; }
          .payroll-col:not(.payroll-net) { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Payroll;
