import React, { useState, useEffect } from 'react';
import './PromotionsShared.css';
import PromotionList from './PromotionList';
import PromotionDetail from './PromotionDetail';
import PromotionWizard from './PromotionWizard/WizardContainer';
import PromotionEdit from './PromotionEdit';
import apiClient from '../../services/apiClient';
import { Check } from 'lucide-react';

const PromotionsMain = ({ role, searchTerm, setSearchTerm }) => {
  // viewState can be: 'list', 'create', 'detail', 'success'
  const [viewState, setViewState] = useState('list');
  const [selectedPromoId, setSelectedPromoId] = useState(null);
  const [createdPromoData, setCreatedPromoData] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      if (role === 'farmer') {
        const response = await apiClient.get('/api/farmers/promotions');
        setPromotions(response.data || []);
      } else {
        const response = await apiClient.get('/api/admin/promotions');
        let filtered = response.data || [];
        if (role === 'admin') {
          filtered = filtered.filter(p => !p.farmerId);
        }
        setPromotions(filtered);
      }
    } catch (e) {
      console.warn("Lỗi khi tải khuyến mãi từ DB:", e);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleCreateNew = () => {
    setViewState('create');
  };

  const handleViewDetail = (id) => {
    setSelectedPromoId(id);
    setViewState('detail');
  };

  const handleEdit = (id) => {
    setSelectedPromoId(id);
    setViewState('edit');
  };

  const handleBackToList = () => {
    setViewState('list');
    setSelectedPromoId(null);
  };

  const handleCreationSuccess = (data) => {
    setCreatedPromoData(data);
    setViewState('success');
  };

  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="spromo-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', background: 'var(--spromo-secondary)', color: 'white', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 9999 }}>
          <Check width={24} height={24} />
          <span style={{ fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}
      {viewState === 'list' && (
        <PromotionList 
          role={role} 
          promotions={promotions}
          loading={loading}
          onRefresh={fetchPromotions}
          onCreateNew={handleCreateNew} 
          onViewDetail={handleViewDetail}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      )}
      
      {viewState === 'create' && (
        <PromotionWizard 
          role={role} 
          onCancel={handleBackToList}
          onSuccess={(data) => {
            fetchPromotions();
            handleCreationSuccess(data);
          }}
        />
      )}

      {viewState === 'detail' && (
        <PromotionDetail 
          role={role} 
          promoId={selectedPromoId} 
          promotions={promotions}
          onRefresh={fetchPromotions}
          onBack={handleBackToList} 
          onEdit={() => handleEdit(selectedPromoId)}
          showToast={showToast}
        />
      )}

      {viewState === 'edit' && (
        <PromotionEdit 
          role={role}
          promoId={selectedPromoId}
          promotions={promotions}
          onCancel={handleBackToList}
          onSuccess={() => {
            fetchPromotions();
            handleBackToList();
          }}
        />
      )}

      {viewState === 'success' && (
        <div className="spromo-success-screen" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'var(--spromo-bg-light)' }}>
          
          {/* Success Icon */}
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <div style={{ 
              width: '100px', 
              height: '100px', 
              background: '#f0fdf4', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
            }}>
              <div style={{
                width: '72px',
                height: '72px',
                background: '#059669',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
              }}>
                <Check width={36} height={36} strokeWidth={3} />
              </div>
            </div>
            {/* Confetti decorations */}
            <div style={{ position: 'absolute', top: '10px', left: '-10px', width: '8px', height: '8px', background: '#f59e0b', borderRadius: '2px', transform: 'rotate(45deg)' }}></div>
            <div style={{ position: 'absolute', top: '-5px', right: '15px', width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }}></div>
            <div style={{ position: 'absolute', bottom: '15px', right: '-15px', width: '8px', height: '8px', background: '#fbbf24', borderRadius: '2px', transform: 'rotate(15deg)' }}></div>
            <div style={{ position: 'absolute', bottom: '5px', left: '10px', width: '6px', height: '6px', background: '#3b82f6', borderRadius: '50%', opacity: 0.5 }}></div>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px', textAlign: 'center' }}>Tạo chương trình khuyến mãi thành công!</h2>
          <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '32px', textAlign: 'center' }}>Chương trình khuyến mãi đã được tạo và áp dụng cho {role === 'admin' ? 'nông dân' : 'gian hàng của bạn'}.</p>
          
          {/* Promo Summary Card */}
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '20px', 
            display: 'flex', 
            gap: '20px', 
            alignItems: 'center',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            marginBottom: '32px',
            border: '1px solid #f3f4f6'
          }}>
            <img 
              src={createdPromoData?.image || createdPromoData?.selectedProducts?.[0]?.image || "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=150"} 
              alt="Promo" 
              style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} 
            />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 600, color: '#065f46' }}>
                {createdPromoData?.title || 'Khuyến mãi mới'}
              </h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6b7280' }}>
                {createdPromoData?.discountVal ? `Giảm ${createdPromoData.discountVal}${createdPromoData.discountType === 'percent' ? '%' : 'đ'} ` : ''} 
                {createdPromoData?.description || 'Chương trình khuyến mãi đặc biệt.'}
              </p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {createdPromoData?.startDate || 'dd/mm/yyyy'} - {createdPromoData?.endDate || 'dd/mm/yyyy'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  {createdPromoData?.selectedProducts?.length || 0} sản phẩm áp dụng
                </span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button 
              className="btn-spromo-secondary" 
              onClick={handleBackToList}
              style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #d1d5db', color: '#374151', fontWeight: 500, background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              Xem danh sách khuyến mãi
            </button>
            <button 
              className="btn-spromo-primary" 
              onClick={handleCreateNew}
              style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 500, background: '#059669', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              Tạo chương trình mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsMain;

