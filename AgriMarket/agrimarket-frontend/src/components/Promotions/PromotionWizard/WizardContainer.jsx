import React, { useState, useEffect } from 'react';
import Step1BasicInfo from './Step1BasicInfo';
import Step2Details from './Step2Details';
import Step3Products from './Step3Products';
import Step4Review from './Step4Review';
import apiClient from '../../../services/apiClient';

const WizardContainer = ({ role, onCancel, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
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

  // Shared state for the wizard
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    description: '',
    maxUses: '',
    farmerId: role === 'farmer' ? (currentUser?.id || '') : '', // For admin
    visibility: 'show', // show, hide
    discountType: 'percent', // percent, amount, order, code
    discountVal: '',
    maxDiscount: '',
    minOrder: '',
    usageLimitPerPerson: '',
    budget: '',
    image: '', // added image field
    selectedProducts: [] // array of objects
  });

  useEffect(() => {
    if (formData.farmerId) {
      const filtered = formData.selectedProducts.filter(p => String(p.farmerId) === String(formData.farmerId));
      if (filtered.length !== formData.selectedProducts.length) {
        setFormData(prev => ({ ...prev, selectedProducts: filtered }));
      }
    }
  }, [formData.farmerId]);

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const updateFormData = (newData) => {
    setFormData({ ...formData, ...newData });
  };

  const handleCreate = async () => {
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

      await apiClient.post('/api/admin/promotions', payload);
      onSuccess(formData);
    } catch (e) {
      console.error("Lỗi khi tạo khuyến mãi:", e);
      alert("Đã xảy ra lỗi khi tạo chương trình khuyến mãi.");
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo formData={formData} updateFormData={updateFormData} role={role} farmersList={farmersList} />;
      case 2:
        return <Step2Details formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <Step3Products formData={formData} updateFormData={updateFormData} />;
      case 4:
        return <Step4Review formData={formData} onEditStep={(step) => setCurrentStep(step)} farmersList={farmersList} />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="spromo-breadcrumb">Khuyến mãi / <span>Tạo khuyến mãi mới</span></div>
      <h2 className="spromo-title" style={{ marginBottom: '4px' }}>Tạo khuyến mãi mới</h2>
      <p className="spromo-subtitle" style={{ marginBottom: '24px' }}>Tạo chương trình khuyến mãi mới cho {role === 'admin' ? 'nông dân trên hệ thống' : 'gian hàng của bạn'}.</p>

      {/* Stepper */}
      <div className="spromo-stepper">
        {/* Step 1 */}
        <div className={`step-item ${currentStep >= 1 ? (currentStep === 1 ? 'active' : 'completed') : ''}`}>
          <div className="step-number">{currentStep > 1 ? '✓' : '1'}</div>
          <div className="step-label">Thông tin cơ bản</div>
        </div>
        
        {/* Step 2 */}
        <div className={`step-item ${currentStep >= 2 ? (currentStep === 2 ? 'active' : 'completed') : ''}`}>
          <div className="step-number">{currentStep > 2 ? '✓' : '2'}</div>
          <div className="step-label">Chi tiết khuyến mãi</div>
        </div>

        {/* Step 3 */}
        <div className={`step-item ${currentStep >= 3 ? (currentStep === 3 ? 'active' : 'completed') : ''}`}>
          <div className="step-number">{currentStep > 3 ? '✓' : '3'}</div>
          <div className="step-label">Sản phẩm áp dụng</div>
        </div>

        {/* Step 4 */}
        <div className={`step-item ${currentStep >= 4 ? (currentStep === 4 ? 'active' : 'completed') : ''}`}>
          <div className="step-number">4</div>
          <div className="step-label">Xem trước & Hoàn tất</div>
        </div>
        
        {/* Progress Line Background */}
        <div style={{ position: 'absolute', top: '50%', left: '40px', right: '150px', height: '2px', background: 'var(--spromo-border)', zIndex: 0, transform: 'translateY(-50%)' }}></div>
        {/* Progress Line Active (approximate logic for demo) */}
        <div style={{ position: 'absolute', top: '50%', left: '40px', width: `calc(${(currentStep - 1) * 32}% - 20px)`, maxWidth: 'calc(100% - 190px)', height: '2px', background: 'var(--spromo-primary)', zIndex: 0, transform: 'translateY(-50%)', transition: 'width 0.3s' }}></div>
      </div>

      <div className="wizard-layout">
        <div className="wizard-main">
          {renderStep()}

          <div className="wizard-footer">
            <button className="btn-spromo-secondary" onClick={currentStep === 1 ? onCancel : handlePrev}>
              {currentStep === 1 ? 'Hủy bỏ' : 'Quay lại'}
            </button>
            <button className="btn-spromo-primary" onClick={currentStep === 4 ? handleCreate : handleNext}>
              {currentStep === 4 ? 'Xác nhận & Tạo' : 'Tiếp tục'} {currentStep < 4 && <span style={{ marginLeft: '4px' }}>→</span>}
            </button>
          </div>
        </div>

        {/* The sidebar is part of step 1, 2, 3 so it's managed within those components or here. 
            Looking at the screenshot, Step 1 and 2 have the preview sidebar. Step 3 has selected products. Step 4 has none.
            We'll let each step component render its own right sidebar for maximum flexibility.
        */}
      </div>
    </div>
  );
};

export default WizardContainer;

