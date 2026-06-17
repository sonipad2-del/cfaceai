import React, { useEffect, useState } from 'react';
import { DollarSign, AlertTriangle, FileText, Search, User } from 'lucide-react';
import { employeesAPI } from '../services/api';

const Payroll = () => {
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchPayroll = async (retryCount = 0) => {
    try {
      if (retryCount === 0) setLoading(true);
      const data = await employeesAPI.getPayroll();
      setPayrollData(data);
      setError('');
      setLoading(false);
    } catch (err) {
      console.error('Error fetching payroll', err);
      if (retryCount < 3) {
        // Retry logic if backend isn't ready
        setTimeout(() => fetchPayroll(retryCount + 1), 2000);
      } else {
        setError('ไม่สามารถเรียกข้อมูลสรุปเงินเดือนได้ (กรุณาลองใหม่ภายหลัง)');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

  const filteredPayroll = payrollData.filter(emp =>
    (emp.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatEmploymentType = (type) => {
    switch (type) {
      case 'monthly': return 'รายเดือน';
      case 'daily': return 'รายวัน';
      case 'hourly': return 'รายชั่วโมง';
      default: return type || 'N/A';
    }
  };

  const fmtNum = (n) => (n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const fmtMoney = (n) => (n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading && payrollData.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>กำลังโหลดข้อมูลสรุปเงินเดือน...</p>
      </div>
    );
  }

  const totalPayrollAmount = payrollData.reduce((sum, emp) => sum + (emp.total_amount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">สรุปเงินเดือน (Payroll)</h1>
          <p className="page-subtitle">แสดงข้อมูลการทำงานและยอดสุทธิของพนักงาน</p>
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
          <span className="emp-sum-value">{payrollData.length} คน</span>
        </div>
        <div className="emp-summary-card">
          <span className="emp-sum-label">ยอดสุทธิรวมทั้งหมด</span>
          <span className="emp-sum-value" style={{ color: 'var(--accent)' }}>{fmtMoney(totalPayrollAmount)} ฿</span>
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

        <div className="table-container">
          {filteredPayroll.length === 0 ? (
            <div className="no-data-employees">
              <FileText className="no-data-icon" size={48} />
              <p>{search ? 'ไม่พบพนักงานที่ตรงกับเงื่อนไข' : 'ยังไม่มีข้อมูลสรุปเงินเดือน'}</p>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ชื่อพนักงาน</th>
                  <th>ประเภท</th>
                  <th>อัตราจ้าง (฿)</th>
                  <th>จำนวนวันทำงาน</th>
                  <th>จำนวนชม.ทำงาน</th>
                  <th>ยอดสุทธิ (฿)</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayroll.map((emp, index) => (
                  <tr key={emp.employee_id || index}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{emp.full_name}</td>
                    <td>
                      <span className={`badge badge-success`}>
                        {formatEmploymentType(emp.employment_type)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtNum(emp.base_rate)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtNum(emp.days_worked)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtNum(emp.hours_worked)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                      {fmtMoney(emp.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        .payroll-card { padding: 24px; }
        .table-filter-bar { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 24px; }
        .search-box { position: relative; width: 100%; max-width: 400px; }
        .search-input { padding-left: 44px; }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
        .employees-count { font-size: 0.95rem; color: var(--text-muted); }
        .employees-count strong { color: var(--accent); }
        .no-data-employees { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; color: var(--text-muted); gap: 16px; }
        .no-data-icon { color: var(--border); }
        
        .emp-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .emp-summary-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; gap: 4px; }
        .emp-sum-label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .emp-sum-value { font-size: 1.3rem; font-weight: 700; color: #fff; }
      `}</style>
    </div>
  );
};

export default Payroll;
