import React, { useEffect, useState } from 'react';
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
  AlertCircle 
} from 'lucide-react';
import { adsAPI } from '../services/api';

const Ads = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Ad Form State
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
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

  useEffect(() => {
    fetchAds();
  }, []);

  const handleCreateAd = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const newAd = await adsAPI.create({
        title,
        image_url: imageUrl.trim(),
        affiliate_url: affiliateUrl.trim(),
        time_slot: timeSlot,
      });
      // Clear form
      setTitle('');
      setImageUrl('');
      setAffiliateUrl('');
      setTimeSlot('morning');
      // Refresh list
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
      setAds(ads.map(ad => {
        if (ad.id === id) {
          return {
            ...ad,
            is_active: updatedAd.is_active
          };
        }
        return ad;
      }));
    } catch (err) {
      console.error('Error toggling ad', err);
      alert('เกิดข้อผิดพลาดในการเปิด/ปิดโฆษณา');
    }
  };

  const getSlotThaiName = (slot) => {
    const slots = {
      morning: '🌞 เช้า (05:00 - 11:59)',
      afternoon: '☀️ บ่าย (12:00 - 16:59)',
      evening: '🌙 เย็น (17:00 - 21:59)',
      night: '🌌 ดึก (22:00 - 04:59)'
    };
    return slots[slot] || slot;
  };

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
        {/* Left Side: Create Form */}
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
              <label className="form-label">ที่อยู่ลิงก์รูปภาพ (Image URL)</label>
              <input 
                type="url" 
                required
                className="form-input" 
                placeholder="https://example.com/banner.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <p className="field-hint">
                สามารถดึงรูปภาพจากเว็บฝากไฟล์ หรือ Unsplash เช่น https://images.unsplash.com/...
              </p>
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
              disabled={formLoading}
            >
              {formLoading ? 'กำลังสร้างโฆษณา...' : 'บันทึกและเปิดใช้งาน'}
            </button>
          </form>
        </div>

        {/* Right Side: Ad Stats Summary */}
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
                  
                  {/* Stats Grid */}
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

                  {/* Actions */}
                  <div className="ad-action-buttons">
                    <button 
                      className="ad-toggle-btn" 
                      onClick={() => handleToggle(ad.id)}
                      title={ad.is_active ? 'ปิดโฆษณา' : 'เปิดโฆษณา'}
                    >
                      {ad.is_active ? (
                        <ToggleRight size={32} className="toggle-icon-active" />
                      ) : (
                        <ToggleLeft size={32} className="toggle-icon-inactive" />
                      )}
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
        .ads-section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
          margin-bottom: 24px;
        }

        .ads-section-header h2 {
          font-size: 1.1rem;
          font-weight: 600;
        }

        .select-input {
          background-color: var(--bg-input);
          color: #fff;
          cursor: pointer;
        }

        .select-input option {
          background-color: var(--bg-secondary);
          color: #fff;
        }

        .create-ad-submit {
          width: 100%;
          padding: 12px;
          margin-top: 15px;
        }

        /* Ads List items styles */
        .ads-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 580px;
          overflow-y: auto;
          padding-right: 5px;
        }

        .no-ads-placeholder {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .no-ads-icon {
          color: var(--border);
        }

        .ad-item-row {
          background: rgba(25, 20, 48, 0.4);
          padding: 16px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: all 0.2s ease;
        }

        .ad-item-row:hover {
          border-color: rgba(157, 78, 221, 0.4);
          transform: translateY(-2px);
        }

        .ad-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ad-thumbnail {
          width: 50px;
          height: 50px;
          border-radius: 8px;
          object-fit: cover;
          border: 1px solid var(--border);
        }

        .ad-details {
          flex-grow: 1;
        }

        .ad-title-txt {
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
        }

        .ad-time-badge {
          font-size: 0.8rem;
          color: var(--accent);
          background: rgba(224, 170, 255, 0.1);
          padding: 2px 8px;
          border-radius: 20px;
          border: 1px solid rgba(224, 170, 255, 0.15);
        }

        /* Stats Grid */
        .ad-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: rgba(0, 0, 0, 0.25);
          padding: 8px 12px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }

        .stat-val {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
        }

        .accent-txt {
          color: var(--success);
        }

        /* Action Buttons */
        .ad-action-buttons {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 12px;
        }

        .ad-toggle-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .toggle-icon-active {
          color: var(--success);
        }

        .toggle-icon-inactive {
          color: var(--text-muted);
        }

        .ad-trash-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
        }

        .ad-trash-btn:hover {
          color: var(--error);
          background: rgba(239, 71, 111, 0.1);
        }
      `}</style>
    </div>
  );
};

export default Ads;
