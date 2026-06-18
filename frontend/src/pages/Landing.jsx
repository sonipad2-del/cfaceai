import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Bot, 
  Wallet, 
  Megaphone, 
  CheckCircle2, 
  XCircle, 
  LayoutDashboard,
  ShieldCheck,
  Zap,
  Users
} from 'lucide-react';
import '../styles/landing.css';

const Landing = () => {
  const navigate = useNavigate();

  // Animation Variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const floatAnimation = {
    y: ["-10px", "10px"],
    transition: {
      y: {
        duration: 2.5,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="landing-page">
      {/* Background Elements */}
      <div className="cyber-grid-bg"></div>
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      <div className="landing-content">
        {/* Navigation */}
        <nav className="landing-nav">
          <div className="landing-logo">NOVA7</div>
          <div className="nav-actions">
            <button className="btn-glow btn-secondary-glow" onClick={() => navigate('/login')}>
              เข้าสู่ระบบ
            </button>
            <button className="btn-glow btn-primary-glow" onClick={() => navigate('/register')}>
              เริ่มต้นใช้งาน
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="hero-section">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
            <div className="hero-badge">🚀 NOVA7 Workforce AI Platform</div>
            <h1 className="hero-title">ระบบจัดการพนักงานอัจฉริยะ<br/>สำหรับธุรกิจยุคใหม่</h1>
            <p className="hero-subtitle">
              ลงเวลา ลางาน เงินเดือน ประกาศ และการสื่อสารภายในองค์กร<br/>
              รวมอยู่ในแพลตฟอร์มเดียว
            </p>
            <div className="hero-actions">
              <button className="btn-glow btn-primary-glow" onClick={() => navigate('/register')}>
                เริ่มต้นใช้งานฟรี
              </button>
              <button className="btn-glow btn-secondary-glow" onClick={() => navigate('/login')}>
                เข้าสู่ระบบ
              </button>
            </div>
            <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '-60px', marginBottom: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
              <CheckCircle2 size={14} color="var(--success)" /> ใช้งานฟรีเต็มรูปแบบ ไม่มีข้อผูกมัด
            </p>
          </motion.div>

          <motion.div 
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="dashboard-mockup">
              {/* Replace with actual dashboard screenshot later if needed, for now use a stylized placeholder or keep it abstract */}
              <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070" alt="Dashboard Mockup" style={{opacity: 0.5, mixBlendMode: 'luminosity'}} />
              <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,15,38,0.2) 0%, rgba(20,15,38,0.9) 100%)'}}></div>
            </div>

            {/* Floating Cards */}
            <motion.div className="floating-card fc-1" animate={floatAnimation}>
              <div className="fc-icon" style={{background: 'rgba(6,214,160,0.2)', color: '#06d6a0'}}><MapPin size={18}/></div>
              Attendance Tracking
            </motion.div>
            <motion.div className="floating-card fc-2" animate={floatAnimation} style={{animationDelay: '1s'}}>
              <div className="fc-icon" style={{background: 'rgba(255,209,102,0.2)', color: '#ffd166'}}><Wallet size={18}/></div>
              Smart Payroll
            </motion.div>
            <motion.div className="floating-card fc-3" animate={floatAnimation} style={{animationDelay: '0.5s'}}>
              <div className="fc-icon" style={{background: 'rgba(157,78,221,0.2)', color: '#c77dff'}}><Bot size={18}/></div>
              Employee Bot
            </motion.div>
            <motion.div className="floating-card fc-4" animate={floatAnimation} style={{animationDelay: '1.5s'}}>
              <div className="fc-icon" style={{background: 'rgba(239,71,111,0.2)', color: '#ef476f'}}><Megaphone size={18}/></div>
              Announcements
            </motion.div>
          </motion.div>
        </section>

        {/* Feature Section */}
        <section className="section-container">
          <motion.h2 
            className="section-title"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
          >
            ทุกเครื่องมือที่ธุรกิจต้องการ<br/>รวมอยู่ในระบบเดียว
          </motion.h2>

          <motion.div 
            className="feature-grid"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
          >
            <motion.div className="feature-card" variants={fadeInUp}>
              <div className="feature-icon-wrap"><MapPin size={24}/></div>
              <h3 className="feature-title">GPS Check-In</h3>
              <p className="feature-desc">📍 ลงเวลาเข้าออกงานผ่านมือถือ</p>
              <ul className="feature-list">
                <li><CheckCircle2 size={16} color="var(--primary)"/> GPS Location</li>
                <li><CheckCircle2 size={16} color="var(--primary)"/> บันทึกเวลาอัตโนมัติ</li>
                <li><CheckCircle2 size={16} color="var(--primary)"/> ตรวจสอบย้อนหลังได้</li>
              </ul>
            </motion.div>

            <motion.div className="feature-card" variants={fadeInUp}>
              <div className="feature-icon-wrap"><Bot size={24}/></div>
              <h3 className="feature-title">Employee Bot</h3>
              <p className="feature-desc">🤖 ผู้ช่วยพนักงานอัตโนมัติ</p>
              <ul className="feature-list">
                <li><CheckCircle2 size={16} color="var(--primary)"/> เช็กเวลาเข้างาน</li>
                <li><CheckCircle2 size={16} color="var(--primary)"/> ขอลางาน</li>
                <li><CheckCircle2 size={16} color="var(--primary)"/> ดูประกาศและข้อมูล</li>
              </ul>
            </motion.div>

            <motion.div className="feature-card" variants={fadeInUp}>
              <div className="feature-icon-wrap"><Wallet size={24}/></div>
              <h3 className="feature-title">Smart Payroll</h3>
              <p className="feature-desc">💰 ระบบเงินเดือนอัจฉริยะ</p>
              <ul className="feature-list">
                <li><CheckCircle2 size={16} color="var(--primary)"/> เงินเดือน / OT / โบนัส</li>
                <li><CheckCircle2 size={16} color="var(--primary)"/> หักสาย / ขาด / ลา</li>
                <li><CheckCircle2 size={16} color="var(--primary)"/> สลิปเงินเดือน PDF</li>
              </ul>
            </motion.div>

            <motion.div className="feature-card" variants={fadeInUp}>
              <div className="feature-icon-wrap"><Megaphone size={24}/></div>
              <h3 className="feature-title">Announcements</h3>
              <p className="feature-desc">📢 ศูนย์กลางการสื่อสารองค์กร</p>
              <ul className="feature-list">
                <li><CheckCircle2 size={16} color="var(--primary)"/> ส่งประกาศบริษัท</li>
                <li><CheckCircle2 size={16} color="var(--primary)"/> แจ้งข่าวสารสำคัญ</li>
                <li><CheckCircle2 size={16} color="var(--primary)"/> ติดตามการอ่าน</li>
              </ul>
            </motion.div>
          </motion.div>
        </section>

        {/* Roles Section */}
        <section className="section-container" style={{background: 'rgba(255,255,255,0.01)'}}>
          <motion.h2 
            className="section-title"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
          >
            ออกแบบสำหรับทั้งผู้บริหารและพนักงาน
          </motion.h2>

          <div className="comparison-grid">
            <motion.div className="comp-card" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
              <h3 className="comp-title"><LayoutDashboard color="var(--primary)"/> Owner Dashboard</h3>
              <p style={{color: 'var(--text-muted)', marginBottom: '20px'}}>สำหรับเจ้าของกิจการ</p>
              <ul className="comp-list comp-nova">
                <li><CheckCircle2 size={20} color="var(--primary)"/> ดูข้อมูลพนักงานทั้งหมด</li>
                <li><CheckCircle2 size={20} color="var(--primary)"/> อนุมัติการลางาน</li>
                <li><CheckCircle2 size={20} color="var(--primary)"/> จัดการระบบเงินเดือน</li>
                <li><CheckCircle2 size={20} color="var(--primary)"/> ออกสลิปเงินเดือน</li>
                <li><CheckCircle2 size={20} color="var(--primary)"/> ดูรายงาน Analytics</li>
              </ul>
            </motion.div>

            <motion.div className="comp-card" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
              <h3 className="comp-title"><Users color="var(--success)"/> Employee Experience</h3>
              <p style={{color: 'var(--text-muted)', marginBottom: '20px'}}>สำหรับพนักงาน (Telegram Bot)</p>
              <ul className="comp-list comp-nova">
                <li><CheckCircle2 size={20} color="var(--success)"/> ลงเวลาเข้า-ออกงาน</li>
                <li><CheckCircle2 size={20} color="var(--success)"/> ส่งคำขอลางาน</li>
                <li><CheckCircle2 size={20} color="var(--success)"/> ดูสลิปเงินเดือนย้อนหลัง</li>
                <li><CheckCircle2 size={20} color="var(--success)"/> อ่านประกาศจากบริษัท</li>
                <li><CheckCircle2 size={20} color="var(--success)"/> ตรวจสอบประวัติการทำงาน</li>
              </ul>
            </motion.div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="section-container">
          <motion.h2 
            className="section-title"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
          >
            เปลี่ยนงานเอกสารให้เป็นระบบอัตโนมัติ
          </motion.h2>
          
          <div className="comparison-grid">
            <motion.div className="comp-card" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
              <h3 className="comp-title">วิธีเดิม</h3>
              <ul className="comp-list comp-old">
                <li><XCircle size={20} color="#ef476f"/> สมุดลงเวลาแบบกระดาษ</li>
                <li><XCircle size={20} color="#ef476f"/> คำนวณเงินเดือนด้วย Excel</li>
                <li><XCircle size={20} color="#ef476f"/> แจ้งลางานผ่าน Line ส่วนตัว</li>
                <li><XCircle size={20} color="#ef476f"/> กระดาษเซ็นชื่อที่มักสูญหาย</li>
                <li><XCircle size={20} color="#ef476f"/> ค้นหาเอกสารย้อนหลังได้ยาก</li>
              </ul>
            </motion.div>

            <motion.div className="comp-card comp-nova" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
              <h3 className="comp-title">NOVA7</h3>
              <ul className="comp-list comp-nova">
                <li><CheckCircle2 size={20} color="#06d6a0"/> ลงเวลาผ่านมือถือด้วย GPS</li>
                <li><CheckCircle2 size={20} color="#06d6a0"/> ระบบคำนวณเงินเดือนอัตโนมัติ</li>
                <li><CheckCircle2 size={20} color="#06d6a0"/> ข้อมูลออนไลน์ 100%</li>
                <li><CheckCircle2 size={20} color="#06d6a0"/> ดูประวัติย้อนหลังได้ตลอดเวลา</li>
                <li><CheckCircle2 size={20} color="#06d6a0"/> จัดการพนักงานได้จากทุกที่</li>
              </ul>
            </motion.div>
          </div>
        </section>

        {/* Platform Section */}
        <section className="section-container platform-section">
          <motion.h2 
            className="section-title" style={{marginBottom: '20px'}}
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
          >
            🌌 Complete Workforce Platform
          </motion.h2>
          <motion.p 
            style={{color: 'var(--text-muted)', fontSize: '1.2rem'}}
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
          >
            ทุกเครื่องมือที่ธุรกิจต้องการ เพื่อบริหารพนักงานในระบบเดียว
          </motion.p>
          
          <motion.div 
            className="platform-pills"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
          >
            {[
              { icon: <MapPin size={16}/>, text: 'Attendance Management' },
              { icon: <ShieldCheck size={16}/>, text: 'Leave Management' },
              { icon: <Wallet size={16}/>, text: 'Payroll System' },
              { icon: <Users size={16}/>, text: 'Employee Self-Service' },
              { icon: <Megaphone size={16}/>, text: 'Company Announcements' },
              { icon: <LayoutDashboard size={16}/>, text: 'Smart Dashboard' },
              { icon: <Bot size={16}/>, text: 'AI Workforce Assistant' },
            ].map((feature, idx) => (
              <motion.div key={idx} className="platform-pill" variants={fadeInUp}>
                {feature.icon} {feature.text}
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="section-container" style={{textAlign: 'center', paddingBottom: '150px'}}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <h2 className="hero-title" style={{fontSize: '3rem'}}>พร้อมยกระดับการบริหารพนักงาน<br/>ของคุณแล้วหรือยัง</h2>
            <p className="hero-subtitle">เริ่มต้นใช้งาน NOVA7 และจัดการทุกอย่างได้จากแพลตฟอร์มเดียว</p>
            <div className="hero-actions" style={{marginBottom: '20px'}}>
              <button className="btn-glow btn-primary-glow" onClick={() => navigate('/register')}>
                เริ่มต้นใช้งานฟรี
              </button>
              <button className="btn-glow btn-secondary-glow" onClick={() => navigate('/login')}>
                เข้าสู่ระบบ
              </button>
            </div>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>
              <CheckCircle2 size={16} color="var(--success)" style={{display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px'}}/> 
              ใช้งานแพลตฟอร์ม NOVA7 ฟรี วันนี้
            </p>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="footer-logo">NOVA7</div>
          <div className="footer-slogan">Work Smarter. Manage Better.</div>
          <div className="footer-text">ระบบจัดการพนักงานอัจฉริยะสำหรับธุรกิจยุคใหม่</div>
          <div className="footer-text" style={{marginTop: '20px', fontSize: '0.8rem', opacity: 0.5}}>
            &copy; {new Date().getFullYear()} NOVA7 Workforce AI Platform. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
