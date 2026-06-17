import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Megaphone,
  Send,
  Settings as SettingsIcon,
  LogOut,
  Clock,
  FileText,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import { companiesAPI } from '../services/api';

const SUPERADMIN_NAV = [
  { to: '/dashboard',  icon: <LayoutDashboard size={20} />, label: 'Dashboard'    },
  { to: '/companies',  icon: <Building2       size={20} />, label: 'Companies'    },
  { to: '/users',      icon: <Users           size={20} />, label: 'Users'        },
  { to: '/ads',        icon: <Megaphone       size={20} />, label: 'Ads'          },
  { to: '/broadcast',  icon: <Send            size={20} />, label: 'Broadcast'    },
  { to: '/system',     icon: <SettingsIcon    size={20} />, label: 'System'       },
];

const OWNER_NAV = [
  { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'แดชบอร์ด'              },
  { to: '/employees', icon: <Users           size={20} />, label: 'รายชื่อพนักงาน'       },
  { to: '/leaves',    icon: <FileText        size={20} />, label: '📝 ลางาน'             },
  { to: '/payroll',   icon: <DollarSign      size={20} />, label: '💰 สรุปเงินเดือน'    },
  { to: '/announcements', icon: <Megaphone   size={20} />, label: '📣 ประกาศพนักงาน'    },
  { to: '/settings',  icon: <SettingsIcon    size={20} />, label: 'ตั้งค่า GPS'          },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || 'owner';
  const isSuperAdmin = role === 'superadmin';
  const [companyName, setCompanyName] = useState(isSuperAdmin ? 'Super Admin' : 'CFaceAI');

  useEffect(() => {
    if (isSuperAdmin) return;
    companiesAPI.getMe()
      .then(data => setCompanyName(data.name))
      .catch(() => {});
  }, [isSuperAdmin]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    navigate('/login');
  };

  const navItems = isSuperAdmin ? SUPERADMIN_NAV : OWNER_NAV;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Clock className="brand-icon" />
        <span className="brand-name">CFaceAI</span>
      </div>

      <div className={`company-tag ${isSuperAdmin ? 'superadmin-tag' : ''}`}>
        {isSuperAdmin
          ? <ShieldCheck size={14} className="tag-icon superadmin-icon" />
          : <span className="dot"></span>
        }
        <span className="company-txt">{companyName}</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>ออกจากระบบ</span>
        </button>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          background: rgba(19, 15, 38, 0.95);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 25px 20px;
          z-index: 100;
        }
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .brand-icon { color: var(--accent); width: 28px; height: 28px; }
        .brand-name {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #fff 0%, var(--primary-light) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .company-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(157, 78, 221, 0.1);
          border: 1px solid rgba(157, 78, 221, 0.2);
          padding: 6px 12px;
          border-radius: 8px;
          margin-bottom: 30px;
          font-size: 0.85rem;
        }
        .superadmin-tag {
          background: rgba(255, 183, 3, 0.08);
          border-color: rgba(255, 183, 3, 0.3);
        }
        .dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background-color: var(--success);
          box-shadow: 0 0 8px var(--success);
          flex-shrink: 0;
        }
        .tag-icon { flex-shrink: 0; }
        .superadmin-icon { color: #ffb703; }
        .company-txt {
          font-weight: 500;
          color: var(--accent);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .superadmin-tag .company-txt { color: #ffb703; }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-grow: 1;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 16px;
          color: var(--text-muted);
          border-radius: 10px;
          font-weight: 500;
          font-size: 0.92rem;
          transition: all 0.2s ease;
          text-decoration: none;
        }
        .nav-item:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.04);
        }
        .nav-item.active {
          color: #fff;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
          box-shadow: 0 4px 12px var(--primary-glow);
        }
        .sidebar-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 15px;
        }
        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.2s ease;
          text-align: left;
        }
        .logout-btn:hover {
          color: var(--error);
          background: rgba(239, 71, 111, 0.05);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
