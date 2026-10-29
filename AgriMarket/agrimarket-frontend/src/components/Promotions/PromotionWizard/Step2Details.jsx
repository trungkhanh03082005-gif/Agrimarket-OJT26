import React from 'react';
import { Info } from 'lucide-react';

const Step2Details = ({ formData, updateFormData }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
      <div>
        <div className="spromo-card">
          <h3 className="spromo-card-title">Chi tiết khuyến mãi</h3>
          
          <div className="form-group">
            <label>Loại giảm giá</label>
            <input 
              type="text" 
              value={
                formData.discountType === 'percent' ? 'Giảm theo %' : 
                formData.discountType === 'amount' ? 'Giảm theo số tiền' : 
                formData.discountType === 'order' ? 'Giảm đơn hàng' : 'Mã giảm giá'
              } 
              disabled 
              style={{ background: 'var(--spromo-bg-light)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Giá trị giảm *</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" 
                  placeholder="Nhập giá trị" 
                  value={formData.discountVal}
                  onChange={(e) => updateFormData({ discountVal: e.target.value })}
                />
                <span style={{ position: 'absolute', right: '12px', top: '10px', color: 'var(--spromo-text-muted)', fontWeight: 500 }}>
                  {formData.discountType === 'percent' ? '%' : 'đ'}
                </span>
              </div>
            </div>
            
            <div className="form-group">
              <label>Giảm tối đa (tùy chọn)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" 
                  placeholder="Nhập số tiền" 
                  value={formData.maxDiscount}
                  onChange={(e) => updateFormData({ maxDiscount: e.target.value })}
                />
                <span style={{ position: 'absolute', right: '12px', top: '10px', color: 'var(--spromo-text-muted)', fontWeight: 500 }}>đ</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Đơn hàng tối thiểu (tùy chọn)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" 
                  placeholder="Nhập số tiền" 
                  value={formData.minOrder}
                  onChange={(e) => updateFormData({ minOrder: e.target.value })}
                />
                <span style={{ position: 'absolute', right: '12px', top: '10px', color: 'var(--spromo-text-muted)', fontWeight: 500 }}>đ</span>
              </div>
            </div>
            
            <div className="form-group">
              <label>Số lần sử dụng mỗi người *</label>
              <input 
                type="number" 
                placeholder="Nhập số lần" 
                value={formData.usageLimitPerPerson}
                onChange={(e) => updateFormData({ usageLimitPerPerson: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Ngân sách chương trình (tùy chọn)</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="number" 
                placeholder="Nhập tổng ngân sách" 
                value={formData.budget}
                onChange={(e) => updateFormData({ budget: e.target.value })}
              />
              <span style={{ position: 'absolute', right: '12px', top: '10px', color: 'var(--spromo-text-muted)', fontWeight: 500 }}>đ</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--spromo-text-muted)', marginTop: '8px', marginBottom: 0 }}>
              Chương trình sẽ tự động dừng khi dùng hết ngân sách này.
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="spromo-preview-sidebar" style={{ background: '#f8fafc', border: 'none', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
            <Info size={20} style={{ color: '#3b82f6' }} />
            Giải thích
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>Giảm tối đa</h4>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Giới hạn số tiền giảm tối đa cho mỗi đơn hàng. Thường dùng khi giảm theo %.
              </p>
            </div>
            
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>Đơn hàng tối thiểu</h4>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Khách hàng phải mua đạt mức này mới được áp dụng khuyến mãi.
              </p>
            </div>
            
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>Số lần sử dụng mỗi người</h4>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Để tránh một người dùng quá nhiều lần, hãy thiết lập giới hạn (ví dụ: 1 lần/người).
              </p>
            </div>
            
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>Ngân sách</h4>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Kiểm soát chi phí khuyến mãi. Khi tổng số tiền giảm giá vượt mức này, chương trình sẽ tạm dừng.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step2Details;
