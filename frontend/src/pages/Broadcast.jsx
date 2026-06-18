import React, { useState } from 'react';
import { Send, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { adminAPI } from '../services/api';

const TEMPLATES = [
  { label: '📢 แจ้งเตือนทั่วไป', text: '📢 แจ้งเตือนจากระบบ Nova7\n\n' },
  { label: '🔔 เตือนเช็กอิน', text: '🔔 เตือนพนักงานทุกท่าน: อย่าลืมเช็กอินก่อนเริ่มงานด้วยนะครับ/ค่ะ' },
  { label: '🏖️ วันหยุด', text: '🏖️ แจ้งวันหยุดพิเศษ: วันที่ ___ ไม่มีการทำงาน' },
  { label: '⚠️ ประกาศสำคัญ', text: '⚠️ ประกาศสำคัญจากฝ่ายบริหาร:\n\n' },
];

const Broadcast = () => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!window.confirm(`ส่งข้อความนี้ไปหาพนักงานทุกคนในระบบ?`)) return;
    setSending(true);
    setResult(null);
    try {
      const res = await adminAPI.broadcast(message);
      setResult({ ok: true, ...res });
    } catch (err) {
      setResult({ ok: false, error: err.response?.data?.detail || 'ส่งไม่สำเร็จ' });
    } finally {
      setSending(false);
    }
  };

  const charCount = message.length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📣 Broadcast</h1>
          <p className="page-subtitle">ส่งข้อความผ่าน Telegram ไปยังพนักงานทุกคนที่ Active ในระบบ</p>
        </div>
      </div>

      <div className="broadcast-layout">
        {/* Left: Compose */}
        <div className="card glass compose-card">
          <h2 className="section-label">เขียนข้อความ</h2>

          <div className="template-row">
            {TEMPLATES.map(t => (
              <button key={t.label} className="tpl-btn" onClick={() => setMessage(t.text)}>
                {t.label}
              </button>
            ))}
          </div>

          <textarea
            className="msg-textarea"
            placeholder="พิมพ์ข้อความที่ต้องการส่ง..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={10}
            maxLength={2000}
          />
          <div className="char-count">{charCount} / 2000</div>

          <button
            className="send-btn"
            onClick={handleSend}
            disabled={sending || !message.trim()}
          >
            <Send size={18} />
            {sending ? 'กำลังส่ง...' : 'ส่ง Broadcast'}
          </button>
        </div>

        {/* Right: Preview + Result */}
        <div className="right-col">
          <div className="card glass preview-card">
            <h2 className="section-label">ตัวอย่างข้อความ (Telegram)</h2>
            <div className="tg-preview">
              <div className="tg-bubble">
                {message
                  ? message.split('\n').map((line, i) => <p key={i} style={{ margin: '2px 0' }}>{line || <br />}</p>)
                  : <span style={{ color: 'rgba(255,255,255,0.3)' }}>ยังไม่มีข้อความ...</span>
                }
              </div>
            </div>
          </div>

          {result && (
            <div className={`result-box ${result.ok ? 'result-ok' : 'result-fail'}`}>
              {result.ok ? (
                <>
                  <CheckCircle size={22} />
                  <div>
                    <div className="result-title">ส่งสำเร็จ</div>
                    <div className="result-sub">
                      ส่งได้ <strong>{result.sent}</strong> คน
                      {result.failed > 0 && <>, ส่งไม่ได้ <strong>{result.failed}</strong> คน</>}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <XCircle size={22} />
                  <div>
                    <div className="result-title">ส่งไม่สำเร็จ</div>
                    <div className="result-sub">{result.error}</div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="warn-box">
            <AlertTriangle size={15} />
            <span>ข้อความจะถูกส่งไปยัง <strong>พนักงานทุกคน</strong> ที่มีสถานะ Active และ Chat ID ในระบบ ไม่สามารถยกเลิกได้หลังส่ง</span>
          </div>
        </div>
      </div>

      <style>{`
        .page-header { margin-bottom: 24px; }
        .page-title { font-size: 1.6rem; font-weight: 700; color: #fff; }
        .page-subtitle { color: var(--text-muted); font-size: 0.9rem; margin-top: 4px; }
        .broadcast-layout { display: grid; grid-template-columns: 1fr 380px; gap: 20px; }
        @media (max-width: 900px) { .broadcast-layout { grid-template-columns: 1fr; } }
        .compose-card, .preview-card { padding: 24px; }
        .section-label { font-size: 0.95rem; font-weight: 600; color: var(--text-muted); margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
        .template-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .tpl-btn { padding: 6px 12px; background: rgba(157,78,221,0.1); border: 1px solid rgba(157,78,221,0.25); color: var(--primary-light); border-radius: 6px; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .tpl-btn:hover { background: rgba(157,78,221,0.2); }
        .msg-textarea { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid var(--border); border-radius: 10px; color: #fff; font-size: 0.95rem; padding: 14px; resize: vertical; outline: none; font-family: inherit; line-height: 1.6; box-sizing: border-box; }
        .msg-textarea:focus { border-color: rgba(157,78,221,0.5); }
        .char-count { text-align: right; color: var(--text-muted); font-size: 0.8rem; margin-top: 6px; margin-bottom: 16px; }
        .send-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 13px; background: linear-gradient(135deg, var(--primary), var(--primary-hover)); border: none; border-radius: 10px; color: #fff; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .send-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 14px var(--primary-glow); }
        .send-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
        .right-col { display: flex; flex-direction: column; gap: 16px; }
        .tg-preview { background: #17212b; border-radius: 10px; padding: 16px; min-height: 120px; }
        .tg-bubble { background: #2b5278; color: #fff; border-radius: 12px 12px 2px 12px; padding: 10px 14px; font-size: 0.92rem; line-height: 1.6; display: inline-block; max-width: 100%; word-break: break-word; }
        .result-box { display: flex; align-items: flex-start; gap: 14px; padding: 16px; border-radius: 10px; }
        .result-ok { background: rgba(6,214,160,0.1); border: 1px solid rgba(6,214,160,0.3); color: var(--success); }
        .result-fail { background: rgba(239,71,111,0.1); border: 1px solid rgba(239,71,111,0.3); color: var(--error); }
        .result-title { font-weight: 600; margin-bottom: 3px; }
        .result-sub { font-size: 0.88rem; opacity: 0.85; }
        .warn-box { display: flex; align-items: flex-start; gap: 10px; background: rgba(255,183,3,0.07); border: 1px solid rgba(255,183,3,0.25); color: rgba(255,183,3,0.85); padding: 12px 14px; border-radius: 8px; font-size: 0.84rem; line-height: 1.5; }
      `}</style>
    </div>
  );
};

export default Broadcast;
