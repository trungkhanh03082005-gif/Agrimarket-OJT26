import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Tag, Users, ShieldCheck, Zap, ShoppingCart, Heart, Star } from 'lucide-react';
import { getApprovedProductsPaged } from '../../services/productService';
import cartService from '../../services/cartService';
import authService from '../../services/authService';
import Header from '../../components/common/Header/Header';
import Footer from '../../components/common/Footer/Footer';
import './PromotionLanding.css';

import apiClient from '../../services/apiClient';

const PromotionLandingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [promo, setPromo] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({});
  const [toastMsg, setToastMsg] = useState('');
  const user = authService.getCurrentUser();

  // Find promo from Backend API
  useEffect(() => {
    const fetchPromo = async () => {
      try {
        const response = await apiClient.get('/api/admin/promotions');
        const list = response.data || [];
        const found = list.find(p => String(p.id) === String(id));
        if (found) {
          setPromo(found);
          return;
        }
      } catch (e) {
        console.error("Lỗi khi tải khuyến mãi từ backend:", e);
      }
      setPromo(null);
    };
    fetchPromo();
  }, [id]);

  // Load products and filter/apply discount
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const result = await getApprovedProductsPaged({ page: 0, size: 100 });
        setProducts(result.content || []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Countdown to promo end date
  useEffect(() => {
    if (!promo?.endDate) return;
    const calcTime = () => {
      const end = new Date(promo.endDate + 'T23:59:59');
      const diff = end.getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };
    setTimeLeft(calcTime());
    const timer = setInterval(() => setTimeLeft(calcTime()), 1000);
    return () => clearInterval(timer);
  }, [promo]);

  const calcDiscountedPrice = (price) => {
    if (!promo) return price;
    if (promo.discountType === 'percent') return Math.round(price * (1 - promo.discountVal / 100));
    if (promo.discountType === 'amount') return Math.max(0, price - promo.discountVal);
    return price;
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleAddToCart = async (p, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      try {
        showToast(`Đã thêm "${p.name}" vào giỏ hàng!`);
        window.dispatchEvent(new Event('cartUpdated'));
        await cartService.addToCart(p.id, 1);
      } catch {
        showToast('Không thể thêm vào giỏ hàng.');
      }
    } else {
      navigate('/login');
    }
  };

  // Only show products explicitly listed in promo.selectedProducts
  const promoProducts = (() => {
    if (!promo || !promo.selectedProducts || promo.selectedProducts.length === 0) return [];
    const selectedIds = promo.selectedProducts.map(sp => String(sp.id ?? sp));
    return products
      .filter(p => selectedIds.includes(String(p.id)))
      .map(p => ({ ...p, discountedPrice: calcDiscountedPrice(p.price) }));
  })();

  const pad = (n) => String(n).padStart(2, '0');

  if (!promo) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <Header />
        <p style={{ color: '#6b7280', fontSize: 16 }}>Không tìm thấy chương trình khuyến mãi này.</p>
        <button onClick={() => navigate('/')} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer' }}>
          Về trang chủ
        </button>
      </div>
    );
  }

  const discountLabel = promo.discountType === 'percent' ? `${promo.discountVal}%` : `${(promo.discountVal / 1000).toFixed(0)}K`;
  const budgetPercent = promo.budget > 0 ? Math.min(100, Math.round((promo.usedBudget / promo.budget) * 100)) : 0;
  const usedPercent = promo.maxUses > 0 ? Math.min(100, Math.round((promo.usedCount / promo.maxUses) * 100)) : 0;

  return (
    <div className="pl-page">
      <Header />

      {/* Hero Banner */}
      <div className="pl-hero" style={{ backgroundImage: promo.image ? `url(${promo.image})` : undefined }}>
        <div className="pl-hero-overlay" />
        <div className="pl-hero-content">
          <button className="pl-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Quay lại
          </button>

            <div className="pl-hero-badges">
              <span className="pl-badge-discount">GIẢM {discountLabel}</span>
              {(promo.status === 'ended' || (promo.endDate && new Date().toISOString().slice(0,10) > promo.endDate)) ? (
                <span className="pl-badge-live" style={{ background: '#6b7280' }}>● ĐÃ KẾT THÚC</span>
              ) : (promo.status === 'upcoming' || (promo.startDate && new Date().toISOString().slice(0,10) < promo.startDate)) ? (
                <span className="pl-badge-live" style={{ background: '#f59e0b' }}>● SẮP BẮT ĐẦU</span>
              ) : (
                <span className="pl-badge-live">● ĐANG DIỄN RA</span>
              )}
            </div>

          <h1 className="pl-hero-title">{promo.title}</h1>
          <p className="pl-hero-desc">{promo.description}</p>

          {/* Countdown */}
          <div className="pl-countdown">
            <Clock size={16} />
            <span style={{ fontSize: 13, opacity: 0.9 }}>Kết thúc sau:</span>
            {[['Ngày', timeLeft.days], ['Giờ', timeLeft.hours], ['Phút', timeLeft.minutes], ['Giây', timeLeft.seconds]].map(([label, val]) => (
              <div key={label} className="pl-countdown-unit">
                <span className="pl-countdown-num">{pad(val ?? 0)}</span>
                <span className="pl-countdown-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="pl-stats-row">
        <div className="pl-stat">
          <Tag size={20} color="#dc2626" />
          <div>
            <div className="pl-stat-value">GIẢM {discountLabel}</div>
            <div className="pl-stat-label">Mức ưu đãi</div>
          </div>
        </div>
        <div className="pl-stat">
          <Users size={20} color="#7c3aed" />
          <div>
            <div className="pl-stat-value">{(promo.usedCount || 0).toLocaleString('vi-VN')}</div>
            <div className="pl-stat-label">Lượt sử dụng</div>
          </div>
        </div>
        <div className="pl-stat">
          <Zap size={20} color="#d97706" />
          <div>
            <div className="pl-stat-value">{promoProducts.length} sản phẩm</div>
            <div className="pl-stat-label">Đang áp dụng</div>
          </div>
        </div>
        <div className="pl-stat">
          <ShieldCheck size={20} color="#16a34a" />
          <div>
            <div className="pl-stat-value">{promo.farmerName}</div>
            <div className="pl-stat-label">Nhà vườn</div>
          </div>
        </div>
      </div>

      {/* Usage Progress */}
      {promo.maxUses > 0 && (
        <div className="pl-usage-section">
          <div className="pl-usage-header">
            <span>Lượt sử dụng: <strong>{promo.usedCount || 0}/{promo.maxUses}</strong></span>
            <span style={{ color: usedPercent > 80 ? '#dc2626' : '#6b7280', fontWeight: 600 }}>
              {usedPercent > 80 ? '🔥 Sắp hết!' : `Còn ${promo.maxUses - (promo.usedCount || 0)} lượt`}
            </span>
          </div>
          <div className="pl-progress-bar">
            <div className="pl-progress-fill" style={{ width: `${usedPercent}%`, background: usedPercent > 80 ? '#dc2626' : '#16a34a' }} />
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="pl-products-section">
        <div className="pl-products-header">
          <h2 className="pl-products-title">
            <Tag size={20} /> Sản phẩm áp dụng khuyến mãi
          </h2>
          <span style={{ fontSize: 13, color: '#6b7280' }}>{promoProducts.length} sản phẩm</span>
        </div>

        {loading ? (
          <div className="pl-loading">Đang tải sản phẩm...</div>
        ) : promoProducts.length === 0 ? (
          <div className="pl-empty">Chưa có sản phẩm áp dụng trong chương trình này.</div>
        ) : (
          <div className="pl-products-grid">
            {promoProducts.map(p => (
              <Link key={p.id} to={`/products/${p.id}`} className="pl-product-card">
                <div className="pl-product-img-wrap">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="pl-product-img" />
                  ) : (
                    <div className="pl-product-img-fallback">🌱</div>
                  )}
                  <span className="pl-product-discount-tag">-{discountLabel}</span>
                </div>

                <div className="pl-product-body">
                  <span className="pl-product-category">{(p.category || '').toUpperCase()}</span>
                  <h3 className="pl-product-name" title={p.name}>{p.name}</h3>
                  <div className="pl-product-farmer">{p.farmerName || 'Nhà vườn Agri'}</div>

                  <div className="pl-product-rating">
                    <Star size={12} fill="#f59e0b" color="#f59e0b" />
                    <span>{p.rating ? p.rating.toFixed(1) : '0.0'}</span>
                    <span style={{ color: '#9ca3af' }}>({p.reviewsCount || 0})</span>
                  </div>

                  <div className="pl-product-price-row">
                    <div>
                      <span className="pl-product-new-price">{p.discountedPrice.toLocaleString('vi-VN')}đ</span>
                      <span className="pl-product-old-price">{p.price.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <button
                      className="pl-add-cart-btn"
                      onClick={(e) => handleAddToCart(p, e)}
                      aria-label="Thêm vào giỏ"
                    >
                      <ShoppingCart size={15} />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />

      {/* Toast */}
      {toastMsg && (
        <div className="pl-toast">
          <ShoppingCart size={15} /> {toastMsg}
        </div>
      )}
    </div>
  );
};

export default PromotionLandingPage;
