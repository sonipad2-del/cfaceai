import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, Mail, Lock, Building, AlertCircle } from 'lucide-react';
import { authAPI } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError('กรุณายอมรับข้อตกลงและนโยบายความเป็นส่วนบุคคล (PDPA) เพื่อลงทะเบียน');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const data = await authAPI.register(email, password, companyName, termsAccepted);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('email', data.email);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'การลงทะเบียนล้มเหลว กรุณาเช็กความถูกต้องของข้อมูลหรือเปลี่ยนอีเมล'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass">
        <div className="auth-header">
          <Clock className="auth-logo" />
          <h1 className="auth-title">Nova7</h1>
          <p className="auth-subtitle">สร้างบัญชีผู้ใช้งานและลงทะเบียนบริษัท</p>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="companyName">ชื่อบริษัท / ร้านค้า</label>
            <div className="input-with-icon">
              <Building className="input-icon" size={18} />
              <input
                id="companyName"
                type="text"
                required
                className="form-input"
                placeholder="เช่น คาเฟ่ริมน้ำ"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">อีเมลผู้ดูแลระบบ</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                required
                className="form-input"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">รหัสผ่าน (ขั้นต่ำ 6 ตัวอักษร)</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                required
                minLength={6}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group checkbox-group" style={{ marginBottom: '20px', marginTop: '10px' }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#a0a0b0' }}>
              <input
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer' }}
              />
              <span className="checkbox-text" style={{ lineHeight: '1.4' }}>
                ข้าพเจ้ายอมรับ <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#c084fc', textDecoration: 'underline' }}>ข้อตกลงในการให้บริการ</a> และ <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#c084fc', textDecoration: 'underline' }}>นโยบายความเป็นส่วนบุคคล (PDPA)</a>
              </span>
            </label>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? 'กำลังบันทึกข้อมูล...' : 'ลงทะเบียนบริษัท'}
          </button>
        </form>

        <div className="auth-switch">
          <span>มีบัญชีอยู่แล้วใช่ไหม?</span>{' '}
          <Link to="/login">เข้าสู่ระบบ</Link>
        </div>
      </div>

      <style>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: linear-gradient(135deg, #090714 0%, #150f2e 100%);
          background-image: 
            radial-gradient(at 0% 0%, rgba(157, 78, 221, 0.15) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(224, 170, 255, 0.08) 0px, transparent 50%);
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          padding: 40px;
          border-radius: var(--border-radius);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .auth-logo {
          color: var(--primary);
          width: 48px;
          height: 48px;
          margin-bottom: 15px;
          filter: drop-shadow(0 0 10px var(--primary));
        }

        .auth-title {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #fff 0%, var(--primary-light) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .auth-subtitle {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-top: 8px;
        }

        .input-with-icon {
          position: relative;
        }

        .input-with-icon .form-input {
          padding-left: 44px;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(239, 71, 111, 0.1);
          border: 1px solid rgba(239, 71, 111, 0.3);
          color: var(--error);
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 0.9rem;
        }

        .auth-submit {
          width: 100%;
          margin-top: 15px;
          padding: 12px;
        }

        .auth-switch {
          text-align: center;
          margin-top: 24px;
          font-size: 0.9rem;
          color: var(--text-muted);
        }

        .auth-switch a {
          color: var(--primary-light);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default Register;
