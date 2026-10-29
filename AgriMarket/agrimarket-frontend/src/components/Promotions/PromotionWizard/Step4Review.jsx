import React from 'react';
import { Check } from 'lucide-react';

const Step4Review = ({ formData, onEditStep, farmersList = [] }) => {
  const farmerName = formData.farmerId 
    ? (farmersList.find(f => String(f.id) === String(formData.farmerId))?.name || 'Đang tải...') 
    : 'Toàn hệ thống';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ background: '#ecfdf5', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '1px solid #a7f3d0' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#065f46' }}>Tóm tắt chương trình</h3>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ background: '#d1fae5', color: '#059669', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check width={24} height={24} />
          </div>
          <div style={{ color: '#065f46', fontSize: '14px', lineHeight: '1.5', fontWeight: 500 }}>
            Khuyến mãi sẽ được tạo và áp dụng cho nông dân ngay sau khi bạn xác nhận.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#065f46', marginLeft: '40px' }}>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '180px', fontWeight: 500 }}>Ngân sách chương trình:</span>
            <span style={{ fontWeight: 600 }}>{formData.budget ? `${Number(formData.budget).toLocaleString('vi-VN')}đ` : 'Chưa thiết lập'}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '180px', fontWeight: 500 }}>Thời gian áp dụng:</span>
            <span style={{ fontWeight: 600 }}>{formData.startDate && formData.endDate ? `${formData.startDate} - ${formData.endDate}` : 'Chưa thiết lập'}</span>
          </div>
        </div>
      </div>

      <div className="spromo-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--spromo-border)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Thông tin cơ bản</h3>
          <button 
            style={{ color: 'var(--spromo-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            onClick={() => onEditStep(1)}
          >
            Chỉnh sửa
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
          <div>
            <div style={{ color: 'var(--spromo-text-muted)', marginBottom: '4px' }}>Tên chương trình</div>
            <div style={{ fontWeight: 500 }}>{formData.title || '-'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--spromo-text-muted)', marginBottom: '4px' }}>Thời gian áp dụng</div>
            <div style={{ fontWeight: 500 }}>{formData.startDate && formData.endDate ? `${formData.startDate} đến ${formData.endDate}` : '-'}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ color: 'var(--spromo-text-muted)', marginBottom: '4px' }}>Mô tả chương trình</div>
            <div style={{ fontWeight: 500 }}>{formData.description || 'Không có mô tả'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--spromo-text-muted)', marginBottom: '4px' }}>Tên nhà vườn được áp dụng</div>
            <div style={{ fontWeight: 500 }}>{farmerName}</div>
          </div>
          <div>
            <div style={{ color: 'var(--spromo-text-muted)', marginBottom: '4px' }}>Trạng thái hiển thị</div>
            <div style={{ fontWeight: 500 }}>{formData.visibility === 'show' ? 'Hiển thị ngay sau khi tạo' : 'Ẩn và chờ duyệt'}</div>
          </div>
        </div>
      </div>

      <div className="spromo-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--spromo-border)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Chi tiết khuyến mãi</h3>
          <button 
            style={{ color: 'var(--spromo-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            onClick={() => onEditStep(2)}
          >
            Chỉnh sửa
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
          <div>
            <div style={{ color: 'var(--spromo-text-muted)', marginBottom: '4px' }}>Loại khuyến mãi</div>
            <div style={{ fontWeight: 500 }}>
              {formData.discountType === 'percent' ? 'Giảm theo %' : 
               formData.discountType === 'amount' ? 'Giảm theo số tiền' : 
               formData.discountType === 'order' ? 'Giảm đơn hàng' : 'Mã giảm giá'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--spromo-text-muted)', marginBottom: '4px' }}>Giá trị giảm</div>
            <div style={{ fontWeight: 500, color: 'var(--spromo-primary)' }}>
              {formData.discountVal ? `${formData.discountVal}${formData.discountType === 'percent' ? '%' : 'đ'}` : '-'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--spromo-text-muted)', marginBottom: '4px' }}>Giảm tối đa</div>
            <div style={{ fontWeight: 500 }}>{formData.maxDiscount ? `${formData.maxDiscount}đ` : 'Không giới hạn'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--spromo-text-muted)', marginBottom: '4px' }}>Đơn hàng tối thiểu</div>
            <div style={{ fontWeight: 500 }}>{formData.minOrder ? `${formData.minOrder}đ` : 'Không yêu cầu'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--spromo-text-muted)', marginBottom: '4px' }}>Số lần sử dụng/người</div>
            <div style={{ fontWeight: 500 }}>{formData.usageLimitPerPerson || '-'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--spromo-text-muted)', marginBottom: '4px' }}>Ngân sách</div>
            <div style={{ fontWeight: 500 }}>{formData.budget ? `${formData.budget}đ` : 'Không giới hạn'}</div>
          </div>
        </div>
      </div>

      <div className="spromo-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--spromo-border)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Sản phẩm áp dụng ({formData.selectedProducts.length} sản phẩm)</h3>
          <button 
            style={{ color: 'var(--spromo-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            onClick={() => onEditStep(3)}
          >
            Chỉnh sửa
          </button>
        </div>
        
        {formData.selectedProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--spromo-text-muted)' }}>Chưa có sản phẩm nào được chọn.</div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {formData.selectedProducts.map(product => (
              <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--spromo-border)', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
                <img src={product.image} alt={product.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                <span>{product.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step4Review;

