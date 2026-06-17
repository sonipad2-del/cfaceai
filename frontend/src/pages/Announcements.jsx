import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, Clock, Search, Image as ImageIcon } from 'lucide-react';
import { announcementsAPI } from '../services/api';

const TEMPLATES = [
  { label: '📢 แจ้งเตือนทั่วไป', text: '📢 ประกาศจากบริษัท\n\n' },
  { label: '🏖️ วันหยุด', text: '🏖️ แจ้งวันหยุดพิเศษ: วันที่ ___ ไม่มีการทำงาน' },
  { label: '⚠️ ประกาศสำคัญ', text: '⚠️ ประกาศสำคัญ:\n\n' },
];

const Announcements = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const data = await announcementsAPI.getAll();
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    if (!window.confirm(`ส่งประกาศนี้ไปหาพนักงานทุกคนในบริษัท?`)) return;
    setSending(true);
    
    try {
      const res = await announcementsAPI.create({
        title,
        message,
        image_url: imageUrl
      });
      setTitle('');
      setMessage('');
      setImageUrl('');
      // Prepend to list
      setAnnouncements([res, ...announcements]);
    } catch (err) {
      alert(err.response?.data?.detail || 'ส่งประกาศไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('th-TH', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const charCount = message.length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📣 ประกาศพนักงาน (Announcements)</h1>
          <p className="page-subtitle">ส่งข้อความประกาศข่าวสารและอัปเดตต่างๆ ถึงพนักงานทุกคนผ่าน Telegram</p>
        </div>
      </div>

      <div className="broadcast-layout">
        {/* Left: Compose */}
        <div className="card glass compose-card" style={{ flex: '1' }}>
          <h2 className="section-label">สร้างประกาศใหม่</h2>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#a0aec0', fontSize: '0.9rem' }}>หัวข้อประกาศ</label>
            <input
              type="text"
              className="form-input"
              placeholder="เช่น ประกาศวันหยุดสงกรานต์"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
            />
          </div>

          <div className="template-row" style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
            {TEMPLATES.map(t => (
              <button 
                key={t.label} 
                className="tpl-btn" 
                onClick={() => { setTitle(t.label.replace(/[^ก-๙a-zA-Z0-9\s]/g, '').trim()); setMessage(t.text); }}
                style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '20px', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#a0aec0', fontSize: '0.9rem' }}>รายละเอียดข้อความ</label>
            <textarea
              className="msg-textarea"
              placeholder="พิมพ์รายละเอียดประกาศ..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={8}
              maxLength={2000}
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', resize: 'vertical' }}
            />
            <div className="char-count" style={{ textAlign: 'right', color: '#64748b', fontSize: '0.8rem', marginTop: '5px' }}>{charCount} / 2000</div>
          </div>

          <div className="form-group" style={{ marginBottom: '25px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#a0aec0', fontSize: '0.9rem' }}>
              <ImageIcon size={16} /> แนบลิงก์รูปภาพ (Optional)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
            />
          </div>

          <button
            className="send-btn"
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
            style={{ width: '100%', padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold' }}
          >
            <Send size={18} />
            {sending ? 'กำลังส่งประกาศ...' : 'ส่งประกาศทันที'}
          </button>
        </div>

        {/* Right: History */}
        <div className="right-col" style={{ flex: '1' }}>
          <div className="card glass preview-card" style={{ height: '100%' }}>
            <h2 className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={20} /> ประวัติการส่งประกาศ
            </h2>
            
            <div className="history-list" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '600px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: '#a0aec0', padding: '20px' }}>กำลังโหลดข้อมูล...</div>
              ) : announcements.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#a0aec0', padding: '20px' }}>ยังไม่มีประวัติการส่งประกาศ</div>
              ) : (
                announcements.map(ann => (
                  <div key={ann.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px', borderLeft: '3px solid var(--primary-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>{ann.title}</h4>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{formatDate(ann.created_at)}</span>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ann.message}
                    </p>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#38bdf8' }}>
                        <Send size={14} /> ส่งแล้ว {ann.sent_count || 0} คน
                      </span>
                      {ann.image_url && (
                         <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f472b6' }}>
                           <ImageIcon size={14} /> แนบรูปภาพ
                         </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .broadcast-layout {
          display: flex;
          gap: 24px;
          margin-top: 20px;
        }
        @media (max-width: 900px) {
          .broadcast-layout {
            flex-direction: column;
          }
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed !important;
        }
      `}</style>
    </div>
  );
};

export default Announcements;
