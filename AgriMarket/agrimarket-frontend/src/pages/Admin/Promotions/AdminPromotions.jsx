import React, { useEffect, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../../components/common/Sidebar/AdminSidebar';
import AdminHeader from '../../../components/common/Header/AdminHeader';
import authService from '../../../services/authService';
import '../AdminStyles.css';
import PromotionsMain from '../../../components/Promotions/PromotionsMain';

const AdminPromotions = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="admin-layout">
      <AdminSidebar activeItem="promotions" />
      <div className="admin-main-container">
        <AdminHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Tìm kiếm khuyến mãi..."
        />

        <main className="admin-page-body">
          <div className="admin-promotions-container">
            <PromotionsMain 
              role="admin" 
              searchTerm={searchQuery} 
              setSearchTerm={setSearchQuery} 
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPromotions;
