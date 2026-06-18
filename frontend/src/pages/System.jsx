import React, { useEffect, useState } from 'react';
import { Activity, Database, Server, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { adminAPI } from '../services/api';

const System = () => {
  const [stats, setStats] = useState(null);
  const [backendOk, setBackendOk] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getGlobalStats();
      setStats(data);
      setBackendOk(true);
    } catch {
      setBackendOk(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const email = localStorage.getItem('email') || '-';

  const InfoRow = ({ label, value, mono }) => (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className={`info-val ${mono ? 'mono' : ''}`}>{value}</span>
    </div>
  );

  const StatCard = ({ icon, label, value, color }) => (
    <div className="stat-card glass">
      <div className="stat-icon" style={{ color }}>{icon}</div>
      <div className="stat-val">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ System</h1>
          <p className="page-subtitle">สถานะและข้อมูลระบบ Nova7</p>
        </div>
        <button className="btn-icon" onClick={load} title="Refresh">
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Status Cards */}
      <div className="status-row">
        <div className={`status-pill ${backendOk ? 'ok' : 'fail'}`}>
          {backendOk ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          Backend API: {backendOk === null ? 'checking...' : backendOk ? 'Online' : 'Offline'}
        </div>
        <div className="status-pill ok">
          <CheckCircle size={15} />
          Frontend: Online
        </div>
        <div className="status-pill ok">
          <Database size={15} />
          Supabase PostgreSQL
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="stats-grid">
          <StatCard icon={<Server size={22} />}     label="Total Companies"   value={stats.total_companies}   color="#a78bfa" />
          <StatCard icon={<Activity size={22} />}   label="Total Employees"   value={stats.total_employees}   color="#34d399" />
          <StatCard icon={<CheckCircle size={22} />} label="Total Check-ins"  value={stats.total_checkins}    color="#60a5fa" />
          <StatCard icon={<Activity size={22} />}   label="Ad Impressions"    value={stats.total_ad_impressions} color="#fbbf24" />
        </div>
      )}

      {/* System Info */}
      <div className="grid-2-info">
        <div className="card glass info-card">
          <h2 className="card-section-title"><Server size={16} /> System Info</h2>
          <InfoRow label="Platform"        value="Nova7 v1.0.0" />
          <InfoRow label="Backend"         value="FastAPI + Python" />
          <InfoRow label="Database"        value="Supabase PostgreSQL" />
          <InfoRow label="Frontend"        value="React + Vite 5" />
          <InfoRow label="Auth"            value="JWT HS256 (24h)" />
          <InfoRow label="Face Verify"     value="OpenCV Haar Cascade + HSV" />
          <InfoRow label="GPS"             value="Haversine Formula" />
          <InfoRow label="Telegram Bot"    value="python-telegram-bot" />
        </div>

        <div className="card glass info-card">
          <h2 className="card-section-title"><CheckCircle size={16} /> Session</h2>
          <InfoRow label="Logged in as"    value={email} mono />
          <InfoRow label="Role"            value="superadmin" />
          <InfoRow label="API Base"        value={import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'} mono />
          <InfoRow label="Frontend URL"    value={window.location.origin} mono />
          <InfoRow label="Node Env"        value={import.meta.env.MODE} />
        </div>
      </div>

      <style>{`
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .page-title { font-size: 1.6rem; font-weight: 700; color: #fff; }
        .page-subtitle { color: var(--text-muted); font-size: 0.9rem; margin-top: 4px; }
        .btn-icon { background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: var(--text-muted); width: 38px; height: 38px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-icon:hover { color: #fff; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .status-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px; }
        .status-pill { display: flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 20px; font-size: 0.84rem; font-weight: 500; }
        .status-pill.ok { background: rgba(6,214,160,0.1); border: 1px solid rgba(6,214,160,0.3); color: var(--success); }
        .status-pill.fail { background: rgba(239,71,111,0.1); border: 1px solid rgba(239,71,111,0.3); color: var(--error); }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat-card { padding: 20px; border-radius: 12px; display: flex; flex-direction: column; gap: 8px; }
        .stat-icon { }
        .stat-val { font-size: 2rem; font-weight: 700; color: #fff; }
        .stat-label { color: var(--text-muted); font-size: 0.85rem; }
        .grid-2-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 768px) { .grid-2-info { grid-template-columns: 1fr; } }
        .info-card { padding: 24px; }
        .card-section-title { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 18px; }
        .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: var(--text-muted); font-size: 0.88rem; }
        .info-val { color: #fff; font-size: 0.88rem; font-weight: 500; text-align: right; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mono { font-family: 'Courier New', monospace; font-size: 0.8rem; color: var(--primary-light); }
      `}</style>
    </div>
  );
};

export default System;
