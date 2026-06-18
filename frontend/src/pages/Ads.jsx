import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Megaphone,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Eye,
  MousePointerClick,
  Percent,
  Coins,
  AlertCircle,
  UploadCloud,
  X,
  CropIcon,
  CheckCircle,
} from 'lucide-react';
import { adsAPI } from '../services/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

function canvasPreview(image, completedCrop) {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const naturalW = completedCrop.width * scaleX;
  const naturalH = completedCrop.height * scaleY;

  // Cap output at 1280 wide so the base64 string stays manageable
  const maxW = 1280;
  const outW = Math.min(Math.round(naturalW), maxW);
  const outH = Math.round(outW * (9 / 16));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    image,
    completedCrop.x * scaleX,
    completedCrop.y * scaleY,
    naturalW,
    naturalH,
    0, 0,
    outW, outH,
  );
  return canvas.toDataURL('image/jpeg', 0.85);
}

// ---------------------------------------------------------------------------
// ImageUploadCrop — self-contained sub-component
// ---------------------------------------------------------------------------

function ImageUploadCrop({ value, onChange }) {
  const [srcImg, setSrcImg] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [showCropper, setShowCropper] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setSrcImg(e.target.result);
      setShowCropper(true);
      setCrop(undefined);
      setCompletedCrop(undefined);
      onChange(null); // clear previous
    };
    reader.readAsDataURL(file);
  };

  const onImageLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setCrop(centerAspectCrop(w, h, 16 / 9));
  };

  const confirmCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) return;
    const dataUrl = canvasPreview(imgRef.current, completedCrop);
    onChange(dataUrl);
    setShowCropper(false);
  }, [completedCrop, onChange]);

  const cancelCrop = () => {
    setShowCropper(false);
    setSrcImg(null);
    if (!value) onChange(null);
  };

  const reset = () => {
    setSrcImg(null);
    setShowCropper(false);
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag & drop handlers
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  // ---- Cropper view ----
  if (showCropper && srcImg) {
    return (
      <div className="iuc-cropper-wrap">
        <p className="iuc-hint">ลากเพื่อปรับพื้นที่ครอบรูป (16:9) แล้วกด "ยืนยัน"</p>
        <div className="iuc-crop-container">
          <ReactCrop
            crop={crop}
            onChange={(_, pct) => setCrop(pct)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={16 / 9}
            minWidth={80}
          >
            <img
              ref={imgRef}
              src={srcImg}
              onLoad={onImageLoad}
              style={{ maxWidth: '100%', maxHeight: '340px' }}
              alt="crop source"
            />
          </ReactCrop>
        </div>
        <div className="iuc-crop-actions">
          <button type="button" className="iuc-btn-cancel" onClick={cancelCrop}>
            <X size={15} /> ยกเลิก
          </button>
          <button
            type="button"
            className="iuc-btn-confirm"
            onClick={confirmCrop}
            disabled={!completedCrop?.width}
          >
            <CheckCircle size={15} /> ยืนยันการครอบรูป
          </button>
        </div>
      </div>
    );
  }

  // ---- Preview view (after crop confirmed) ----
  if (value) {
    return (
      <div className="iuc-preview-wrap">
        <img src={value} alt="Ad preview" className="iuc-preview-img" />
        <button type="button" className="iuc-btn-change" onClick={reset}>
          <UploadCloud size={14} /> เปลี่ยนรูป
        </button>
      </div>
    );
  }

  // ---- Drop zone ----
  return (
    <div
      className={`iuc-dropzone ${isDragging ? 'iuc-drag-over' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => loadFile(e.target.files?.[0])}
      />
      <UploadCloud size={36} className="iuc-upload-icon" />
      <p className="iuc-drop-title">ลากรูปมาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
      <p className="iuc-drop-sub">รองรับ JPG, PNG, WEBP — จะถูก crop เป็นสัดส่วน 16:9 อัตโนมัติ</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Ads Page
// ---------------------------------------------------------------------------

const Ads = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [croppedImage, setCroppedImage] = useState(null);
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [timeSlot, setTimeSlot] = useState('morning');
  const [formLoading, setFormLoading] = useState(false);

  const fetchAds = async () => {
    try {
      const data = await adsAPI.getAll();
      setAds(data);
    } catch (err) {
      console.error('Error fetching ads', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAds(); }, []);

  const handleCreateAd = async (e) => {
    e.preventDefault();
    if (!croppedImage) {
      alert('กรุณาอัปโหลดและครอบรูปภาพโฆษณาก่อนบันทึก');
      return;
    }
    setFormLoading(true);
    try {
      await adsAPI.create({
        title,
        image_url: croppedImage,
        affiliate_url: affiliateUrl.trim(),
        time_slot: timeSlot,
      });
      setTitle('');
      setCroppedImage(null);
      setAffiliateUrl('');
      setTimeSlot('morning');
      fetchAds();
    } catch (err) {
      console.error('Error creating ad', err);
      alert('เกิดข้อผิดพลาดในการบันทึกโฆษณา');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`คุณแน่ใจที่จะลบโฆษณา "${name}" ใช่หรือไม่?`)) {
      try {
        await adsAPI.delete(id);
        setAds(ads.filter(ad => ad.id !== id));
      } catch (err) {
        console.error('Error deleting ad', err);
        alert('เกิดข้อผิดพลาดในการลบโฆษณา');
      }
    }
  };

  const handleToggle = async (id) => {
    try {
      const updatedAd = await adsAPI.toggle(id);
      setAds(ads.map(ad => ad.id === id ? { ...ad, is_active: updatedAd.is_active } : ad));
    } catch (err) {
      console.error('Error toggling ad', err);
      alert('เกิดข้อผิดพลาดในการเปิด/ปิดโฆษณา');
    }
  };

  const getSlotThaiName = (slot) => ({
    morning:   '🌞 เช้า (05:00 - 11:59)',
    afternoon: '☀️ บ่าย (12:00 - 16:59)',
    evening:   '🌙 เย็น (17:00 - 21:59)',
    night:     '🌌 ดึก (22:00 - 04:59)',
  }[slot] || slot);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>กำลังโหลดข้อมูลผู้สนับสนุนและโฆษณา...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ระบบผู้สนับสนุนและโฆษณา</h1>
          <p className="page-subtitle">จัดการรูปภาพโฆษณาและลิงก์ Affiliate รายได้สำหรับการแสดงผลในบอท</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Left: Create Form */}
        <div className="card glass ads-form-card">
          <div className="ads-section-header">
            <Plus className="icon-purple" />
            <h2>เพิ่มโฆษณาใหม่</h2>
          </div>

          <form onSubmit={handleCreateAd} className="ads-form">
            <div className="form-group">
              <label className="form-label">หัวข้อโฆษณา / รายละเอียด</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="เช่น ดีล Shopee แก้วเก็บความเย็นสุดคุ้ม"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">รูปภาพโฆษณา (อัตราส่วน 16:9)</label>
              <ImageUploadCrop value={croppedImage} onChange={setCroppedImage} />
            </div>

            <div className="form-group">
              <label className="form-label">Affiliate URL (ลิงก์ปลายทาง)</label>
              <input
                type="url"
                required
                className="form-input"
                placeholder="https://shope.ee/... หรือ https://s.lazada.co.th/..."
                value={affiliateUrl}
                onChange={(e) => setAffiliateUrl(e.target.value)}
              />
              <p className="field-hint">
                ลิงก์แนะนำสินค้าจาก Shopee/Lazada เพื่อสร้างรายได้เมื่อพนักงานกดคลิก
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">ช่วงเวลาแสดงผล (Time Slot)</label>
              <select
                className="form-input select-input"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
              >
                <option value="morning">🌞 เช้า (05:00 - 11:59)</option>
                <option value="afternoon">☀️ บ่าย (12:00 - 16:59)</option>
                <option value="evening">🌙 เย็น (17:00 - 21:59)</option>
                <option value="night">🌌 ดึก (22:00 - 04:59)</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary create-ad-submit"
              disabled={formLoading || !croppedImage}
            >
              {formLoading ? 'กำลังสร้างโฆษณา...' : 'บันทึกและเปิดใช้งาน'}
            </button>
          </form>
        </div>

        {/* Right: Ad List */}
        <div className="card glass ads-stats-card">
          <div className="ads-section-header">
            <Megaphone className="icon-purple" />
            <h2>แคมเปญทั้งหมด ({ads.length})</h2>
          </div>

          <div className="ads-list">
            {ads.length === 0 ? (
              <div className="no-ads-placeholder">
                <AlertCircle size={36} className="no-ads-icon" />
                <p>ยังไม่มีโฆษณาใดลงทะเบียนไว้ กรุณาใช้ฟอร์มซ้ายมือเพื่อเริ่มสร้างโฆษณารายการแรกครับ</p>
              </div>
            ) : (
              ads.map((ad) => (
                <div key={ad.id} className="ad-item-row glass">
                  <div className="ad-info">
                    <img src={ad.image_url} alt="Ad Preview" className="ad-thumbnail" />
                    <div className="ad-details">
                      <h3 className="ad-title-txt">{ad.title}</h3>
                      <span className="ad-time-badge">{getSlotThaiName(ad.time_slot)}</span>
                    </div>
                  </div>

                  <div className="ad-stats-grid">
                    <div className="stat-col">
                      <span className="stat-label"><Eye size={12} /> View</span>
                      <span className="stat-val">{ad.impressions}</span>
                    </div>
                    <div className="stat-col">
                      <span className="stat-label"><MousePointerClick size={12} /> Click</span>
                      <span className="stat-val">{ad.clicks}</span>
                    </div>
                    <div className="stat-col">
                      <span className="stat-label"><Percent size={12} /> CTR</span>
                      <span className="stat-val">{ad.ctr}%</span>
                    </div>
                    <div className="stat-col">
                      <span className="stat-label"><Coins size={12} /> รายได้</span>
                      <span className="stat-val accent-txt">{ad.revenue}฿</span>
                    </div>
                  </div>

                  <div className="ad-action-buttons">
                    <button
                      className="ad-toggle-btn"
                      onClick={() => handleToggle(ad.id)}
                      title={ad.is_active ? 'ปิดโฆษณา' : 'เปิดโฆษณา'}
                    >
                      {ad.is_active
                        ? <ToggleRight size={32} className="toggle-icon-active" />
                        : <ToggleLeft  size={32} className="toggle-icon-inactive" />}
                    </button>
                    <button
                      className="ad-trash-btn"
                      onClick={() => handleDelete(ad.id, ad.title)}
                      title="ลบโฆษณา"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        /* ---- Section header ---- */
        .ads-section-header {
          display: flex; align-items: center; gap: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px; margin-bottom: 24px;
        }
        .ads-section-header h2 { font-size: 1.1rem; font-weight: 600; }

        /* ---- Form ---- */
        .select-input { background-color: var(--bg-input); color: #fff; cursor: pointer; }
        .select-input option { background-color: var(--bg-secondary); color: #fff; }
        .create-ad-submit { width: 100%; padding: 12px; margin-top: 15px; }
        .create-ad-submit:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ---- Drop zone ---- */
        .iuc-dropzone {
          border: 2px dashed rgba(157,78,221,0.35);
          border-radius: 12px;
          padding: 36px 20px;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          cursor: pointer; transition: all 0.2s;
          background: rgba(157,78,221,0.04);
          text-align: center;
        }
        .iuc-dropzone:hover, .iuc-drag-over {
          border-color: rgba(157,78,221,0.7);
          background: rgba(157,78,221,0.1);
        }
        .iuc-upload-icon { color: rgba(157,78,221,0.7); }
        .iuc-drop-title { color: #fff; font-weight: 600; font-size: 0.95rem; margin: 0; }
        .iuc-drop-sub { color: var(--text-muted); font-size: 0.8rem; margin: 0; }

        /* ---- Cropper ---- */
        .iuc-cropper-wrap {
          border: 1px solid var(--border); border-radius: 12px; padding: 16px;
          background: rgba(0,0,0,0.2);
        }
        .iuc-hint { color: var(--text-muted); font-size: 0.82rem; margin: 0 0 12px; }
        .iuc-crop-container { display: flex; justify-content: center; }
        .iuc-crop-actions {
          display: flex; gap: 10px; margin-top: 14px; justify-content: flex-end;
        }
        .iuc-btn-cancel {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 8px;
          background: rgba(255,255,255,0.06); border: 1px solid var(--border);
          color: var(--text-muted); font-size: 0.88rem; cursor: pointer;
          transition: all 0.2s;
        }
        .iuc-btn-cancel:hover { color: #fff; }
        .iuc-btn-confirm {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 18px; border-radius: 8px;
          background: linear-gradient(135deg, var(--primary), var(--primary-hover));
          border: none; color: #fff; font-size: 0.88rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .iuc-btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
        .iuc-btn-confirm:hover:not(:disabled) { opacity: 0.9; }

        /* ---- Preview ---- */
        .iuc-preview-wrap {
          position: relative; border-radius: 10px; overflow: hidden;
          border: 1px solid rgba(157,78,221,0.3);
        }
        .iuc-preview-img {
          width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block;
        }
        .iuc-btn-change {
          position: absolute; top: 8px; right: 8px;
          display: flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 6px;
          background: rgba(0,0,0,0.65); border: 1px solid rgba(255,255,255,0.15);
          color: #fff; font-size: 0.78rem; cursor: pointer; transition: all 0.2s;
        }
        .iuc-btn-change:hover { background: rgba(0,0,0,0.85); }

        /* ---- Ad list ---- */
        .ads-list {
          display: flex; flex-direction: column; gap: 16px;
          max-height: 580px; overflow-y: auto; padding-right: 5px;
        }
        .no-ads-placeholder {
          text-align: center; padding: 60px 20px; color: var(--text-muted);
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .no-ads-icon { color: var(--border); }
        .ad-item-row {
          background: rgba(25,20,48,0.4); padding: 16px; border-radius: 12px;
          display: flex; flex-direction: column; gap: 16px; transition: all 0.2s ease;
        }
        .ad-item-row:hover { border-color: rgba(157,78,221,0.4); transform: translateY(-2px); }
        .ad-info { display: flex; align-items: center; gap: 12px; }
        .ad-thumbnail {
          width: 72px; height: 40px; border-radius: 6px;
          object-fit: cover; border: 1px solid var(--border); flex-shrink: 0;
        }
        .ad-details { flex-grow: 1; }
        .ad-title-txt { font-size: 0.95rem; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .ad-time-badge {
          font-size: 0.8rem; color: var(--accent);
          background: rgba(224,170,255,0.1); padding: 2px 8px;
          border-radius: 20px; border: 1px solid rgba(224,170,255,0.15);
        }
        .ad-stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          background: rgba(0,0,0,0.25); padding: 8px 12px;
          border-radius: 8px; text-align: center;
        }
        .stat-col { display: flex; flex-direction: column; gap: 4px; }
        .stat-label {
          font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;
          display: flex; align-items: center; justify-content: center; gap: 3px;
        }
        .stat-val { font-size: 0.95rem; font-weight: 700; color: #fff; }
        .accent-txt { color: var(--success); }
        .ad-action-buttons {
          display: flex; justify-content: flex-end; align-items: center; gap: 12px;
          border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;
        }
        .ad-toggle-btn { background: transparent; border: none; cursor: pointer; display: flex; align-items: center; }
        .toggle-icon-active { color: var(--success); }
        .toggle-icon-inactive { color: var(--text-muted); }
        .ad-trash-btn {
          background: transparent; border: none; cursor: pointer;
          color: var(--text-muted); padding: 6px; border-radius: 6px;
          transition: all 0.2s ease; display: flex; align-items: center;
        }
        .ad-trash-btn:hover { color: var(--error); background: rgba(239,71,111,0.1); }
      `}</style>
    </div>
  );
};

export default Ads;
