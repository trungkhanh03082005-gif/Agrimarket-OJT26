import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';

const PromotionEdit = ({ promoId, onCancel, onSuccess, role, promotions = [] }) => {
  const existingPromo = promotions.find(p => p.id === promoId) || promotions[0] || {};
  const [farmersList, setFarmersList] = useState([]);

  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        const response = await apiClient.get('/api/admin/users');
        const farmers = response.data
          .filter(u => u.role === 'farmer')
          .map(u => ({
            id: u.id,
            name: u.farmName ? `${u.fullName} (${u.farmName})` : u.fullName
          }));
        setFarmersList([{ id: '', name: 'Toàn hệ thống' }, ...farmers]);
      } catch (e) {
        console.error("Lỗi khi tải danh sách nông dân:", e);
        setFarmersList([
          { id: '', name: 'Toàn hệ thống' },
          { id: '2', name: 'Nguyễn Văn A (Farm Fresh)' },
          { id: '3', name: 'Trần Thị B (Vườn Xanh)' },
          { id: '4', name: 'Lê Văn C (Eco Farm)' }
        ]);
      }
    };
    if (role === 'admin') {
      fetchFarmers();
    }
  }, [role]);
  
  const currentUserStr = localStorage.getItem("farmconnect_user");
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  const [formData, setFormData] = useState({
    title: existingPromo.title || '',
    startDate: existingPromo.startDate || '',
    endDate: existingPromo.endDate || '',
    description: existingPromo.description || '',
    maxUses: existingPromo.maxUses || '',
    farmerId: role === 'farmer' ? (currentUser?.id || existingPromo.farmerId || '') : (existingPromo.farmerId || ''), 
    visibility: existingPromo.visibility || 'show', 
    discountType: existingPromo.discountType || 'percent', 
    discountVal: existingPromo.discountVal || '',
    maxDiscount: existingPromo.maxDiscount || '',
    minOrder: existingPromo.minOrder || '',
    usageLimitPerPerson: existingPromo.usageLimitPerPerson || '1',
    budget: existingPromo.budget || '',
    selectedProducts: existingPromo.selectedProducts || []
  });

  const [allProducts, setAllProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await apiClient.get('/api/admin/products');
        const mapped = response.data.map(p => ({
          id: p.id,
          name: p.name,
          unit: p.unit || 'kg',
          price: p.price || 0,
          category: p.categoryName || '',
          image: p.thumbnailUrl || (p.images && p.images[0]) || "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=100",
          farmerId: p.farmerId
        }));
        setAllProducts(mapped);
      } catch (e) {
        console.error("Lỗi khi tải sản phẩm:", e);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (formData.farmerId) {
      const filtered = formData.selectedProducts.filter(p => String(p.farmerId) === String(formData.farmerId));
      if (filtered.length !== formData.selectedProducts.length) {
        setFormData(prev => ({ ...prev, selectedProducts: filtered }));
      }
    }
  }, [formData.farmerId]);

  const filteredProducts = allProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFarmer = formData.farmerId ? String(p.farmerId) === String(formData.farmerId) : true;
    return matchesSearch && matchesFarmer;
  });

  const handleSelectProduct = (product) => {
    const isSelected = formData.selectedProducts.find(p => p.id === product.id);
    if (isSelected) {
      setFormData(prev => ({
        ...prev,
        selectedProducts: prev.selectedProducts.filter(p => p.id !== product.id)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedProducts: [...prev.selectedProducts, product]
      }));
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const newSelections = [...formData.selectedProducts];
      filteredProducts.forEach(p => {
        if (!newSelections.find(sp => sp.id === p.id)) {
          newSelections.push(p);
        }
      });
      setFormData(prev => ({ ...prev, selectedProducts: newSelections }));
    } else {
      const remaining = formData.selectedProducts.filter(
        sp => !filteredProducts.find(fp => fp.id === sp.id)
      );
      setFormData(prev => ({ ...prev, selectedProducts: remaining }));
    }
  };

  const isAllFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(ap => formData.selectedProducts.find(sp => sp.id === ap.id));

  const updateFormData = (newData) => {
    setFormData({ ...formData, ...newData });
  };

  const handleUpdate = async () => {
    try {
      const selectedProductIds = formData.selectedProducts.map(p => p.id);
      
      const currentUserStr = localStorage.getItem("farmconnect_user");
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
      const currentUserId = currentUser?.id;

      const payload = {
        title: formData.title,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
        farmerId: role === 'farmer' ? currentUserId : (formData.farmerId ? parseInt(formData.farmerId) : null),
        visibility: formData.visibility,
        discountType: formData.discountType,
        discountVal: formData.discountVal ? parseFloat(formData.discountVal) : 0.0,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
        minOrder: formData.minOrder ? parseFloat(formData.minOrder) : null,
        usageLimitPerPerson: formData.usageLimitPerPerson ? parseInt(formData.usageLimitPerPerson) : 1,
        budget: formData.budget ? parseFloat(formData.budget) : 0.0,
        image: formData.image,
        selectedProductIds: selectedProductIds
      };

      await apiClient.put(`/api/admin/promotions/${promoId}`, payload);
      onSuccess(formData);
    } catch (e) {
      console.error("Lỗi khi cập nhật khuyến mãi:", e);
      alert("Đã xảy ra lỗi khi cập nhật chương trình khuyến mãi.");
    }
  };

  return (
    <div>
      <div className="spromo-breadcrumb">Khuyến mãi / Chi tiết chương trình / <span>Chỉnh sửa</span></div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
        <h2 className="spromo-title" style={{ margin: 0 }}>Chỉnh sửa chương trình khuyến mãi</h2>
        <span className="spromo-badge active" style={{ fontSize: '13px' }}>Đang hoạt động</span>
      </div>
      <p className="spromo-subtitle" style={{ marginBottom: '24px' }}>Cập nhật thông tin chương trình khuyến mãi.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Left Column - Forms */}
        <div>
          {/* Basic Info */}
          <div className="spromo-card">
            <h3 className="spromo-card-title">Thông tin cơ bản</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="form-group">
                <label>Tên chương trình *</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '10px', fontSize: '12px', color: 'var(--spromo-text-muted)' }}>
                    {formData.title.length}/100
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Thời gian áp dụng *</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input type="text" value={formData.startDate} disabled style={{ background: '#f8fafc', width: '100%' }} />
                  <span style={{ color: 'var(--spromo-text-muted)' }}>→</span>
                  <input type="text" value={formData.endDate} disabled style={{ background: '#f8fafc', width: '100%' }} />
                </div>
              </div>

              <div className="form-group">
                <label>Mô tả chương trình *</label>
                <div style={{ position: 'relative' }}>
                  <textarea 
                    rows="3" 
                    value={formData.description}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                  ></textarea>
                  <span style={{ position: 'absolute', right: '12px', bottom: '12px', fontSize: '12px', color: 'var(--spromo-text-muted)' }}>
                    {formData.description.length}/255
                  </span>
                </div>
              </div>



              <div className="form-group">
                <label>Tên nhà vườn được áp dụng *</label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={formData.farmerId || ''} 
                    onChange={(e) => {
                      const val = e.target.value;
                      updateFormData({ farmerId: val });
                    }}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--spromo-border)', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                  >
                    {farmersList.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--spromo-text-muted)', marginTop: '4px' }}>
                    Chọn nhà vườn cụ thể muốn áp dụng chương trình khuyến mãi này, hoặc chọn "Toàn hệ thống" để áp dụng cho tất cả nhà vườn.
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Loại khuyến mãi *</label>
                <select value={formData.discountType} onChange={(e) => updateFormData({ discountType: e.target.value })}>
                  <option value="percent">Giảm theo %</option>
                  <option value="amount">Giảm theo số tiền</option>
                  <option value="order">Giảm đơn hàng</option>
                </select>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="spromo-card">
            <h3 className="spromo-card-title">Chi tiết khuyến mãi</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Giá trị giảm *</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={formData.discountVal} onChange={(e) => updateFormData({ discountVal: e.target.value })} />
                  <span style={{ position: 'absolute', right: '12px', top: '10px', color: 'var(--spromo-text-muted)' }}>%</span>
                </div>
              </div>
              <div className="form-group">
                <label>Giảm tối đa</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={formData.maxDiscount || '200000'} onChange={(e) => updateFormData({ maxDiscount: e.target.value })} />
                  <span style={{ position: 'absolute', right: '12px', top: '10px', color: 'var(--spromo-text-muted)' }}>đ</span>
                </div>
              </div>
              <div className="form-group">
                <label>Đơn hàng tối thiểu</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={formData.minOrder || '200000'} onChange={(e) => updateFormData({ minOrder: e.target.value })} />
                  <span style={{ position: 'absolute', right: '12px', top: '10px', color: 'var(--spromo-text-muted)' }}>đ</span>
                </div>
              </div>
              <div className="form-group">
                <label>Số lần sử dụng mỗi người</label>
                <input type="number" value={formData.usageLimitPerPerson} onChange={(e) => updateFormData({ usageLimitPerPerson: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Số lượng sử dụng tối đa <span style={{ fontWeight: 'normal', color: 'var(--spromo-text-muted)' }}>(tùy chọn)</span></label>
                <input type="number" value={formData.maxUses || '10000'} onChange={(e) => updateFormData({ maxUses: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Ngân sách chương trình</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={formData.budget || '10000000'} onChange={(e) => updateFormData({ budget: e.target.value })} />
                  <span style={{ position: 'absolute', right: '12px', top: '10px', color: 'var(--spromo-text-muted)' }}>đ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Applied Products */}
          <div className="spromo-card">
            <h3 className="spromo-card-title">Sản phẩm áp dụng</h3>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <div style={{ position: 'relative', width: '250px' }}>
                <input 
                  type="text" 
                  placeholder="Tìm kiếm sản phẩm..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingRight: '36px', background: '#f8fafc', width: '100%', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px 12px' }} 
                />
                <svg style={{ position: 'absolute', right: '12px', top: '10px', color: '#9ca3af' }} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="spromo-table" style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={{ width: '40px', padding: '12px' }}>
                      <input type="checkbox" checked={isAllFilteredSelected} onChange={handleSelectAll} />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: '#6b7280' }}>SẢN PHẨM</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: '#6b7280' }}>ĐƠN VỊ</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: '#6b7280' }}>GIÁ BÁN</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => {
                    const isSelected = !!formData.selectedProducts.find(sp => sp.id === p.id);
                    return (
                      <tr 
                        key={p.id} 
                        style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                        onClick={() => handleSelectProduct(p)}
                      >
                        <td style={{ padding: '12px' }}><input type="checkbox" checked={isSelected} readOnly /></td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={p.image} alt={p.name} style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} />
                            <span style={{ fontWeight: 500 }}>{p.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{p.unit}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{p.price.toLocaleString()}đ</td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--spromo-text-muted)' }}>
                        Không tìm thấy sản phẩm nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--spromo-text-muted)' }}>
                Đã chọn <strong style={{ color: 'var(--spromo-text-main)' }}>{formData.selectedProducts.length} sản phẩm</strong>
              </div>
              {formData.selectedProducts.length > 0 && (
                <button 
                  style={{ background: 'none', border: 'none', color: 'var(--spromo-danger)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => updateFormData({ selectedProducts: [] })}
                >
                  Xóa tất cả
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid var(--spromo-border)', marginTop: '32px' }}>
            <button className="btn-spromo-secondary" onClick={onCancel} style={{ border: 'none', background: 'transparent' }}>
              Hủy bỏ
            </button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-spromo-secondary" style={{ background: 'white' }}>
                Lưu nháp
              </button>
              <button className="btn-spromo-primary" onClick={handleUpdate}>
                Cập nhật chương trình
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Previews */}
        <div>
          {/* Preview Card */}
          <div className="spromo-preview-sidebar" style={{ background: 'white', border: '1px solid var(--spromo-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px', position: 'sticky', top: '24px' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#111827' }}>
              Xem trước chương trình
            </h3>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <img src={formData.selectedProducts[0]?.image || "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=100"} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} alt="Preview" />
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>{formData.title || 'Chưa có tên'}</h4>
                <div style={{ color: '#10b981', background: '#d1fae5', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, display: 'inline-block' }}>Đang hoạt động</div>
              </div>
            </div>
            
            <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '24px', lineHeight: '1.5' }}>
              {formData.description || 'Chưa có mô tả...'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  Loại khuyến mãi
                </span>
                <span style={{ fontWeight: 500 }}>{formData.discountType === 'percent' ? 'Giảm theo %' : 'Giảm số tiền'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                  Giá trị giảm
                </span>
                <span style={{ fontWeight: 500 }}>{formData.discountVal}{formData.discountType === 'percent' ? '%' : 'đ'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  Giảm tối đa
                </span>
                <span style={{ fontWeight: 500 }}>{formData.maxDiscount || '200000'}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  Đơn hàng tối thiểu
                </span>
                <span style={{ fontWeight: 500 }}>{formData.minOrder || '200000'}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Thời gian áp dụng
                </span>
                <span style={{ fontWeight: 500 }}>{formData.startDate} - {formData.endDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  Sản phẩm áp dụng
                </span>
                <span style={{ fontWeight: 500 }}>{formData.selectedProducts.length} sản phẩm</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Ngân sách chương trình
                </span>
                <span style={{ fontWeight: 500 }}>{formData.budget ? Number(formData.budget).toLocaleString() : '10.000.000'}đ</span>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="spromo-preview-sidebar" style={{ background: 'white', border: '1px solid var(--spromo-border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#111827' }}>
              Thống kê ước tính
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#4b5563' }}>Số lượt sử dụng ước tính</span>
                <span style={{ fontWeight: 600 }}>~ 58</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#4b5563' }}>Doanh thu ước tính</span>
                <span style={{ fontWeight: 600 }}>8.450.000đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#4b5563' }}>Ngân sách đã sử dụng ước tính</span>
                <span style={{ fontWeight: 600 }}>2.120.000đ <span style={{ color: '#6b7280', fontWeight: 'normal' }}>(21.2%)</span></span>
              </div>
            </div>
            
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '16px', fontStyle: 'italic' }}>
              * Thống kê chỉ mang tính ước tính dựa trên dữ liệu hiện tại.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionEdit;
