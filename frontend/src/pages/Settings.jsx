import React, { useEffect, useState } from 'react';
import { 
  QrCode, 
  Download, 
  Copy, 
  RefreshCw, 
  MapPin, 
  Compass, 
  BellRing, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { companiesAPI } from '../services/api';

const Settings = () => {
  const [settings, setSettings] = useState({
    office_lat: 13.7261,
    office_lng: 100.5260,
    radius: 200,
    owner_chat_id: '',
  });

  const [qrCodeData, setQrCodeData] = useState({
    join_code: '',
    join_url: '',
    qr_code_url: '',
  });

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [companyName, setCompanyName] = useState('');

  // Address Geocoding State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // Map Component Instances
  const [mapInstance, setMapInstance] = useState(null);
  const [markerInstance, setMarkerInstance] = useState(null);
  const [circleInstance, setCircleInstance] = useState(null);

  const fetchSettingsAndQr = async () => {
    try {
      const companyInfo = await companiesAPI.getMe();
      setSettings(companyInfo.settings);
      setCompanyName(companyInfo.name || '');
      
      const qrData = await companiesAPI.getQrCode();
      setQrCodeData(qrData);
    } catch (err) {
      console.error('Error fetching settings or QR', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndQr();
  }, []);

  // Initialize Map when loading completes
  useEffect(() => {
    if (!loading && window.L && !mapInstance) {
      // Setup marker icons via CDN assets to prevent default Vite asset path issues
      delete window.L.Icon.Default.prototype._getIconUrl;
      window.L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const startLat = parseFloat(settings.office_lat) || 13.7261;
      const startLng = parseFloat(settings.office_lng) || 100.5260;

      const map = window.L.map('map-container').setView([startLat, startLng], 15);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const marker = window.L.marker([startLat, startLng], {
        draggable: true
      }).addTo(map);

      const circle = window.L.circle([startLat, startLng], {
        color: '#9d4edd',
        fillColor: '#9d4edd',
        fillOpacity: 0.15,
        radius: settings.radius
      }).addTo(map);

      // Draggable Marker Event
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setSettings(prev => ({
          ...prev,
          office_lat: pos.lat.toFixed(6),
          office_lng: pos.lng.toFixed(6)
        }));
        circle.setLatLng(pos);
      });

      // Map Click Event
      map.on('click', (e) => {
        const pos = e.latlng;
        marker.setLatLng(pos);
        circle.setLatLng(pos);
        setSettings(prev => ({
          ...prev,
          office_lat: pos.lat.toFixed(6),
          office_lng: pos.lng.toFixed(6)
        }));
      });

      setMapInstance(map);
      setMarkerInstance(marker);
      setCircleInstance(circle);

      return () => {
        map.remove();
      };
    }
  }, [loading]);

  // Sync Radius slide adjustments with map circle radius
  useEffect(() => {
    if (circleInstance) {
      circleInstance.setRadius(settings.radius);
    }
  }, [settings.radius, circleInstance]);

  const handleLatChange = (e) => {
    const lat = e.target.value;
    setSettings(prev => ({ ...prev, office_lat: lat }));
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(settings.office_lng);
    if (markerInstance && circleInstance && mapInstance && !isNaN(parsedLat) && lat !== '') {
      const newLatLng = [parsedLat, parsedLng];
      markerInstance.setLatLng(newLatLng);
      circleInstance.setLatLng(newLatLng);
      mapInstance.setView(newLatLng);
    }
  };

  const handleLngChange = (e) => {
    const lng = e.target.value;
    setSettings(prev => ({ ...prev, office_lng: lng }));
    const parsedLat = parseFloat(settings.office_lat);
    const parsedLng = parseFloat(lng);
    if (markerInstance && circleInstance && mapInstance && !isNaN(parsedLng) && lng !== '') {
      const newLatLng = [parsedLat, parsedLng];
      markerInstance.setLatLng(newLatLng);
      circleInstance.setLatLng(newLatLng);
      mapInstance.setView(newLatLng);
    }
  };

  // Geocode address using Nominatim (free OSM Geocoding API)
  const handleSearchAddress = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const firstResult = data[0];
        const lat = parseFloat(firstResult.lat);
        const lng = parseFloat(firstResult.lon);

        setSettings(prev => ({
          ...prev,
          office_lat: lat.toFixed(6),
          office_lng: lng.toFixed(6)
        }));

        if (mapInstance && markerInstance && circleInstance) {
          const newLatLng = [lat, lng];
          mapInstance.setView(newLatLng, 16);
          markerInstance.setLatLng(newLatLng);
          circleInstance.setLatLng(newLatLng);
        }
      } else {
        alert('ไม่พบสถานที่ที่ค้นหา กรุณาลองระบุชื่อที่ชัดเจนยิ่งขึ้นครับ');
      }
    } catch (err) {
      console.error('Error geocoding address:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ค้นหาที่อยู่');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSuccessMsg('');
    try {
      await companiesAPI.updateSettings({
        office_lat: parseFloat(settings.office_lat),
        office_lng: parseFloat(settings.office_lng),
        radius: parseFloat(settings.radius),
        owner_chat_id: settings.owner_chat_id ? settings.owner_chat_id.trim() : null
      });
      setSuccessMsg('บันทึกตั้งค่า GPS และพิกัดสำนักงานสำเร็จแล้ว');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving settings', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลตั้งค่า');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะสร้าง QR Code ใหม่?\n*ลิงก์เข้าร่วมและ QR Code เดิมจะใช้งานไม่ได้ในทันที พนักงานที่ต้องการสมัครใหม่จะต้องใช้ลิงก์ใหม่*')) {
      try {
        const qrData = await companiesAPI.regenerateQrCode();
        setQrCodeData(qrData);
        setSuccessMsg('สร้างรหัสเข้าร่วมและ QR Code ใหม่สำเร็จแล้ว');
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err) {
        console.error('Error regenerating QR Code', err);
        alert('เกิดข้อผิดพลาดในการสร้างรหัสเข้าร่วมใหม่');
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrCodeData.join_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(qrCodeData.join_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8"/>
<title>คู่มือพนักงาน – ${companyName || 'บริษัท'}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
  @page { size: A4 portrait; margin: 18mm 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sarabun', sans-serif; color: #1a1a2e; background: #fff; }

  .page { max-width: 170mm; margin: 0 auto; }

  /* Header */
  .header { text-align: center; padding-bottom: 14px; border-bottom: 3px solid #7c3aed; margin-bottom: 22px; }
  .brand { font-size: 2.2rem; font-weight: 800; color: #7c3aed; letter-spacing: 1px; }
  .brand-sub { font-size: 0.95rem; color: #6b7280; margin-top: 2px; }

  /* Company */
  .company-block { text-align: center; margin-bottom: 24px; }
  .company-label { font-size: 0.78rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
  .company-name { font-size: 1.6rem; font-weight: 700; color: #1a1a2e; margin-top: 4px; }

  /* QR section */
  .qr-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 28px; }
  .qr-img { width: 180px; height: 180px; border: 6px solid #7c3aed; border-radius: 16px; padding: 6px; background: #fff; }
  .code-block { margin-top: 14px; text-align: center; }
  .code-label { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
  .code-value { font-size: 2.4rem; font-weight: 800; color: #7c3aed; letter-spacing: 4px; font-family: 'Courier New', monospace; }

  /* Steps */
  .steps-block { background: #f5f3ff; border: 2px solid #ddd6fe; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
  .steps-title { font-size: 1.1rem; font-weight: 700; color: #5b21b6; margin-bottom: 16px; }
  .steps-list { list-style: none; display: flex; flex-direction: column; gap: 12px; }
  .step-item { display: flex; align-items: flex-start; gap: 14px; }
  .step-num { width: 28px; height: 28px; border-radius: 50%; background: #7c3aed; color: #fff;
              font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .step-text { font-size: 0.98rem; line-height: 1.5; padding-top: 4px; }
  .step-code { display: inline-block; background: #ede9fe; border: 1px solid #c4b5fd; color: #5b21b6;
               padding: 1px 8px; border-radius: 4px; font-family: 'Courier New', monospace; font-weight: 700; }

  /* Footer */
  .footer { text-align: center; border-top: 1px solid #e5e7eb; padding-top: 14px; color: #9ca3af; font-size: 0.8rem; line-height: 1.7; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">⏰ Nova7</div>
    <div class="brand-sub">ระบบเช็กอินพิกัดพนักงาน & จัดการบริษัท</div>
  </div>

  <div class="company-block">
    <div class="company-label">คู่มือลงทะเบียนพนักงาน</div>
    <div class="company-name">${companyName || 'บริษัทของคุณ'}</div>
  </div>

  <div class="qr-section">
    <img class="qr-img" src="${qrCodeData.qr_code_url}" alt="QR Code"/>
    <div class="code-block">
      <div class="code-label">รหัสเข้าร่วมบริษัท</div>
      <div class="code-value">${qrCodeData.join_code}</div>
    </div>
  </div>

  <div class="steps-block">
    <div class="steps-title">📋 วิธีลงทะเบียน 5 ขั้นตอน</div>
    <ol class="steps-list">
      <li class="step-item">
        <div class="step-num">1</div>
        <div class="step-text">เปิดแอป <strong>Telegram</strong> บนมือถือ</div>
      </li>
      <li class="step-item">
        <div class="step-num">2</div>
        <div class="step-text">สแกน <strong>QR Code</strong> ด้านบน หรือค้นหา <span class="step-code">@cfaceai_notify_bot</span> แล้วกด Start</div>
      </li>
      <li class="step-item">
        <div class="step-num">3</div>
        <div class="step-text">กดปุ่ม <strong>🏢 เข้าร่วมบริษัท</strong></div>
      </li>
      <li class="step-item">
        <div class="step-num">4</div>
        <div class="step-text">พิมพ์รหัสเข้าร่วม: <span class="step-code">${qrCodeData.join_code}</span></div>
      </li>
      <li class="step-item">
        <div class="step-num">5</div>
        <div class="step-text">กรอก <strong>ชื่อ-นามสกุล</strong> และถ่ายรูปหน้าตรงเพื่อลงทะเบียน Face ID — เสร็จแล้วสามารถเช็กอินได้ทันที!</div>
      </li>
    </ol>
  </div>

  <div class="footer">
    <p>หากมีข้อสงสัยกรุณาติดต่อเจ้าของร้านหรือผู้ดูแลระบบโดยตรง</p>
    <p>ระบบ Nova7 | GPS Check-in &amp; Ads Management System</p>
  </div>
</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
    w.document.close();
  };

  const [linkLoading, setLinkLoading] = useState(false);
  const handleLinkTelegram = async () => {
    setLinkLoading(true);
    try {
      const data = await companiesAPI.getTelegramLink();
      if (data && data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error getting telegram link', err);
      alert('เกิดข้อผิดพลาดในการดึงลิงก์เชื่อมต่อ');
    } finally {
      setLinkLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>กำลังโหลดการตั้งค่าระบบ...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ตั้งค่าพิกัดบริษัท & QR Code</h1>
          <p className="page-subtitle">กำหนดจุดตรวจสอบพิกัดเข้างาน GPS และลิ้งก์ลงทะเบียนบอทของพนักงาน</p>
        </div>
      </div>

      {successMsg && (
        <div className="success-banner">
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid-2">
        {/* Left Card: QR Code setup */}
        <div className="card glass settings-qr-card">
          <div className="settings-header">
            <QrCode className="icon-purple" />
            <h2>QR Code สำหรับลงทะเบียนพนักงาน</h2>
          </div>
          
          <div className="qr-body">
            <div className="qr-container">
              <img 
                src={qrCodeData.qr_code_url} 
                alt="Telegram Join QR Code"
                className="qr-image"
              />
              <div className="join-code-badge">
                JOIN CODE: <span>{qrCodeData.join_code}</span>
              </div>
            </div>
            
            <p className="qr-desc">
              ให้พนักงานใหม่สแกน QR Code นี้เพื่อเริ่มเข้าห้องแชตลงทะเบียนกับ Telegram Bot หรือคัดลอกลิงก์ด้านล่างส่งในแชตกลุ่มพนักงาน
            </p>

            <div className="qr-actions">
              <button className="btn btn-secondary flex-1" onClick={handleCopyLink}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
              </button>
              <a 
                href={qrCodeData.qr_code_url} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-secondary flex-1"
                style={{ display: 'inline-flex' }}
              >
                <Download size={16} />
                <span>ดาวน์โหลดรูป</span>
              </a>
            </div>

            <button className="btn btn-danger regenerate-btn" onClick={handleRegenerateCode}>
              <RefreshCw size={16} />
              <span>สร้าง QR Code ใหม่ (Regenerate)</span>
            </button>

            {/* Owner guide: how to onboard employees */}
            <div className="owner-guide-box">
              <div className="owner-guide-title">📋 วิธีแนะนำพนักงานใหม่</div>
              <ol className="owner-guide-steps">
                <li>แชร์ <strong>QR Code</strong> หรือลิงก์ด้านบนให้พนักงาน</li>
                <li>พนักงานเปิด Telegram แล้วสแกน QR หรือกดลิงก์</li>
                <li>บอทจะแสดงปุ่ม <strong>"🏢 เข้าร่วมบริษัท"</strong> ให้กด</li>
                <li>บอทจะแนะนำขั้นตอนสมัครและลงทะเบียน Face ID ทั้งหมดให้เอง</li>
              </ol>
              <button className="print-guide-btn" onClick={handlePrint}>
                🖨️ พิมพ์คู่มือพนักงาน (A4)
              </button>
            </div>

            {/* Manual join instructions */}
            <div className="manual-join-box">
              <div className="manual-join-title">
                📱 วิธีสมัครแบบ Manual
                <span className="manual-join-subtitle">ถ้าสแกน QR หรือกดลิงก์ไม่ได้</span>
              </div>

              <ol className="manual-join-steps">
                <li>เปิดแอป <strong>Telegram</strong></li>
                <li>ค้นหา <code className="bot-handle">@cfaceai_notify_bot</code></li>
                <li>กด <strong>Start</strong></li>
                <li>พิมพ์ <code className="bot-handle">/start join_{qrCodeData.join_code}</code></li>
                <li>ทำตามขั้นตอนในแชตต่อได้เลย</li>
              </ol>

              <div className="manual-join-code-row">
                <div className="manual-join-code-label">รหัสเข้าร่วมบริษัท</div>
                <div className="manual-join-code-wrap">
                  <span className="manual-join-code-value">{qrCodeData.join_code}</span>
                  <button className="copy-code-btn" onClick={handleCopyCode}>
                    {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{codeCopied ? 'คัดลอกแล้ว!' : 'คัดลอกรหัส'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: GPS coordinates setting form */}
        <div className="card glass settings-form-card">
          <div className="settings-header">
            <MapPin className="icon-purple" />
            <h2>ตั้งค่าจุด GPS สำนักงาน</h2>
          </div>

          <form onSubmit={handleSaveSettings} className="settings-form">
            {/* Search address input */}
            <div className="form-group">
              <label className="form-label">ค้นหาพิกัดแผนที่ (พิมพ์ชื่อสถานที่หรือที่อยู่เพื่อค้นหา)</label>
              <div className="search-group" style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ flexGrow: 1 }}
                  placeholder="เช่น หอศิลป์กรุงเทพฯ, สยามสแควร์..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchAddress(); } }}
                />
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleSearchAddress}
                  disabled={searchLoading}
                  style={{ padding: '0 16px', whiteSpace: 'nowrap' }}
                >
                  {searchLoading ? 'กำลังค้นหา...' : 'ค้นหาตำแหน่ง'}
                </button>
              </div>
            </div>

            {/* Leaflet Map Container */}
            <div className="form-group">
              <label className="form-label">จิ้มแผนที่หรือลากหมุดเพื่อระบุตำแหน่งบริษัท</label>
              <div id="map-container" style={{ height: '320px', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', zIndex: 1 }}></div>
            </div>

            {/* GPS Hint Box */}
            <div className="info-box info-box-blue">
              <div className="info-box-title">📍 วิธีหาค่าละติจูด/ลองจิจูดของออฟฟิศ</div>
              <div className="info-box-cols">
                <div>
                  <div className="info-box-sub">บนมือถือ</div>
                  <ol className="info-box-list">
                    <li>เปิด Google Maps</li>
                    <li>กดค้างที่ตำแหน่งออฟฟิศสักครู่</li>
                    <li>ตัวเลขจะขึ้นด้านบน เช่น 13.7261, 100.5260</li>
                    <li>คัดลอกมาใส่ได้เลย</li>
                  </ol>
                </div>
                <div>
                  <div className="info-box-sub">บนคอมพิวเตอร์</div>
                  <ol className="info-box-list">
                    <li>เปิด maps.google.com</li>
                    <li>คลิกขวาที่ตำแหน่งออฟฟิศ</li>
                    <li>ตัวเลขพิกัดจะขึ้นมา กดคลิกเพื่อ copy</li>
                  </ol>
                </div>
              </div>
              <div className="info-box-footer">
                <span className="info-tag">ตัวเลขแรก = Latitude (ละติจูด)</span>
                <span className="info-tag">ตัวเลขสอง = Longitude (ลองจิจูด)</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label className="form-label">ละติจูด (Latitude)</label>
                <div className="input-group">
                  <Compass className="input-icon-settings" size={16} />
                  <input 
                    type="number" 
                    step="0.000000000000001" 
                    required
                    className="form-input" 
                    placeholder="เช่น 13.7261"
                    value={settings.office_lat}
                    onChange={handleLatChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ลองจิจูด (Longitude)</label>
                <div className="input-group">
                  <Compass className="input-icon-settings" size={16} />
                  <input 
                    type="number" 
                    step="0.000000000000001" 
                    required
                    className="form-input" 
                    placeholder="เช่น 100.5260"
                    value={settings.office_lng}
                    onChange={handleLngChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <div className="flex-between">
                <label className="form-label">รัศมีตรวจจับเช็กอิน: {settings.radius} เมตร</label>
              </div>
              <input 
                type="range" 
                min="50" 
                max="1000" 
                step="10"
                className="slider"
                value={settings.radius}
                onChange={(e) => setSettings({...settings, radius: parseInt(e.target.value)})}
              />
              <div className="slider-labels">
                <span>50ม.</span>
                <span>500ม.</span>
                <span>1000ม.</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Telegram Chat ID ของเจ้าของร้าน (Owner Account)</label>
              <div style={{ marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#0088cc', borderColor: '#0088cc', color: '#fff', fontSize: '1rem' }}
                  onClick={handleLinkTelegram}
                  disabled={linkLoading}
                >
                  <BellRing size={20} />
                  {linkLoading ? 'กำลังสร้างลิงก์...' : '🔗 กดเพื่อเชื่อมต่อ Telegram ของเจ้าของร้านอัตโนมัติ'}
                </button>
              </div>
              <p className="field-hint" style={{ marginTop: '12px' }}>
                กดปุ่มด้านบน ระบบจะเปิดแอป Telegram เพื่อผูกบัญชี Owner ให้คุณทันที คุณจะได้รับสิทธิ์ในการดูรายงาน, ส่งประกาศ และรับการแจ้งเตือนพนักงานลา/มาสายอัตโนมัติ
              </p>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary save-settings-btn"
              disabled={saveLoading}
            >
              {saveLoading ? 'กำลังบันทึก...' : 'บันทึกพิกัด GPS'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .success-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(6, 214, 160, 0.1);
          border: 1px solid rgba(6, 214, 160, 0.3);
          color: var(--success);
          padding: 12px 20px;
          border-radius: 10px;
          margin-bottom: 24px;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .settings-header {
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
          margin-bottom: 24px;
        }

        .settings-header h2 {
          font-size: 1.1rem;
          font-weight: 600;
        }

        .qr-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .qr-container {
          background: #fff;
          padding: 16px;
          border-radius: 16px;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .qr-image {
          width: 200px;
          height: 200px;
        }

        .join-code-badge {
          background: var(--bg-primary);
          color: var(--accent);
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
          margin-top: 12px;
          font-family: monospace;
          border: 1px solid var(--border);
        }

        .join-code-badge span {
          color: #fff;
        }

        .qr-desc {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 24px;
          max-width: 320px;
          line-height: 1.5;
        }

        .qr-actions {
          display: flex;
          width: 100%;
          gap: 12px;
          margin-bottom: 12px;
        }

        .flex-1 {
          flex: 1;
        }

        .regenerate-btn {
          width: 100%;
          padding: 10px;
          font-size: 0.85rem;
          background: transparent !important;
          border: 1px dashed var(--error);
          color: var(--error) !important;
        }

        .regenerate-btn:hover {
          background: rgba(239, 71, 111, 0.05) !important;
          border-style: solid;
        }

        /* Form styling */
        .input-group {
          position: relative;
        }

        .input-group .form-input {
          padding-left: 40px;
        }

        .input-icon-settings {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: var(--bg-input);
          outline: none;
          margin: 10px 0;
          border: 1px solid var(--border);
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          transition: transform 0.1s ease;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .slider-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .field-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.4;
          margin-top: 4px;
        }

        .save-settings-btn {
          width: 100%;
          padding: 12px;
          margin-top: 15px;
        }

        .info-box {
          border-radius: 10px;
          padding: 16px 18px;
          margin-bottom: 20px;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .info-box-blue {
          background: rgba(0, 180, 216, 0.08);
          border: 1px solid rgba(0, 180, 216, 0.25);
          color: #caf0f8;
        }

        .info-box-purple {
          background: rgba(157, 78, 221, 0.08);
          border: 1px solid rgba(157, 78, 221, 0.25);
          color: #e0aaff;
        }

        .info-box-title {
          font-weight: 700;
          font-size: 0.9rem;
          margin-bottom: 12px;
          letter-spacing: 0.2px;
        }

        .info-box-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 12px;
        }

        .info-box-sub {
          font-weight: 600;
          font-size: 0.8rem;
          opacity: 0.75;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .info-box-list {
          margin: 0;
          padding-left: 18px;
          color: inherit;
          opacity: 0.9;
        }

        .info-box-list li {
          margin-bottom: 4px;
        }

        .info-box-footer {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 4px;
          padding-top: 10px;
          border-top: 1px solid rgba(0, 180, 216, 0.15);
        }

        .info-tag {
          background: rgba(0, 180, 216, 0.12);
          border: 1px solid rgba(0, 180, 216, 0.2);
          color: #90e0ef;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .info-code {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 1px 7px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.85em;
          color: #fff;
        }

        /* ---- Owner guide ---- */
        .owner-guide-box {
          width: 100%;
          margin-top: 20px;
          background: rgba(157, 78, 221, 0.06);
          border: 1px solid rgba(157, 78, 221, 0.22);
          border-radius: 12px;
          padding: 18px 20px;
          text-align: left;
          color: #e0aaff;
        }

        .owner-guide-title {
          font-weight: 700;
          font-size: 0.92rem;
          margin-bottom: 12px;
          color: #e0aaff;
        }

        .owner-guide-steps {
          margin: 0 0 16px 0;
          padding-left: 20px;
          color: #d8b4fe;
          font-size: 0.87rem;
          line-height: 1.75;
        }

        .owner-guide-steps strong { color: #fff; }

        .print-guide-btn {
          width: 100%;
          padding: 10px 16px;
          background: linear-gradient(135deg, rgba(157,78,221,0.25), rgba(157,78,221,0.15));
          border: 1px solid rgba(157, 78, 221, 0.45);
          border-radius: 8px;
          color: #e0aaff;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .print-guide-btn:hover {
          background: rgba(157, 78, 221, 0.35);
          color: #fff;
          border-color: rgba(157, 78, 221, 0.7);
        }

        /* ---- Manual join instructions ---- */
        .manual-join-box {
          width: 100%;
          margin-top: 20px;
          background: rgba(157, 78, 221, 0.08);
          border: 1px solid rgba(157, 78, 221, 0.28);
          border-radius: 12px;
          padding: 18px 20px;
          text-align: left;
          color: #e0aaff;
        }

        .manual-join-title {
          font-weight: 700;
          font-size: 0.95rem;
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          color: #e0aaff;
        }

        .manual-join-subtitle {
          font-weight: 400;
          font-size: 0.78rem;
          opacity: 0.7;
          color: #c084fc;
        }

        .manual-join-steps {
          margin: 0 0 16px 0;
          padding-left: 20px;
          color: #e0aaff;
          font-size: 0.88rem;
          line-height: 1.7;
        }

        .manual-join-steps li { margin-bottom: 2px; }

        .manual-join-steps strong { color: #fff; }

        .bot-handle {
          background: rgba(157, 78, 221, 0.2);
          border: 1px solid rgba(157, 78, 221, 0.35);
          color: #d8b4fe;
          padding: 1px 7px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.88em;
        }

        .manual-join-code-row {
          border-top: 1px solid rgba(157, 78, 221, 0.2);
          padding-top: 14px;
        }

        .manual-join-code-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #c084fc;
          margin-bottom: 8px;
          opacity: 0.85;
        }

        .manual-join-code-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(157, 78, 221, 0.3);
          border-radius: 8px;
          padding: 8px 12px;
        }

        .manual-join-code-value {
          font-family: monospace;
          font-size: 1.15rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: 1.5px;
          flex: 1;
        }

        .copy-code-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          background: rgba(157, 78, 221, 0.2);
          border: 1px solid rgba(157, 78, 221, 0.4);
          border-radius: 6px;
          color: #e0aaff;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .copy-code-btn:hover {
          background: rgba(157, 78, 221, 0.35);
          color: #fff;
        }
      `}</style>
    </div>
  );
};

export default Settings;
