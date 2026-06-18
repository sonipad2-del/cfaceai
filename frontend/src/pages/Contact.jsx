import React from 'react';
import { Headphones, MessageCircle, Phone, Sparkles, Send } from 'lucide-react';

const Contact = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">ติดต่อผู้พัฒนา / เสนอแนะ</h1>
          <p className="page-subtitle">พบปัญหา หรือต้องการฟีเจอร์ใหม่ๆ แจ้งทีมงานได้เลยครับ!</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Contact Info Card */}
        <div className="card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Headphones className="icon-purple" size={28} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600' }}>ช่องทางการติดต่อ</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <a 
              href="https://t.me/son_sontaya" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(0,136,204,0.1)', borderRadius: '12px', textDecoration: 'none', color: '#fff', border: '1px solid rgba(0,136,204,0.3)', transition: 'all 0.2s' }}
              className="hover-card"
            >
              <div style={{ background: '#0088cc', padding: '10px', borderRadius: '50%' }}>
                <Send size={20} color="#fff" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#a0a0b0' }}>Telegram</p>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>@son_sontaya</p>
              </div>
            </a>

            <a 
              href="tel:0882727597" 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(37,211,102,0.1)', borderRadius: '12px', textDecoration: 'none', color: '#fff', border: '1px solid rgba(37,211,102,0.3)', transition: 'all 0.2s' }}
              className="hover-card"
            >
              <div style={{ background: '#25d366', padding: '10px', borderRadius: '50%' }}>
                <Phone size={20} color="#fff" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#a0a0b0' }}>เบอร์โทรศัพท์</p>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>088-272-7597</p>
              </div>
            </a>
          </div>
        </div>

        {/* Feature Suggestion Card */}
        <div className="card glass" style={{ background: 'linear-gradient(145deg, rgba(157,78,221,0.1) 0%, rgba(25,20,48,0.6) 100%)', border: '1px solid rgba(157,78,221,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Sparkles style={{ color: '#ffd700' }} size={28} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600' }}>ต้องการฟีเจอร์อะไรเพิ่มไหม?</h2>
          </div>
          
          <div style={{ color: '#e0e0e0', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p>
              เรารับฟังทุกความคิดเห็นและข้อเสนอแนะจากเจ้าของกิจการทุกท่าน! 
              ไม่ว่าจะเป็น:
            </p>
            <ul style={{ paddingLeft: '20px', color: '#fff', margin: 0 }}>
              <li>ระบบรายงานรูปแบบใหม่</li>
              <li>การคำนวณเงินเดือนที่ซับซ้อนขึ้น</li>
              <li>การเชื่อมต่อกับระบบอื่น</li>
            </ul>
            <div style={{ marginTop: '10px', padding: '16px', background: 'rgba(255,215,0,0.1)', borderRadius: '8px', borderLeft: '4px solid #ffd700' }}>
              <p style={{ margin: 0, fontWeight: '600', color: '#ffd700' }}>
                🎉 และที่สำคัญ... เรากำลังเร่งพัฒนาอีกหลายฟีเจอร์เจ๋งๆ ออกมาให้ผู้ใช้งานปัจจุบันได้ "ใช้กันแบบฟรีๆ" ในเร็วๆ นี้ครับ!
              </p>
            </div>
            <p style={{ marginTop: '10px' }}>
              ทักมาพูดคุย แนะนำ หรือขอฟีเจอร์เพิ่มกับผมได้โดยตรงผ่านช่องทางติดต่อด้านซ้ายมือได้เลยครับ
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .hover-card:hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
      `}</style>
    </div>
  );
};

export default Contact;
