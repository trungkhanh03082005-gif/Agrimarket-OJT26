import React from 'react';

const PreviewSidebar = ({ formData }) => {
  return (
    <div className="spromo-preview-sidebar">
      <h3 style={{ fontSize: '16px', margin: '0 0 16px 0' }}>Xem trước chương trình</h3>
      
      <div className="preview-ticket" style={{ overflow: 'hidden', padding: formData.image ? '0' : undefined }}>
        {formData.image ? (
          <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        )}
      </div>

      <ul className="preview-list">
        <li>
          <span className="label">Tên chương trình</span>
          <span style={{ fontWeight: 500 }}>{formData.title || 'Chưa có'}</span>
        </li>
        <li>
          <span className="label">Loại khuyến mãi</span>
          <span style={{ fontWeight: 500 }}>
            {formData.discountType === 'percent' ? 'Giảm theo %' : 
             formData.discountType === 'amount' ? 'Giảm theo số tiền' : 
             formData.discountType === 'order' ? 'Giảm đơn hàng' : 'Mã giảm giá'}
          </span>
        </li>
        <li>
          <span className="label">Tên nhà vườn</span>
          <span style={{ fontWeight: 500 }}>{formData.farmerId ? 'Đã chọn' : 'Toàn hệ thống'}</span>
        </li>
        <li>
          <span className="label">Thời gian áp dụng</span>
          <span style={{ fontWeight: 500 }}>
            {formData.startDate && formData.endDate ? `${formData.startDate} - ${formData.endDate}` : 'Chưa chọn'}
          </span>
        </li>
        <li>
          <span className="label">Sản phẩm áp dụng</span>
          <span style={{ fontWeight: 500 }}>
            {formData.selectedProducts.length > 0 ? `${formData.selectedProducts.length} sản phẩm` : 'Chưa chọn'}
          </span>
        </li>
        <li>
          <span className="label">Số lượng tối đa</span>
          <span style={{ fontWeight: 500 }}>{formData.maxUses ? formData.maxUses : 'Không giới hạn'}</span>
        </li>
      </ul>

      {(!formData.title || !formData.startDate || !formData.endDate) && (
        <div className="preview-warning">
          <span style={{ marginRight: '8px' }}>!</span> 
          Vui lòng điền đầy đủ thông tin để xem trước chương trình khuyến mãi.
        </div>
      )}
    </div>
  );
};

export default PreviewSidebar;

