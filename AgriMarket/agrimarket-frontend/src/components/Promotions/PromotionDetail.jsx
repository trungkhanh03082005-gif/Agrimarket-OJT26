import React, { useState } from 'react';
import { Edit2, Pause, Trash2, ArrowLeft, CheckCircle2, User, Calendar, Tag, Eye, Percent, DollarSign, Users, Clock, TrendingUp, Package, FileText, Database, Layers } from 'lucide-react';
import apiClient from '../../services/apiClient';

const PromotionDetail = ({ promoId, onBack, onEdit, role, showToast, promotions = [], onRefresh }) => {
  const promo = promotions.find(p => p.id === promoId) || promotions[0] || {};
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <span style={{ color: '#10b981', background: '#d1fae5', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 500 }}>Đang hoạt động</span>;
      case 'upcoming': return <span style={{ color: '#f59e0b', background: '#fef3c7', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 500 }}>Sắp bắt đầu</span>;
      case 'ended': return <span style={{ color: '#6b7280', background: '#f3f4f6', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 500 }}>Đã kết thúc</span>;
      default: return null;
    }
  };

  const budgetPercent = promo.budget ? Math.min(100, Math.round(((promo.usedBudget || 0) / promo.budget) * 100)) : 0;
  
  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const diffTime = Math.abs(new Date(end) - new Date(start));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };
  const durationDays = calculateDays(promo.startDate, promo.endDate);
  const usageRate = promo.maxUses ? Math.round(((promo.usedCount || 0) / promo.maxUses) * 100) : 0;

  return (
    <>
      <div className="spromo-detail-container" style={{ paddingBottom: '40px' }}>
        <div className="spromo-breadcrumb" style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
          <span style={{ color: '#10b981', fontWeight: 500, cursor: 'pointer' }} onClick={onBack}>Khuyến mãi</span> / <span>Chi tiết chương trình</span>
        </div>
        
        <div className="spromo-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <h2 className="spromo-title" style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111827' }}>{promo.title}</h2>
              {getStatusBadge(promo.status)}
            </div>
            <p className="spromo-subtitle" style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '15px' }}>
              {promo.description || "Chương trình khuyến mãi nông sản."}
            </p>
            <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#6b7280' }}>
              <span>Mã chương trình: <strong style={{ color: '#111827' }}>{promo.code || 'Chưa có mã'}</strong></span>
              <span>Ngày tạo: <strong style={{ color: '#111827' }}>{promo.startDate ? `${promo.startDate.split('-').reverse().join('/')} 09:00` : 'Chưa rõ'}</strong></span>
              <span>Cập nhật lần cuối: <strong style={{ color: '#111827' }}>{promo.startDate ? `${promo.startDate.split('-').reverse().join('/')} 09:00` : 'Chưa rõ'}</strong></span>
            </div>
          </div>
          
          <button 
            className="btn-spromo-secondary" 
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: '#374151', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <ArrowLeft size={16} /> Quay lại danh sách
          </button>
        </div>

        <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
          
          {/* CỘT TRÁI (MAIN) */}
          <div className="detail-main" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* THẺ MAIN INFO */}
            <div className="spromo-card" style={{ display: 'flex', gap: '32px', padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ flex: '0 0 280px' }}>
                <img src={promo.image} alt={promo.title} style={{ width: '100%', height: '320px', objectFit: 'cover', borderRadius: '8px' }} />
              </div>

              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>Nông dân áp dụng</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={18} color="#6b7280" />
                      <span style={{ fontWeight: 600, fontSize: '15px', color: '#111827' }}>{promo.farmerName}</span>
                      {promo.farmerId && (
                        <span style={{ color: '#10b981', background: '#d1fae5', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                          <CheckCircle2 size={12} /> Đã xác minh
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>Thời gian áp dụng</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, fontSize: '14px', color: '#374151' }}>
                      <Calendar size={18} color="#6b7280" />
                      {promo.startDate ? promo.startDate.split('-').reverse().join('/') : ''} - {promo.endDate ? promo.endDate.split('-').reverse().join('/') : ''} ({durationDays} ngày)
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>Loại khuyến mãi</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, fontSize: '14px', color: '#374151' }}>
                      <Tag size={18} color="#6b7280" />
                      {promo.discountType === 'percent' ? 'Giảm theo %' : promo.discountType === 'amount' ? 'Giảm theo số tiền' : 'Miễn phí vận chuyển'}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>Hiển thị chương trình</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, fontSize: '14px', color: '#374151' }}>
                      <Eye size={18} color="#6b7280" />
                      {promo.visibility === 'show' ? 'Hiển thị ngay sau khi tạo' : 'Ẩn và chờ duyệt'}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>Mô tả chương trình</div>
                    <div style={{ fontWeight: 500, lineHeight: 1.5, fontSize: '14px', color: '#374151' }}>
                      {promo.description || "Không có mô tả cho chương trình này."}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>Giá trị giảm</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '15px', color: '#111827' }}>
                      <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center' }}>
                        {promo.discountType === 'percent' ? <Percent size={14}/> : 'đ'}
                      </span>
                      {promo.discountVal?.toLocaleString()}{promo.discountType === 'percent' ? '%' : 'đ'}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>Giảm tối đa</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '15px', color: '#111827' }}>
                      <FileText size={18} color="#6b7280" />
                      {promo.maxDiscount ? promo.maxDiscount.toLocaleString() + 'đ' : 'Không giới hạn'}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>Số lần sử dụng mỗi người</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '15px', color: '#111827' }}>
                      <User size={18} color="#6b7280" />
                      {promo.usageLimitPerPerson || 1} lần
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>Ngân sách chương trình</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '15px', color: '#111827' }}>
                      <Database size={18} color="#6b7280" />
                      {promo.budget ? promo.budget.toLocaleString() + 'đ' : 'Không giới hạn'}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>Ngân sách đã sử dụng</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '15px', color: '#111827' }}>
                      <Database size={18} color="#6b7280" />
                      {promo.usedBudget ? promo.usedBudget.toLocaleString() + 'đ' : '0đ'} ({budgetPercent}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* THẺ DANH SÁCH SẢN PHẨM */}
            <div className="spromo-card" style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: '#111827' }}>Sản phẩm áp dụng ({promo.selectedProducts?.length || 0} sản phẩm)</h3>
              <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#4b5563', fontSize: '12px', textTransform: 'uppercase', textAlign: 'left' }}>SẢN PHẨM</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#4b5563', fontSize: '12px', textTransform: 'uppercase', textAlign: 'left' }}>ĐƠN VỊ</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#4b5563', fontSize: '12px', textTransform: 'uppercase', textAlign: 'left' }}>GIÁ BÁN</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#4b5563', fontSize: '12px', textTransform: 'uppercase', textAlign: 'right' }}>TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(promo.selectedProducts || []).map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <img src={p.image || "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=100"} alt={p.name} style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }} />
                          <span style={{ fontWeight: 600, color: '#111827' }}>{p.name}</span>
                        </td>
                        <td style={{ padding: '16px', color: '#4b5563' }}>{p.unit}</td>
                        <td style={{ padding: '16px', color: '#4b5563' }}>{p.price?.toLocaleString()}đ</td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <span style={{ color: '#10b981', background: '#d1fae5', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>Đang áp dụng</span>
                        </td>
                      </tr>
                    ))}
                    {(!promo.selectedProducts || promo.selectedProducts.length === 0) && (
                      <tr>
                        <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                          Không có sản phẩm nào được áp dụng.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* HAI THẺ CUỐI BÊN TRÁI */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="spromo-card" style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px', color: '#111827' }}>Điều kiện & Giới hạn</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>Đơn hàng tối thiểu</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#111827', fontSize: '15px' }}><FileText size={18} color="#6b7280"/> {promo.minOrder ? promo.minOrder.toLocaleString() + 'đ' : 'Không yêu cầu'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>Áp dụng cho</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#111827', fontSize: '15px' }}><Layers size={18} color="#6b7280"/> Tất cả sản phẩm được áp dụng</div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>Số lần sử dụng mỗi người</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#111827', fontSize: '15px' }}><Clock size={18} color="#6b7280"/> {promo.usageLimitPerPerson || 1} lần</div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>Không áp dụng cho</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#111827', fontSize: '15px' }}><Tag size={18} color="#6b7280"/> Sản phẩm đã giảm giá khác</div>
                  </div>
                </div>
              </div>
              
              <div className="spromo-card" style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px', color: '#111827' }}>Lịch sử thay đổi</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '4px', top: '8px', bottom: '8px', width: '2px', background: '#e5e7eb' }}></div>
                  <div style={{ paddingLeft: '20px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '0', top: '6px', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 500 }}>
                        {promo.startDate ? `${promo.startDate.split('-').reverse().join('/')} 09:15` : '12/07/2025 14:20'}
                      </span>
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '2px' }}>Administrator</div>
                    <div style={{ fontWeight: 500, fontSize: '14px', color: '#374151' }}>Cập nhật sản phẩm áp dụng</div>
                  </div>
                  <div style={{ paddingLeft: '20px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '0', top: '6px', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 500 }}>
                        {promo.startDate ? `${promo.startDate.split('-').reverse().join('/')} 09:00` : '10/07/2025 10:30'}
                      </span>
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '2px' }}>Administrator</div>
                    <div style={{ fontWeight: 500, fontSize: '14px', color: '#374151' }}>Tạo chương trình khuyến mãi</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (SIDEBAR) */}
          <div className="detail-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* THẺ TRẠNG THÁI */}
            <div className="spromo-card" style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>Trạng thái chương trình</h3>
                {getStatusBadge(promo.status)}
              </div>
              
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Tiến độ ngân sách</span>
                  <span style={{ color: '#4b5563', fontWeight: 500 }}>
                    {(promo.usedBudget || 0).toLocaleString()}đ / {promo.budget ? promo.budget.toLocaleString() + 'đ' : 'Không giới hạn'}
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${budgetPercent}%`, background: '#10b981', borderRadius: '4px' }}></div>
                </div>
                <div style={{ fontSize: '13px', color: '#10b981', marginTop: '6px', textAlign: 'right', fontWeight: 600 }}>
                  {budgetPercent}%
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Percent size={22} strokeWidth={2.5}/></div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '17px', color: '#111827', marginBottom: '4px' }}>{promo.usedCount || 0}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Số lượt sử dụng</div>
                  </div>
                </div>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={22} strokeWidth={2.5}/></div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '17px', color: '#111827', marginBottom: '4px' }}>{promo.selectedProducts?.length || 0} sản phẩm</div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Đang áp dụng</div>
                  </div>
                </div>
              </div>
            </div>

            {/* THẺ HÀNH ĐỘNG */}
            <div className="spromo-card" style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', margin: 0, color: '#111827' }}>Hành động</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                <button style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #a7f3d0', background: '#f0fdf4', color: '#059669', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', cursor: 'pointer', transition: 'all 0.2s' }} onClick={onEdit}>
                  <Edit2 size={18} strokeWidth={2.5} /> Chỉnh sửa chương trình
                </button>
                <button style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #fde68a', background: '#fffbeb', color: '#d97706', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setShowPauseModal(true)}>
                  <Pause size={18} strokeWidth={2.5} /> Tạm dừng chương trình
                </button>
                <button style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setShowDeleteModal(true)}>
                  <Trash2 size={18} strokeWidth={2.5} /> Xóa chương trình
                </button>
              </div>
            </div>

            {/* THẺ THỐNG KÊ CHI TIẾT */}
            <div className="spromo-card" style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', margin: 0, color: '#111827' }}>Thống kê chi tiết</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#4b5563' }}>Tổng lượt sử dụng</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{promo.usedCount || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#4b5563' }}>Ngân sách đã sử dụng</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{(promo.usedBudget || 0).toLocaleString()}đ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#4b5563' }}>Số sản phẩm áp dụng</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{promo.selectedProducts?.length || 0} sản phẩm</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#4b5563' }}>Tổng số đơn hàng</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{promo.usedCount || 0}</span>
                </div>
              </div>
              <div style={{ marginTop: '20px', fontSize: '12px', color: '#9ca3af' }}>* Dữ liệu được cập nhật từ hệ thống</div>
            </div>

          </div>
        </div>
      </div>

      {showPauseModal && (
        <div className="spromo-modal-overlay">
          <div className="spromo-modal-content" style={{ maxWidth: '400px' }}>
            <div style={{ marginBottom: '20px', color: 'var(--spromo-warning)', textAlign: 'center' }}>
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 style={{ textAlign: 'center', marginBottom: '12px', fontSize: '18px' }}>Tạm dừng khuyến mãi?</h3>
            <p style={{ textAlign: 'center', color: 'var(--spromo-text-muted)', marginBottom: '24px', fontSize: '14px' }}>
              Chương trình khuyến mãi này sẽ tạm thời không khả dụng cho khách hàng. Bạn có thể kích hoạt lại bất kỳ lúc nào.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-spromo-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowPauseModal(false)}>Hủy</button>
              <button 
                className="btn-spromo-primary" 
                style={{ flex: 1, justifyContent: 'center', background: 'var(--spromo-warning)' }} 
                onClick={async () => {
                  try {
                    await apiClient.put(`/api/admin/promotions/${promoId}/status`, { status: 'ended' });
                    setShowPauseModal(false);
                    if (showToast) showToast('Đã tạm dừng chương trình khuyến mãi');
                    if (onRefresh) await onRefresh();
                    onBack();
                  } catch (e) {
                    console.error("Lỗi khi dừng khuyến mãi:", e);
                    if (showToast) showToast('Không thể kết nối máy chủ');
                  }
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="spromo-modal-overlay">
          <div className="spromo-modal-content" style={{ maxWidth: '400px' }}>
            <div style={{ marginBottom: '20px', color: 'var(--spromo-danger)', textAlign: 'center' }}>
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 style={{ textAlign: 'center', marginBottom: '12px', fontSize: '18px' }}>Xóa chương trình?</h3>
            <p style={{ textAlign: 'center', color: 'var(--spromo-text-muted)', marginBottom: '24px', fontSize: '14px' }}>
              Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa chương trình khuyến mãi này không?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-spromo-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowDeleteModal(false)}>Hủy</button>
              <button 
                className="btn-spromo-primary" 
                style={{ flex: 1, justifyContent: 'center', background: 'var(--spromo-danger)' }} 
                onClick={async () => {
                  try {
                    await apiClient.delete(`/api/admin/promotions/${promoId}`);
                    setShowDeleteModal(false);
                    if (showToast) showToast('Đã xóa chương trình khuyến mãi thành công');
                    if (onRefresh) await onRefresh();
                    onBack();
                  } catch (e) {
                    console.error("Lỗi khi xóa khuyến mãi:", e);
                    if (showToast) showToast('Không thể kết nối máy chủ');
                  }
                }}
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PromotionDetail;
