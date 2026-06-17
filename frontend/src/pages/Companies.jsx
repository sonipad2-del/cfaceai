import React, { useEffect, useState } from 'react';
import { Building2, Users, Search, RefreshCw } from 'lucide-react';
import { adminAPI } from '../services/api';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.join_code?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏢 Companies</h1>
          <p className="page-subtitle">บริษัททั้งหมดในระบบ ({companies.length} บริษัท)</p>
        </div>
        <button className="btn-icon" onClick={load} title="Refresh">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            className="search-input"
            placeholder="ค้นหาชื่อบริษัท / Join Code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-box"><div className="spinner" /><p>กำลังโหลด...</p></div>
      ) : (
        <div className="card glass">
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ชื่อบริษัท</th>
                  <th>Join Code</th>
                  <th>พนักงาน (ทั้งหมด)</th>
                  <th>พนักงาน (Active)</th>
                  <th>วันที่สมัคร</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>ไม่พบข้อมูล</td></tr>
                ) : filtered.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={16} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                      </div>
                    </td>
                    <td><code style={{ background: 'rgba(255,255,255,0.07)', padding: '2px 8px', borderRadius: 4, fontSize: '0.85rem' }}>{c.join_code || '-'}</code></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Users size={14} style={{ color: 'var(--text-muted)' }} />
                        {c.employee_count}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${c.active_count > 0 ? 'badge-success' : 'badge-muted'}`}>
                        {c.active_count} active
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .page-title { font-size: 1.6rem; font-weight: 700; color: #fff; }
        .page-subtitle { color: var(--text-muted); font-size: 0.9rem; margin-top: 4px; }
        .btn-icon { background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: var(--text-muted); width: 38px; height: 38px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-icon:hover { color: #fff; background: rgba(255,255,255,0.1); }
        .toolbar { display: flex; gap: 12px; margin-bottom: 20px; }
        .search-wrap { position: relative; flex: 1; max-width: 360px; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
        .search-input { width: 100%; padding: 9px 12px 9px 36px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 8px; color: #fff; font-size: 0.9rem; outline: none; }
        .search-input:focus { border-color: rgba(157,78,221,0.5); }
        .loading-box { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px 0; color: var(--text-muted); }
        .spinner { width: 40px; height: 40px; border: 3px solid rgba(157,78,221,0.15); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .badge-muted { background: rgba(255,255,255,0.06); color: var(--text-muted); padding: 3px 10px; border-radius: 20px; font-size: 0.8rem; }
      `}</style>
    </div>
  );
};

export default Companies;
