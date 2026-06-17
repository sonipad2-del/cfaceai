import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  UserMinus, 
  Eye, 
  MousePointerClick, 
  DollarSign,
  Building,
  Activity,
  FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { checkinsAPI, adminAPI } from '../services/api';

const Dashboard = () => {
  const role = localStorage.getItem('role') || 'owner';
  const [summary, setSummary] = useState({
    total_employees: 0,
    checked_in: 0,
    late: 0,
    absent: 0,
    total_impressions: 0,
    total_clicks: 0,
    est_earnings: 0.0,
  });
  const [weeklyChart, setWeeklyChart] = useState([]);
  const [todayCheckins, setTodayCheckins] = useState([]);
  const [globalStats, setGlobalStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (role === 'superadmin') {
          try {
            const stats = await adminAPI.getGlobalStats();
            setGlobalStats(stats);
          } catch (err) {
            console.error('Error fetching global stats', err);
          }
        }

        const sumData = await checkinsAPI.getSummary();
        setSummary(sumData.summary);
        setWeeklyChart(sumData.weekly_chart);

        const todayList = await checkinsAPI.getToday();
        setTodayCheckins(todayList);
      } catch (err) {
        console.error('Error fetching dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  };

  const handleDownloadCSV = async () => {
    try {
      const allCheckins = await checkinsAPI.getAll();
      if (!allCheckins || allCheckins.length === 0) {
        alert('ไม่มีข้อมูลเช็กอินในระบบ');
        return;
      }
      const header = 'ลำดับ,วันที่,พนักงาน,เวลาเข้า,เวลาออก,ระยะห่างเข้า(ม.),ระยะห่างออก(ม.),ชม.ทำงาน\n';
      const BOM = '\uFEFF';
      const rows = allCheckins.map((item, i) => {
        const dateStr = new Date(item.check_in_time).toLocaleDateString('th-TH');
        const inTime = new Date(item.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const outTime = item.check_out_time ? new Date(item.check_out_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
        const hours = item.check_out_time ? ((new Date(item.check_out_time) - new Date(item.check_in_time)) / 3600000).toFixed(2) : '-';
        return `${i + 1},${dateStr},${item.employee_name || ''},${inTime},${outTime},${item.distance_in ? item.distance_in.toFixed(1) : '-'},${item.distance_out ? item.distance_out.toFixed(1) : '-'},${hours}`;
      }).join('\n');
      const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cfaceai_checkins_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading CSV:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดรายงาน');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>กำลังโหลดข้อมูลแดชบอร์ด...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{role === 'superadmin' ? 'Super Admin Dashboard' : 'แดชบอร์ดสรุปผลวันนี้'}</h1>
          <p className="page-subtitle">
            {role === 'superadmin' ? 'สถิติภาพรวมระบบ (Global Stats)' : 'สถิติการเข้างานรายวันของพนักงาน'}
          </p>
        </div>
      </div>

      {role === 'superadmin' && globalStats && (
        <div style={{ marginBottom: '30px' }}>
          <h2 className="section-title">Super Admin Overview</h2>
          <div className="dashboard-grid">
            <div className="card glass">
              <div className="card-title">
                <span>Total Companies</span>
                <Building size={18} className="icon-purple" />
              </div>
              <div className="card-value">{globalStats.total_companies}</div>
              <div className="card-subtext neutral">Registered Companies</div>
            </div>

            <div className="card glass">
              <div className="card-title">
                <span>Total Employees</span>
                <Users size={18} className="icon-cyan" />
              </div>
              <div className="card-value">{globalStats.total_employees}</div>
              <div className="card-subtext neutral">Across all companies</div>
            </div>

            <div className="card glass">
              <div className="card-title">
                <span>Total Check-ins</span>
                <UserCheck size={18} className="icon-green" />
              </div>
              <div className="card-value">{globalStats.total_checkins}</div>
              <div className="card-subtext neutral">Total scans</div>
            </div>

            <div className="card glass">
              <div className="card-title">
                <span>Total Ad Impressions</span>
                <Eye size={18} className="icon-yellow" />
              </div>
              <div className="card-value">{globalStats.total_ad_impressions}</div>
              <div className="card-subtext neutral">Total impressions</div>
            </div>

            <div className="card glass">
              <div className="card-title">
                <span>Total Ad Clicks</span>
                <MousePointerClick size={18} className="icon-pink" />
              </div>
              <div className="card-value">{globalStats.total_ad_clicks}</div>
              <div className="card-subtext neutral">Total clicks</div>
            </div>

            <div className="card glass">
              <div className="card-title">
                <span>Total Revenue</span>
                <DollarSign size={18} className="icon-gold" />
              </div>
              <div className="card-value">{globalStats.total_revenue.toLocaleString('th-TH')} ฿</div>
              <div className="card-subtext up">Est. global revenue</div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Widgets */}
      <div className="dashboard-grid">
        <div className="card glass">
          <div className="card-title">
            <span>พนักงานทั้งหมด</span>
            <Users size={18} className="icon-purple" />
          </div>
          <div className="card-value">{summary.total_employees}</div>
          <div className="card-subtext neutral">พนักงานลงทะเบียนในระบบ</div>
        </div>

        <div className="card glass">
          <div className="card-title">
            <span>เข้างานวันนี้</span>
            <UserCheck size={18} className="icon-green" />
          </div>
          <div className="card-value">{summary.checked_in}</div>
          <div className="card-subtext up">เช็กอินเรียบร้อย</div>
        </div>

        <div className="card glass">
          <div className="card-title">
            <span>มาสาย</span>
            <Clock size={18} className="icon-yellow" />
          </div>
          <div className="card-value">{summary.late}</div>
          <div className="card-subtext down">เข้างานหลัง 08:30 น.</div>
        </div>

        <div className="card glass">
          <div className="card-title">
            <span>ขาดงาน</span>
            <UserMinus size={18} className="icon-red" />
          </div>
          <div className="card-value">{summary.absent}</div>
          <div className="card-subtext down">ยังไม่ได้สแกนเข้าวันนี้</div>
        </div>
      </div>

      {/* Ads Performance Widgets */}
      {role === 'superadmin' && (
        <div className="dashboard-grid secondary-widgets">
          <div className="card glass">
            <div className="card-title">
              <span>Impression โฆษณา</span>
              <Eye size={18} className="icon-cyan" />
            </div>
            <div className="card-value">{summary.total_impressions}</div>
            <div className="card-subtext neutral">จำนวนการเห็นโฆษณา</div>
          </div>

          <div className="card glass">
            <div className="card-title">
              <span>จำนวนการคลิก</span>
              <MousePointerClick size={18} className="icon-pink" />
            </div>
            <div className="card-value">{summary.total_clicks}</div>
            <div className="card-subtext up">
              CTR: {summary.total_impressions > 0 ? ((summary.total_clicks / summary.total_impressions) * 100).toFixed(2) : 0}%
            </div>
          </div>

          <div className="card glass">
            <div className="card-title">
              <span>รายได้ประมาณการ</span>
              <DollarSign size={18} className="icon-gold" />
            </div>
            <div className="card-value">{summary.est_earnings.toLocaleString('th-TH')} ฿</div>
            <div className="card-subtext up">จากระบบ Affiliate</div>
          </div>
        </div>
      )}

      {/* Graphical Chart & Table Grid */}
      <div className="grid-2">
        {/* Weekly Chart */}
        <div className="card glass chart-card">
          <h2 className="section-title">สถิติเช็กอินรายสัปดาห์ (คน)</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyChart} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#221e3b" />
                <XAxis dataKey="name" stroke="#9f94b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9f94b8" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#130f26', borderColor: '#8b5cf6', borderRadius: '10px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#9d4edd" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's Checkins */}
        <div className="card glass table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>ตารางการสแกนวันนี้</h2>
            <button className="csv-download-btn" onClick={handleDownloadCSV} title="ดาวน์โหลดรายงานเช็กอินทั้งหมด">
              📥 ดาวน์โหลด CSV
            </button>
          </div>
          <div className="table-container">
            {todayCheckins.length === 0 ? (
              <div className="no-data">วันนี้ยังไม่มีพนักงานเช็กอิน</div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>พนักงาน</th>
                    <th>เช็กอิน</th>
                    <th>เช็กเอาต์</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {todayCheckins.map((item) => {
                    const _d = new Date(item.check_in_time);
                    const isLate = _d.getHours() > 8 || (_d.getHours() === 8 && _d.getMinutes() > 30);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.employee_name}</td>
                        <td>{formatDateTime(item.check_in_time)}</td>
                        <td>{formatDateTime(item.check_out_time)}</td>
                        <td>
                          {item.check_out_time ? (
                            <span className="badge badge-success">เสร็จงาน</span>
                          ) : isLate ? (
                            <span className="badge badge-warning">สาย</span>
                          ) : (
                            <span className="badge badge-success">เข้างานตรงเวลา</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .section-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 20px;
          color: #fff;
          border-left: 3px solid var(--primary);
          padding-left: 10px;
        }

        .icon-purple { color: var(--primary-light); }
        .icon-green { color: var(--success); }
        .icon-yellow { color: var(--warning); }
        .icon-red { color: var(--error); }
        .icon-cyan { color: #00f5d4; }
        .icon-pink { color: var(--accent); }
        .icon-gold { color: #ffb703; }

        .secondary-widgets {
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }

        .chart-card, .table-card {
          min-height: 390px;
          display: flex;
          flex-direction: column;
        }

        .chart-container {
          flex-grow: 1;
          display: flex;
          align-items: center;
          margin-top: 10px;
        }

        .no-data {
          color: var(--text-muted);
          text-align: center;
          padding: 60px 0;
          font-size: 0.95rem;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
          gap: 20px;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(157, 78, 221, 0.1);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .csv-download-btn {
          background: rgba(157, 78, 221, 0.15);
          border: 1px solid rgba(157, 78, 221, 0.3);
          color: var(--accent);
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }
        .csv-download-btn:hover {
          background: rgba(157, 78, 221, 0.25);
          box-shadow: 0 2px 8px rgba(157, 78, 221, 0.2);
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
