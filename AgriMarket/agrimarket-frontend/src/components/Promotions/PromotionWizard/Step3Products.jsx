import React, { useState, useEffect } from 'react';
import apiClient from '../../../services/apiClient';
import { Search } from 'lucide-react';

const Step3Products = ({ formData, updateFormData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
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

        if (formData.farmerId) {
          const filtered = mapped.filter(p => String(p.farmerId) === String(formData.farmerId));
          setAllProducts(filtered);
        } else {
          setAllProducts(mapped);
        }
      } catch (e) {
        console.error("Lỗi khi tải danh sách sản phẩm:", e);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [formData.farmerId]);

  const filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSelectProduct = (product) => {
    const isSelected = formData.selectedProducts.find(p => p.id === product.id);
    if (isSelected) {
      updateFormData({ selectedProducts: formData.selectedProducts.filter(p => p.id !== product.id) });
    } else {
      updateFormData({ selectedProducts: [...formData.selectedProducts, product] });
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
      updateFormData({ selectedProducts: newSelections });
    } else {
      const remaining = formData.selectedProducts.filter(
        sp => !filteredProducts.find(fp => fp.id === sp.id)
      );
      updateFormData({ selectedProducts: remaining });
    }
  };

  const handleRemoveProduct = (id) => {
    updateFormData({ selectedProducts: formData.selectedProducts.filter(p => p.id !== id) });
  };

  const isAllFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(fp => formData.selectedProducts.find(sp => sp.id === fp.id));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
      <div className="spromo-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '24px 24px 0 24px' }}>
          <h3 className="spromo-card-title" style={{ border: 'none', padding: 0, marginBottom: '16px' }}>Sản phẩm áp dụng</h3>

          <div className="spromo-search-box" style={{ width: '100%', marginBottom: '16px' }}>
            <Search width={18} height={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo tên sản phẩm..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table className="spromo-table" style={{ borderTop: '1px solid var(--spromo-border)' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input type="checkbox" checked={isAllFilteredSelected} onChange={handleSelectAll} />
                </th>
                <th colSpan={2}>Sản phẩm</th>
                <th>Đơn vị</th>
                <th>Giá</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => {
                const isSelected = !!formData.selectedProducts.find(p => p.id === product.id);
                return (
                  <tr 
                    key={product.id} 
                    className={`spromo-product-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectProduct(product)}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={isSelected} readOnly />
                    </td>
                    <td style={{ width: '50px' }}>
                      <img src={product.image} alt={product.name} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                    </td>
                    <td style={{ fontWeight: 500 }}>{product.name}</td>
                    <td style={{ color: 'var(--spromo-text-muted)' }}>{product.unit}</td>
                    <td style={{ fontWeight: 500 }}>{product.price.toLocaleString()}đ</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="spromo-preview-sidebar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', margin: 0 }}>Tóm tắt lựa chọn</h3>
          {formData.selectedProducts.length > 0 && (
            <button 
              style={{ background: 'none', border: 'none', color: 'var(--spromo-danger)', fontSize: '13px', cursor: 'pointer', padding: 0 }}
              onClick={() => updateFormData({ selectedProducts: [] })}
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {formData.selectedProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--spromo-text-muted)', fontSize: '13px' }}>
            Chưa có sản phẩm nào được chọn.
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '13px', color: 'var(--spromo-text-muted)', marginBottom: '12px' }}>
              Đã chọn: <strong style={{ color: 'var(--spromo-text-main)' }}>{formData.selectedProducts.length} sản phẩm</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '450px', overflowY: 'auto' }}>
              {formData.selectedProducts.map(product => (
                <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--spromo-border)', padding: '8px', borderRadius: '6px' }}>
                  <img src={product.image} alt={product.name} style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{product.name}</div>
                  </div>
                  <button 
                    style={{ background: 'none', border: 'none', color: 'var(--spromo-text-muted)', cursor: 'pointer', padding: '4px' }}
                    onClick={() => handleRemoveProduct(product.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Step3Products;
