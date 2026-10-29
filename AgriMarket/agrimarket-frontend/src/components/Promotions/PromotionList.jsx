import React, { useState } from 'react';
import { Download, Plus, Search, ChevronDown, X, Eye } from 'lucide-react';

const PromotionList = ({ role, onCreateNew, onViewDetail, promotions = [], loading, searchTerm: externalSearchTerm, setSearchTerm: externalSetSearchTerm }) => {
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : localSearchTerm;
  const setSearchTerm = externalSetSearchTerm !== undefined ? externalSetSearchTerm : setLocalSearchTerm;
  const [statusFilter, setStatusFilter] = useState('all');
  const [discountFilter, setDiscountFilter] = useState('all');
  const [farmerFilter, setFarmerFilter] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  // Lấy danh sách nông dân duy nhất
  const uniqueFarmers = [...new Set(promotions.map(p => p.farmerName).filter(Boolean))];

  // Filter & Sort logic
  const filteredPromotions = promotions.filter(promo => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = promo.title.toLowerCase().includes(searchLower) || 
                          promo.code.toLowerCase().includes(searchLower) ||
                          (promo.farmerName && promo.farmerName.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter === 'all' || promo.status === statusFilter;
    const matchesDiscount = discountFilter === 'all' || promo.discountType === discountFilter;
    const matchesFarmer = farmerFilter === 'all' || promo.farmerName === farmerFilter;
    const matchesDate = !filterDate || (new Date(promo.startDate) <= new Date(filterDate) && new Date(promo.endDate) >= new Date(filterDate));
    
    return matchesSearch && matchesStatus && matchesDiscount && matchesFarmer && matchesDate;
  }).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <span className="spromo-badge active">Đang hoạt động</span>;
      case 'upcoming': return <span className="spromo-badge upcoming">Sắp bắt đầu</span>;
      case 'ended': return <span className="spromo-badge ended">Đã kết thúc</span>;
      default: return null;
    }
  };

  const handleExportReport = () => {
    const headers = [
      'Chương trình',
      'Mã KM',
      'Nông dân',
      'Loại giảm giá',
      'Giá trị giảm',
      'Ngày bắt đầu',
      'Ngày kết thúc',
      'Doanh thu (VNĐ)',
      'Lượt dùng',
      'Trạng thái'
    ];

    const csvData = filteredPromotions.map(promo => {
      const discountText = promo.discountType === 'percent' ? `${promo.discountVal}%` : 
                           promo.discountType === 'amount' ? `${promo.discountVal}đ` : 
                           'Miễn phí vận chuyển';
      
      const statusText = promo.status === 'active' ? 'Đang hoạt động' :
                         promo.status === 'upcoming' ? 'Sắp bắt đầu' : 'Đã kết thúc';

      const typeText = promo.discountType === 'percent' ? 'Giảm %' : 
                       promo.discountType === 'amount' ? 'Giảm tiền' : 'Freeship';

      return [
        `"${promo.title}"`,
        `"${promo.code}"`,
        `"${promo.farmerName || ''}"`,
        `"${typeText}"`,
        `"${discountText}"`,
        `"${promo.startDate}"`,
        `"${promo.endDate}"`,
        `"${promo.revenueGenerated}"`,
        `"${promo.usedCount}"`,
        `"${statusText}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bao_cao_khuyen_mai.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="spromo-header">
        <div>
          <h2 className="spromo-title">Danh sách khuyến mãi hệ thống</h2>
          <p className="spromo-subtitle">Quản lý và theo dõi các chương trình khuyến mãi hiện có.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleExportReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              color: '#1f2937',
              fontWeight: '500',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <Download size={18} />
            Xuất báo cáo
          </button>
          <button className="btn-spromo-primary" onClick={onCreateNew} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Tạo khuyến mãi mới
          </button>
        </div>
      </div>

      <div className="spromo-list-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {externalSearchTerm === undefined && (
          <div className="spromo-search-box" style={{ flex: '1', minWidth: '300px' }}>
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm khuyến mãi, nông dân, sản phẩm..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button style={{ padding: '8px 16px', border: '1px solid #10b981', color: '#10b981', background: '#f0fdf4', borderRadius: '6px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
            Tất cả ({filteredPromotions.length})
            <ChevronDown size={14} />
          </button>
          
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--spromo-border)', background: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', outline: 'none', color: 'var(--spromo-text-main)' }}
          >
            <option value="all">Trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="upcoming">Sắp bắt đầu</option>
            <option value="ended">Đã kết thúc</option>
          </select>

          <select 
            value={discountFilter} 
            onChange={(e) => setDiscountFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--spromo-border)', background: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', outline: 'none', color: 'var(--spromo-text-main)' }}
          >
            <option value="all">Loại giảm</option>
            <option value="percent">Giảm theo %</option>
            <option value="amount">Giảm theo số tiền</option>
            <option value="free_ship">Miễn phí vận chuyển</option>
          </select>

          {role === 'admin' && (
            <select 
              value={farmerFilter} 
              onChange={(e) => setFarmerFilter(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--spromo-border)', background: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', outline: 'none', color: 'var(--spromo-text-main)', maxWidth: '150px' }}
            >
              <option value="all">Nhà vườn</option>
              {uniqueFarmers.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          )}

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--spromo-text-muted)', marginRight: '8px', fontWeight: 500 }}>Thời gian:</span>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid var(--spromo-border)', background: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', outline: 'none', color: 'var(--spromo-text-main)', fontFamily: 'inherit' }}
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')}
                style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Xóa bộ lọc ngày"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="spromo-table-wrapper">
        <table className="spromo-table" style={{ fontSize: '13px' }}>
          <thead>
            <tr style={{ textTransform: 'uppercase', color: 'var(--spromo-text-muted)', fontSize: '12px', background: 'var(--spromo-bg-light)' }}>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input type="checkbox" />
              </th>
              <th>Chương trình</th>
              {role === 'admin' && <th>Nhà vườn áp dụng</th>}
              <th>Loại giảm giá</th>
              <th>Giá trị giảm</th>
              <th>Thời gian</th>

              <th>Lượt dùng</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredPromotions.map(promo => (
              <tr key={promo.id}>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" />
                </td>
                <td>
                  <div className="spromo-name-cell">
                    <img src={promo.image} alt={promo.title} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                    <div className="spromo-name-info" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--spromo-primary)', fontWeight: 600 }}>{promo.title}</h4>
                      <span style={{ fontSize: '12px', color: 'var(--spromo-text-muted)', marginTop: '2px' }}>
                        ID: {promo.code || `KM-2024-${promo.id.toString().padStart(3, '0')}`}
                      </span>
                    </div>
                  </div>
                </td>
                {role === 'admin' && (
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--spromo-text-main)', marginBottom: '4px' }}>{promo.farmerName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--spromo-text-muted)' }}>{promo.productsCount} sản phẩm</div>
                  </td>
                )}
                <td>
                  <span style={{ fontWeight: 500, color: 'var(--spromo-text-main)' }}>
                    {promo.discountType === 'percent' ? 'Giảm theo %' : 
                     promo.discountType === 'free_ship' ? 'Miễn phí vận chuyển' : 'Giảm theo số tiền'}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--spromo-text-main)', marginBottom: '4px' }}>
                    {promo.discountType === 'percent' ? promo.discountVal + '%' : promo.discountVal.toLocaleString() + 'đ'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--spromo-text-muted)' }}>
                    Tối đa {promo.maxDiscount ? promo.maxDiscount.toLocaleString() + 'đ' : 'Không giới hạn'}
                  </div>
                </td>
                <td>
                  <div style={{ color: 'var(--spromo-text-muted)' }}>
                    <div>{promo.startDate.split('-').reverse().join('/')}</div>
                    <div style={{ margin: '2px 0' }}>-</div>
                    <div>{promo.endDate.split('-').reverse().join('/')}</div>
                  </div>
                </td>

                <td>
                  <span style={{ color: 'var(--spromo-text-main)', fontWeight: 500 }}>
                    {promo.usedCount || 0}
                  </span>
                </td>
                <td>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    background: 'var(--spromo-bg-light)',
                    color: 'var(--spromo-text-muted)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 500
                  }}>
                    {promo.status === 'active' ? 'Đang hoạt động' : 
                     promo.status === 'upcoming' ? 'Sắp bắt đầu' : 
                     promo.status === 'ended' ? 'Đã kết thúc' : 'Chờ duyệt'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', color: 'var(--spromo-text-muted)' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'inline-flex', alignItems: 'center' }} onClick={() => onViewDetail(promo.id)}>
                      <Eye size={18} />
                    </button>

                  </div>
                </td>
              </tr>
            ))}
            {filteredPromotions.length === 0 && (
              <tr>
                <td colSpan={role === 'admin' ? 10 : 9} style={{ textAlign: 'center', padding: '40px' }}>
                  Không tìm thấy chương trình khuyến mãi nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--spromo-text-muted)' }}>
        <div>Hiển thị {filteredPromotions.length} kết quả</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ padding: '6px 12px', border: '1px solid var(--spromo-border)', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>Trước</button>
          <button style={{ padding: '6px 12px', border: '1px solid var(--spromo-primary)', background: 'var(--spromo-primary)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>1</button>
          <button style={{ padding: '6px 12px', border: '1px solid var(--spromo-border)', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>Sau</button>
        </div>
      </div>
    </div>
  );
};

export default PromotionList;

